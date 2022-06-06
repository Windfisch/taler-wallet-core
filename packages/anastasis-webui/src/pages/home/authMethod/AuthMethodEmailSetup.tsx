/*
 This file is part of GNU Anastasis
 (C) 2021-2022 Anastasis SARL

 GNU Anastasis is free software; you can redistribute it and/or modify it under the
 terms of the GNU Affero General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Anastasis is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License along with
 GNU Anastasis; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */
import { encodeCrock, stringToBytes } from "@gnu-taler/taler-util";
import { h, VNode } from "preact";
import { useState } from "preact/hooks";
import { EmailInput } from "../../../components/fields/EmailInput.js";
import { AnastasisClientFrame } from "../index.js";
import { AuthMethodSetupProps } from "./index.js";

const EMAIL_PATTERN =
  /^(([^<>()[]\\.,;:\s@"]+(\.[^<>()[]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

export function AuthMethodEmailSetup({
  cancel,
  addAuthMethod,
  configured,
}: AuthMethodSetupProps): VNode {
  const [email, setEmail] = useState("");
  const addEmailAuth = (): void =>
    addAuthMethod({
      authentication_method: {
        type: "email",
        instructions: `Email to ${email}`,
        challenge: encodeCrock(stringToBytes(email)),
      },
    });
  const emailError = !EMAIL_PATTERN.test(email)
    ? "Email address is not valid"
    : undefined;
  const errors = !email ? "Add your email" : emailError;

  function goNextIfNoErrors(): void {
    if (!errors) addEmailAuth();
  }
  return (
    <AnastasisClientFrame hideNav title="Add email authentication">
      <p>
        For email authentication, you need to provide an email address. When
        recovering your secret, you will need to enter the code you receive by
        email. Add the uuid from the challenge
      </p>
      <div>
        <EmailInput
          label="Email address"
          error={emailError}
          onConfirm={goNextIfNoErrors}
          placeholder="email@domain.com"
          bind={[email, setEmail]}
        />
      </div>
      {configured.length > 0 && (
        <section class="section">
          <div class="block">Your emails:</div>
          <div class="block">
            {configured.map((c, i) => {
              return (
                <div
                  key={i}
                  class="box"
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <p style={{ marginBottom: "auto", marginTop: "auto" }}>
                    {c.instructions}
                  </p>
                  <div>
                    <button class="button is-danger" onClick={c.remove}>
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
      <div>
        <div
          style={{
            marginTop: "2em",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <button class="button" onClick={cancel}>
            Cancel
          </button>
          <span data-tooltip={errors}>
            <button
              class="button is-info"
              disabled={errors !== undefined}
              onClick={addEmailAuth}
            >
              Add
            </button>
          </span>
        </div>
      </div>
    </AnastasisClientFrame>
  );
}
