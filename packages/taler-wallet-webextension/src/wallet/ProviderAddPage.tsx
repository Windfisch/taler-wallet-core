/* eslint-disable @typescript-eslint/no-non-null-assertion */
/*
 This file is part of GNU Taler
 (C) 2021 Taler Systems S.A.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

import {
  Amounts,
  BackupBackupProviderTerms,
  canonicalizeBaseUrl,
} from "@gnu-taler/taler-util";
import { Fragment, h, VNode } from "preact";
import { useEffect, useState } from "preact/hooks";
import { Checkbox } from "../components/Checkbox.js";
import { ErrorMessage } from "../components/ErrorMessage.js";
import {
  Button,
  ButtonPrimary,
  Input,
  LightText,
  SmallLightText,
  SubTitle,
  Title,
} from "../components/styled/index.js";
import { useTranslationContext } from "../context/translation.js";
import { queryToSlashConfig } from "../utils/index.js";
import * as wxApi from "../wxApi.js";

interface Props {
  currency: string;
  onBack: () => void;
}

export function ProviderAddPage({ onBack }: Props): VNode {
  const [verifying, setVerifying] = useState<
    | { url: string; name: string; provider: BackupBackupProviderTerms }
    | undefined
  >(undefined);

  if (!verifying) {
    return (
      <SetUrlView
        onCancel={onBack}
        onVerify={(url) => queryToSlashConfig(url)}
        onConfirm={(url, name) =>
          queryToSlashConfig<BackupBackupProviderTerms>(url)
            .then((provider) => {
              setVerifying({ url, name, provider });
            })
            .catch((e) => e.message)
        }
      />
    );
  }
  return (
    <ConfirmProviderView
      provider={verifying.provider}
      url={verifying.url}
      onCancel={() => {
        setVerifying(undefined);
      }}
      onConfirm={() => {
        wxApi.addBackupProvider(verifying.url, verifying.name).then(onBack);
      }}
    />
  );
}

export interface SetUrlViewProps {
  initialValue?: string;
  onCancel: () => void;
  onVerify: (s: string) => Promise<BackupBackupProviderTerms | undefined>;
  onConfirm: (url: string, name: string) => Promise<string | undefined>;
  withError?: string;
}

export function SetUrlView({
  initialValue,
  onCancel,
  onVerify,
  onConfirm,
  withError,
}: SetUrlViewProps): VNode {
  const { i18n } = useTranslationContext();
  const [value, setValue] = useState<string>(initialValue || "");
  const [urlError, setUrlError] = useState(false);
  const [name, setName] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(withError);
  useEffect(() => {
    try {
      const url = canonicalizeBaseUrl(value);
      onVerify(url)
        .then((r) => {
          setUrlError(false);
          setName(new URL(url).hostname);
        })
        .catch(() => {
          setUrlError(true);
          setName(undefined);
        });
    } catch {
      setUrlError(true);
      setName(undefined);
    }
  }, [onVerify, value]);
  return (
    <Fragment>
      <section>
        <Title>
          <i18n.Translate>Add backup provider</i18n.Translate>
        </Title>
        {error && (
          <ErrorMessage
            title={
              <i18n.Translate>
                Could not get provider information
              </i18n.Translate>
            }
            description={error}
          />
        )}
        <LightText>
          <i18n.Translate>
            Backup providers may charge for their service
          </i18n.Translate>
        </LightText>
        <p>
          <Input invalid={urlError}>
            <label>
              <i18n.Translate>URL</i18n.Translate>
            </label>
            <input
              type="text"
              placeholder="https://"
              value={value}
              onChange={(e) => setValue(e.currentTarget.value)}
            />
          </Input>
          <Input>
            <label>
              <i18n.Translate>Name</i18n.Translate>
            </label>
            <input
              type="text"
              disabled={name === undefined}
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
            />
          </Input>
        </p>
      </section>
      <footer>
        <Button onClick={onCancel}>
          <i18n.Translate>Cancel</i18n.Translate>
        </Button>
        <ButtonPrimary
          disabled={!value && !urlError}
          onClick={() => {
            const url = canonicalizeBaseUrl(value);
            return onConfirm(url, name!).then((r) =>
              r ? setError(r) : undefined,
            );
          }}
        >
          <i18n.Translate>Next</i18n.Translate>
        </ButtonPrimary>
      </footer>
    </Fragment>
  );
}

export interface ConfirmProviderViewProps {
  provider: BackupBackupProviderTerms;
  url: string;
  onCancel: () => void;
  onConfirm: () => void;
}
export function ConfirmProviderView({
  url,
  provider,
  onCancel,
  onConfirm,
}: ConfirmProviderViewProps): VNode {
  const [accepted, setAccepted] = useState(false);
  const { i18n } = useTranslationContext();

  return (
    <Fragment>
      <section>
        <Title>
          <i18n.Translate>Review terms of service</i18n.Translate>
        </Title>
        <div>
          <i18n.Translate>Provider URL</i18n.Translate>:{" "}
          <a href={url} target="_blank" rel="noreferrer">
            {url}
          </a>
        </div>
        <SmallLightText>
          <i18n.Translate>
            Please review and accept this provider&apos;s terms of service
          </i18n.Translate>
        </SmallLightText>
        <SubTitle>
          1. <i18n.Translate>Pricing</i18n.Translate>
        </SubTitle>
        <p>
          {Amounts.isZero(provider.annual_fee) ? (
            <i18n.Translate>free of charge</i18n.Translate>
          ) : (
            <i18n.Translate>
              {provider.annual_fee} per year of service
            </i18n.Translate>
          )}
        </p>
        <SubTitle>
          2. <i18n.Translate>Storage</i18n.Translate>
        </SubTitle>
        <p>
          <i18n.Translate>
            {provider.storage_limit_in_megabytes} megabytes of storage per year
            of service
          </i18n.Translate>
        </p>
        <Checkbox
          label={<i18n.Translate>Accept terms of service</i18n.Translate>}
          name="terms"
          onToggle={() => setAccepted((old) => !old)}
          enabled={accepted}
        />
      </section>
      <footer>
        <Button onClick={onCancel}>
          <i18n.Translate>Cancel</i18n.Translate>
        </Button>
        <ButtonPrimary disabled={!accepted} onClick={onConfirm}>
          <i18n.Translate>Add provider</i18n.Translate>
        </ButtonPrimary>
      </footer>
    </Fragment>
  );
}
