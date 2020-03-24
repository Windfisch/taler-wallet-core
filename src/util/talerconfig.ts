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
}

export class Configuration {
  private sectionMap: SectionMap = {};

  constructor() {}

  loadFromString(s: string): void {
    const reComment = /^\s*#.*$/;
    const reSection = /^\s*\[\s*([^\]]*)\s*\]\s*$/;
    const reParam = /^\s*([^=]+?)\s*=\s*(.*?)\s*$/;
    const reEmptyLine = /^\s*$/;

    let currentSection: string | undefined = undefined;

    const lines = s.split("\n");
    for (const line of lines) {
      console.log("parsing line", JSON.stringify(line));
      if (reEmptyLine.test(line)) {
        continue;
      }
      if (reComment.test(line)) {
        continue;
      }
      const secMatch = line.match(reSection);
      if (secMatch) {
        currentSection = secMatch[1];
        console.log("setting section to", currentSection);
        continue;
      }
      if (currentSection === undefined) {
        throw Error("invalid configuration, expected section header");
      }
      const paramMatch = line.match(reParam);
      if (paramMatch) {
        const optName = paramMatch[1];
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

    console.log("parsed config", JSON.stringify(this.sectionMap, undefined, 2));
  }

  getString(section: string, option: string): ConfigValue<string> {
    const val = (this.sectionMap[section] ?? {})[option];
    return new ConfigValue(section, option, val, x => x);
  }

  getAmount(section: string, option: string): ConfigValue<AmountJson> {
    const val = (this.sectionMap[section] ?? {})[option];
    return new ConfigValue(section, option, val, x => Amounts.parseOrThrow(x));
  }
}
