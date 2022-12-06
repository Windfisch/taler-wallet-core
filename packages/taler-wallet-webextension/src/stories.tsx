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

/**
 *
 * @author Sebastian Javier Marchano (sebasjm)
 */
import { Fragment, FunctionComponent, h } from "preact";
import { LogoHeader } from "./components/LogoHeader.js";
import { PopupBox, WalletBox } from "./components/styled/index.js";
import { strings } from "./i18n/strings.js";
import { PopupNavBar, WalletNavBar } from "./NavigationBar.js";

import * as components from "./components/index.stories.js";
import * as cta from "./cta/index.stories.js";
import * as mui from "./mui/index.stories.js";
import * as popup from "./popup/index.stories.js";
import * as wallet from "./wallet/index.stories.js";

import { renderStories } from "@gnu-taler/web-util/lib/index.browser";

function main(): void {
  renderStories(
    { popup, wallet, cta, mui, components },
    {
      strings,
      getWrapperForGroup,
    },
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", main);
} else {
  main();
}
function getWrapperForGroup(group: string): FunctionComponent {
  switch (group) {
    case "popup":
      return function PopupWrapper({ children }: any) {
        return (
          <Fragment>
            <PopupNavBar />
            <PopupBox>{children}</PopupBox>
          </Fragment>
        );
      };
    case "wallet":
      return function WalletWrapper({ children }: any) {
        return (
          <Fragment>
            <LogoHeader />
            <WalletNavBar />
            <WalletBox>{children}</WalletBox>
          </Fragment>
        );
      };
    case "cta":
      return function WalletWrapper({ children }: any) {
        return (
          <Fragment>
            <WalletBox>{children}</WalletBox>
          </Fragment>
        );
      };
    default:
      return Fragment;
  }
}
