/* eslint-disable @typescript-eslint/camelcase */
import { RecoveryInternalData } from "anastasis-core";
import { h, VNode } from "preact";
import { useState } from "preact/hooks";
import { AsyncButton } from "../../components/AsyncButton";
import { NumberInput } from "../../components/fields/NumberInput";
import { useAnastasisContext } from "../../context/anastasis";
import { AnastasisClientFrame } from "./index";

export function SecretSelectionScreen(): VNode {
  const [selectingVersion, setSelectingVersion] = useState<boolean>(false);
  const [otherProvider, setOtherProvider] = useState<string>("");
  const reducer = useAnastasisContext()

  const currentVersion = (reducer?.currentReducerState
    && ("recovery_document" in reducer.currentReducerState)
    && reducer.currentReducerState.recovery_document?.version) || 0;

  const [otherVersion, setOtherVersion] = useState("");

  if (!reducer) {
    return <div>no reducer in context</div>
  }
  if (!reducer.currentReducerState || reducer.currentReducerState.recovery_state === undefined) {
    return <div>invalid state</div>
  }

  async function selectVersion(p: string, n: number): Promise<void> {
    if (!reducer) return Promise.resolve();
    return reducer.runTransaction(async (tx) => {
      await tx.transition("change_version", {
        version: n,
        provider_url: p,
      });
      setSelectingVersion(false);
    });
  }

  const providerList = Object.keys(reducer.currentReducerState.authentication_providers ?? {})
  const recoveryDocument = reducer.currentReducerState.recovery_document
  if (!recoveryDocument) {
    return (
      <AnastasisClientFrame hideNext="Recovery document not found" title="Recovery: Problem">
        <p>No recovery document found, try with another provider</p>
        <table class="table">
          <tr>
            <td><b>Provider</b></td>
            <td>
              <select onChange={(e) => setOtherProvider((e.target as any).value)}>
                <option key="none" disabled selected > Choose another provider </option>
                {providerList.map(prov => (
                  <option key={prov} value={prov}>
                    {prov}
                  </option>
                ))}
              </select>
            </td>
          </tr>
        </table>
      </AnastasisClientFrame>
    )
  }
  if (selectingVersion) {
    return (
      <AnastasisClientFrame hideNav title="Recovery: Select secret">
        <div class="columns">
          <div class="column">
            <div class="box">
              <h1 class="subtitle">Provider {recoveryDocument.provider_url}</h1>
              <div class="block">
                {currentVersion === 0 ? <p>
                  Set to recover the latest version
                </p> : <p>
                  Set to recover the version number {currentVersion}
                </p>}
                <p>Specify other version below or use the latest</p>
              </div>
              <div class="container">
                <NumberInput
                  label="Version"
                  placeholder="version number to recover"
                  grabFocus
                  bind={[otherVersion, setOtherVersion]} />
              </div>
            </div>
            <div style={{ marginTop: '2em', display: 'flex', justifyContent: 'space-between' }}>
              <button class="button" onClick={() => setSelectingVersion(false)}>Cancel</button>
              <div class="buttons">
                <button class="button " onClick={() => selectVersion(otherProvider, 0)}>Use latest</button>
                <AsyncButton onClick={() => selectVersion(otherProvider, parseInt(otherVersion, 10))}>Confirm</AsyncButton>
              </div>
            </div>
          </div>
          <div class="column">
            .
          </div>
        </div>

      </AnastasisClientFrame>
    );
  }

  function ProviderCard({ provider, selected }: { selected?: boolean; provider: string }): VNode {
    return <button key={provider} class="button block is-fullwidth" style={{ border: selected ? '2px solid green' : undefined }}
      onClick={(e) => selectVersion(provider, currentVersion)}
    >
      {provider}
    </button>
  }

  return (
    <AnastasisClientFrame title="Recovery: Select secret">
      <div class="columns">
        <div class="column">
          <div class="box" style={{ border: '2px solid green' }}>
            <h1 class="subtitle">{recoveryDocument.provider_url}</h1>
            <div class="block">
              {currentVersion === 0 ? <p>
                Set to recover the latest version
              </p> : <p>
                Set to recover the version number {currentVersion}
              </p>}
            </div>
            <div class="buttons is-right">
              <button class="button" onClick={(e) => setSelectingVersion(true)}>Change secret's version</button>
            </div>
          </div>
          <p class="block">
            Or you can use another provider
          </p>
          {providerList.map(prov => {
            if (recoveryDocument.provider_url === prov) return;
            return <ProviderCard key={prov} provider={prov} />
          })}
        </div>
        <div class="column">
          <p>Secret found, you can select another version or continue to the challenges solving</p>
        </div>
      </div>
    </AnastasisClientFrame>
  );
}
