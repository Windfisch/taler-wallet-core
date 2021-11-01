/* eslint-disable @typescript-eslint/camelcase */
import {
  encodeCrock,
  stringToBytes
} from "@gnu-taler/taler-util";
import { h, VNode } from "preact";
import { useState } from "preact/hooks";
import { AuthMethodSetupProps } from "../AuthenticationEditorScreen";
import { AnastasisClientFrame } from "../index";
import { TextInput } from "../../../components/fields/TextInput";
import { QR } from "../../../components/QR";

export function AuthMethodTotpSetup({addAuthMethod, cancel, configured}: AuthMethodSetupProps): VNode {
  const [name, setName] = useState("");
  const addTotpAuth = (): void => addAuthMethod({
    authentication_method: {
      type: "totp",
      instructions: `Enter code for ${name}`,
      challenge: encodeCrock(stringToBytes(name)),
    },
  });
  const errors = !name ? 'The TOTP name is missing' : undefined;
  return (
    <AnastasisClientFrame hideNav title="Add TOTP authentication">
      <p>
        For Time-based One-Time Password (TOTP) authentication, you need to set 
        a name for the TOTP secret. Then, you must scan the generated QR code 
        with your TOTP App to import the TOTP secret into your TOTP App.
      </p>
      <div>
        <TextInput
          label="TOTP Name"
          grabFocus
          bind={[name, setName]} />
      </div>
      <QR text={`sometext ${name}`} />
      <div>
        <div style={{ marginTop: '2em', display: 'flex', justifyContent: 'space-between' }}>
          <button class="button" onClick={cancel}>Cancel</button>
          <span data-tooltip={errors}>
            <button class="button is-info" disabled={errors !== undefined} onClick={addTotpAuth}>Add</button>
          </span>
        </div>
      </div>
    </AnastasisClientFrame>
  );
}
