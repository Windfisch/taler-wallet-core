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
import {
  canonicalJson,
  encodeCrock,
  stringToBytes,
} from "@gnu-taler/taler-util";
import { h, VNode } from "preact";
import { useState } from "preact/hooks";
import { TextInput } from "../../../components/fields/TextInput.js";
import { AnastasisClientFrame } from "../index.js";
import { AuthMethodSetupProps } from "./index.js";

export function AuthMethodPostSetup({
  addAuthMethod,
  cancel,
  configured,
}: AuthMethodSetupProps): VNode {
  const [fullName, setFullName] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");
  const [country, setCountry] = useState("");

  const addPostAuth = () => {
    const challengeJson = {
      full_name: fullName,
      street,
      city,
      postcode,
      country,
    };
    addAuthMethod({
      authentication_method: {
        type: "post",
        instructions: `Letter to address in postal code ${postcode}`,
        challenge: encodeCrock(stringToBytes(canonicalJson(challengeJson))),
      },
    });
  };

  const errors = !fullName
    ? "The full name is missing"
    : !street
    ? "The street is missing"
    : !city
    ? "The city is missing"
    : !postcode
    ? "The postcode is missing"
    : !country
    ? "The country is missing"
    : undefined;

  function goNextIfNoErrors(): void {
    if (!errors) addPostAuth();
  }
  return (
    <AnastasisClientFrame hideNav title="Add postal authentication">
      <p>
        For postal letter authentication, you need to provide a postal address.
        When recovering your secret, you will be asked to enter a code that you
        will receive in a letter to that address.
      </p>
      <div>
        <TextInput
          grabFocus
          label="Full Name"
          bind={[fullName, setFullName]}
          onConfirm={goNextIfNoErrors}
        />
      </div>
      <div>
        <TextInput
          onConfirm={goNextIfNoErrors}
          label="Street"
          bind={[street, setStreet]}
        />
      </div>
      <div>
        <TextInput
          onConfirm={goNextIfNoErrors}
          label="City"
          bind={[city, setCity]}
        />
      </div>
      <div>
        <TextInput
          onConfirm={goNextIfNoErrors}
          label="Postal Code"
          bind={[postcode, setPostcode]}
        />
      </div>
      <div>
        <TextInput
          onConfirm={goNextIfNoErrors}
          label="Country"
          bind={[country, setCountry]}
        />
      </div>

      {configured.length > 0 && (
        <section class="section">
          <div class="block">Your postal code:</div>
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
            onClick={addPostAuth}
          >
            Add
          </button>
        </span>
      </div>
    </AnastasisClientFrame>
  );
}
