/* eslint-disable @typescript-eslint/camelcase */
import {
  encodeCrock,
  stringToBytes
} from "@gnu-taler/taler-util";
import { h, VNode } from "preact";
import { useState, useRef, useLayoutEffect } from "preact/hooks";
import { AuthMethodSetupProps } from "./AuthenticationEditorScreen";
import { AnastasisClientFrame } from "./index";

export function AuthMethodSmsSetup(props: AuthMethodSetupProps): VNode {
  const [mobileNumber, setMobileNumber] = useState("");
  const addSmsAuth = (): void => {
    props.addAuthMethod({
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
  return (
    <AnastasisClientFrame hideNav title="Add SMS authentication">
      <div>
        <p>
          For SMS authentication, you need to provide a mobile number. When
          recovering your secret, you will be asked to enter the code you
          receive via SMS.
        </p>
        <label>
          Mobile number:{" "}
          <input
            value={mobileNumber}
            ref={inputRef}
            style={{ display: "block" }}
            autoFocus
            onChange={(e) => setMobileNumber((e.target as any).value)}
            type="text" />
        </label>
        <div>
          <button onClick={() => props.cancel()}>Cancel</button>
          <button onClick={() => addSmsAuth()}>Add</button>
        </div>
      </div>
    </AnastasisClientFrame>
  );
}
