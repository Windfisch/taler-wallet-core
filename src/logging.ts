/*
 This file is part of TALER
 (C) 2016 Inria

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

/**
 * Configurable logging.  Allows to log persistently to a database.
 */

import {
  QueryRoot,
  Store,
  openPromise,
} from "./query";

/**
 * Supported log levels.
 */
export type Level = "error" | "debug" | "info" | "warn";

// Right now, our debug/info/warn/debug loggers just use the console based
// loggers.  This might change in the future.

function makeInfo() {
  return console.info.bind(console, "%o");
}

function makeWarn() {
  return console.warn.bind(console, "%o");
}

function makeError() {
  return console.error.bind(console, "%o");
}

function makeDebug() {
  return console.log.bind(console, "%o");
}

/**
 * Log a message using the configurable logger.
 */
export async function log(msg: string, level: Level = "info"): Promise<void> {
  const ci = getCallInfo(2);
  return record(level, msg, undefined, ci.file, ci.line, ci.column);
}

function getCallInfo(level: number) {
  // see https://github.com/v8/v8/wiki/Stack-Trace-API
  const stack = Error().stack;
  if (!stack) {
    return unknownFrame;
  }
  const lines = stack.split("\n");
  return parseStackLine(lines[level + 1]);
}

interface Frame {
  column?: number;
  file?: string;
  line?: number;
  method?: string;
}

const unknownFrame: Frame = {
  column: 0,
  file: "(unknown)",
  line: 0,
  method: "(unknown)",
};

/**
 * Adapted from https://github.com/errwischt/stacktrace-parser.
 */
function parseStackLine(stackLine: string): Frame {
  // tslint:disable-next-line:max-line-length
  const chrome = /^\s*at (?:(?:(?:Anonymous function)?|((?:\[object object\])?\S+(?: \[as \S+\])?)) )?\(?((?:file|http|https):.*?):(\d+)(?::(\d+))?\)?\s*$/i;
  const gecko = /^(?:\s*([^@]*)(?:\((.*?)\))?@)?(\S.*?):(\d+)(?::(\d+))?\s*$/i;
  const node  = /^\s*at (?:((?:\[object object\])?\S+(?: \[as \S+\])?) )?\(?(.*?):(\d+)(?::(\d+))?\)?\s*$/i;
  let parts;

  parts = gecko.exec(stackLine);
  if (parts) {
    const f: Frame = {
        column: parts[5] ? +parts[5] : undefined,
        file: parts[3],
        line: +parts[4],
        method: parts[1] || "(unknown)",
    };
    return f;
  }

  parts = chrome.exec(stackLine);
  if (parts) {
    const f: Frame = {
        column: parts[4] ? +parts[4] : undefined,
        file: parts[2],
        line: +parts[3],
        method: parts[1] || "(unknown)",
    };
    return f;
  }

  parts = node.exec(stackLine);
  if (parts) {
    const f: Frame = {
        column: parts[4] ? +parts[4] : undefined,
        file: parts[2],
        line: +parts[3],
        method: parts[1] || "(unknown)",
    };
    return f;
  }

  return unknownFrame;
}


let db: IDBDatabase|undefined;

/**
 * A structured log entry as stored in the database.
 */
export interface LogEntry {
  /**
   * Soure code column where the error occured.
   */
  col?: number;
  /**
   * Additional detail for the log statement.
   */
  detail?: string;
  /**
   * Id of the log entry, used as primary
   * key for the database.
   */
  id?: number;
  /**
   * Log level, see [[Level}}.
   */
  level: string;
  /**
   * Line where the log was created from.
   */
  line?: number;
  /**
   * The actual log message.
   */
  msg: string;
  /**
   * The source file where the log enctry
   * was created from.
   */
  source?: string;
  /**
   * Time when the log entry was created.
   */
  timestamp: number;
}

/**
 * Get all logs.  Only use for debugging, since this returns all logs ever made
 * at once without pagination.
 */
export async function getLogs(): Promise<LogEntry[]> {
  if (!db) {
    db = await openLoggingDb();
  }
  return await new QueryRoot(db).iter(logsStore).toArray();
}

/**
 * The barrier ensures that only one DB write is scheduled against the log db
 * at the same time, so that the DB can stay responsive.  This is a bit of a
 * design problem with IndexedDB, it doesn't guarantee fairness.
 */
let barrier: any;

/**
 * Record an exeption in the log.
 */
export async function recordException(msg: string, e: any): Promise<void> {
  let stack: string|undefined;
  let frame: Frame|undefined;
  try {
    stack = e.stack;
    if (stack) {
      const lines = stack.split("\n");
      frame = parseStackLine(lines[1]);
    }
  } catch (e) {
    // ignore
  }
  if (!frame) {
    frame = unknownFrame;
  }
  return record("error", e.toString(), stack, frame.file, frame.line, frame.column);
}


/**
 * Cache for reports.  Also used when something is so broken that we can't even
 * access the database.
 */
const reportCache: { [reportId: string]: any } = {};


/**
 * Get a UUID that does not use cryptographically secure randomness.
 * Formatted as RFC4122 version 4 UUID.
 */
function getInsecureUuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c: string) => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}


/**
 * Store a report and return a unique identifier to retrieve it later.
 */
export async function storeReport(report: any): Promise<string> {
  const uid = getInsecureUuid();
  reportCache[uid] = report;
  return uid;
}


/**
 * Retrieve a report by its unique identifier.
 */
export async function getReport(reportUid: string): Promise<any> {
  return reportCache[reportUid];
}


/**
 * Record a log entry in the database.
 */
export async function record(level: Level,
                             msg: string,
                             detail?: string,
                             source?: string,
                             line?: number,
                             col?: number): Promise<void> {
  if (typeof indexedDB === "undefined") {
    console.log("can't access DB for logging in this context");
    console.log("log was", { level, msg, detail, source, line, col });
    return;
  }

  let myBarrier: any;

  if (barrier) {
    const p = barrier.promise;
    myBarrier = barrier = openPromise();
    await p;
  } else {
    myBarrier = barrier = openPromise();
  }

  try {
    if (!db) {
      db = await openLoggingDb();
    }

    const count = await new QueryRoot(db).count(logsStore);

    if (count > 1000) {
      await new QueryRoot(db).deleteIf(logsStore, (e, i) => (i < 200));
    }

    const entry: LogEntry = {
      col,
      detail,
      level,
      line,
      msg,
      source,
      timestamp: new Date().getTime(),
    };
    await new QueryRoot(db).put(logsStore, entry);
  } finally {
    await Promise.resolve().then(() => myBarrier.resolve());
  }
}

const loggingDbVersion = 2;

const logsStore: Store<LogEntry> = new Store<LogEntry>("logs");

/**
 * Get a handle to the IndexedDB used to store
 * logs.
 */
export function openLoggingDb(): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open("taler-logging", loggingDbVersion);
    req.onerror = (e) => {
      reject(e);
    };
    req.onsuccess = (e) => {
      resolve(req.result);
    };
    req.onupgradeneeded = (e) => {
      const resDb = req.result;
      if (e.oldVersion !== 0) {
        try {
          resDb.deleteObjectStore("logs");
        } catch (e) {
          console.error(e);
        }
      }
      resDb.createObjectStore("logs", { keyPath: "id", autoIncrement: true });
      resDb.createObjectStore("reports", { keyPath: "uid", autoIncrement: false });
    };
  });
}

/**
 * Log a message at severity info.
 */
export const info = makeInfo();

/**
 * Log a message at severity debug.
 */
export const debug = makeDebug();

/**
 * Log a message at severity warn.
 */
export const warn = makeWarn();

/**
 * Log a message at severity error.
 */
export const error = makeError();
