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
import {
  AuthenticationProviderStatus,
  AuthenticationProviderStatusOk,
} from "@gnu-taler/anastasis-core";
import { h, VNode } from "preact";
import { useEffect, useState } from "preact/hooks";
import { AsyncButton } from "../../components/AsyncButton.js";
import { PhoneNumberInput } from "../../components/fields/NumberInput.js";
import { useAnastasisContext } from "../../context/anastasis.js";
import AddingProviderScreen from "./AddingProviderScreen/index.js";
import { AnastasisClientFrame } from "./index.js";

export function SecretSelectionScreen(): VNode {
  const [selectingVersion, setSelectingVersion] = useState<boolean>(false);
  const reducer = useAnastasisContext();
  const [manageProvider, setManageProvider] = useState(false);

  useEffect(() => {
    async function f() {
      if (reducer) {
        await reducer.discoverStart();
      }
    }
    f().catch((e) => console.log(e));
  }, []);

  if (!reducer) {
    return <div>no reducer in context</div>;
  }

  if (
    !reducer.currentReducerState ||
    reducer.currentReducerState.reducer_type !== "recovery"
  ) {
    return <div>invalid state</div>;
  }

  const provs = reducer.currentReducerState.authentication_providers ?? {};
  const recoveryDocument = reducer.currentReducerState.recovery_document;

  if (manageProvider) {
    return (
      <AddingProviderScreen onCancel={async () => setManageProvider(false)} />
    );
  }

  if (reducer.discoveryState.state === "none") {
    // Can this even happen?
    return (
      <AnastasisClientFrame title="Recovery: Select secret">
        <div>waiting to start discovery</div>
      </AnastasisClientFrame>
    );
  }

  if (reducer.discoveryState.state === "active") {
    return (
      <AnastasisClientFrame title="Recovery: Select secret">
        <div>loading secret versions</div>
      </AnastasisClientFrame>
    );
  }

  const policies = reducer.discoveryState.aggregatedPolicies ?? [];

  if (policies.length === 0) {
    return (
      <ChooseAnotherProviderScreen
        providers={provs}
        selected=""
        onChange={() => null}
      ></ChooseAnotherProviderScreen>
    );
  }

  return (
    <AnastasisClientFrame
      title="Recovery: Select secret"
      hideNext="Please select version to recover"
    >
      <div class="columns">
        <div class="column">
          <p class="block">Found versions:</p>
          {policies.map((version, i) => (
            <div key={i} class="box">
              <div
                class="block"
                style={{ display: "flex", justifyContent: "space-between" }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <b>Name:</b>&nbsp;<span>{version.secret_name}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <b>Id:</b>&nbsp;
                    <span
                      class="icon has-tooltip-top"
                      data-tooltip={version.policy_hash
                        .match(/(.{22})/g)
                        ?.join("\n")}
                    >
                      <i class="mdi mdi-information" />
                    </span>
                    <span>{version.policy_hash.substring(0, 22)}...</span>
                  </div>
                </div>

                <div>
                  <AsyncButton
                    class="button"
                    onClick={() =>
                      reducer.transition("select_version", version)
                    }
                  >
                    Recover
                  </AsyncButton>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div class="column">
          <p>
            Secret found, you can select another version or continue to the
            challenges solving
          </p>
          <p class="block">
            <a onClick={() => setManageProvider(true)}>
              Manage recovery providers
            </a>
          </p>
        </div>
      </div>
    </AnastasisClientFrame>
  );
}

export function OldSecretSelectionScreen(): VNode {
  const [selectingVersion, setSelectingVersion] = useState<boolean>(false);
  const reducer = useAnastasisContext();
  const [manageProvider, setManageProvider] = useState(false);

  useEffect(() => {
    async function f() {
      if (reducer) {
        await reducer.discoverStart();
      }
    }
    f().catch((e) => console.log(e));
  }, []);

  const currentVersion =
    (reducer?.currentReducerState &&
      "recovery_document" in reducer.currentReducerState &&
      reducer.currentReducerState.recovery_document?.version) ||
    0;

  if (!reducer) {
    return <div>no reducer in context</div>;
  }
  if (
    !reducer.currentReducerState ||
    reducer.currentReducerState.reducer_type !== "recovery"
  ) {
    return <div>invalid state</div>;
  }

  async function doSelectVersion(p: string, n: number): Promise<void> {
    if (!reducer) return Promise.resolve();
    return reducer.runTransaction(async (tx) => {
      await tx.transition("select_version", {
        version: n,
        provider_url: p,
      });
      setSelectingVersion(false);
    });
  }

  const provs = reducer.currentReducerState.authentication_providers ?? {};
  const recoveryDocument = reducer.currentReducerState.recovery_document;

  if (!recoveryDocument) {
    return (
      <ChooseAnotherProviderScreen
        providers={provs}
        selected=""
        onChange={(newProv) => doSelectVersion(newProv, 0)}
      />
    );
  }

  if (selectingVersion) {
    return (
      <SelectOtherVersionProviderScreen
        providers={provs}
        provider={recoveryDocument.provider_url}
        version={recoveryDocument.version}
        onCancel={() => setSelectingVersion(false)}
        onConfirm={doSelectVersion}
      />
    );
  }

  if (manageProvider) {
    return (
      <AddingProviderScreen onCancel={async () => setManageProvider(false)} />
    );
  }

  const providerInfo = provs[
    recoveryDocument.provider_url
  ] as AuthenticationProviderStatusOk;

  return (
    <AnastasisClientFrame title="Recovery: Select secret">
      <div class="columns">
        <div class="column">
          <div class="box" style={{ border: "2px solid green" }}>
            <h1 class="subtitle">{providerInfo.business_name}</h1>
            <div class="block">
              {currentVersion === 0 ? (
                <p>Set to recover the latest version</p>
              ) : (
                <p>Set to recover the version number {currentVersion}</p>
              )}
            </div>
            <div class="buttons is-right">
              <button class="button" onClick={(e) => setSelectingVersion(true)}>
                Change secret&apos;s version
              </button>
            </div>
          </div>
        </div>
        <div class="column">
          <p>
            Secret found, you can select another version or continue to the
            challenges solving
          </p>
          <p class="block">
            <a onClick={() => setManageProvider(true)}>
              Manage recovery providers
            </a>
          </p>
        </div>
      </div>
    </AnastasisClientFrame>
  );
}

function ChooseAnotherProviderScreen({
  providers,
  selected,
  onChange,
}: {
  selected: string;
  providers: { [url: string]: AuthenticationProviderStatus };
  onChange: (prov: string) => void;
}): VNode {
  return (
    <AnastasisClientFrame
      hideNext="Recovery document not found"
      title="Recovery: Problem"
    >
      <p>No recovery document found, try with another provider</p>
      <div class="field">
        <label class="label">Provider</label>
        <div class="control is-expanded has-icons-left">
          <div class="select is-fullwidth">
            <select
              onChange={(e) => onChange(e.currentTarget.value)}
              value={selected}
            >
              <option key="none" disabled selected value="">
                {" "}
                Choose a provider{" "}
              </option>
              {Object.keys(providers).map((url) => {
                const p = providers[url];
                if (!("methods" in p)) return null;
                return (
                  <option key={url} value={url}>
                    {p.business_name}
                  </option>
                );
              })}
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

function SelectOtherVersionProviderScreen({
  providers,
  provider,
  version,
  onConfirm,
  onCancel,
}: {
  onCancel: () => void;
  provider: string;
  version: number;
  providers: { [url: string]: AuthenticationProviderStatus };
  onConfirm: (prov: string, v: number) => Promise<void>;
}): VNode {
  const [otherProvider, setOtherProvider] = useState<string>(provider);
  const [otherVersion, setOtherVersion] = useState(
    version > 0 ? String(version) : "",
  );
  const otherProviderInfo = providers[
    otherProvider
  ] as AuthenticationProviderStatusOk;

  return (
    <AnastasisClientFrame hideNav title="Recovery: Select secret">
      <div class="columns">
        <div class="column">
          <div class="box">
            <h1 class="subtitle">Provider {otherProviderInfo.business_name}</h1>
            <div class="block">
              {version === 0 ? (
                <p>Set to recover the latest version</p>
              ) : (
                <p>Set to recover the version number {version}</p>
              )}
              <p>Specify other version below or use the latest</p>
            </div>

            <div class="field">
              <label class="label">Provider</label>
              <div class="control is-expanded has-icons-left">
                <div class="select is-fullwidth">
                  <select
                    onChange={(e) => setOtherProvider(e.currentTarget.value)}
                    value={otherProvider}
                  >
                    <option key="none" disabled selected value="">
                      {" "}
                      Choose a provider{" "}
                    </option>
                    {Object.keys(providers).map((url) => {
                      const p = providers[url];
                      if (!("methods" in p)) return null;
                      return (
                        <option key={url} value={url}>
                          {p.business_name}
                        </option>
                      );
                    })}
                  </select>
                  <div class="icon is-small is-left">
                    <i class="mdi mdi-earth" />
                  </div>
                </div>
              </div>
            </div>
            <div class="container">
              <PhoneNumberInput
                label="Version"
                placeholder="version number to recover"
                grabFocus
                bind={[otherVersion, setOtherVersion]}
              />
            </div>
          </div>
          <div
            style={{
              marginTop: "2em",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <button class="button" onClick={onCancel}>
              Cancel
            </button>
            <div class="buttons">
              <AsyncButton
                class="button"
                onClick={() => onConfirm(otherProvider, 0)}
              >
                Use latest
              </AsyncButton>
              <AsyncButton
                class="button is-info"
                onClick={() =>
                  onConfirm(otherProvider, parseInt(otherVersion, 10))
                }
              >
                Confirm
              </AsyncButton>
            </div>
          </div>
        </div>
      </div>
    </AnastasisClientFrame>
  );
}
