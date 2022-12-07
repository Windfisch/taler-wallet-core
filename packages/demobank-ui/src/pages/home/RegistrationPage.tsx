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
import { Fragment, h, VNode } from "preact";
import { route } from "preact-router";
import { StateUpdater, useState } from "preact/hooks";
import { PageStateType, usePageContext } from "../../context/pageState.js";
import { useTranslationContext } from "../../context/translation.js";
import { BackendStateType, useBackendState } from "../../hooks/backend.js";
import { bankUiSettings } from "../../settings.js";
import { getBankBackendBaseUrl, undefinedIfEmpty } from "../../utils.js";
import { BankFrame } from "./BankFrame.js";
import { ShowInputErrorLabel } from "./ShowInputErrorLabel.js";

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

/**
 * Collect and submit registration data.
 */
function RegistrationForm(): VNode {
  const [backendState, backendStateSetter] = useBackendState();
  const { pageState, pageStateSetter } = usePageContext();
  const [username, setUsername] = useState<string | undefined>();
  const [password, setPassword] = useState<string | undefined>();
  const [repeatPassword, setRepeatPassword] = useState<string | undefined>();

  const { i18n } = useTranslationContext();

  const errors = undefinedIfEmpty({
    username: !username ? i18n.str`Missing username` : undefined,
    password: !password ? i18n.str`Missing password` : undefined,
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
                    backendStateSetter, // will store BE URL, if OK.
                    pageStateSetter,
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
  backendStateSetter: StateUpdater<BackendStateType | undefined>,
  pageStateSetter: StateUpdater<PageStateType>,
): Promise<void> {
  let baseUrl = getBankBackendBaseUrl();
  /**
   * If the base URL doesn't end with slash and the path
   * is not empty, then the concatenation made by URL()
   * drops the last path element.
   */
  if (!baseUrl.endsWith("/")) baseUrl += "/";

  const headers = new Headers();
  headers.append("Content-Type", "application/json");
  const url = new URL("access-api/testing/register", baseUrl);
  let res: Response;
  try {
    res = await fetch(url.href, {
      method: "POST",
      body: JSON.stringify({
        username: req.username,
        password: req.password,
      }),
      headers,
    });
  } catch (error) {
    console.log(
      `Could not POST new registration to the bank (${url.href})`,
      error,
    );
    pageStateSetter((prevState) => ({
      ...prevState,

      error: {
        title: `Registration failed, please report`,
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
          title: `That username is already taken`,
          debug: JSON.stringify(response),
        },
      }));
    } else {
      pageStateSetter((prevState) => ({
        ...prevState,

        error: {
          title: `New registration gave response error`,
          debug: JSON.stringify(response),
        },
      }));
    }
  } else {
    // registration was ok
    pageStateSetter((prevState) => ({
      ...prevState,
      isLoggedIn: true,
    }));
    backendStateSetter((prevState) => ({
      ...prevState,
      url: baseUrl,
      username: req.username,
      password: req.password,
    }));
    route("/account");
  }
}
