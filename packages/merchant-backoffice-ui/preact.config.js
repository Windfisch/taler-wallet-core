/*
 This file is part of GNU Taler
 (C) 2021-2023 Taler Systems S.A.

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
*
* @author Sebastian Javier Marchano (sebasjm)
*/

import { DefinePlugin } from 'webpack';

import pack from './package.json';
import * as cp from 'child_process';

const commitHash = cp.execSync('git rev-parse --short HEAD').toString();

export default {
  webpack(config, env, helpers) {
    // ensure that process.env will not be undefined on runtime
    config.node.process = 'mock'

    // add __VERSION__ to be use in the html
    config.plugins.push(
      new DefinePlugin({
        'process.env.__VERSION__': JSON.stringify(env.isProd ? pack.version : `dev-${commitHash}`) ,
      }),
    );

    // suddenly getting out of memory error from build process, error below [1]
    // FIXME: remove preact-cli, use rollup
    let { index } = helpers.getPluginsByName(config, 'WebpackFixStyleOnlyEntriesPlugin')[0]
    config.plugins.splice(index, 1)   
  }
}



/* [1] from this error decided to remove plugin 'webpack-fix-style-only-entries
   leaving this error for future reference


<--- Last few GCs --->

[32479:0x2e01870]    19969 ms: Mark-sweep 1869.4 (1950.2) -> 1443.1 (1504.1) MB, 497.5 / 0.0 ms  (average mu = 0.631, current mu = 0.455) allocation failure scavenge might not succeed
[32479:0x2e01870]    21907 ms: Mark-sweep 2016.9 (2077.9) -> 1628.6 (1681.4) MB, 1596.0 / 0.0 ms  (average mu = 0.354, current mu = 0.176) allocation failure scavenge might not succeed

<--- JS stacktrace --->

==== JS stack trace =========================================

    0: ExitFrame [pc: 0x13cf099]
Security context: 0x2f4ca66c08d1 <JSObject>
    1: /* anonymous * / [0x35d05555b4b9] [...path/merchant-backoffice/node_modules/.pnpm/webpack-fix-style-only-entries@0.5.2/node_modules/webpack-fix-style-only-entries/index.js:~80] [pc=0x2145e699d1a4](this=0x1149465410e9 <GlobalObject Object map = 0xff481b5b5f9>,0x047e52e36a49 <Dependency map = 0x1ed1fe41cd19>)
    2: arguments adaptor frame: 3...

FATAL ERROR: invalid array length Allocation failed - JavaScript heap out of memory
 
*/