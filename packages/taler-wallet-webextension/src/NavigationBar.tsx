/*
 This file is part of TALER
 (C) 2016 GNUnet e.V.

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

/**
 * Popup shown to the user when they click
 * the Taler browser action button.
 *
 * @author Florian Dold
 */

/**
 * Imports.
 */
import { i18n } from "@gnu-taler/taler-util";
import { ComponentChildren, h, VNode } from "preact";
import { PopupNavigation } from "./components/styled";

export enum Pages {
  welcome = "/welcome",
  balance = "/balance",
  balance_history = "/balance/history/:currency",
  manual_withdraw = "/balance/manual-withdraw/:currency?",
  deposit = "/balance/deposit/:currency",
  transaction = "/balance/transaction/:tid",
  settings = "/settings",
  dev = "/dev",
  cta = "/cta/:action",
  backup = "/backup",
  last_activity = "/last-activity",
  provider_detail = "/provider/:pid",
  provider_add = "/provider/add",
  exchange_add = "/exchange/add",

  reset_required = "/reset-required",
  payback = "/payback",
  return_coins = "/return-coins",

  pay = "/pay",
  refund = "/refund",
  tips = "/tip",
  withdraw = "/withdraw",
}

interface TabProps {
  target: string;
  current?: string;
  children?: ComponentChildren;
}

function Tab(props: TabProps): VNode {
  let cssClass = "";
  if (props.current?.startsWith(props.target)) {
    cssClass = "active";
  }
  return (
    <a href={props.target} class={cssClass}>
      {props.children}
    </a>
  );
}

export function NavBar({
  devMode,
  path,
}: {
  path: string;
  devMode: boolean;
}): VNode {
  return (
    <PopupNavigation devMode={devMode}>
      <div>
        <Tab target="/balance" current={path}>{i18n.str`Balance`}</Tab>
        <Tab
          target="/last-activity"
          current={path}
        >{i18n.str`Last Activity`}</Tab>
        <Tab target="/backup" current={path}>{i18n.str`Backup`}</Tab>
        <Tab target="/settings" current={path}>{i18n.str`Settings`}</Tab>
        {devMode && <Tab target="/dev" current={path}>{i18n.str`Dev`}</Tab>}
      </div>
    </PopupNavigation>
  );
}
