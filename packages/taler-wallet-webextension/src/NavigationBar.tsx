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
import { VNode, h } from "preact";
import { JustInDevMode } from "./components/JustInDevMode";
import { NavigationHeader, NavigationHeaderHolder } from "./components/styled";

export enum Pages {
  welcome = "/welcome",

  balance = "/balance",
  balance_history = "/balance/history/:currency?",
  balance_manual_withdraw = "/balance/manual-withdraw/:currency?",
  balance_deposit = "/balance/deposit/:currency",
  balance_transaction = "/balance/transaction/:tid",

  dev = "/dev",

  backup = "/backup",
  backup_provider_detail = "/backup/provider/:pid",
  backup_provider_add = "/backup/provider/add",

  settings = "/settings",
  settings_exchange_add = "/settings/exchange/add",

  cta = "/cta/:action",
  cta_pay = "/cta/pay",
  cta_refund = "/cta/refund",
  cta_tips = "/cta/tip",
  cta_withdraw = "/cta/withdraw",
}

export function PopupNavBar({ path = "" }: { path?: string }): VNode {
  const innerUrl = chrome.runtime
    ? new URL(chrome.runtime.getURL("/static/wallet.html#/settings")).href
    : "#";
  return (
    <NavigationHeader>
      <a
        href="/balance"
        class={path.startsWith("/balance") ? "active" : ""}
      >{i18n.str`Balance`}</a>
      <a
        href="/backup"
        class={path.startsWith("/backup") ? "active" : ""}
      >{i18n.str`Backup`}</a>
      <a />
      <a href={innerUrl} target="_blank" rel="noreferrer">
        <div class="settings-icon" title="Settings" />
      </a>
    </NavigationHeader>
  );
}

export function WalletNavBar({ path = "" }: { path?: string }): VNode {
  return (
    <NavigationHeaderHolder>
      <NavigationHeader>
        <a
          href="/balance"
          class={path.startsWith("/balance") ? "active" : ""}
        >{i18n.str`Balance`}</a>
        <a
          href="/backup"
          class={path.startsWith("/backup") ? "active" : ""}
        >{i18n.str`Backup`}</a>

        <JustInDevMode>
          <a
            href="/dev"
            class={path.startsWith("/dev") ? "active" : ""}
          >{i18n.str`Dev`}</a>
        </JustInDevMode>

        <a />
        <a
          href="/settings"
          class={path.startsWith("/settings") ? "active" : ""}
        >
          <div class="settings-icon" title="Settings" />
        </a>
      </NavigationHeader>
    </NavigationHeaderHolder>
  );
}
