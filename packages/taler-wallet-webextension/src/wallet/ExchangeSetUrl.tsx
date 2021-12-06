import {
  canonicalizeBaseUrl,
  ExchangeListItem,
  i18n,
  TalerConfigResponse,
} from "@gnu-taler/taler-util";
import { Fragment, h } from "preact";
import { useEffect, useState } from "preact/hooks";
import { ErrorMessage } from "../components/ErrorMessage";
import {
  Button,
  ButtonPrimary,
  Input,
  WarningBox,
} from "../components/styled/index";

export interface Props {
  initialValue?: string;
  expectedCurrency?: string;
  onCancel: () => void;
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
  }, [value]);

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
}: Props) {
  const { loading, result, endpoint, updateEndpoint, error } =
    useEndpointStatus(initialValue ?? "", onVerify);

  const [confirmationError, setConfirmationError] = useState<
    string | undefined
  >(undefined);

  return (
    <Fragment>
      <section>
        {!expectedCurrency ? (
          <h1>Add new exchange</h1>
        ) : (
          <h2>Add exchange for {expectedCurrency}</h2>
        )}
        {result && expectedCurrency && expectedCurrency !== result.currency && (
          <WarningBox>
            This exchange doesn't match the expected currency{" "}
            <b>{expectedCurrency}</b>
          </WarningBox>
        )}
        <ErrorMessage
          title={error && "Unable to add this exchange"}
          description={error}
        />
        <ErrorMessage
          title={confirmationError && "Unable to add this exchange"}
          description={confirmationError}
        />
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
          {loading && <div>loading... </div>}
          {result && !loading && (
            <Fragment>
              <Input>
                <label>Version</label>
                <input type="text" disabled value={result.version} />
              </Input>
              <Input>
                <label>Currency</label>
                <input type="text" disabled value={result.currency} />
              </Input>
            </Fragment>
          )}
        </p>
      </section>
      <footer>
        <Button onClick={onCancel}>
          <i18n.Translate>Cancel</i18n.Translate>
        </Button>
        <ButtonPrimary
          disabled={
            !result ||
            !!error ||
            (expectedCurrency !== undefined &&
              expectedCurrency !== result.currency)
          }
          onClick={() => {
            const url = canonicalizeBaseUrl(endpoint);
            return onConfirm(url).then((r) =>
              r ? setConfirmationError(r) : undefined,
            );
          }}
        >
          <i18n.Translate>Next</i18n.Translate>
        </ButtonPrimary>
      </footer>
    </Fragment>
  );
}
