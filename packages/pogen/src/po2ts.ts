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
 * Convert a <lang>.po file into a JavaScript / TypeScript expression.
 */

// @ts-ignore
import * as po2json from "po2json";
import * as fs from "fs";
import * as path from "path";
import glob = require("glob");

const DEFAULT_STRING_PRELUDE = "export const strings: any = {};\n\n"

export function po2ts(): void {
  const files = glob.sync("src/i18n/*.po");

  if (files.length === 0) {
    console.error("no .po files found in src/i18n/");
    process.exit(1);
  }

  console.log(files);

  let prelude: string;
  try {
    prelude = fs.readFileSync("src/i18n/strings-prelude", "utf-8")
  } catch (e) {
    prelude = DEFAULT_STRING_PRELUDE
  }

  const chunks = [prelude];

  for (const filename of files) {
    const m = filename.match(/([a-zA-Z0-9-_]+).po/);

    if (!m) {
      console.error("error: unexpected filename (expected <lang>.po)");
      process.exit(1);
    }

    const lang = m[1];
    const pojson = po2json.parseFileSync(filename, {
      format: "jed1.x",
      fuzzy: true,
    });
    const s =
      "strings['" +
      lang +
      "'] = " +
      JSON.stringify(pojson, null, "  ") +
      ";\n\n";
    chunks.push(s);
  }

  const tsContents = chunks.join("");

  fs.writeFileSync("src/i18n/strings.ts", tsContents);
}
