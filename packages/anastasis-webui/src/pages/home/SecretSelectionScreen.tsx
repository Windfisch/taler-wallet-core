/* eslint-disable @typescript-eslint/camelcase */
import { h, VNode } from "preact";
import { useState } from "preact/hooks";
import { RecoveryReducerProps, AnastasisClientFrame } from "./index";

export function SecretSelectionScreen(props: RecoveryReducerProps): VNode {
  const { reducer, recoveryState } = props;
  const [selectingVersion, setSelectingVersion] = useState<boolean>(false);
  const [otherVersion, setOtherVersion] = useState<number>(
    recoveryState.recovery_document?.version ?? 0
  );
  const recoveryDocument = recoveryState.recovery_document!;
  const [otherProvider, setOtherProvider] = useState<string>("");
  function selectVersion(p: string, n: number): void {
    reducer.runTransaction(async (tx) => {
      await tx.transition("change_version", {
        version: n,
        provider_url: p,
      });
      setSelectingVersion(false);
    });
  }
  if (selectingVersion) {
    return (
      <AnastasisClientFrame hideNav title="Recovery: Select secret">
        <p>Select a different version of the secret</p>
        <select onChange={(e) => setOtherProvider((e.target as any).value)}>
          {Object.keys(recoveryState.authentication_providers ?? {}).map(
            (x, i) => (
              <option key={i} selected={x === recoveryDocument.provider_url} value={x}>
                {x}
              </option>
            )
          )}
        </select>
        <div>
          <input
            value={otherVersion}
            onChange={(e) => setOtherVersion(Number((e.target as HTMLInputElement).value))}
            type="number" />
          <button onClick={() => selectVersion(otherProvider, otherVersion)}>
            Use this version
          </button>
        </div>
        <div>
          <button onClick={() => selectVersion(otherProvider, 0)}>
            Use latest version
          </button>
        </div>
        <div>
          <button onClick={() => setSelectingVersion(false)}>Cancel</button>
        </div>
      </AnastasisClientFrame>
    );
  }
  return (
    <AnastasisClientFrame title="Recovery: Select secret">
      <p>Provider: {recoveryDocument.provider_url}</p>
      <p>Secret version: {recoveryDocument.version}</p>
      <p>Secret name: {recoveryDocument.secret_name}</p>
      <button onClick={() => setSelectingVersion(true)}>
        Select different secret
      </button>
    </AnastasisClientFrame>
  );
}
