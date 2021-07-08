import { Amounts, BackupBackupProviderTerms, i18n } from "@gnu-taler/taler-util";
import { Fragment, VNode } from "preact";
import { useState } from "preact/hooks";
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
  const [readingTerms, setReadingTerms] = useState<boolean | undefined>(undefined)
  const alreadyCheckedTheTerms = readingTerms === false

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
  if (readingTerms) {
    return <TermsOfService
      onCancel={() => setReadingTerms(undefined)}
      onAccept={() => setReadingTerms(false)}
    />
  }
  return <ConfirmProviderView
    provider={verifying.provider}
    termsChecked={alreadyCheckedTheTerms}
    url={verifying.url}
    onCancel={() => {
      setVerifying(undefined);
    }}
    onShowTerms={() => {
      setReadingTerms(true)
    }}
    onConfirm={() => {
      wxApi.addBackupProvider(verifying.url).then(onBack)
    }}

  />
}

interface TermsOfServiceProps {
  onCancel: () => void;
  onAccept: () => void;
}

function TermsOfService({ onCancel, onAccept }: TermsOfServiceProps) {
  return <div style={{ display: 'flex', flexDirection: 'column' }}>
    <section style={{ height: 'calc(320px - 34px - 34px - 16px)', overflow: 'auto' }}>
      <div>
        Here we will place the complete text of terms of service
      </div>
    </section>
    <footer style={{ marginTop: 'auto', display: 'flex', flexShrink: 0 }}>
      <button class="pure-button" onClick={onCancel}><i18n.Translate>cancel</i18n.Translate></button>
      <div style={{ width: '100%', flexDirection: 'row', justifyContent: 'flex-end', display: 'flex' }}>
        <button class="pure-button" onClick={onAccept}><i18n.Translate>accept</i18n.Translate></button>
      </div>
    </footer>
  </div>
}

export interface SetUrlViewProps {
  initialValue?: string;
  onCancel: () => void;
  onVerify: (s: string) => Promise<string | undefined>;
  withError?: string;
}
import arrowDown from '../../static/img/chevron-down.svg';

export function SetUrlView({ initialValue, onCancel, onVerify, withError }: SetUrlViewProps) {
  const [value, setValue] = useState<string>(initialValue || "")
  const [error, setError] = useState<string | undefined>(withError)
  const [showErrorDetail, setShowErrorDetail] = useState(false);
  return <div style={{ display: 'flex', flexDirection: 'column' }}>
    <section style={{ height: 'calc(320px - 34px - 34px - 16px)', overflow: 'auto' }}>
      <div>
        Add backup provider for saving coins
      </div>
      <h3>Backup provider URL</h3>
      <div style={{ width: '3em', display: 'inline-block' }}>https://</div>
      <input style={{ width: 'calc(100% - 8px - 4em)', marginLeft: 5 }} value={value} onChange={(e) => setValue(e.currentTarget.value)} />
      <p>
        Backup providers may charge for their service
      </p>
      {error && <Fragment>
        <div class="errorbox" style={{ marginTop: 10 }} >
          <div style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', display: 'flex' }}>
            <p style={{ alignSelf: 'center' }}>Could not get provider information</p>
            <p>
              <button style={{ fontSize: '100%', padding: 0, height: 28, width: 28 }} onClick={() => { setShowErrorDetail(v => !v) }} >
                <img style={{ height: '1.5em' }} src={arrowDown} />
              </button>
            </p>
          </div>
          {showErrorDetail && <div>{error}</div>}
        </div>
      </Fragment>
      }
    </section>
    <footer style={{ marginTop: 'auto', display: 'flex', flexShrink: 0 }}>
      <button class="pure-button" onClick={onCancel}><i18n.Translate>cancel</i18n.Translate></button>
      <div style={{ width: '100%', flexDirection: 'row', justifyContent: 'flex-end', display: 'flex' }}>
        <button class="pure-button button-secondary" style={{ marginLeft: 5 }}
          disabled={!value}
          onClick={() => {
            let url = value.startsWith('http://') || value.startsWith('https://') ? value : `https://${value}`
            url = url.endsWith('/') ? url.substring(0, url.length - 1) : url;
            return onVerify(url).then(r => r ? setError(r) : undefined)
          }}><i18n.Translate>next</i18n.Translate></button>
      </div>
    </footer>
  </div>
}

export interface ConfirmProviderViewProps {
  provider: BackupBackupProviderTerms,
  url: string,
  onCancel: () => void;
  onConfirm: () => void;
  onShowTerms: () => void;
  termsChecked: boolean;
}
export function ConfirmProviderView({ url, termsChecked, onShowTerms, provider, onCancel, onConfirm }: ConfirmProviderViewProps) {
  return <div style={{ display: 'flex', flexDirection: 'column' }}>
    <section style={{ height: 'calc(320px - 34px - 34px - 16px)', overflow: 'auto' }}>
      <div>Verify provider service terms for <b>{url}</b> backup provider</div>
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
        {termsChecked ?
          <button class="pure-button button-success" style={{ marginLeft: 5 }} onClick={onConfirm}>
            <i18n.Translate>confirm</i18n.Translate>
          </button> :
          <button class="pure-button button-success" style={{ marginLeft: 5 }} onClick={onShowTerms}>
            <i18n.Translate>review terms</i18n.Translate>
          </button>
        }
      </div>
    </footer>
  </div>
}
