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

import {
  globalLogLevel,
  setGlobalLogLevelFromString,
} from "@gnu-taler/taler-util";
import { h, FunctionalComponent } from "preact";
import { BackendStateProvider } from "../context/backend.js";
import { PageStateProvider } from "../context/pageState.js";
import { TranslationProvider } from "../context/translation.js";
import { Routing } from "../pages/Routing.js";

/**
 * FIXME:
 *
 * - INPUT elements have their 'required' attribute ignored.
 *
 * - the page needs a "home" button that either redirects to
 *   the profile page (when the user is logged in), or to
 *   the very initial home page.
 *
 * - histories 'pages' are grouped in UL elements that cause
 *   the rendering to visually separate each UL.  History elements
 *   should instead line up without any separation caused by
 *   a implementation detail.
 *
 * - Many strings need to be i18n-wrapped.
 */

const App: FunctionalComponent = () => {
  return (
    <TranslationProvider>
      <PageStateProvider>
        <BackendStateProvider>
          <Routing />
        </BackendStateProvider>
      </PageStateProvider>
    </TranslationProvider>
  );
};
(window as any).setGlobalLogLevelFromString = setGlobalLogLevelFromString;
(window as any).getGlobaLevel = () => {
  return globalLogLevel;
};

export default App;
