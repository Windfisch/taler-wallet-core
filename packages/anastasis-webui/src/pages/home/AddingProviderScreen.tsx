import { AuthenticationProviderStatusOk } from "anastasis-core";
import { h, VNode } from "preact";
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { TextInput } from "../../components/fields/TextInput";
import { useAnastasisContext } from "../../context/anastasis";
import { authMethods, KnownAuthMethods } from "./authMethod";
import { AnastasisClientFrame } from "./index";

interface Props {
  providerType?: KnownAuthMethods;
  cancel: () => void;
}


async function testProvider(url: string, expectedMethodType?: string): Promise<void> {
  try {
    const response = await fetch(`${url}/config`)
    const json = await (response.json().catch(d => ({})))
    if (!("methods" in json) || !Array.isArray(json.methods)) {
      throw Error("This provider doesn't have authentication method. Check the provider URL")
    }
    console.log("expected", expectedMethodType)
    if (!expectedMethodType) {
      return
    }
    let found = false
    for (let i = 0; i < json.methods.length && !found; i++) {
      found = json.methods[i].type === expectedMethodType
    }
    if (!found) {
      throw Error(`This provider does not support authentication method ${expectedMethodType}`)
    }
    return
  } catch (e) {
    console.log("error", e)
    const error = e instanceof Error ?
      Error(`There was an error testing this provider, try another one. ${e.message}`) :
      Error(`There was an error testing this provider, try another one.`)
    throw error
  }

}

export function AddingProviderScreen({ providerType, cancel }: Props): VNode {
  const reducer = useAnastasisContext();

  const [providerURL, setProviderURL] = useState("");
  const [error, setError] = useState<string | undefined>()
  const [testing, setTesting] = useState(false)
  const providerLabel = providerType ? authMethods[providerType].label : undefined

  //FIXME: move this timeout logic into a hook
  const timeout = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (timeout) window.clearTimeout(timeout.current)
    timeout.current = window.setTimeout(async () => {
      const url = providerURL.endsWith('/') ? providerURL.substring(0, providerURL.length - 1) : providerURL
      if (!url) return;
      try {
        setTesting(true)
        await testProvider(url, providerType)
        // this is use as tested but everything when ok
        // undefined will mean that the field is not dirty
        setError("")
      } catch (e) {
        console.log("tuvieja", e)
        if (e instanceof Error) setError(e.message)
      }
      setTesting(false)
    }, 1000);
  }, [providerURL])


  if (!reducer) {
    return <div>no reducer in context</div>;
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

  let errors = !providerURL ? 'Add provider URL' : undefined
  try {
    new URL(providerURL)
  } catch {
    errors = 'Check the URL'
  }
  if (!!error && !errors) {
    errors = error
  }

  if (!reducer.currentReducerState || !("authentication_providers" in reducer.currentReducerState)) {
    return <div>invalid state</div>
  }

  const authProviders = reducer.currentReducerState.authentication_providers || {}

  return (
    <AnastasisClientFrame hideNav
      title="Backup: Manage providers"
      hideNext={errors}>
      <div>
        {!providerLabel ?
          <p>
            Add a provider url
          </p> :
          <p>
            Add a provider url for a {providerLabel} service
          </p>
        }
        <div class="container">
          <TextInput
            label="Provider URL"
            placeholder="https://provider.com"
            grabFocus
            bind={[providerURL, setProviderURL]} />
        </div>
        <p class="block">
          Example: https://kudos.demo.anastasis.lu
        </p>

        {testing && <p class="block has-text-info">Testing</p>}
        {!!error && <p class="block has-text-danger">{error}</p>}
        {error === "" && <p class="block has-text-success">This provider worked!</p>}

        <div class="block" style={{ marginTop: '2em', display: 'flex', justifyContent: 'space-between' }}>
          <button class="button" onClick={cancel}>Cancel</button>
          <span data-tooltip={errors}>
            <button class="button is-info" disabled={error !== "" || testing} onClick={addProvider}>Add</button>
          </span>
        </div>

        <p class="subtitle">
          Current providers
        </p>
        {/* <table class="table"> */}
        {Object.keys(authProviders).map(k => {
          const p = authProviders[k]
          if (("currency" in p)) {
            return <TableRow url={k} info={p} />
          }
        }
        )}
        {/* </table> */}
      </div>
    </AnastasisClientFrame>
  );
}
function TableRow({ url, info }: { url: string, info: AuthenticationProviderStatusOk }) {
  const [status, setStatus] = useState("checking")
  useEffect(function () {
    testProvider(url.endsWith('/') ? url.substring(0, url.length - 1) : url)
      .then(function () { setStatus('responding') })
      .catch(function () { setStatus('failed to contact') })
  })
  return <div class="box" style={{ display: 'flex', justifyContent: 'space-between' }}>
    <div>
      <div class="subtitle">{url}</div>
      <dl>
        <dt><b>Business Name</b></dt>
        <dd>{info.business_name}</dd>
        <dt><b>Supported methods</b></dt>
        <dd>{info.methods.map(m => m.type).join(',')}</dd>
        <dt><b>Maximum storage</b></dt>
        <dd>{info.storage_limit_in_megabytes} Mb</dd>
        <dt><b>Status</b></dt>
        <dd>{status}</dd>
      </dl>
    </div>
    <div class="block" style={{ marginTop: 'auto', marginBottom: 'auto', display: 'flex', justifyContent: 'space-between', flexDirection: 'column' }}>
      <button class="button is-danger" >Remove</button>
    </div>
  </div>
}