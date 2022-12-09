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
import { Logger } from "@gnu-taler/taler-util";
import { Fragment, h, VNode } from "preact";
import { route } from "preact-router";
import { StateUpdater, useState } from "preact/hooks";
import { useBackendContext } from "../context/backend.js";
import { PageStateType, usePageContext } from "../context/pageState.js";
import {
  InternationalizationAPI,
  useTranslationContext,
} from "@gnu-taler/web-util/lib/index.browser";
import { BackendStateHandler } from "../hooks/backend.js";
import { bankUiSettings } from "../settings.js";
import { getBankBackendBaseUrl, undefinedIfEmpty } from "../utils.js";
import { BankFrame } from "./BankFrame.js";
import { ShowInputErrorLabel } from "./ShowInputErrorLabel.js";

const logger = new Logger("RegistrationPage");

export function RegistrationPage(): VNode {
  const { i18n } = useTranslationContext();
  if (!bankUiSettings.allowRegistrations) {
    return (
      <BankFrame>
        <p>{i18n.str`Currently, the bank is not accepting new registrations!`}</p>
      </BankFrame>
    );
  }
  return (
    <BankFrame>
      <RegistrationForm />
    </BankFrame>
  );
}

const usernameRegex = /^[a-z][a-zA-Z0-9]+$/;

/**
 * Collect and submit registration data.
 */
function RegistrationForm(): VNode {
  const backend = useBackendContext();
  const { pageState, pageStateSetter } = usePageContext();
  const [username, setUsername] = useState<string | undefined>();
  const [password, setPassword] = useState<string | undefined>();
  const [repeatPassword, setRepeatPassword] = useState<string | undefined>();

  const { i18n } = useTranslationContext();

  const errors = undefinedIfEmpty({
    username: !username
      ? i18n.str`Missing username`
      : !usernameRegex.test(username)
      ? i18n.str`Use only letter and numbers starting with a lower case letter`
      : undefined,
    password: !password
      ? i18n.str`Missing password`
      : !usernameRegex.test(password)
      ? i18n.str`Use only letter and numbers starting with a lower case letter`
      : undefined,
    repeatPassword: !repeatPassword
      ? i18n.str`Missing password`
      : repeatPassword !== password
      ? i18n.str`Password don't match`
      : undefined,
  });

  return (
    <Fragment>
      <h1 class="nav">{i18n.str`Welcome to ${bankUiSettings.bankName}!`}</h1>
      <article>
        <div class="register-div">
          <form action="javascript:void(0);" class="register-form" noValidate>
            <div class="pure-form">
              <h2>{i18n.str`Please register!`}</h2>
              <p class="unameFieldLabel registerFieldLabel formFieldLabel">
                <label for="register-un">{i18n.str`Username:`}</label>
              </p>
              <input
                id="register-un"
                name="register-un"
                type="text"
                placeholder="Username"
                value={username ?? ""}
                onInput={(e): void => {
                  setUsername(e.currentTarget.value);
                }}
              />
              <ShowInputErrorLabel
                message={errors?.username}
                isDirty={username !== undefined}
              />
              <p class="unameFieldLabel registerFieldLabel formFieldLabel">
                <label for="register-pw">{i18n.str`Password:`}</label>
              </p>
              <input
                type="password"
                name="register-pw"
                id="register-pw"
                placeholder="Password"
                value={password ?? ""}
                required
                onInput={(e): void => {
                  setPassword(e.currentTarget.value);
                }}
              />
              <ShowInputErrorLabel
                message={errors?.password}
                isDirty={password !== undefined}
              />
              <p class="unameFieldLabel registerFieldLabel formFieldLabel">
                <label for="register-repeat">{i18n.str`Repeat Password:`}</label>
              </p>
              <input
                type="password"
                style={{ marginBottom: 8 }}
                name="register-repeat"
                id="register-repeat"
                placeholder="Same password"
                value={repeatPassword ?? ""}
                required
                onInput={(e): void => {
                  setRepeatPassword(e.currentTarget.value);
                }}
              />
              <ShowInputErrorLabel
                message={errors?.repeatPassword}
                isDirty={repeatPassword !== undefined}
              />
              <br />
              <button
                class="pure-button pure-button-primary btn-register"
                disabled={!!errors}
                onClick={() => {
                  if (!username || !password) return;
                  registrationCall(
                    { username, password },
                    backend, // will store BE URL, if OK.
                    pageStateSetter,
                    i18n,
                  );

                  setUsername(undefined);
                  setPassword(undefined);
                  setRepeatPassword(undefined);
                }}
              >
                {i18n.str`Register`}
              </button>
              {/* FIXME: should use a different color */}
              <button
                class="pure-button pure-button-secondary btn-cancel"
                onClick={() => {
                  setUsername(undefined);
                  setPassword(undefined);
                  setRepeatPassword(undefined);
                  route("/account");
                }}
              >
                {i18n.str`Cancel`}
              </button>
            </div>
          </form>
        </div>
      </article>
    </Fragment>
  );
}

/**
 * This function requests /register.
 *
 * This function is responsible to change two states:
 * the backend's (to store the login credentials) and
 * the page's (to indicate a successful login or a problem).
 */
async function registrationCall(
  req: { username: string; password: string },
  /**
   * FIXME: figure out if the two following
   * functions can be retrieved somewhat from
   * the state.
   */
  backend: BackendStateHandler,
  pageStateSetter: StateUpdater<PageStateType>,
  i18n: InternationalizationAPI,
): Promise<void> {
  const url = getBankBackendBaseUrl();

  const headers = new Headers();
  headers.append("Content-Type", "application/json");
  const registerEndpoint = new URL("access-api/testing/register", url);
  let res: Response;
  try {
    res = await fetch(registerEndpoint.href, {
      method: "POST",
      body: JSON.stringify({
        username: req.username,
        password: req.password,
      }),
      headers,
    });
  } catch (error) {
    logger.error(
      `Could not POST new registration to the bank (${registerEndpoint.href})`,
      error,
    );
    pageStateSetter((prevState) => ({
      ...prevState,

      error: {
        title: i18n.str`Registration failed, please report`,
        debug: JSON.stringify(error),
      },
    }));
    return;
  }
  if (!res.ok) {
    const response = await res.json();
    if (res.status === 409) {
      pageStateSetter((prevState) => ({
        ...prevState,

        error: {
          title: i18n.str`That username is already taken`,
          debug: JSON.stringify(response),
        },
      }));
    } else {
      pageStateSetter((prevState) => ({
        ...prevState,

        error: {
          title: i18n.str`New registration gave response error`,
          debug: JSON.stringify(response),
        },
      }));
    }
  } else {
    // registration was ok
    backend.save({
      url,
      username: req.username,
      password: req.password,
    });
    route("/account");
  }
}
