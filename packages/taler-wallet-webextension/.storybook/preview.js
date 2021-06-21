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

import { setupI18n } from "@gnu-taler/taler-util"
import { strings } from '../src/i18n/strings.ts'

const mockConfig = {
  backendURL: 'http://demo.taler.net',
  currency: 'KUDOS'
}

export const parameters = {
  controls: { expanded: true },
  actions: { argTypesRegex: "^on[A-Z].*" },
}

export const globalTypes = {
  locale: {
    name: 'Locale',
    description: 'Internationalization locale',
    defaultValue: 'en',
    toolbar: {
      icon: 'globe',
      items: [
        { value: 'en', right: '🇺🇸', title: 'English' },
        { value: 'es', right: '🇪🇸', title: 'Spanish' },
      ],
    },
  },
};



export const decorators = [
  (Story, { globals }) => {
    setupI18n(globals.locale, strings);
    return <Story />
  },
  (Story, { kind }) => {
    if (kind.startsWith('popup')) {
      return <div class="popup-container">
        <link key="1" rel="stylesheet" type="text/css" href="/style/pure.css" />
        <link key="2" rel="stylesheet" type="text/css" href="/style/popup.css" />
        <div style={{ padding: 8, width: 'calc(400px - 16px - 2px)', height: 'calc(320px - 34px - 16px - 2px)', border: 'black solid 1px' }}>
          <Story />
        </div>
      </div>
    }
    if (kind.startsWith('wallet')) {
      return <div class="wallet-container">
        <link key="1" rel="stylesheet" type="text/css" href="/style/pure.css" />
        <link key="2" rel="stylesheet" type="text/css" href="/style/wallet.css" />
        <Story />
      </div>
    }
    return <div>
      <h1>this story is not under wallet or popup, check title property</h1>
      <Story />
    </div>
  }
  //   (Story) => <ConfigContextProvider value={mockConfig}> <Story /> </ConfigContextProvider>
];
