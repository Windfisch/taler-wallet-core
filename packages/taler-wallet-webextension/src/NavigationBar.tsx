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
 * Popup shown to the user when they click
 * the Taler browser action button.
 *
 * @author sebasjm
 */

/**
 * Imports.
 */
import { h, VNode } from "preact";
import { JustInDevMode } from "./components/JustInDevMode.js";
import {
  NavigationHeader,
  NavigationHeaderHolder,
  SvgIcon,
} from "./components/styled/index.js";
import { useTranslationContext } from "./context/translation.js";
import settingsIcon from "./svg/settings_black_24dp.svg";
import qrIcon from "./svg/qr_code_24px.svg";

/**
 * List of pages used by the wallet
 *
 * @author sebasjm
 */

type PageLocation<DynamicPart extends object> = {
  pattern: string;
  (params: DynamicPart): string;
};

function replaceAll(
  pattern: string,
  vars: Record<string, string>,
  values: Record<string, any>,
): string {
  let result = pattern;
  for (const v in vars) {
    result = result.replace(vars[v], !values[v] ? "" : values[v]);
  }
  return result;
}

function pageDefinition<T extends object>(pattern: string): PageLocation<T> {
  const patternParams = pattern.match(/(:[\w?]*)/g);
  if (!patternParams)
    throw Error(
      `page definition pattern ${pattern} doesn't have any parameter`,
    );

  const vars = patternParams.reduce((prev, cur) => {
    const pName = cur.match(/(\w+)/g);

    //skip things like :? in the path pattern
    if (!pName || !pName[0]) return prev;
    const name = pName[0];
    return { ...prev, [name]: cur };
  }, {} as Record<string, string>);

  const f = (values: T): string => replaceAll(pattern, vars, values);
  f.pattern = pattern;
  return f;
}

export const Pages = {
  welcome: "/welcome",
  balance: "/balance",
  balanceHistory: pageDefinition<{ currency?: string }>(
    "/balance/history/:currency?",
  ),
  balanceManualWithdraw: pageDefinition<{ amount?: string }>(
    "/balance/manual-withdraw/:amount?",
  ),
  balanceDeposit: pageDefinition<{ currency: string }>(
    "/balance/deposit/:currency",
  ),
  balanceTransaction: pageDefinition<{ tid: string }>(
    "/balance/transaction/:tid",
  ),
  sendCash: pageDefinition<{ amount?: string }>("/destination/send/:amount"),
  receiveCash: pageDefinition<{ amount?: string }>("/destination/get/:amount?"),
  dev: "/dev",

  exchanges: "/exchanges",
  backup: "/backup",
  backupProviderDetail: pageDefinition<{ pid: string }>(
    "/backup/provider/:pid",
  ),
  backupProviderAdd: "/backup/provider/add",

  qr: "/qr",
  settings: "/settings",
  settingsExchangeAdd: pageDefinition<{ currency?: string }>(
    "/settings/exchange/add/:currency?",
  ),

  cta: pageDefinition<{ action: string }>("/cta/:action"),
  ctaPay: "/cta/pay",
  ctaRefund: "/cta/refund",
  ctaTips: "/cta/tip",
  ctaWithdraw: "/cta/withdraw",
  ctaDeposit: "/cta/deposit",
};

export function PopupNavBar({ path = "" }: { path?: string }): VNode {
  const { i18n } = useTranslationContext();
  return (
    <NavigationHeader>
      <a
        href={Pages.balance}
        class={path.startsWith("/balance") ? "active" : ""}
      >
        <i18n.Translate>Balance</i18n.Translate>
      </a>
      <a href={Pages.backup} class={path.startsWith("/backup") ? "active" : ""}>
        <i18n.Translate>Backup</i18n.Translate>
      </a>
      <div style={{ display: "flex", paddingTop: 4, justifyContent: "right" }}>
        <a href={Pages.qr}>
          <SvgIcon
            title={i18n.str`QR Reader`}
            dangerouslySetInnerHTML={{ __html: qrIcon }}
            color="white"
          />
        </a>
        <a href={Pages.settings}>
          <SvgIcon
            title={i18n.str`Settings`}
            dangerouslySetInnerHTML={{ __html: settingsIcon }}
            color="white"
          />
        </a>
      </div>
    </NavigationHeader>
  );
}

export function WalletNavBar({ path = "" }: { path?: string }): VNode {
  const { i18n } = useTranslationContext();
  return (
    <NavigationHeaderHolder>
      <NavigationHeader>
        <a
          href={Pages.balance}
          class={path.startsWith("/balance") ? "active" : ""}
        >
          <i18n.Translate>Balance</i18n.Translate>
        </a>
        <a
          href={Pages.backup}
          class={path.startsWith("/backup") ? "active" : ""}
        >
          <i18n.Translate>Backup</i18n.Translate>
        </a>

        <JustInDevMode>
          <a href={Pages.dev} class={path.startsWith("/dev") ? "active" : ""}>
            <i18n.Translate>Dev</i18n.Translate>
          </a>
        </JustInDevMode>

        <div
          style={{ display: "flex", paddingTop: 4, justifyContent: "right" }}
        >
          <a href={Pages.qr}>
            <SvgIcon
              title={i18n.str`QR Reader`}
              dangerouslySetInnerHTML={{ __html: qrIcon }}
              color="white"
            />
          </a>
          <a href={Pages.settings}>
            <SvgIcon
              title={i18n.str`Settings`}
              dangerouslySetInnerHTML={{ __html: settingsIcon }}
              color="white"
            />
          </a>
        </div>
      </NavigationHeader>
    </NavigationHeaderHolder>
  );
}
