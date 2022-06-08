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
import { AuthenticationProviderStatusOk } from "@gnu-taler/anastasis-core";
import { h, VNode } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { TextInput } from "../../components/fields/TextInput.js";
import { useAnastasisContext } from "../../context/anastasis.js";
import { authMethods, KnownAuthMethods } from "./authMethod/index.js";
import { AnastasisClientFrame } from "./index.js";

interface Props {
  providerType?: KnownAuthMethods;
  onCancel: () => void;
}

async function testProvider(
  url: string,
  expectedMethodType?: string,
): Promise<void> {
  try {
    const response = await fetch(new URL("config", url).href);
    const json = await response.json().catch((d) => ({}));
    if (!("methods" in json) || !Array.isArray(json.methods)) {
      throw Error(
        "This provider doesn't have authentication method. Check the provider URL",
      );
    }
    console.log("expected", expectedMethodType);
    if (!expectedMethodType) {
      return;
    }
    let found = false;
    for (let i = 0; i < json.methods.length && !found; i++) {
      found = json.methods[i].type === expectedMethodType;
    }
    if (!found) {
      throw Error(
        `This provider does not support authentication method ${expectedMethodType}`,
      );
    }
    return;
  } catch (e) {
    console.log("error", e);
    const error =
      e instanceof Error
        ? Error(
            `There was an error testing this provider, try another one. ${e.message}`,
          )
        : Error(`There was an error testing this provider, try another one.`);
    throw error;
  }
}

export function AddingProviderScreen({ providerType, onCancel }: Props): VNode {
  const reducer = useAnastasisContext();

  const [providerURL, setProviderURL] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [testing, setTesting] = useState(false);
  const providerLabel = providerType
    ? authMethods[providerType].label
    : undefined;

  const allAuthProviders =
    !reducer ||
    !reducer.currentReducerState ||
    reducer.currentReducerState.reducer_type === "error" ||
    !reducer.currentReducerState.authentication_providers
      ? {}
      : reducer.currentReducerState.authentication_providers;
  const authProviders = Object.keys(allAuthProviders).filter((provUrl) => {
    const p = allAuthProviders[provUrl];
    if (!providerLabel) {
      return p && "currency" in p;
    } else {
      return (
        p &&
        "currency" in p &&
        p.methods.findIndex((m) => m.type === providerType) !== -1
      );
    }
  });

  //FIXME: move this timeout logic into a hook
  const timeout = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (timeout) window.clearTimeout(timeout.current);
    timeout.current = window.setTimeout(async () => {
      const url = providerURL.endsWith("/") ? providerURL : providerURL + "/";
      if (!providerURL || authProviders.includes(url)) return;
      try {
        setTesting(true);
        await testProvider(url, providerType);
        setError("");
      } catch (e) {
        if (e instanceof Error) setError(e.message);
      }
      setTesting(false);
    }, 200);
  }, [providerURL, reducer]);

  async function addProvider(provider_url: string): Promise<void> {
    await reducer?.transition("add_provider", { provider_url });
    onCancel();
  }
  function deleteProvider(provider_url: string): void {
    reducer?.transition("delete_provider", { provider_url });
  }

  if (!reducer) {
    return <div>no reducer in context</div>;
  }

  if (
    !reducer.currentReducerState ||
    !("authentication_providers" in reducer.currentReducerState)
  ) {
    return <div>invalid state</div>;
  }

  let errors = !providerURL ? "Add provider URL" : undefined;
  let url: string | undefined;
  try {
    url = new URL("", providerURL).href;
  } catch {
    errors = "Check the URL";
  }
  if (!!error && !errors) {
    errors = error;
  }
  if (!errors && authProviders.includes(url!)) {
    errors = "That provider is already known";
  }

  return (
    <AnastasisClientFrame
      hideNav
      title="Backup: Manage providers"
      hideNext={errors}
    >
      <div>
        {!providerLabel ? (
          <p>Add a provider url</p>
        ) : (
          <p>Add a provider url for a {providerLabel} service</p>
        )}
        <div class="container">
          <TextInput
            label="Provider URL"
            placeholder="https://provider.com"
            grabFocus
            error={errors}
            bind={[providerURL, setProviderURL]}
          />
        </div>
        <p class="block">Example: https://kudos.demo.anastasis.lu</p>
        {testing && <p class="has-text-info">Testing</p>}

        <div
          class="block"
          style={{
            marginTop: "2em",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <button class="button" onClick={onCancel}>
            Cancel
          </button>
          <span data-tooltip={errors}>
            <button
              class="button is-info"
              disabled={error !== "" || testing}
              onClick={() => addProvider(url!)}
            >
              Add
            </button>
          </span>
        </div>

        {authProviders.length > 0 ? (
          !providerLabel ? (
            <p class="subtitle">Current providers</p>
          ) : (
            <p class="subtitle">
              Current providers for {providerLabel} service
            </p>
          )
        ) : !providerLabel ? (
          <p class="subtitle">No known providers, add one.</p>
        ) : (
          <p class="subtitle">No known providers for {providerLabel} service</p>
        )}

        {authProviders.map((k) => {
          const p = allAuthProviders[k] as AuthenticationProviderStatusOk;
          return (
            <TableRow key={k} url={k} info={p} onDelete={deleteProvider} />
          );
        })}
      </div>
    </AnastasisClientFrame>
  );
}
function TableRow({
  url,
  info,
  onDelete,
}: {
  onDelete: (s: string) => void;
  url: string;
  info: AuthenticationProviderStatusOk;
}): VNode {
  const [status, setStatus] = useState("checking");
  useEffect(function () {
    testProvider(url.endsWith("/") ? url.substring(0, url.length - 1) : url)
      .then(function () {
        setStatus("responding");
      })
      .catch(function () {
        setStatus("failed to contact");
      });
  });
  return (
    <div
      class="box"
      style={{ display: "flex", justifyContent: "space-between" }}
    >
      <div>
        <div class="subtitle">{url}</div>
        <dl>
          <dt>
            <b>Business Name</b>
          </dt>
          <dd>{info.business_name}</dd>
          <dt>
            <b>Supported methods</b>
          </dt>
          <dd>{info.methods.map((m) => m.type).join(",")}</dd>
          <dt>
            <b>Maximum storage</b>
          </dt>
          <dd>{info.storage_limit_in_megabytes} Mb</dd>
          <dt>
            <b>Status</b>
          </dt>
          <dd>{status}</dd>
        </dl>
      </div>
      <div
        class="block"
        style={{
          marginTop: "auto",
          marginBottom: "auto",
          display: "flex",
          justifyContent: "space-between",
          flexDirection: "column",
        }}
      >
        <button class="button is-danger" onClick={() => onDelete(url)}>
          Remove
        </button>
      </div>
    </div>
  );
}
