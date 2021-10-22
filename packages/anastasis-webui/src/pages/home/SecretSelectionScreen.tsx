/* eslint-disable @typescript-eslint/camelcase */
import { h, VNode } from "preact";
import { useState } from "preact/hooks";
import { useAnastasisContext } from "../../context/anastasis";
import { AnastasisClientFrame } from "./index";

export function SecretSelectionScreen(): VNode {
  const [selectingVersion, setSelectingVersion] = useState<boolean>(false);
  const [otherProvider, setOtherProvider] = useState<string>("");
  const reducer = useAnastasisContext()

  const currentVersion = reducer?.currentReducerState
    && ("recovery_document" in reducer.currentReducerState)
    && reducer.currentReducerState.recovery_document?.version;

  const [otherVersion, setOtherVersion] = useState<number>(currentVersion || 0);

  if (!reducer) {
    return <div>no reducer in context</div>
  }
  if (!reducer.currentReducerState || reducer.currentReducerState.recovery_state === undefined) {
    return <div>invalid state</div>
  }

  function selectVersion(p: string, n: number): void {
    if (!reducer) return;
    reducer.runTransaction(async (tx) => {
      await tx.transition("change_version", {
        version: n,
        provider_url: p,
      });
      setSelectingVersion(false);
    });
  }

  const recoveryDocument = reducer.currentReducerState.recovery_document
  if (!recoveryDocument) {
    return (
      <AnastasisClientFrame hideNav title="Recovery: Problem">
        <p>No recovery document found</p>
      </AnastasisClientFrame>
    )
  }
  if (selectingVersion) {
    return (
      <AnastasisClientFrame hideNav title="Recovery: Select secret">
        <p>Select a different version of the secret</p>
        <select onChange={(e) => setOtherProvider((e.target as any).value)}>
          {Object.keys(reducer.currentReducerState.authentication_providers ?? {}).map(
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
