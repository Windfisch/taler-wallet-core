/*
 This file is part of GNU Taler
 (C) 2022 Taler Systems S.A.

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
  canonicalizeBaseUrl,
  TalerConfigResponse,
} from "@gnu-taler/taler-util";
import { Fragment, h, VNode } from "preact";
import { useEffect, useState } from "preact/hooks";
import { ErrorMessage } from "../components/ErrorMessage.js";
import {
  Input,
  LightText,
  SubTitle,
  Title,
  WarningBox,
} from "../components/styled/index.js";
import { useTranslationContext } from "../context/translation.js";
import { Button } from "../mui/Button.js";

export interface Props {
  initialValue?: string;
  expectedCurrency?: string;
  onCancel: () => Promise<void>;
  onVerify: (s: string) => Promise<TalerConfigResponse | undefined>;
  onConfirm: (url: string) => Promise<string | undefined>;
  withError?: string;
}

function useEndpointStatus<T>(
  endpoint: string,
  onVerify: (e: string) => Promise<T>,
): {
  loading: boolean;
  error?: string;
  endpoint: string;
  result: T | undefined;
  updateEndpoint: (s: string) => void;
} {
  const [value, setValue] = useState<string>(endpoint);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

  const [handler, setHandler] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!value) return;
    window.clearTimeout(handler);
    const h = window.setTimeout(async () => {
      setDirty(true);
      setLoading(true);
      try {
        const url = canonicalizeBaseUrl(value);
        const result = await onVerify(url);
        setResult(result);
        setError(undefined);
        setLoading(false);
      } catch (e) {
        const errorMessage =
          e instanceof Error ? e.message : `unknown error: ${e}`;
        setError(errorMessage);
        setLoading(false);
        setResult(undefined);
      }
    }, 500);
    setHandler(h);
  }, [value, setHandler, onVerify]);

  return {
    error: dirty ? error : undefined,
    loading: loading,
    result: result,
    endpoint: value,
    updateEndpoint: setValue,
  };
}

export function ExchangeSetUrlPage({
  initialValue,
  expectedCurrency,
  onCancel,
  onVerify,
  onConfirm,
}: Props): VNode {
  const { i18n } = useTranslationContext();
  const { loading, result, endpoint, updateEndpoint, error } =
    useEndpointStatus(initialValue ?? "", onVerify);

  const [confirmationError, setConfirmationError] = useState<
    string | undefined
  >(undefined);

  return (
    <Fragment>
      <section>
        {!expectedCurrency ? (
          <Title>
            <i18n.Translate>Add new exchange</i18n.Translate>
          </Title>
        ) : (
          <SubTitle>
            <i18n.Translate>Add exchange for {expectedCurrency}</i18n.Translate>
          </SubTitle>
        )}
        {!result && (
          <LightText>
            <i18n.Translate>
              Enter the URL of an exchange you trust.
            </i18n.Translate>
          </LightText>
        )}
        {result && (
          <LightText>
            <i18n.Translate>
              An exchange has been found! Review the information and click next
            </i18n.Translate>
          </LightText>
        )}
        {result && expectedCurrency && expectedCurrency !== result.currency && (
          <WarningBox>
            <i18n.Translate>
              This exchange doesn&apos;t match the expected currency
              <b>{expectedCurrency}</b>
            </i18n.Translate>
          </WarningBox>
        )}
        {error && (
          <ErrorMessage
            title={
              <i18n.Translate>Unable to verify this exchange</i18n.Translate>
            }
            description={error}
          />
        )}
        {confirmationError && (
          <ErrorMessage
            title={<i18n.Translate>Unable to add this exchange</i18n.Translate>}
            description={confirmationError}
          />
        )}
        <p>
          <Input invalid={!!error}>
            <label>URL</label>
            <input
              type="text"
              placeholder="https://"
              value={endpoint}
              onInput={(e) => updateEndpoint(e.currentTarget.value)}
            />
          </Input>
          {loading && (
            <div>
              <i18n.Translate>loading</i18n.Translate>...
            </div>
          )}
          {result && !loading && (
            <Fragment>
              <Input>
                <label>
                  <i18n.Translate>Version</i18n.Translate>
                </label>
                <input type="text" disabled value={result.version} />
              </Input>
              <Input>
                <label>
                  <i18n.Translate>Currency</i18n.Translate>
                </label>
                <input type="text" disabled value={result.currency} />
              </Input>
            </Fragment>
          )}
        </p>
      </section>
      <footer>
        <Button variant="contained" color="secondary" onClick={onCancel}>
          <i18n.Translate>Cancel</i18n.Translate>
        </Button>
        <Button
          variant="contained"
          disabled={
            !result ||
            !!error ||
            (!!expectedCurrency && expectedCurrency !== result.currency)
          }
          onClick={() => {
            const url = canonicalizeBaseUrl(endpoint);
            return onConfirm(url).then((r) =>
              r ? setConfirmationError(r) : undefined,
            );
          }}
        >
          <i18n.Translate>Next</i18n.Translate>
        </Button>
      </footer>
    </Fragment>
  );
}
