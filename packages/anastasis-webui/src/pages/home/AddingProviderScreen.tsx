/* eslint-disable @typescript-eslint/camelcase */
import {
  encodeCrock,
  stringToBytes
} from "@gnu-taler/taler-util";
import { h, VNode } from "preact";
import { useLayoutEffect, useRef, useState } from "preact/hooks";
import { TextInput } from "../../components/fields/TextInput";
import { authMethods, KnownAuthMethods } from "./authMethod";
import { AnastasisClientFrame } from "./index";

interface Props {
  providerType?: KnownAuthMethods;
  cancel: () => void;
}
export function AddingProviderScreen({ providerType, cancel }: Props): VNode {
  const [providerURL, setProviderURL] = useState("");
  const [error, setError] = useState<string | undefined>()
  const providerLabel = providerType ? authMethods[providerType].label : undefined

  function testProvider(): void {
    setError(undefined)

    fetch(`${providerURL}/config`)
      .then(r => r.json().catch(d => ({})))
      .then(r => {
        if (!("methods" in r) || !Array.isArray(r.methods)) {
          setError("This provider doesn't have authentication method. Check the provider URL")
          return;
        }
        if (!providerLabel) {
          setError("")
          return
        }
        let found = false
        for (let i = 0; i < r.methods.length && !found; i++) {
          found = r.methods[i].type !== providerType
        }
        if (!found) {
          setError(`This provider does not support authentication method ${providerLabel}`)
        }
      })
      .catch(e => {
        setError(`There was an error testing this provider, try another one. ${e.message}`)
      })

  }
  function addProvider(): void {
    // addAuthMethod({
    //   authentication_method: {
    //     type: "sms",
    //     instructions: `SMS to ${providerURL}`,
    //     challenge: encodeCrock(stringToBytes(providerURL)),
    //   },
    // });
  }
  const inputRef = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    inputRef.current?.focus();
  }, []);

  let errors = !providerURL ? 'Add provider URL' : undefined
  try {
    new URL(providerURL)
  } catch {
    errors = 'Check the URL'
  }
  if (!!error && !errors) {
    errors = error
  }

  return (
    <AnastasisClientFrame hideNav
      title={!providerLabel ? `Backup: Adding a provider` : `Backup: Adding a ${providerLabel} provider`}
      hideNext={errors}>
      <div>
        <p>
          Add a provider url {errors}
        </p>
        <div class="container">
          <TextInput
            label="Provider URL"
            placeholder="https://provider.com"
            grabFocus
            bind={[providerURL, setProviderURL]} />
        </div>
        {!!error && <p class="block has-text-danger">{error}</p>}
        {error === "" && <p class="block has-text-success">This provider worked!</p>}
        <div style={{ marginTop: '2em', display: 'flex', justifyContent: 'space-between' }}>
          <button class="button" onClick={testProvider}>TEST</button>
        </div>
        <div style={{ marginTop: '2em', display: 'flex', justifyContent: 'space-between' }}>
          <button class="button" onClick={cancel}>Cancel</button>
          <span data-tooltip={errors}>
            <button class="button is-info" disabled={errors !== undefined} onClick={addProvider}>Add</button>
          </span>
        </div>
      </div>
    </AnastasisClientFrame>
  );
}
