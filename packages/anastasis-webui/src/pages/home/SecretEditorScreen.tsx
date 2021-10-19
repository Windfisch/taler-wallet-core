/* eslint-disable @typescript-eslint/camelcase */
import {
  encodeCrock,
  stringToBytes
} from "@gnu-taler/taler-util";
import { h, VNode } from "preact";
import { useState } from "preact/hooks";
import { BackupReducerProps, AnastasisClientFrame, LabeledInput } from "./index";

export function SecretEditorScreen(props: BackupReducerProps): VNode {
  const { reducer } = props;
  const [secretName, setSecretName] = useState(
    props.backupState.secret_name ?? ""
  );
  const [secretValue, setSecretValue] = useState(
    props.backupState.core_secret?.value ?? "" ?? ""
  );
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
          bind={[secretName, setSecretName]} />
      </div>
      <div>
        <LabeledInput
          label="Secret Value:"
          bind={[secretValue, setSecretValue]} />
      </div>
    </AnastasisClientFrame>
  );
}
