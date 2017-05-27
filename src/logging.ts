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
 * Configurable logging.
 *
 * @author Florian Dold
 */

import {
  QueryRoot,
  Store,
  openPromise,
} from "./query";

export type Level = "error" | "debug" | "info" | "warn";

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

export interface LogEntry {
  col?: number;
  detail?: string;
  id?: number;
  level: string;
  line?: number;
  msg: string;
  source?: string;
  timestamp: number;
}

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

export async function record(level: Level,
                             msg: string,
                             detail?: string,
                             source?: string,
                             line?: number,
                             col?: number): Promise<void> {
  if (typeof indexedDB === "undefined") {
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

const loggingDbVersion = 1;

const logsStore: Store<LogEntry> = new Store<LogEntry>("logs");

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
      resDb.createObjectStore("logs", {keyPath: "id", autoIncrement: true});
    };
  });
}

export const info = makeInfo();
export const debug = makeDebug();
export const warn = makeWarn();
export const error = makeError();
