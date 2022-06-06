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
import { useLayoutEffect, useRef, useState } from "preact/hooks";
import { PhoneNumberInput } from "../../../components/fields/NumberInput.js";
import { AnastasisClientFrame } from "../index.js";
import { AuthMethodSetupProps } from "./index.js";

const REGEX_JUST_NUMBERS = /^\+[0-9 ]*$/;

function isJustNumbers(str: string): boolean {
  return REGEX_JUST_NUMBERS.test(str);
}

export function AuthMethodSmsSetup({
  addAuthMethod,
  cancel,
  configured,
}: AuthMethodSetupProps): VNode {
  const [mobileNumber, setMobileNumber] = useState("+");
  const addSmsAuth = (): void => {
    addAuthMethod({
      authentication_method: {
        type: "sms",
        instructions: `SMS to ${mobileNumber}`,
        challenge: encodeCrock(stringToBytes(mobileNumber)),
      },
    });
  };
  const inputRef = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    inputRef.current?.focus();
  }, []);
  const errors = !mobileNumber
    ? "Add a mobile number"
    : !mobileNumber.startsWith("+")
    ? "Mobile number should start with '+'"
    : !isJustNumbers(mobileNumber)
    ? "Mobile number can't have other than numbers"
    : undefined;
  function goNextIfNoErrors(): void {
    if (!errors) addSmsAuth();
  }
  return (
    <AnastasisClientFrame hideNav title="Add SMS authentication">
      <div>
        <p>
          For SMS authentication, you need to provide a mobile number. When
          recovering your secret, you will be asked to enter the code you
          receive via SMS.
        </p>
        <div class="container">
          <PhoneNumberInput
            label="Mobile number"
            placeholder="Your mobile number"
            onConfirm={goNextIfNoErrors}
            error={errors}
            grabFocus
            bind={[mobileNumber, setMobileNumber]}
          />
          <div>
            Enter mobile number including +CC international dialing prefix.
          </div>
        </div>
        {configured.length > 0 && (
          <section class="section">
            <div class="block">Your mobile numbers:</div>
            <div class="block">
              {configured.map((c, i) => {
                return (
                  <div
                    key={i}
                    class="box"
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <p style={{ marginTop: "auto", marginBottom: "auto" }}>
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
              onClick={addSmsAuth}
            >
              Add
            </button>
          </span>
        </div>
      </div>
    </AnastasisClientFrame>
  );
}
