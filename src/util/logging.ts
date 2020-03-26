/*
 This file is part of TALER
 (C) 2019 GNUnet e.V.

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
 * Imports.
 */
import { isNode } from "../webex/compat";

function writeNodeLog(
  message: string,
  tag: string,
  level: string,
  args: any[],
) {
  process.stderr.write(`${new Date().toISOString()} ${tag} ${level} `);
  process.stderr.write(message);
  if (args.length != 0) {
    process.stderr.write(" ");
    process.stderr.write(JSON.stringify(args, undefined, 2));
  }
  process.stderr.write("\n");
}

/**
 * Logger that writes to stderr when running under node,
 * and uses the corresponding console.* method to log in the browser.
 */
export class Logger {
  constructor(private tag: string) {}

  info(message: string, ...args: any[]) {
    if (isNode()) {
      writeNodeLog(message, this.tag, "INFO", args);
    } else {
      console.info(
        `${new Date().toISOString()} ${this.tag} INFO ` + message,
        ...args,
      );
    }
  }

  warn(message: string, ...args: any[]) {
    if (isNode()) {
      writeNodeLog(message, this.tag, "WARN", args);
    } else {
      console.warn(
        `${new Date().toISOString()} ${this.tag} INFO ` + message,
        ...args,
      );
    }
  }

  error(message: string, ...args: any[]) {
    if (isNode()) {
      writeNodeLog(message, this.tag, "ERROR", args);
    } else {
      console.info(
        `${new Date().toISOString()} ${this.tag} ERROR ` + message,
        ...args,
      );
    }
  }

  trace(message: any, ...args: any[]) {
    if (isNode()) {
      writeNodeLog(message, this.tag, "TRACE", args);
    } else {
      console.info(
        `${new Date().toISOString()} ${this.tag} TRACE ` + message,
        ...args,
      );
    }
  }
}
