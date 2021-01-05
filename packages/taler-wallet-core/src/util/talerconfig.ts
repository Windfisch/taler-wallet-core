/*
 This file is part of GNU Taler
 (C) 2020 Taler Systems S.A.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

/**
 * Utilities to handle Taler-style configuration files.
 *
 * @author Florian Dold <dold@taler.net>
 */

/**
 * Imports
 */
import { AmountJson } from "./amounts";
import * as Amounts from "./amounts";
import fs from "fs";

export class ConfigError extends Error {
  constructor(message: string) {
    super();
    Object.setPrototypeOf(this, ConfigError.prototype);
    this.name = "ConfigError";
    this.message = message;
  }
}

type OptionMap = { [optionName: string]: string };
type SectionMap = { [sectionName: string]: OptionMap };

export class ConfigValue<T> {
  constructor(
    private sectionName: string,
    private optionName: string,
    private val: string | undefined,
    private converter: (x: string) => T,
  ) {}

  required(): T {
    if (!this.val) {
      throw new ConfigError(
        `required option [${this.sectionName}]/${this.optionName} not found`,
      );
    }
    return this.converter(this.val);
  }

  orUndefined(): T | undefined {
    if (this.val !== undefined) {
      return this.converter(this.val);
    } else {
      return undefined;
    }
  }

  orDefault(v: T): T | undefined {
    if (this.val !== undefined) {
      return this.converter(this.val);
    } else {
      return v;
    }
  }

  isDefined(): boolean {
    return this.val !== undefined;
  }
}

/**
 * Shell-style path substitution.
 *
 * Supported patterns:
 * "$x" (look up "x")
 * "${x}" (look up "x")
 * "${x:-y}" (look up "x", fall back to expanded y)
 */
export function pathsub(
  x: string,
  lookup: (s: string, depth: number) => string | undefined,
  depth = 0,
): string {
  if (depth >= 10) {
    throw Error("recursion in path substitution");
  }
  let s = x;
  let l = 0;
  while (l < s.length) {
    if (s[l] === "$") {
      if (s[l + 1] === "{") {
        let depth = 1;
        const start = l;
        let p = start + 2;
        let insideNamePart = true;
        let hasDefault = false;
        for (; p < s.length; p++) {
          if (s[p] == "}") {
            insideNamePart = false;
            depth--;
          } else if (s[p] === "$" && s[p + 1] === "{") {
            insideNamePart = false;
            depth++;
          }
          if (insideNamePart && s[p] === ":" && s[p + 1] === "-") {
            hasDefault = true;
          }
          if (depth == 0) {
            break;
          }
        }
        if (depth == 0) {
          const inner = s.slice(start + 2, p);
          let varname: string;
          let defaultValue: string | undefined;
          if (hasDefault) {
            [varname, defaultValue] = inner.split(":-", 2);
          } else {
            varname = inner;
            defaultValue = undefined;
          }

          const r = lookup(inner, depth + 1);
          if (r !== undefined) {
            s = s.substr(0, start) + r + s.substr(p + 1);
            l = start + r.length;
            continue;
          } else if (defaultValue !== undefined) {
            const resolvedDefault = pathsub(defaultValue, lookup, depth + 1);
            s = s.substr(0, start) + resolvedDefault + s.substr(p + 1);
            l = start + resolvedDefault.length;
            continue;
          }
        }
        l = p;
        continue;
      } else {
        const m = /^[a-zA-Z-_][a-zA-Z0-9-_]*/.exec(s.substring(l + 1));
        if (m && m[0]) {
          const r = lookup(m[0], depth + 1);
          if (r !== undefined) {
            s = s.substr(0, l) + r + s.substr(l + 1 + m[0].length);
            l = l + r.length;
            continue;
          }
        }
      }
    }
    l++;
  }
  return s;
}

export class Configuration {
  private sectionMap: SectionMap = {};

  loadFromString(s: string): void {
    const reComment = /^\s*#.*$/;
    const reSection = /^\s*\[\s*([^\]]*)\s*\]\s*$/;
    const reParam = /^\s*([^=]+?)\s*=\s*(.*?)\s*$/;
    const reEmptyLine = /^\s*$/;

    let currentSection: string | undefined = undefined;

    const lines = s.split("\n");
    for (const line of lines) {
      if (reEmptyLine.test(line)) {
        continue;
      }
      if (reComment.test(line)) {
        continue;
      }
      const secMatch = line.match(reSection);
      if (secMatch) {
        currentSection = secMatch[1];
        continue;
      }
      if (currentSection === undefined) {
        throw Error("invalid configuration, expected section header");
      }
      currentSection = currentSection.toUpperCase();
      const paramMatch = line.match(reParam);
      if (paramMatch) {
        const optName = paramMatch[1].toUpperCase();
        let val = paramMatch[2];
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.slice(1, val.length - 1);
        }
        const sec = this.sectionMap[currentSection] ?? {};
        this.sectionMap[currentSection] = Object.assign(sec, {
          [optName]: val,
        });
        continue;
      }
      throw Error(
        "invalid configuration, expected section header or option assignment",
      );
    }
  }

  setString(section: string, option: string, value: string): void {
    const secNorm = section.toUpperCase();
    const sec = this.sectionMap[secNorm] ?? (this.sectionMap[secNorm] = {});
    sec[option.toUpperCase()] = value;
  }

  /**
   * Get lower-cased section names.
   */
  getSectionNames(): string[] {
    return Object.keys(this.sectionMap).map((x) => x.toLowerCase());
  }

  getString(section: string, option: string): ConfigValue<string> {
    const secNorm = section.toUpperCase();
    const optNorm = option.toUpperCase();
    const val = (this.sectionMap[secNorm] ?? {})[optNorm];
    return new ConfigValue(secNorm, optNorm, val, (x) => x);
  }

  getPath(section: string, option: string): ConfigValue<string> {
    const secNorm = section.toUpperCase();
    const optNorm = option.toUpperCase();
    const val = (this.sectionMap[secNorm] ?? {})[optNorm];
    return new ConfigValue(secNorm, optNorm, val, (x) =>
      pathsub(x, (v, d) => this.lookupVariable(v, d + 1)),
    );
  }

  getYesNo(section: string, option: string): ConfigValue<boolean> {
    const secNorm = section.toUpperCase();
    const optNorm = option.toUpperCase();
    const val = (this.sectionMap[secNorm] ?? {})[optNorm];
    const convert = (x: string): boolean => {
      x = x.toLowerCase();
      if (x === "yes") {
        return true;
      } else if (x === "no") {
        return false;
      }
      throw Error(
        `invalid config value for [${secNorm}]/${optNorm}, expected yes/no`,
      );
    };
    return new ConfigValue(secNorm, optNorm, val, convert);
  }

  getNumber(section: string, option: string): ConfigValue<number> {
    const secNorm = section.toUpperCase();
    const optNorm = option.toUpperCase();
    const val = (this.sectionMap[secNorm] ?? {})[optNorm];
    const convert = (x: string): number => {
      try {
        return Number.parseInt(x, 10);
      } catch (e) {
        throw Error(
          `invalid config value for [${secNorm}]/${optNorm}, expected number`,
        );
      }
    };
    return new ConfigValue(secNorm, optNorm, val, convert);
  }

  lookupVariable(x: string, depth: number = 0): string | undefined {
    // We loop up options in PATHS in upper case, as option names
    // are case insensitive
    const val = (this.sectionMap["PATHS"] ?? {})[x.toUpperCase()];
    if (val !== undefined) {
      return pathsub(val, (v, d) => this.lookupVariable(v, d), depth);
    }
    // Environment variables can be case sensitive, respect that.
    const envVal = process.env[x];
    if (envVal !== undefined) {
      return envVal;
    }
    return;
  }

  getAmount(section: string, option: string): ConfigValue<AmountJson> {
    const val = (this.sectionMap[section] ?? {})[option];
    return new ConfigValue(section, option, val, (x) =>
      Amounts.parseOrThrow(x),
    );
  }

  static load(filename: string): Configuration {
    const s = fs.readFileSync(filename, "utf-8");
    const cfg = new Configuration();
    cfg.loadFromString(s);
    return cfg;
  }

  write(filename: string): void {
    let s = "";
    for (const sectionName of Object.keys(this.sectionMap)) {
      s += `[${sectionName}]\n`;
      for (const optionName of Object.keys(
        this.sectionMap[sectionName] ?? {},
      )) {
        const val = this.sectionMap[sectionName][optionName];
        if (val !== undefined) {
          s += `${optionName} = ${val}\n`;
        }
      }
      s += "\n";
    }
    fs.writeFileSync(filename, s);
  }
}
