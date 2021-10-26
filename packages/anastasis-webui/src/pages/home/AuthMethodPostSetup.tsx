/* eslint-disable @typescript-eslint/camelcase */
import {
  canonicalJson, encodeCrock,
  stringToBytes
} from "@gnu-taler/taler-util";
import { h, VNode } from "preact";
import { useState } from "preact/hooks";
import { AuthMethodSetupProps } from "./AuthenticationEditorScreen";
import { LabeledInput } from "../../components/fields/LabeledInput";

export function AuthMethodPostSetup(props: AuthMethodSetupProps): VNode {
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
    props.addAuthMethod({
      authentication_method: {
        type: "email",
        instructions: `Letter to address in postal code ${postcode}`,
        challenge: encodeCrock(stringToBytes(canonicalJson(challengeJson))),
      },
    });
  };

  return (
    <div class="home"> 
      <h1>Add {props.method} authentication</h1>
      <div>
        <p>
          For postal letter authentication, you need to provide a postal
          address. When recovering your secret, you will be asked to enter a
          code that you will receive in a letter to that address.
        </p>
        <div>
          <LabeledInput
            grabFocus
            label="Full Name"
            bind={[fullName, setFullName]} />
        </div>
        <div>
          <LabeledInput label="Street" bind={[street, setStreet]} />
        </div>
        <div>
          <LabeledInput label="City" bind={[city, setCity]} />
        </div>
        <div>
          <LabeledInput label="Postal Code" bind={[postcode, setPostcode]} />
        </div>
        <div>
          <LabeledInput label="Country" bind={[country, setCountry]} />
        </div>
        <div>
          <button onClick={() => props.cancel()}>Cancel</button>
          <button onClick={() => addPostAuth()}>Add</button>
        </div>
      </div>
    </div>
  );
}
