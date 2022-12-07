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

import { ComponentChildren, Fragment, h, VNode } from "preact";
import talerLogo from "../../assets/logo-white.svg";
import { LangSelectorLikePy as LangSelector } from "../../components/menu/LangSelector.js";
import { useBackendContext } from "../../context/backend.js";
import { PageStateType, usePageContext } from "../../context/pageState.js";
import { useTranslationContext } from "../../context/translation.js";
import { bankUiSettings } from "../../settings.js";

export function BankFrame({
  children,
}: {
  children: ComponentChildren;
}): VNode {
  const { i18n } = useTranslationContext();
  const backend = useBackendContext();
  const { pageState, pageStateSetter } = usePageContext();
  console.log("BankFrame state", pageState);
  const logOut = (
    <div class="logout">
      <a
        href="#"
        class="pure-button logout-button"
        onClick={() => {
          pageStateSetter((prevState: PageStateType) => {
            const { talerWithdrawUri, withdrawalId, ...rest } = prevState;
            backend.clear();
            return {
              ...rest,
              withdrawalInProgress: false,
              error: undefined,
              info: undefined,
              isRawPayto: false,
            };
          });
        }}
      >{i18n.str`Logout`}</a>
    </div>
  );

  const demo_sites = [];
  for (const i in bankUiSettings.demoSites)
    demo_sites.push(
      <a href={bankUiSettings.demoSites[i][1]}>
        {bankUiSettings.demoSites[i][0]}
      </a>,
    );

  return (
    <Fragment>
      <header
        class="demobar"
        style="display: flex; flex-direction: row; justify-content: space-between;"
      >
        <a href="#main" class="skip">{i18n.str`Skip to main content`}</a>
        <div style="max-width: 50em; margin-left: 2em;">
          <h1>
            <span class="it">
              <a href="/">{bankUiSettings.bankName}</a>
            </span>
          </h1>
          {maybeDemoContent(
            <p>
              <i18n.Translate>
                This part of the demo shows how a bank that supports Taler
                directly would work. In addition to using your own bank account,
                you can also see the transaction history of some{" "}
                <a href="/public-accounts">Public Accounts</a>.
              </i18n.Translate>
            </p>,
          )}
        </div>
        <a href="https://taler.net/">
          <img
            src={talerLogo}
            alt={i18n.str`Taler logo`}
            height="100"
            width="224"
            style="margin: 2em 2em"
          />
        </a>
      </header>
      <div style="display:flex; flex-direction: column;" class="navcontainer">
        <nav class="demolist">
          {maybeDemoContent(<Fragment>{demo_sites}</Fragment>)}
          <div class="right">
            <LangSelector />
          </div>
        </nav>
      </div>
      <section id="main" class="content">
        <ErrorBanner />
        <StatusBanner />
        {backend.state.status === "loggedIn" ? logOut : null}
        {children}
      </section>
      <section id="footer" class="footer">
        <div class="footer">
          <hr />
          <div>
            <p>
              You can learn more about GNU Taler on our{" "}
              <a href="https://taler.net">main website</a>.
            </p>
          </div>
          <div style="flex-grow:1" />
          <p>Copyright &copy; 2014&mdash;2022 Taler Systems SA</p>
        </div>
      </section>
    </Fragment>
  );
}

function maybeDemoContent(content: VNode): VNode {
  if (bankUiSettings.showDemoNav) {
    return content;
  }
  return <Fragment />;
}

function ErrorBanner(): VNode | null {
  const { pageState, pageStateSetter } = usePageContext();

  if (!pageState.error) return null;

  const rval = (
    <div class="informational informational-fail" style={{ marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <p>
          <b>{pageState.error.title}</b>
        </p>
        <div>
          <input
            type="button"
            class="pure-button"
            value="Clear"
            onClick={async () => {
              pageStateSetter((prev) => ({ ...prev, error: undefined }));
            }}
          />
        </div>
      </div>
      <p>{pageState.error.description}</p>
    </div>
  );
  delete pageState.error;
  return rval;
}

function StatusBanner(): VNode | null {
  const { pageState, pageStateSetter } = usePageContext();
  if (!pageState.info) return null;

  const rval = (
    <div class="informational informational-ok" style={{ marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <p>
          <b>{pageState.info}</b>
        </p>
        <div>
          <input
            type="button"
            class="pure-button"
            value="Clear"
            onClick={async () => {
              pageStateSetter((prev) => ({ ...prev, info: undefined }));
            }}
          />
        </div>
      </div>
    </div>
  );
  return rval;
}
