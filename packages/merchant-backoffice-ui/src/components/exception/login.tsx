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

import { h, VNode } from "preact";
import { useState } from "preact/hooks";
import { useBackendContext } from "../../context/backend";
import { useInstanceContext } from "../../context/instance";
import { Translate, useTranslator } from "../../i18n";
import { Notification } from "../../utils/types";

interface Props {
  withMessage?: Notification;
  onConfirm: (backend: string, token?: string) => void;
}

function getTokenValuePart(t?: string): string | undefined {
  if (!t) return t;
  const match = /secret-token:(.*)/.exec(t);
  if (!match || !match[1]) return undefined;
  return match[1];
}

function normalizeToken(r: string | undefined): string | undefined {
  return r ? `secret-token:${encodeURIComponent(r)}` : undefined;
}

export function LoginModal({ onConfirm, withMessage }: Props): VNode {
  const { url: backendUrl, token: baseToken } = useBackendContext();
  const { admin, token: instanceToken } = useInstanceContext();
  const currentToken = getTokenValuePart(
    !admin ? baseToken : instanceToken || ""
  );
  const [token, setToken] = useState(currentToken);

  const [url, setURL] = useState(backendUrl);
  const i18n = useTranslator();

  return (
    <div class="columns is-centered">
      <div class="column is-two-thirds ">
        <div class="modal-card" style={{ width: "100%", margin: 0 }}>
          <header
            class="modal-card-head"
            style={{ border: "1px solid", borderBottom: 0 }}
          >
            <p class="modal-card-title">{i18n`Login required`}</p>
          </header>
          <section
            class="modal-card-body"
            style={{ border: "1px solid", borderTop: 0, borderBottom: 0 }}
          >
            <Translate>Please enter your access token.</Translate>
            <div class="field is-horizontal">
              <div class="field-label is-normal">
                <label class="label">URL</label>
              </div>
              <div class="field-body">
                <div class="field">
                  <p class="control is-expanded">
                    <input
                      class="input"
                      type="text"
                      placeholder="set new url"
                      name="id"
                      value={url}
                      onKeyPress={(e) =>
                        e.keyCode === 13
                          ? onConfirm(url, normalizeToken(token))
                          : null
                      }
                      onInput={(e): void => setURL(e?.currentTarget.value)}
                    />
                  </p>
                </div>
              </div>
            </div>
            <div class="field is-horizontal">
              <div class="field-label is-normal">
                <label class="label">
                  <Translate>Access Token</Translate>
                </label>
              </div>
              <div class="field-body">
                <div class="field">
                  <p class="control is-expanded">
                    <input
                      class="input"
                      type="password"
                      placeholder={"set new access token"}
                      name="token"
                      onKeyPress={(e) =>
                        e.keyCode === 13
                          ? onConfirm(url, normalizeToken(token))
                          : null
                      }
                      value={token}
                      onInput={(e): void => setToken(e?.currentTarget.value)}
                    />
                  </p>
                </div>
              </div>
            </div>
          </section>
          <footer
            class="modal-card-foot "
            style={{
              justifyContent: "flex-end",
              border: "1px solid",
              borderTop: 0,
            }}
          >
            <button
              class="button is-info"
              onClick={(): void => {
                onConfirm(url, normalizeToken(token));
              }}
            >
              <Translate>Confirm</Translate>
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}
