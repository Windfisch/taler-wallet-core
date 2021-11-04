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
    });
    setSelectingVersion(false);
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
        <p>Select a different version of the secret</p>
        <table class="table">
          <tr>
            <td><b>Provider</b></td>
            <td>
              <select onChange={(e) => setOtherProvider((e.target as any).value)}>
                {providerList.map(prov => (
                  <option key={prov} selected={prov === recoveryDocument.provider_url} value={prov}>
                    {prov}
                  </option>
                ))}
              </select>
            </td>
          </tr>
          <tr>
            <td><b>Version</b></td>
            <td>
              <input
                value={otherVersion}
                onChange={(e) => setOtherVersion(Number((e.target as HTMLInputElement).value))}
                type="number" />
            </td>
            <td>
              <a onClick={() => setOtherVersion(0)}>set to latest version</a>
            </td>
          </tr>
        </table>
        <div style={{ marginTop: '2em', display: 'flex', justifyContent: 'space-between' }}>
          <button class="button" onClick={() => setSelectingVersion(false)}>Cancel</button>
          <button class="button is-info" onClick={() => selectVersion(otherProvider, otherVersion)}>Confirm</button>
        </div>

      </AnastasisClientFrame>
    );
  }
  return (
    <AnastasisClientFrame title="Recovery: Select secret">
      <div class="columns">
        <div class="column is-half">
          <div class="box">
            <h1 class="subtitle">{recoveryDocument.provider_url}</h1>
            <table class="table">
              <tr>
                <td>
                  <b>Secret version</b>
                  <span class="icon has-tooltip-right" data-tooltip="Secret version to be recovered">
                    <i class="mdi mdi-information" />
                  </span>
                </td>
                <td>{recoveryDocument.version}</td>
                <td><a onClick={() => setSelectingVersion(true)}>use another version</a></td>
              </tr>
              <tr>
                <td>
                  <b>Secret name</b>
                  <span class="icon has-tooltip-right" data-tooltip="Secret identifier">
                    <i class="mdi mdi-information" />
                  </span>
                </td>
                <td>{recoveryDocument.secret_name}</td>
                <td> </td>
              </tr>
            </table>
            <div class="buttons is-right">
              <button class="button" disabled onClick={() => reducer.reset()}>Use this provider</button>
            </div>
          </div>
          <div class="buttons is-right">
            <button class="button" disabled onClick={() => reducer.reset()}>Change provider</button>
          </div>
        </div>
        <div class="column is-two-third">
          <p>Secret found, you can select another version or continue to the challenges solving</p>
        </div>
      </div>
    </AnastasisClientFrame>
  );
}
