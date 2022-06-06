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
import { encodeCrock } from "@gnu-taler/taler-util";
import { h, VNode } from "preact";
import { useMemo, useState } from "preact/hooks";
import { TextInput } from "../../../components/fields/TextInput.js";
import { QR } from "../../../components/QR.js";
import { AnastasisClientFrame } from "../index.js";
import { AuthMethodSetupProps } from "./index.js";
import { base32enc, computeTOTPandCheck } from "./totp.js";

/**
 * This is hard-coded in the protocol for TOTP auth.
 */
const ANASTASIS_TOTP_DIGITS = 8;

export function AuthMethodTotpSetup({
  addAuthMethod,
  cancel,
  configured,
}: AuthMethodSetupProps): VNode {
  const [name, setName] = useState("anastasis");
  const [test, setTest] = useState("");
  const secretKey = useMemo(() => {
    const array = new Uint8Array(32);
    return window.crypto.getRandomValues(array);
  }, []);

  const secret32 = base32enc(secretKey);
  const totpURL = `otpauth://totp/${name}?digits=${ANASTASIS_TOTP_DIGITS}&secret=${secret32}`;

  const addTotpAuth = (): void =>
    addAuthMethod({
      authentication_method: {
        type: "totp",
        instructions: `Enter ${ANASTASIS_TOTP_DIGITS} digits code for "${name}"`,
        challenge: encodeCrock(secretKey),
      },
    });

  const testCodeMatches = computeTOTPandCheck(secretKey, 8, parseInt(test, 10));

  const errors = !name
    ? "The TOTP name is missing"
    : !testCodeMatches
    ? "The test code doesnt match"
    : undefined;
  function goNextIfNoErrors(): void {
    if (!errors) addTotpAuth();
  }
  return (
    <AnastasisClientFrame hideNav title="Add TOTP authentication">
      <p>
        For Time-based One-Time Password (TOTP) authentication, you need to set
        a name for the TOTP secret. Then, you must scan the generated QR code
        with your TOTP App to import the TOTP secret into your TOTP App.
      </p>
      <div class="block">
        <TextInput label="TOTP Name" grabFocus bind={[name, setName]} />
      </div>
      <div style={{ height: 300 }}>
        <QR text={totpURL} />
      </div>
      <p>
        Confirm that your TOTP App works by entering the current 8-digit TOTP
        code here:
      </p>
      <TextInput
        label="Test code"
        onConfirm={goNextIfNoErrors}
        bind={[test, setTest]}
      />
      <div>
        We note that Google&apos;s implementation of TOTP is incomplete and will
        not work. We recommend using FreeOTP+.
      </div>

      {configured.length > 0 && (
        <section class="section">
          <div class="block">Your TOTP numbers:</div>
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
              onClick={addTotpAuth}
            >
              Add
            </button>
          </span>
        </div>
      </div>
    </AnastasisClientFrame>
  );
}
