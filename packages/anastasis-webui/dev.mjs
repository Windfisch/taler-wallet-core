#!/usr/bin/env node
/*
 This file is part of GNU Anastasis
 (C) 2021-2022 Anastasis SARL

 GNU Anastasis is free software; you can redistribute it and/or modify it under the
 terms of the GNU Affero General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Anastasis is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License along with
 GNU Anastasis; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

import { serve } from "@gnu-taler/web-util/lib/index.node";
import esbuild from 'esbuild';
import { buildConfig } from "./build.mjs";

buildConfig.inject = ['./node_modules/@gnu-taler/web-util/lib/live-reload.mjs']

serve({
  folder: './dist',
  port: 8080,
  source: './src',
  development: true,
  onUpdate: async () => esbuild.build(buildConfig)
})

