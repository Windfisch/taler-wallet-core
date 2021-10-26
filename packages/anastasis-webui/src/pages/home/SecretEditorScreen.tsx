/* eslint-disable @typescript-eslint/camelcase */
import { encodeCrock, stringToBytes } from "@gnu-taler/taler-util";
import { h, VNode } from "preact";
import { useState } from "preact/hooks";
import { useAnastasisContext } from "../../context/anastasis";
import {
  AnastasisClientFrame} from "./index";
import { LabeledInput } from "../../components/fields/LabeledInput";

export function SecretEditorScreen(): VNode {
  const reducer = useAnastasisContext()
  const [secretValue, setSecretValue] = useState("");

  const currentSecretName = reducer?.currentReducerState 
    && ("secret_name" in reducer.currentReducerState) 
    && reducer.currentReducerState.secret_name;

  const [secretName, setSecretName] = useState(currentSecretName || "");
  
  if (!reducer) {
    return <div>no reducer in context</div>
  }
  if (!reducer.currentReducerState || reducer.currentReducerState.backup_state === undefined) {
    return <div>invalid state</div>
  }

  const secretNext = (): void => {
    reducer.runTransaction(async (tx) => {
      await tx.transition("enter_secret_name", {
        name: secretName,
      });
      await tx.transition("enter_secret", {
        secret: {
          value: encodeCrock(stringToBytes(secretValue)),
          mime: "text/plain",
        },
        expiration: {
          t_ms: new Date().getTime() + 1000 * 60 * 60 * 24 * 365 * 5,
        },
      });
      await tx.transition("next", {});
    });
  };
  return (
    <AnastasisClientFrame
      title="Backup: Provide secret"
      onNext={() => secretNext()}
    >
      <div>
        <LabeledInput
          label="Secret Name:"
          grabFocus
          bind={[secretName, setSecretName]}
        />
      </div>
      <div>
        <LabeledInput
          label="Secret Value:"
          bind={[secretValue, setSecretValue]}
        />
      </div>
    </AnastasisClientFrame>
  );
}
