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
import { FunctionalComponent, h } from "preact";
import { TranslationProvider } from "../context/translation.js";
import AnastasisClient from "../pages/home/index.js";

const App: FunctionalComponent = () => {
  return (
    <TranslationProvider>
      <div id="app" class="has-navbar-fixed-top">
        <AnastasisClient />
      </div>
    </TranslationProvider>
  );
};

export default App;
