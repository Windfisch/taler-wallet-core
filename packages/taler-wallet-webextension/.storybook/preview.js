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

// import "../src/scss/main.scss"
// import { ConfigContextProvider } from '../src/context/config'
// import { TranslationProvider } from '../src/context/translation'

const mockConfig = {
  backendURL: 'http://demo.taler.net',
  currency: 'KUDOS'
}

// export const parameters = {
//   controls: { expanded: true },
//   actions: { argTypesRegex: "^on[A-Z].*" },
// }

// export const globalTypes = {
//   locale: {
//     name: 'Locale',
//     description: 'Internationalization locale',
//     defaultValue: 'en',
//     toolbar: {
//       icon: 'globe',
//       items: [
//         { value: 'en', right: '🇺🇸', title: 'English' },
//         { value: 'es', right: '🇪🇸', title: 'Spanish' },
//       ],
//     },
//   },
// };

// export const decorators = [
//   (Story, { globals }) => {
    
//     return <TranslationProvider initial={globals.locale}>
//       <Story />
//     </TranslationProvider>
//   },
//   (Story) => <ConfigContextProvider value={mockConfig}> <Story /> </ConfigContextProvider>
// ];
