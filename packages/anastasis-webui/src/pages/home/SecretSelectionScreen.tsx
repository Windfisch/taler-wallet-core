import { h, VNode } from "preact";
import { useState } from "preact/hooks";
import { AsyncButton } from "../../components/AsyncButton";
import { NumberInput } from "../../components/fields/NumberInput";
import { useAnastasisContext } from "../../context/anastasis";
import { AnastasisClientFrame } from "./index";

export function SecretSelectionScreen(): VNode {
  const [selectingVersion, setSelectingVersion] = useState<boolean>(false);
  const reducer = useAnastasisContext()

  const currentVersion = (reducer?.currentReducerState
    && ("recovery_document" in reducer.currentReducerState)
    && reducer.currentReducerState.recovery_document?.version) || 0;

  if (!reducer) {
    return <div>no reducer in context</div>
  }
  if (!reducer.currentReducerState || reducer.currentReducerState.recovery_state === undefined) {
    return <div>invalid state</div>
  }

  async function doSelectVersion(p: string, n: number): Promise<void> {
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
    return <ChooseAnotherProviderScreen
      providers={providerList} selected=""
      onChange={(newProv) => doSelectVersion(newProv, 0)}
    />
  }

  if (selectingVersion) {
    return <SelectOtherVersionProviderScreen providers={providerList}
      provider={recoveryDocument.provider_url} version={recoveryDocument.version}
      onCancel={() => setSelectingVersion(false)}
      onConfirm={doSelectVersion}
    />
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
        </div>
        <div class="column">
          <p>Secret found, you can select another version or continue to the challenges solving</p>
        </div>
      </div>
    </AnastasisClientFrame>
  );
}


function ChooseAnotherProviderScreen({ providers, selected, onChange }: { selected: string; providers: string[]; onChange: (prov: string) => void }): VNode {
  return (
    <AnastasisClientFrame hideNext="Recovery document not found" title="Recovery: Problem">
      <p>No recovery document found, try with another provider</p>
      <div class="field">
        <label class="label">Provider</label>
        <div class="control is-expanded has-icons-left">
          <div class="select is-fullwidth">
            <select onChange={(e) => onChange(e.currentTarget.value)} value={selected}>
              <option key="none" disabled selected value=""> Choose a provider </option>
              {providers.map(prov => (
                <option key={prov} value={prov}>
                  {prov}
                </option>
              ))}
            </select>
            <div class="icon is-small is-left">
              <i class="mdi mdi-earth" />
            </div>
          </div>
        </div>
      </div>
    </AnastasisClientFrame>
  );
}

function SelectOtherVersionProviderScreen({ providers, provider, version, onConfirm, onCancel }: { onCancel: () => void; provider: string; version: number; providers: string[]; onConfirm: (prov: string, v: number) => Promise<void>; }): VNode {
  const [otherProvider, setOtherProvider] = useState<string>(provider);
  const [otherVersion, setOtherVersion] = useState(version > 0 ? String(version) : "");

  return (
    <AnastasisClientFrame hideNav title="Recovery: Select secret">
      <div class="columns">
        <div class="column">
          <div class="box">
            <h1 class="subtitle">Provider {otherProvider}</h1>
            <div class="block">
              {version === 0 ? <p>
                Set to recover the latest version
              </p> : <p>
                Set to recover the version number {version}
              </p>}
              <p>Specify other version below or use the latest</p>
            </div>

            <div class="field">
              <label class="label">Provider</label>
              <div class="control is-expanded has-icons-left">
                <div class="select is-fullwidth">
                  <select onChange={(e) => setOtherProvider(e.currentTarget.value)} value={otherProvider}>
                    <option key="none" disabled selected value=""> Choose a provider </option>
                    {providers.map(prov => (
                      <option key={prov} value={prov}>
                        {prov}
                      </option>
                    ))}
                  </select>
                  <div class="icon is-small is-left">
                    <i class="mdi mdi-earth" />
                  </div>
                </div>
              </div>
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
            <button class="button" onClick={onCancel}>Cancel</button>
            <div class="buttons">
              <AsyncButton class="button" onClick={() => onConfirm(otherProvider, 0)}>Use latest</AsyncButton>
              <AsyncButton class="button is-info" onClick={() => onConfirm(otherProvider, parseInt(otherVersion, 10))}>Confirm</AsyncButton>
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
