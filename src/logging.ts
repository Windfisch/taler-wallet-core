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

import {Store, QueryRoot} from "./query";

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
  let ci = getCallInfo(2);
  return record(level, msg, ci.file, ci.line, ci.column);
}

function getCallInfo(level: number) {
  // see https://github.com/v8/v8/wiki/Stack-Trace-API
  let stack = Error().stack;
  if (!stack) {
    return unknownFrame;
  }
  let lines = stack.split("\n");
  return parseStackLine(lines[level + 1]);
}

interface Frame {
  file?: string;
  method?: string;
  column?: number;
  line?: number;
}

const unknownFrame: Frame = {
  file: "(unknown)",
  method: "(unknown)",
  line: 0,
  column: 0
};

/**
 * Adapted from https://github.com/errwischt/stacktrace-parser.
 */
function parseStackLine(stackLine: string): Frame {
  const chrome = /^\s*at (?:(?:(?:Anonymous function)?|((?:\[object object\])?\S+(?: \[as \S+\])?)) )?\(?((?:file|http|https):.*?):(\d+)(?::(\d+))?\)?\s*$/i;
  const gecko = /^(?:\s*([^@]*)(?:\((.*?)\))?@)?(\S.*?):(\d+)(?::(\d+))?\s*$/i;
  const node  = /^\s*at (?:((?:\[object object\])?\S+(?: \[as \S+\])?) )?\(?(.*?):(\d+)(?::(\d+))?\)?\s*$/i;
  let parts;

  if ((parts = gecko.exec(stackLine))) {
    let f: Frame = {
        file: parts[3],
        method: parts[1] || "(unknown)",
        line: +parts[4],
        column: parts[5] ? +parts[5] : undefined,
    };
    return f;
  } else if ((parts = chrome.exec(stackLine))) {
    let f: Frame = {
        file: parts[2],
        method: parts[1] || "(unknown)",
        line: +parts[3],
        column: parts[4] ? +parts[4] : undefined,
    };
    return f;
  } else if ((parts = node.exec(stackLine))) {
    let f: Frame = {
        file: parts[2],
        method: parts[1] || "(unknown)",
        line: +parts[3],
        column: parts[4] ? +parts[4] : undefined,
    };
    return f;
  }
  return unknownFrame;
}


let db: IDBDatabase|undefined = undefined;

export interface LogEntry {
  timestamp: number;
  level: string;
  msg: string;
  source: string|undefined;
  col: number|undefined;
  line: number|undefined;
  id?: number;
}

export async function getLogs(): Promise<LogEntry[]> {
  if (!db) {
    db = await openLoggingDb();
  }
  return await new QueryRoot(db).iter(logsStore).toArray();
}

export async function record(level: Level, msg: string, source?: string, line?: number, col?: number): Promise<void> {
  if (typeof indexedDB === "undefined") {
    return;
  }
  if (!db) {
    db = await openLoggingDb();
  }

  let count = await new QueryRoot(db).count(logsStore);

  console.log("count is", count);

  if (count > 1000) {
    await new QueryRoot(db).deleteIf(logsStore, (e, i) => (i < 200));
  }

  let entry: LogEntry = {
    timestamp: new Date().getTime(),
    level,
    msg,
    source,
    line,
    col,
  };
  await new QueryRoot(db).put(logsStore, entry);
}

const loggingDbVersion = 1;

const logsStore: Store<LogEntry> = new Store<LogEntry>("logs");

export function openLoggingDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("taler-logging", loggingDbVersion);
    req.onerror = (e) => {
      reject(e);
    };
    req.onsuccess = (e) => {
      resolve(req.result);
    };
    req.onupgradeneeded = (e) => {
      const db = req.result;
      if (e.oldVersion != 0) {
        try {
          db.deleteObjectStore("logs");
        } catch (e) {
          console.error(e);
        }
      }
      db.createObjectStore("logs", {keyPath: "id", autoIncrement: true});
    };
  });
}

export const info = makeInfo();
export const debug = makeDebug();
export const warn = makeWarn();
export const error = makeError();
