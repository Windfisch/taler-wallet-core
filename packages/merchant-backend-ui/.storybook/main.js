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


module.exports = {
  "stories": [
    "../src/**/*.stories.mdx",
    "../src/**/*.stories.@(js|jsx|ts|tsx)"
  ],
  "addons": [
    "@storybook/preset-scss",
    "@storybook/addon-a11y",
    "@storybook/addon-essentials" //docs, control, actions, viewpot, toolbar, background
  ],
  // sb does not yet support new jsx transform by default
  // https://github.com/storybookjs/storybook/issues/12881
  // https://github.com/storybookjs/storybook/issues/12952
  babel: async (options) => ({
    ...options,
    presets: [
      ...options.presets,
      [
        '@babel/preset-react', {
          runtime: 'automatic',
        },
        'preset-react-jsx-transform' 
      ],
      "@linaria",
    ],
  }),
  webpackFinal: (config) => {
    // should be removed after storybook 6.3
    // https://github.com/storybookjs/storybook/issues/12853#issuecomment-821576113
    config.resolve.alias = {
      react: "preact/compat",
      "react-dom": "preact/compat",
    };

    // we need to add @linaria loader AFTER the babel-loader
    // https://github.com/callstack/linaria/blob/master/docs/BUNDLERS_INTEGRATION.md#webpack  
    config.module.rules[0] = {
      ...(config.module.rules[0]),
      loader: undefined, // Disable the predefined babel-loader on the rule
      use: [
        {
          ...(config.module.rules[0].use[0]),
          loader: 'babel-loader',          
        },
        {
          loader: '@linaria/webpack-loader',
          options: {
            sourceMap: true, //always true since this is dev
            babelOptions: {
              presets: config.module.rules[0].use[0].options.presets,
            }
             // Pass the current babel options to linaria's babel instance
          }
        }
      ]
    };

    return config;
  },
}