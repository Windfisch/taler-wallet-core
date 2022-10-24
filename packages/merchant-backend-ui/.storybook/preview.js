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

import { ConfigContextProvider } from '../src/context/config'
import { InstanceContextProvider } from '../src/context/instance'
import { TranslationProvider } from '../src/context/translation'
import { BackendContextProvider } from '../src/context/backend'
import { h } from 'preact';

const mockConfig = {
  backendURL: 'http://demo.taler.net',
  currency: 'TESTKUDOS'
}

const mockInstance = {
  id: 'instance-id',
  token: 'instance-token',
  admin: false,
}

const mockBackend = {
  url: 'http://merchant.url',
  token: 'default-token',
  triedToLog: false,
}

export const parameters = {
  controls: { expanded: true },
  // actions: { argTypesRegex: "^on.*" },
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
  (Story, { globals }) => <TranslationProvider initial='en' forceLang={globals.locale}>
    <Story />
  </TranslationProvider>,
  (Story) => <ConfigContextProvider value={mockConfig}>
    <Story />
  </ConfigContextProvider>,
  (Story) => <InstanceContextProvider value={mockInstance}>
    <Story />
  </InstanceContextProvider>,
  (Story) => <BackendContextProvider defaultUrl={mockBackend.url}>
    <Story />
  </BackendContextProvider>,
];
