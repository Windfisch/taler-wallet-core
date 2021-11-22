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
  knownExchanges: ExchangeListItem[];
  onCancel: () => void;
  onVerify: (s: string) => Promise<TalerConfigResponse | undefined>;
  onConfirm: (url: string) => Promise<string | undefined>;
  withError?: string;
}

export function ExchangeSetUrlPage({
  initialValue,
  knownExchanges,
  expectedCurrency,
  onCancel,
  onVerify,
  onConfirm,
  withError,
}: Props) {
  const [value, setValue] = useState<string>(initialValue || "");
  const [dirty, setDirty] = useState(false);
  const [result, setResult] = useState<TalerConfigResponse | undefined>(
    undefined,
  );
  const [error, setError] = useState<string | undefined>(withError);

  useEffect(() => {
    try {
      const url = canonicalizeBaseUrl(value);

      const found =
        knownExchanges.findIndex((e) => e.exchangeBaseUrl === url) !== -1;

      if (found) {
        setError("This exchange is already known");
        return;
      }
      onVerify(url)
        .then((r) => {
          setResult(r);
        })
        .catch(() => {
          setResult(undefined);
        });
      setDirty(true);
    } catch {
      setResult(undefined);
    }
  }, [value]);

  return (
    <Fragment>
      <section>
        {!expectedCurrency ? (
          <h1>Add new exchange</h1>
        ) : (
          <h2>Add exchange for {expectedCurrency}</h2>
        )}
        <ErrorMessage
          title={error && "Unable to add this exchange"}
          description={error}
        />
        <p>
          <Input invalid={dirty && !!error}>
            <label>URL</label>
            <input
              type="text"
              placeholder="https://"
              value={value}
              onInput={(e) => setValue(e.currentTarget.value)}
            />
          </Input>
          {result && (
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
      {result && expectedCurrency && expectedCurrency !== result.currency && (
        <WarningBox>
          This exchange doesn't match the expected currency{" "}
          <b>{expectedCurrency}</b>
        </WarningBox>
      )}
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
            const url = canonicalizeBaseUrl(value);
            return onConfirm(url).then((r) => (r ? setError(r) : undefined));
          }}
        >
          <i18n.Translate>Next</i18n.Translate>
        </ButtonPrimary>
      </footer>
    </Fragment>
  );
}
