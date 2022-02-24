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

/**
 *
 * @author Sebastian Javier Marchano (sebasjm)
 */

import { classifyTalerUri, TalerUriType, i18n } from "@gnu-taler/taler-util";
import { Fragment, h } from "preact";
import { ButtonPrimary, ButtonSuccess } from "../components/styled";
import { actionForTalerUri } from "../utils/index";

export interface Props {
  url: string;
  onDismiss: () => void;
}

async function getCurrentTab(): Promise<chrome.tabs.Tab> {
  let queryOptions = { active: true, currentWindow: true };
  const tab = await new Promise<chrome.tabs.Tab>((res, rej) => {
    chrome.tabs.query(queryOptions, (tabs) => {
      res(tabs[0]);
    });
  });
  return tab;
}

async function navigateTo(url?: string) {
  if (!url) return;
  const tab = await getCurrentTab();
  if (!tab.id) return;
  await chrome.tabs.update(tab.id, { url });
  window.close();
}

export function TalerActionFound({ url, onDismiss }: Props) {
  const uriType = classifyTalerUri(url);
  return (
    <Fragment>
      <section>
        <h1>
          <i18n.Translate>Taler Action</i18n.Translate>
        </h1>
        {uriType === TalerUriType.TalerPay && (
          <div>
            <p>
              <i18n.Translate>This page has pay action.</i18n.Translate>
            </p>
            <ButtonSuccess
              onClick={() => {
                navigateTo(actionForTalerUri(uriType, url));
              }}
            >
              <i18n.Translate>Open pay page</i18n.Translate>
            </ButtonSuccess>
          </div>
        )}
        {uriType === TalerUriType.TalerWithdraw && (
          <div>
            <p>
              <i18n.Translate>
                This page has a withdrawal action.
              </i18n.Translate>
            </p>
            <ButtonSuccess
              onClick={() => {
                navigateTo(actionForTalerUri(uriType, url));
              }}
            >
              <i18n.Translate>Open withdraw page</i18n.Translate>
            </ButtonSuccess>
          </div>
        )}
        {uriType === TalerUriType.TalerTip && (
          <div>
            <p>
              <i18n.Translate>This page has a tip action.</i18n.Translate>
            </p>
            <ButtonSuccess
              onClick={() => {
                navigateTo(actionForTalerUri(uriType, url));
              }}
            >
              <i18n.Translate>Open tip page</i18n.Translate>
            </ButtonSuccess>
          </div>
        )}
        {uriType === TalerUriType.TalerNotifyReserve && (
          <div>
            <p>
              <i18n.Translate>
                This page has a notify reserve action.
              </i18n.Translate>
            </p>
            <ButtonSuccess
              onClick={() => {
                navigateTo(actionForTalerUri(uriType, url));
              }}
            >
              <i18n.Translate>Notify</i18n.Translate>
            </ButtonSuccess>
          </div>
        )}
        {uriType === TalerUriType.TalerRefund && (
          <div>
            <p>
              <i18n.Translate>This page has a refund action.</i18n.Translate>
            </p>
            <ButtonSuccess
              onClick={() => {
                navigateTo(actionForTalerUri(uriType, url));
              }}
            >
              <i18n.Translate>Open refund page</i18n.Translate>
            </ButtonSuccess>
          </div>
        )}
        {uriType === TalerUriType.Unknown && (
          <div>
            <p>
              <i18n.Translate>
                This page has a malformed taler uri.
              </i18n.Translate>
            </p>
            <p>{url}</p>
          </div>
        )}
      </section>
      <footer>
        <div />
        <ButtonPrimary onClick={() => onDismiss()}>
          {" "}
          <i18n.Translate>Dismiss</i18n.Translate>{" "}
        </ButtonPrimary>
      </footer>
    </Fragment>
  );
}
