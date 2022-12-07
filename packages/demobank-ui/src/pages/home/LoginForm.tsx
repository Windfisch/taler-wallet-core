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

import { h, VNode } from "preact";
import { route } from "preact-router";
import { StateUpdater, useEffect, useRef, useState } from "preact/hooks";
import { PageStateType, usePageContext } from "../../context/pageState.js";
import { useTranslationContext } from "../../context/translation.js";
import { BackendStateType, useBackendState } from "../../hooks/backend.js";
import { bankUiSettings } from "../../settings.js";
import { getBankBackendBaseUrl, undefinedIfEmpty } from "../../utils.js";
import { ShowInputErrorLabel } from "./ShowInputErrorLabel.js";

/**
 * Collect and submit login data.
 */
export function LoginForm(): VNode {
  const [backendState, backendStateSetter] = useBackendState();
  const { pageState, pageStateSetter } = usePageContext();
  const [username, setUsername] = useState<string | undefined>();
  const [password, setPassword] = useState<string | undefined>();
  const { i18n } = useTranslationContext();
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);

  const errors = undefinedIfEmpty({
    username: !username ? i18n.str`Missing username` : undefined,
    password: !password ? i18n.str`Missing password` : undefined,
  });

  return (
    <div class="login-div">
      <form action="javascript:void(0);" class="login-form" noValidate>
        <div class="pure-form">
          <h2>{i18n.str`Please login!`}</h2>
          <p class="unameFieldLabel loginFieldLabel formFieldLabel">
            <label for="username">{i18n.str`Username:`}</label>
          </p>
          <input
            ref={ref}
            autoFocus
            type="text"
            name="username"
            id="username"
            value={username ?? ""}
            placeholder="Username"
            required
            onInput={(e): void => {
              setUsername(e.currentTarget.value);
            }}
          />
          <ShowInputErrorLabel
            message={errors?.username}
            isDirty={username !== undefined}
          />
          <p class="passFieldLabel loginFieldLabel formFieldLabel">
            <label for="password">{i18n.str`Password:`}</label>
          </p>
          <input
            type="password"
            name="password"
            id="password"
            value={password ?? ""}
            placeholder="Password"
            required
            onInput={(e): void => {
              setPassword(e.currentTarget.value);
            }}
          />
          <ShowInputErrorLabel
            message={errors?.password}
            isDirty={password !== undefined}
          />
          <br />
          <button
            type="submit"
            class="pure-button pure-button-primary"
            disabled={!!errors}
            onClick={() => {
              if (!username || !password) return;
              loginCall(
                { username, password },
                backendStateSetter,
                pageStateSetter,
              );
              setUsername(undefined);
              setPassword(undefined);
            }}
          >
            {i18n.str`Login`}
          </button>

          {bankUiSettings.allowRegistrations ? (
            <button
              class="pure-button pure-button-secondary btn-cancel"
              onClick={() => {
                route("/register");
              }}
            >
              {i18n.str`Register`}
            </button>
          ) : (
            <div />
          )}
        </div>
      </form>
    </div>
  );
}

async function loginCall(
  req: { username: string; password: string },
  /**
   * FIXME: figure out if the two following
   * functions can be retrieved from the state.
   */
  backendStateSetter: StateUpdater<BackendStateType | undefined>,
  pageStateSetter: StateUpdater<PageStateType>,
): Promise<void> {
  /**
   * Optimistically setting the state as 'logged in', and
   * let the Account component request the balance to check
   * whether the credentials are valid.  */
  pageStateSetter((prevState) => ({ ...prevState, isLoggedIn: true }));
  let baseUrl = getBankBackendBaseUrl();
  if (!baseUrl.endsWith("/")) baseUrl += "/";

  backendStateSetter((prevState) => ({
    ...prevState,
    url: baseUrl,
    username: req.username,
    password: req.password,
  }));
}
