#!/usr/bin/env node
/*
 This file is part of GNU Taler
 (C) 2022 Taler Systems S.A.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

import { serve } from "@gnu-taler/web-util/lib/index.node";
import esbuild from 'esbuild';
import { buildConfig } from "./build-fast-with-linaria.mjs";

buildConfig.inject = ['./node_modules/@gnu-taler/web-util/lib/live-reload.mjs']

serve({
  folder: './dist',
  port: 8080,
  source: './src',
  development: true,
  onUpdate: async () => esbuild.build(buildConfig)
})

// FIXME: create a mocha test in the browser as it was before

// fs.writeFileSync("dev-html/manifest.json", fs.readFileSync("manifest-v2.json"))
// fs.writeFileSync("dev-html/mocha.css", fs.readFileSync("node_modules/mocha/mocha.css"))
// fs.writeFileSync("dev-html/mocha.js", fs.readFileSync("node_modules/mocha/mocha.js"))
// fs.writeFileSync("dev-html/mocha.js.map", fs.readFileSync("node_modules/mocha/mocha.js.map"))

