/*
 This file is part of GNU Taler
 (C) 2021 Taler Systems S.A.

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

import defaultConfig from './preact.config'

export default {
  webpack(config, env, helpers, options) {
    defaultConfig.webpack(config, env, helpers, options)

    //1. check no file is under /routers or /component/{routers,async} to prevent async components
    // https://github.com/preactjs/preact-cli#route-based-code-splitting

    //2. remove devtools to prevent sourcemaps
    config.devtool = false

    //3. change assetLoader to load assets inline
    const loaders = helpers.getLoaders(config)
    const assetsLoader = loaders.find(lo => lo.rule.test.test('something.woff'))
    if (assetsLoader) {
      assetsLoader.rule.use = 'base64-inline-loader'
      assetsLoader.rule.loader = undefined
    }

    //4. remove critters
    //critters remove the css bundle from htmlWebpackPlugin.files.css
    //for now, pushing all the content into the html is enough
    const crittersWrapper = helpers.getPluginsByName(config, 'Critters')
    if (crittersWrapper && crittersWrapper.length > 0) {
      const [{ index }] = crittersWrapper
      config.plugins.splice(index, 1)
    }

    //5. remove favicon from src/assets

    //6. remove performance hints since we now that this is going to be big
    if (config.performance) {
      config.performance.hints = false
    }

    //7. template.html should have a favicon and add js/css content

    //last, after building remove the mysterious link to stylesheet with remove-link-stylesheet.sh
  }
}
