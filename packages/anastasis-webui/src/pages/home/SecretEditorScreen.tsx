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
import {
  FileInput,
  FileTypeContent,
} from "../../components/fields/FileInput.js";
import { TextInput } from "../../components/fields/TextInput.js";
import { useAnastasisContext } from "../../context/anastasis.js";
import { AnastasisClientFrame } from "./index.js";

export function SecretEditorScreen(): VNode {
  const reducer = useAnastasisContext();
  const [secretValue, setSecretValue] = useState("");
  const [secretFile, _setSecretFile] = useState<FileTypeContent | undefined>(
    undefined,
  );
  function setSecretFile(v: FileTypeContent | undefined): void {
    setSecretValue(""); // reset secret value when uploading a file
    _setSecretFile(v);
  }

  const currentSecretName =
    reducer?.currentReducerState &&
    "secret_name" in reducer.currentReducerState &&
    reducer.currentReducerState.secret_name;

  const [secretName, setSecretName] = useState(currentSecretName || "");

  if (!reducer) {
    return <div>no reducer in context</div>;
  }
  if (reducer.currentReducerState?.reducer_type !== "backup") {
    return <div>invalid state</div>;
  }

  const secretNext = async (): Promise<void> => {
    const secret = secretFile
      ? {
          value: encodeCrock(stringToBytes(secretValue)),
          filename: secretFile.name,
          mime: secretFile.type,
        }
      : {
          value: encodeCrock(stringToBytes(secretValue)),
          mime: "text/plain",
        };
    return reducer.runTransaction(async (tx) => {
      await tx.transition("enter_secret_name", {
        name: secretName,
      });
      await tx.transition("enter_secret", {
        secret,
        expiration: {
          t_s: new Date().getTime() + 60 * 60 * 24 * 365 * 5,
        },
      });
      await tx.transition("next", {});
    });
  };
  const errors = !secretName
    ? "Add a secret name"
    : !secretValue && !secretFile
    ? "Add a secret value or a choose a file to upload"
    : undefined;
  function goNextIfNoErrors(): void {
    if (!errors) secretNext();
  }
  return (
    <AnastasisClientFrame
      hideNext={errors}
      title="Backup: Provide secret to backup"
      onNext={() => secretNext()}
    >
      <div class="block">
        <TextInput
          label="Secret name:"
          tooltip="This allows you to uniquely identify a secret if you have made multiple back ups. The value entered here will NOT be protected by the authentication checks!"
          grabFocus
          onConfirm={goNextIfNoErrors}
          bind={[secretName, setSecretName]}
        />
        <div>
          Names should be unique, so that you can easily identify your secret
          later.
        </div>
      </div>
      <div class="block">
        <TextInput
          inputType="multiline"
          disabled={!!secretFile}
          onConfirm={goNextIfNoErrors}
          label="Enter the secret as text:"
          bind={[secretValue, setSecretValue]}
        />
      </div>
      <div class="block">
        Or upload a secret file
        <FileInput label="Choose file" onChange={setSecretFile} />
        {secretFile && (
          <div>
            Uploading secret file <b>{secretFile.name}</b>{" "}
            <a onClick={() => setSecretFile(undefined)}>cancel</a>
          </div>
        )}
      </div>
    </AnastasisClientFrame>
  );
}
