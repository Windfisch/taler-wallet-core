/* eslint-disable @typescript-eslint/camelcase */
import {
  encodeCrock,
  stringToBytes
} from "@gnu-taler/taler-util";
import { h, VNode } from "preact";
import { useState } from "preact/hooks";
import { AuthMethodSetupProps } from "./AuthenticationEditorScreen";
import { AnastasisClientFrame, LabeledInput } from "./index";

export function AuthMethodEmailSetup(props: AuthMethodSetupProps): VNode {
  const [email, setEmail] = useState("");
  return (
    <AnastasisClientFrame hideNav title="Add email authentication">
      <p>
        For email authentication, you need to provide an email address. When
        recovering your secret, you will need to enter the code you receive by
        email.
      </p>
      <div>
        <LabeledInput
          label="Email address"
          grabFocus
          bind={[email, setEmail]} />
      </div>
      <div>
        <button onClick={() => props.cancel()}>Cancel</button>
        <button
          onClick={() => props.addAuthMethod({
            authentication_method: {
              type: "email",
              instructions: `Email to ${email}`,
              challenge: encodeCrock(stringToBytes(email)),
            },
          })}
        >
          Add
        </button>
      </div>
    </AnastasisClientFrame>
  );
}
