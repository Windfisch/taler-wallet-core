import { Amounts, BackupBackupProviderTerms, i18n } from "@gnu-taler/taler-util";
import { privateDecrypt } from "crypto";
import { add, addYears } from "date-fns";
import { VNode } from "preact";
import { useState } from "preact/hooks";
import * as wxApi from "../wxApi";
import ProviderAddConfirmProviderStories from "./ProviderAddConfirmProvider.stories";

interface Props {
  currency: string;
}

export function ProviderAddPage({ currency }: Props): VNode {
  const [verifying, setVerifying] = useState<{ url: string, provider: BackupBackupProviderTerms } | undefined>(undefined)
  if (!verifying) {
    return <SetUrlView
      currency={currency}
      onCancel={() => {
        setVerifying(undefined);
      }}
      onVerify={(url) => {
        return fetch(url).then(r => r.json())
          .then((provider) => setVerifying({ url, provider }))
          .catch((e) => e.message)
      }}
    />
  }
  return <ConfirmProviderView
    provider={verifying.provider}
    currency={currency}
    url={verifying.url}
    onCancel={() => {
      setVerifying(undefined);
    }}
    onConfirm={() => {
      wxApi.addBackupProvider(verifying.url).then(_ => history.go(-1))
    }}

  />
}

export interface SetUrlViewProps {
  currency: string,
  onCancel: () => void;
  onVerify: (s: string) => Promise<string | undefined>;
}

export function SetUrlView({ currency, onCancel, onVerify }: SetUrlViewProps) {
  const [value, setValue] = useState<string>("")
  const [error, setError] = useState<string | undefined>(undefined)
  return <div style={{ display: 'flex', flexDirection: 'column' }}>
    <section style={{ height: 'calc(320px - 34px - 34px - 16px)', overflow: 'auto' }}>
      <div>
        Add backup provider for storing <b>{currency}</b>
      </div>
      {error && <div class="errorbox" style={{ marginTop: 10 }} >
        <p>{error}</p>
      </div>}
      <h3>Backup provider URL</h3>
      <input style={{ width: 'calc(100% - 8px)' }} value={value} onChange={(e) => setValue(e.currentTarget.value)} />
      <p>
        Backup providers may charge for their service
      </p>
    </section>
    <footer style={{ marginTop: 'auto', display: 'flex', flexShrink: 0 }}>
      <button class="pure-button" onClick={onCancel}><i18n.Translate>cancel</i18n.Translate></button>
      <div style={{ width: '100%', flexDirection: 'row', justifyContent: 'flex-end', display: 'flex' }}>
        <button class="pure-button button-secondary" style={{ marginLeft: 5 }} onClick={() => onVerify(value).then(r => r ? setError(r) : undefined)}><i18n.Translate>verify service terms</i18n.Translate></button>
      </div>
    </footer>
  </div>
}

export interface ConfirmProviderViewProps {
  provider: BackupBackupProviderTerms,
  currency: string,
  url: string,
  onCancel: () => void;
  onConfirm: () => void
}
export function ConfirmProviderView({ url, provider, currency, onCancel, onConfirm }: ConfirmProviderViewProps) {
  return <div style={{ display: 'flex', flexDirection: 'column' }}>

    <section style={{ height: 'calc(320px - 34px - 34px - 16px)', overflow: 'auto' }}>
      <div>
        Verify provider service terms for storing <b>{currency}</b>
      </div>
      <h3>{url}</h3>
      <p>
        {Amounts.isZero(provider.annual_fee) ? 'free of charge' : provider.annual_fee} for a year of backup service
      </p>
      <p>
        {provider.storage_limit_in_megabytes} megabytes of storage
      </p>
    </section>
    <footer style={{ marginTop: 'auto', display: 'flex', flexShrink: 0 }}>
      <button class="pure-button" onClick={onCancel}>
        <i18n.Translate>cancel</i18n.Translate>
      </button>
      <div style={{ width: '100%', flexDirection: 'row', justifyContent: 'flex-end', display: 'flex' }}>
        <button class="pure-button button-success" style={{ marginLeft: 5 }} onClick={onConfirm}>
          <i18n.Translate>confirm</i18n.Translate>
        </button>
      </div>
    </footer>
  </div>
}
