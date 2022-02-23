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

import {
  classifyTalerUri,
  TalerUriType,
  Translate,
} from "@gnu-taler/taler-util";
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
          <Translate>Taler Action</Translate>
        </h1>
        {uriType === TalerUriType.TalerPay && (
          <div>
            <p>
              <Translate>This page has pay action.</Translate>
            </p>
            <ButtonSuccess
              onClick={() => {
                navigateTo(actionForTalerUri(uriType, url));
              }}
            >
              <Translate>Open pay page</Translate>
            </ButtonSuccess>
          </div>
        )}
        {uriType === TalerUriType.TalerWithdraw && (
          <div>
            <p>
              <Translate>This page has a withdrawal action.</Translate>
            </p>
            <ButtonSuccess
              onClick={() => {
                navigateTo(actionForTalerUri(uriType, url));
              }}
            >
              <Translate>Open withdraw page</Translate>
            </ButtonSuccess>
          </div>
        )}
        {uriType === TalerUriType.TalerTip && (
          <div>
            <p>
              <Translate>This page has a tip action.</Translate>
            </p>
            <ButtonSuccess
              onClick={() => {
                navigateTo(actionForTalerUri(uriType, url));
              }}
            >
              <Translate>Open tip page</Translate>
            </ButtonSuccess>
          </div>
        )}
        {uriType === TalerUriType.TalerNotifyReserve && (
          <div>
            <p>
              <Translate>This page has a notify reserve action.</Translate>
            </p>
            <ButtonSuccess
              onClick={() => {
                navigateTo(actionForTalerUri(uriType, url));
              }}
            >
              Notify
            </ButtonSuccess>
          </div>
        )}
        {uriType === TalerUriType.TalerRefund && (
          <div>
            <p>
              <Translate>This page has a refund action.</Translate>
            </p>
            <ButtonSuccess
              onClick={() => {
                navigateTo(actionForTalerUri(uriType, url));
              }}
            >
              <Translate>Open refund page</Translate>
            </ButtonSuccess>
          </div>
        )}
        {uriType === TalerUriType.Unknown && (
          <div>
            <p>
              <Translate>This page has a malformed taler uri.</Translate>
            </p>
            <p>{url}</p>
          </div>
        )}
      </section>
      <footer>
        <div />
        <ButtonPrimary onClick={() => onDismiss()}>
          {" "}
          <Translate>Dismiss</Translate>{" "}
        </ButtonPrimary>
      </footer>
    </Fragment>
  );
}
