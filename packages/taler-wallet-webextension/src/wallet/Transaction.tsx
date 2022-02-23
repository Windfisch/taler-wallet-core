/*
 This file is part of TALER
 (C) 2016 GNUnet e.V.

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

import {
  AmountLike,
  Amounts,
  i18n,
  NotificationType,
  parsePaytoUri,
  Transaction,
  TransactionType,
  Translate,
  WithdrawalType,
} from "@gnu-taler/taler-util";
import { differenceInSeconds } from "date-fns";
import { ComponentChildren, Fragment, h, VNode } from "preact";
import { useState } from "preact/hooks";
import emptyImg from "../../static/img/empty.png";
import { BankDetailsByPaytoType } from "../components/BankDetailsByPaytoType";
import { ErrorTalerOperation } from "../components/ErrorTalerOperation";
import { Loading } from "../components/Loading";
import { LoadingError } from "../components/LoadingError";
import { Part } from "../components/Part";
import {
  Button,
  ButtonDestructive,
  ButtonPrimary,
  CenteredDialog,
  InfoBox,
  ListOfProducts,
  Overlay,
  RowBorderGray,
  SmallLightText,
  WarningBox,
} from "../components/styled";
import { Time } from "../components/Time";
import { useAsyncAsHook } from "../hooks/useAsyncAsHook";
import * as wxApi from "../wxApi";

interface Props {
  tid: string;
  goToWalletHistory: (currency?: string) => void;
}
export function TransactionPage({ tid, goToWalletHistory }: Props): VNode {
  async function getTransaction(): Promise<Transaction> {
    const res = await wxApi.getTransactions();
    const ts = res.transactions.filter((t) => t.transactionId === tid);
    if (ts.length > 1) throw Error("more than one transaction with this id");
    if (ts.length === 1) {
      return ts[0];
    }
    throw Error("no transaction found");
  }

  const state = useAsyncAsHook(getTransaction, [
    NotificationType.WithdrawGroupFinished,
  ]);

  if (!state) {
    return <Loading />;
  }

  if (state.hasError) {
    return (
      <LoadingError
        title={
          <Translate>Could not load the transaction information</Translate>
        }
        error={state}
      />
    );
  }

  const currency = Amounts.parse(state.response.amountRaw)?.currency;

  return (
    <TransactionView
      transaction={state.response}
      onDelete={() =>
        wxApi.deleteTransaction(tid).then(() => goToWalletHistory(currency))
      }
      onRetry={() =>
        wxApi.retryTransaction(tid).then(() => goToWalletHistory(currency))
      }
      onBack={() => goToWalletHistory(currency)}
    />
  );
}

export interface WalletTransactionProps {
  transaction: Transaction;
  onDelete: () => void;
  onRetry: () => void;
  onBack: () => void;
}

export function TransactionView({
  transaction,
  onDelete,
  onRetry,
  onBack,
}: WalletTransactionProps): VNode {
  const [confirmBeforeForget, setConfirmBeforeForget] = useState(false);

  function doCheckBeforeForget(): void {
    if (
      transaction.pending &&
      transaction.type === TransactionType.Withdrawal
    ) {
      setConfirmBeforeForget(true);
    } else {
      onDelete();
    }
  }

  function TransactionTemplate({
    children,
  }: {
    children: ComponentChildren;
  }): VNode {
    const showRetry =
      transaction.error !== undefined ||
      transaction.timestamp.t_ms === "never" ||
      (transaction.pending &&
        differenceInSeconds(new Date(), transaction.timestamp.t_ms) > 10);

    return (
      <Fragment>
        <section style={{ padding: 8, textAlign: "center" }}>
          <ErrorTalerOperation
            title={
              <Translate>
                There was an error trying to complete the transaction
              </Translate>
            }
            error={transaction?.error}
          />
          {transaction.pending && (
            <WarningBox>
              <Translate>This transaction is not completed</Translate>
            </WarningBox>
          )}
        </section>
        <section>
          <div style={{ textAlign: "center" }}>{children}</div>
        </section>
        <footer>
          <Button onClick={onBack}>
            &lt; <Translate> Back </Translate>
          </Button>
          <div>
            {showRetry ? (
              <ButtonPrimary onClick={onRetry}>
                <Translate>Retry</Translate>
              </ButtonPrimary>
            ) : null}
            <ButtonDestructive onClick={doCheckBeforeForget}>
              <Translate>Forget</Translate>
            </ButtonDestructive>
          </div>
        </footer>
      </Fragment>
    );
  }

  function amountToString(text: AmountLike): string {
    const aj = Amounts.jsonifyAmount(text);
    const amount = Amounts.stringifyValue(aj);
    return `${amount} ${aj.currency}`;
  }

  if (transaction.type === TransactionType.Withdrawal) {
    const fee = Amounts.sub(
      Amounts.parseOrThrow(transaction.amountRaw),
      Amounts.parseOrThrow(transaction.amountEffective),
    ).amount;
    return (
      <TransactionTemplate>
        {confirmBeforeForget ? (
          <Overlay>
            <CenteredDialog>
              <header>
                <Translate>Caution!</Translate>
              </header>
              <section>
                <Translate>
                  If you have already wired money to the exchange you will loose
                  the chance to get the coins form it.
                </Translate>
              </section>
              <footer>
                <Button onClick={() => setConfirmBeforeForget(false)}>
                  <Translate>Cancel</Translate>
                </Button>

                <ButtonDestructive onClick={onDelete}>
                  <Translate>Confirm</Translate>
                </ButtonDestructive>
              </footer>
            </CenteredDialog>
          </Overlay>
        ) : undefined}
        <h2>
          <Translate>Withdrawal</Translate>
        </h2>
        <Time timestamp={transaction.timestamp} format="dd MMMM yyyy, HH:mm" />
        {transaction.pending ? (
          transaction.withdrawalDetails.type ===
          WithdrawalType.ManualTransfer ? (
            <Fragment>
              <BankDetailsByPaytoType
                amount={amountToString(transaction.amountRaw)}
                exchangeBaseUrl={transaction.exchangeBaseUrl}
                payto={parsePaytoUri(
                  transaction.withdrawalDetails.exchangePaytoUris[0],
                )}
                subject={transaction.withdrawalDetails.reservePub}
              />
              <p>
                <WarningBox>
                  <Translate>
                    Make sure to use the correct subject, otherwise the money
                    will not arrive in this wallet.
                  </Translate>
                </WarningBox>
              </p>
              <Part
                big
                title={<Translate>Total withdrawn</Translate>}
                text={amountToString(transaction.amountEffective)}
                kind="positive"
              />
              <Part
                big
                title={<Translate>Exchange fee</Translate>}
                text={amountToString(fee)}
                kind="negative"
              />
            </Fragment>
          ) : (
            <Fragment>
              {!transaction.withdrawalDetails.confirmed &&
              transaction.withdrawalDetails.bankConfirmationUrl ? (
                <InfoBox>
                  <Translate>
                    The bank is waiting for confirmation. Go to the
                    <a
                      href={transaction.withdrawalDetails.bankConfirmationUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Translate>bank site</Translate>
                    </a>
                  </Translate>
                </InfoBox>
              ) : undefined}
              {transaction.withdrawalDetails.confirmed && (
                <InfoBox>
                  <Translate>Waiting for the coins to arrive</Translate>
                </InfoBox>
              )}
              <Part
                big
                title={<Translate>Total withdrawn</Translate>}
                text={amountToString(transaction.amountEffective)}
                kind="positive"
              />
              <Part
                big
                title={<Translate>Chosen amount</Translate>}
                text={amountToString(transaction.amountRaw)}
                kind="neutral"
              />
              <Part
                big
                title={<Translate>Exchange fee</Translate>}
                text={amountToString(fee)}
                kind="negative"
              />
            </Fragment>
          )
        ) : (
          <Fragment>
            <Part
              big
              title={<Translate>Total withdrawn</Translate>}
              text={amountToString(transaction.amountEffective)}
              kind="positive"
            />
            <Part
              big
              title={<Translate>Chosen amount</Translate>}
              text={amountToString(transaction.amountRaw)}
              kind="neutral"
            />
            <Part
              big
              title={<Translate>Exchange fee</Translate>}
              text={amountToString(fee)}
              kind="negative"
            />
          </Fragment>
        )}
        <Part
          title={<Translate>Exchange</Translate>}
          text={new URL(transaction.exchangeBaseUrl).hostname}
          kind="neutral"
        />
      </TransactionTemplate>
    );
  }

  const showLargePic = (): void => {
    return;
  };

  if (transaction.type === TransactionType.Payment) {
    const fee = Amounts.sub(
      Amounts.parseOrThrow(transaction.amountEffective),
      Amounts.parseOrThrow(transaction.amountRaw),
    ).amount;

    return (
      <TransactionTemplate>
        <h2>
          <Translate>Payment</Translate>
        </h2>
        <Time timestamp={transaction.timestamp} format="dd MMMM yyyy, HH:mm" />
        <br />
        <Part
          big
          title={<Translate>Total paid</Translate>}
          text={amountToString(transaction.amountEffective)}
          kind="negative"
        />
        <Part
          big
          title={<Translate>Purchase amount</Translate>}
          text={amountToString(transaction.amountRaw)}
          kind="neutral"
        />
        <Part
          big
          title={<Translate>Fee</Translate>}
          text={amountToString(fee)}
          kind="negative"
        />
        <Part
          title={<Translate>Merchant</Translate>}
          text={transaction.info.merchant.name}
          kind="neutral"
        />
        <Part
          title={<Translate>Purchase</Translate>}
          text={transaction.info.summary}
          kind="neutral"
        />
        <Part
          title={<Translate>Receipt</Translate>}
          text={`#${transaction.info.orderId}`}
          kind="neutral"
        />

        <div>
          {transaction.info.products && transaction.info.products.length > 0 && (
            <ListOfProducts>
              {transaction.info.products.map((p, k) => (
                <RowBorderGray key={k}>
                  <a href="#" onClick={showLargePic}>
                    <img src={p.image ? p.image : emptyImg} />
                  </a>
                  <div>
                    {p.quantity && p.quantity > 0 && (
                      <SmallLightText>
                        x {p.quantity} {p.unit}
                      </SmallLightText>
                    )}
                    <div>{p.description}</div>
                  </div>
                </RowBorderGray>
              ))}
            </ListOfProducts>
          )}
        </div>
      </TransactionTemplate>
    );
  }

  if (transaction.type === TransactionType.Deposit) {
    const fee = Amounts.sub(
      Amounts.parseOrThrow(transaction.amountEffective),
      Amounts.parseOrThrow(transaction.amountRaw),
    ).amount;
    return (
      <TransactionTemplate>
        <h2>
          <Translate>Deposit</Translate>
        </h2>
        <Time timestamp={transaction.timestamp} format="dd MMMM yyyy, HH:mm" />
        <br />
        <Part
          big
          title={<Translate>Total send</Translate>}
          text={amountToString(transaction.amountEffective)}
          kind="neutral"
        />
        <Part
          big
          title={<Translate>Deposit amount</Translate>}
          text={amountToString(transaction.amountRaw)}
          kind="positive"
        />
        <Part
          big
          title={<Translate>Fee</Translate>}
          text={amountToString(fee)}
          kind="negative"
        />
      </TransactionTemplate>
    );
  }

  if (transaction.type === TransactionType.Refresh) {
    const fee = Amounts.sub(
      Amounts.parseOrThrow(transaction.amountRaw),
      Amounts.parseOrThrow(transaction.amountEffective),
    ).amount;
    return (
      <TransactionTemplate>
        <h2>
          <Translate>Refresh</Translate>
        </h2>
        <Time timestamp={transaction.timestamp} format="dd MMMM yyyy, HH:mm" />
        <br />
        <Part
          big
          title={<Translate>Total refresh</Translate>}
          text={amountToString(transaction.amountEffective)}
          kind="negative"
        />
        <Part
          big
          title={<Translate>Refresh amount</Translate>}
          text={amountToString(transaction.amountRaw)}
          kind="neutral"
        />
        <Part
          big
          title={<Translate>Fee</Translate>}
          text={amountToString(fee)}
          kind="negative"
        />
      </TransactionTemplate>
    );
  }

  if (transaction.type === TransactionType.Tip) {
    const fee = Amounts.sub(
      Amounts.parseOrThrow(transaction.amountRaw),
      Amounts.parseOrThrow(transaction.amountEffective),
    ).amount;
    return (
      <TransactionTemplate>
        <h2>
          <Translate>Tip</Translate>
        </h2>
        <Time timestamp={transaction.timestamp} format="dd MMMM yyyy, HH:mm" />
        <br />
        <Part
          big
          title={<Translate>Total tip</Translate>}
          text={amountToString(transaction.amountEffective)}
          kind="positive"
        />
        <Part
          big
          title={<Translate>Received amount</Translate>}
          text={amountToString(transaction.amountRaw)}
          kind="neutral"
        />
        <Part
          big
          title={<Translate>Fee</Translate>}
          text={amountToString(fee)}
          kind="negative"
        />
      </TransactionTemplate>
    );
  }

  if (transaction.type === TransactionType.Refund) {
    const fee = Amounts.sub(
      Amounts.parseOrThrow(transaction.amountRaw),
      Amounts.parseOrThrow(transaction.amountEffective),
    ).amount;
    return (
      <TransactionTemplate>
        <h2>
          <Translate>Refund</Translate>
        </h2>
        <Time timestamp={transaction.timestamp} format="dd MMMM yyyy, HH:mm" />
        <br />
        <Part
          big
          title={<Translate>Total refund</Translate>}
          text={amountToString(transaction.amountEffective)}
          kind="positive"
        />
        <Part
          big
          title={<Translate>Refund amount</Translate>}
          text={amountToString(transaction.amountRaw)}
          kind="neutral"
        />
        <Part
          big
          title={<Translate>Fee</Translate>}
          text={amountToString(fee)}
          kind="negative"
        />
        <Part
          title={<Translate>Merchant</Translate>}
          text={transaction.info.merchant.name}
          kind="neutral"
        />
        <Part
          title={<Translate>Purchase</Translate>}
          text={transaction.info.summary}
          kind="neutral"
        />
        <Part
          title={<Translate>Receipt</Translate>}
          text={`#${transaction.info.orderId}`}
          kind="neutral"
        />

        <p>{transaction.info.summary}</p>
        <div>
          {transaction.info.products && transaction.info.products.length > 0 && (
            <ListOfProducts>
              {transaction.info.products.map((p, k) => (
                <RowBorderGray key={k}>
                  <a href="#" onClick={showLargePic}>
                    <img src={p.image ? p.image : emptyImg} />
                  </a>
                  <div>
                    {p.quantity && p.quantity > 0 && (
                      <SmallLightText>
                        x {p.quantity} {p.unit}
                      </SmallLightText>
                    )}
                    <div>{p.description}</div>
                  </div>
                </RowBorderGray>
              ))}
            </ListOfProducts>
          )}
        </div>
      </TransactionTemplate>
    );
  }

  return <div />;
}
