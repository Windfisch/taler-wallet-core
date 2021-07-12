import { Amounts, BackupBackupProviderTerms, i18n } from "@gnu-taler/taler-util";
import { VNode } from "preact";
import { useState } from "preact/hooks";
import { Checkbox } from "../components/Checkbox";
import { ErrorMessage } from "../components/ErrorMessage";
import { Button, ButtonPrimary, Input, LightText, PopupBox, SmallTextLight } from "../components/styled/index";
import * as wxApi from "../wxApi";

interface Props {
  currency: string;
  onBack: () => void;
}

function getJsonIfOk(r: Response) {
  if (r.ok) {
    return r.json()
  } else {
    if (r.status >= 400 && r.status < 500) {
      throw new Error(`URL may not be right: (${r.status}) ${r.statusText}`)
    } else {
      throw new Error(`Try another server: (${r.status}) ${r.statusText || 'internal server error'}`)
    }
  }
}


export function ProviderAddPage({ onBack }: Props): VNode {
  const [verifying, setVerifying] = useState<{ url: string, provider: BackupBackupProviderTerms } | undefined>(undefined)

  if (!verifying) {
    return <SetUrlView
      onCancel={onBack}
      onVerify={(url) => {
        return fetch(`${url}/config`)
          .catch(e => { throw new Error(`Network error`) })
          .then(getJsonIfOk)
          .then((provider) => { setVerifying({ url, provider }); return undefined })
          .catch((e) => e.message)
      }}
    />
  }
  return <ConfirmProviderView
    provider={verifying.provider}
    url={verifying.url}
    onCancel={() => {
      setVerifying(undefined);
    }}
    onConfirm={() => {
      wxApi.addBackupProvider(verifying.url).then(onBack)
    }}

  />
}


export interface SetUrlViewProps {
  initialValue?: string;
  onCancel: () => void;
  onVerify: (s: string) => Promise<string | undefined>;
  withError?: string;
}

export function SetUrlView({ initialValue, onCancel, onVerify, withError }: SetUrlViewProps) {
  const [value, setValue] = useState<string>(initialValue || "")
  const [error, setError] = useState<string | undefined>(withError)
  return <PopupBox>
    <section>
      <h1> Add backup provider</h1>
      <ErrorMessage title={error && "Could not get provider information"} description={error} />
      <LightText> Backup providers may charge for their service</LightText>
      <p>
        <Input>
          <label>URL</label>
          <input type="text" placeholder="https://" value={value} onChange={(e) => setValue(e.currentTarget.value)} />
        </Input>
        <Input>
          <label>Name</label>
          <input type="text" disabled />
        </Input>
      </p>
    </section>
    <footer>
      <Button onClick={onCancel}><i18n.Translate> &lt; Back</i18n.Translate></Button>
      <ButtonPrimary
        disabled={!value}
        onClick={() => {
          let url = value.startsWith('http://') || value.startsWith('https://') ? value : `https://${value}`
          url = url.endsWith('/') ? url.substring(0, url.length - 1) : url;
          return onVerify(url).then(r => r ? setError(r) : undefined)
        }}><i18n.Translate>Next</i18n.Translate></ButtonPrimary>
    </footer>
  </PopupBox>
}

export interface ConfirmProviderViewProps {
  provider: BackupBackupProviderTerms,
  url: string,
  onCancel: () => void;
  onConfirm: () => void;
}
export function ConfirmProviderView({ url, provider, onCancel, onConfirm }: ConfirmProviderViewProps) {
  const [accepted, setAccepted] = useState(false);

  return <PopupBox>
    <section>
      <h1>Review terms of service</h1>
      <div>Provider URL: <a href={url} target="_blank">{url}</a></div>
      <SmallTextLight>Please review and accept this provider's terms of service</SmallTextLight>
      <h2>1. Pricing</h2>
      <p>
        {Amounts.isZero(provider.annual_fee) ? 'free of charge' : `${provider.annual_fee} per year of service`} 
      </p>
      <h2>2. Storage</h2>
      <p>
        {provider.storage_limit_in_megabytes} megabytes of storage per year of service
      </p>
      <Checkbox label="Accept terms of service" name="terms" onToggle={() => setAccepted(old => !old)} enabled={accepted}/>
    </section>
    <footer>
      <Button onClick={onCancel}><i18n.Translate> &lt; Back</i18n.Translate></Button>
      <ButtonPrimary
        disabled={!accepted}
        onClick={onConfirm}><i18n.Translate>Add provider</i18n.Translate></ButtonPrimary>
    </footer>
  </PopupBox>
}
