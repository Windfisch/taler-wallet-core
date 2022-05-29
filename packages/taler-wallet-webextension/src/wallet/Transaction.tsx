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
  AbsoluteTime,
  AmountJson,
  Amounts,
  Location,
  NotificationType,
  parsePaytoUri,
  parsePayUri,
  PaytoUri,
  stringifyPaytoUri,
  TalerProtocolTimestamp,
  Transaction,
  TransactionDeposit,
  TransactionPayment,
  TransactionRefresh,
  TransactionRefund,
  TransactionTip,
  TransactionType,
  TransactionWithdrawal,
  WithdrawalType,
} from "@gnu-taler/taler-util";
import { styled } from "@linaria/react";
import { differenceInSeconds } from "date-fns";
import { ComponentChildren, Fragment, h, VNode } from "preact";
import { useEffect, useState } from "preact/hooks";
import emptyImg from "../../static/img/empty.png";
import { Amount } from "../components/Amount.js";
import { BankDetailsByPaytoType } from "../components/BankDetailsByPaytoType.js";
import { ErrorTalerOperation } from "../components/ErrorTalerOperation.js";
import { Loading } from "../components/Loading.js";
import { LoadingError } from "../components/LoadingError.js";
import { Kind, Part, PartCollapsible, PartPayto } from "../components/Part.js";
import {
  Button,
  ButtonBox,
  ButtonDestructive,
  ButtonPrimary,
  CenteredDialog,
  HistoryRow,
  InfoBox,
  ListOfProducts,
  Overlay,
  Row,
  RowBorderGray,
  SmallLightText,
  SubTitle,
  WarningBox,
} from "../components/styled/index.js";
import { Time } from "../components/Time.js";
import { useTranslationContext } from "../context/translation.js";
import { useAsyncAsHook } from "../hooks/useAsyncAsHook.js";
import { Pages } from "../NavigationBar.js";
import * as wxApi from "../wxApi.js";

interface Props {
  tid: string;
  goToWalletHistory: (currency?: string) => void;
}

async function getTransaction(tid: string): Promise<Transaction> {
  const res = await wxApi.getTransactions();
  const ts = res.transactions.filter((t) => t.transactionId === tid);
  if (ts.length > 1) throw Error("more than one transaction with this id");
  if (ts.length === 1) {
    return ts[0];
  }
  throw Error("no transaction found");
}

export function TransactionPage({ tid, goToWalletHistory }: Props): VNode {
  const { i18n } = useTranslationContext();

  const state = useAsyncAsHook(() => getTransaction(tid), [tid]);

  useEffect(() => {
    wxApi.onUpdateNotification([NotificationType.WithdrawGroupFinished], () => {
      state?.retry();
    });
  });

  if (!state) {
    return <Loading />;
  }

  if (state.hasError) {
    return (
      <LoadingError
        title={
          <i18n.Translate>
            Could not load the transaction information
          </i18n.Translate>
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
      onRefund={(id) => wxApi.applyRefundFromPurchaseId(id)}
      onBack={() => goToWalletHistory(currency)}
    />
  );
}

export interface WalletTransactionProps {
  transaction: Transaction;
  onDelete: () => void;
  onRetry: () => void;
  onRefund: (id: string) => void;
  onBack: () => void;
}

const PurchaseDetailsTable = styled.table`
  width: 100%;

  & > tr > td:nth-child(2n) {
    text-align: right;
  }
`;

export function TransactionView({
  transaction,
  onDelete,
  onRetry,
  onRefund,
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

  const { i18n } = useTranslationContext();

  function TransactionTemplate({
    children,
  }: {
    children: ComponentChildren;
  }): VNode {
    const showRetry =
      transaction.error !== undefined ||
      transaction.timestamp.t_s === "never" ||
      (transaction.pending &&
        differenceInSeconds(new Date(), transaction.timestamp.t_s * 1000) > 10);

    return (
      <Fragment>
        <section style={{ padding: 8, textAlign: "center" }}>
          <ErrorTalerOperation
            title={
              <i18n.Translate>
                There was an error trying to complete the transaction
              </i18n.Translate>
            }
            error={transaction?.error}
          />
          {transaction.pending && (
            <WarningBox>
              <i18n.Translate>This transaction is not completed</i18n.Translate>
            </WarningBox>
          )}
        </section>
        <section>{children}</section>
        <footer>
          <div />
          <div>
            {showRetry ? (
              <ButtonPrimary onClick={onRetry}>
                <i18n.Translate>Retry</i18n.Translate>
              </ButtonPrimary>
            ) : null}
            <ButtonDestructive onClick={doCheckBeforeForget}>
              <i18n.Translate>Forget</i18n.Translate>
            </ButtonDestructive>
          </div>
        </footer>
      </Fragment>
    );
  }

  if (transaction.type === TransactionType.Withdrawal) {
    const total = Amounts.parseOrThrow(transaction.amountEffective);
    const chosen = Amounts.parseOrThrow(transaction.amountRaw);
    return (
      <TransactionTemplate>
        {confirmBeforeForget ? (
          <Overlay>
            <CenteredDialog>
              <header>
                <i18n.Translate>Caution!</i18n.Translate>
              </header>
              <section>
                <i18n.Translate>
                  If you have already wired money to the exchange you will loose
                  the chance to get the coins form it.
                </i18n.Translate>
              </section>
              <footer>
                <Button onClick={() => setConfirmBeforeForget(false)}>
                  <i18n.Translate>Cancel</i18n.Translate>
                </Button>

                <ButtonDestructive onClick={onDelete}>
                  <i18n.Translate>Confirm</i18n.Translate>
                </ButtonDestructive>
              </footer>
            </CenteredDialog>
          </Overlay>
        ) : undefined}
        <Header
          timestamp={transaction.timestamp}
          type={i18n.str`Withdrawal`}
          total={total}
          kind="positive"
        >
          {transaction.exchangeBaseUrl}
        </Header>

        {!transaction.pending ? undefined : transaction.withdrawalDetails
            .type === WithdrawalType.ManualTransfer ? (
          <Fragment>
            <BankDetailsByPaytoType
              amount={chosen}
              exchangeBaseUrl={transaction.exchangeBaseUrl}
              payto={parsePaytoUri(
                transaction.withdrawalDetails.exchangePaytoUris[0],
              )}
              subject={transaction.withdrawalDetails.reservePub}
            />
            <WarningBox>
              <i18n.Translate>
                Make sure to use the correct subject, otherwise the money will
                not arrive in this wallet.
              </i18n.Translate>
            </WarningBox>
          </Fragment>
        ) : (
          <Fragment>
            {!transaction.withdrawalDetails.confirmed &&
            transaction.withdrawalDetails.bankConfirmationUrl ? (
              <InfoBox>
                <div style={{ display: "block" }}>
                  <i18n.Translate>
                    The bank did not yet confirmed the wire transfer. Go to the
                    {` `}
                    <a
                      href={transaction.withdrawalDetails.bankConfirmationUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ display: "inline" }}
                    >
                      <i18n.Translate>bank site</i18n.Translate>
                    </a>{" "}
                    and check there is no pending step.
                  </i18n.Translate>
                </div>
              </InfoBox>
            ) : undefined}
            {transaction.withdrawalDetails.confirmed && (
              <InfoBox>
                <i18n.Translate>
                  Bank has confirmed the wire transfer. Waiting for the exchange
                  to send the coins
                </i18n.Translate>
              </InfoBox>
            )}
          </Fragment>
        )}
        <Part
          title={<i18n.Translate>Details</i18n.Translate>}
          text={<WithdrawDetails transaction={transaction} />}
        />
      </TransactionTemplate>
    );
  }

  if (transaction.type === TransactionType.Payment) {
    const pendingRefund =
      transaction.refundPending === undefined
        ? undefined
        : Amounts.parseOrThrow(transaction.refundPending);

    const total = Amounts.sub(
      Amounts.parseOrThrow(transaction.amountEffective),
      Amounts.parseOrThrow(transaction.totalRefundEffective),
    ).amount;

    return (
      <TransactionTemplate>
        <Header
          timestamp={transaction.timestamp}
          total={total}
          type={i18n.str`Payment`}
          kind="negative"
        >
          {transaction.info.fulfillmentUrl ? (
            <a
              href={transaction.info.fulfillmentUrl}
              target="_bank"
              rel="noreferrer"
            >
              {transaction.info.summary}
            </a>
          ) : (
            transaction.info.summary
          )}
        </Header>
        <br />
        {transaction.refunds.length > 0 ? (
          <Part
            title={<i18n.Translate>Refunds</i18n.Translate>}
            text={
              <table>
                {transaction.refunds.map((r, i) => {
                  return (
                    <tr key={i}>
                      <td>
                        {<Amount value={r.amountEffective} />}{" "}
                        <a
                          href={Pages.balance_transaction.replace(
                            ":tid",
                            r.transactionId,
                          )}
                        >
                          was refunded
                        </a>{" "}
                        on{" "}
                        {
                          <Time
                            timestamp={AbsoluteTime.fromTimestamp(r.timestamp)}
                            format="dd MMMM yyyy"
                          />
                        }
                      </td>
                    </tr>
                  );
                })}
              </table>
            }
            kind="neutral"
          />
        ) : undefined}
        {pendingRefund !== undefined && Amounts.isNonZero(pendingRefund) && (
          <InfoBox>
            <i18n.Translate>
              Merchant created a refund for this order but was not automatically
              picked up.
            </i18n.Translate>
            <Part
              title={<i18n.Translate>Offer</i18n.Translate>}
              text={<Amount value={pendingRefund} />}
              kind="positive"
            />
            <div>
              <div />
              <div>
                <ButtonPrimary onClick={() => onRefund(transaction.proposalId)}>
                  <i18n.Translate>Accept</i18n.Translate>
                </ButtonPrimary>
              </div>
            </div>
          </InfoBox>
        )}
        <Part
          title={<i18n.Translate>Merchant</i18n.Translate>}
          text={
            <Fragment>
              <div style={{ display: "flex", flexDirection: "row" }}>
                {transaction.info.merchant.logo && (
                  <div>
                    <img
                      src={transaction.info.merchant.logo}
                      style={{ width: 64, height: 64, margin: 4 }}
                    />
                  </div>
                )}
                <div>
                  <p>{transaction.info.merchant.name}</p>
                  {transaction.info.merchant.website && (
                    <a
                      href={transaction.info.merchant.website}
                      target="_blank"
                      style={{ textDecorationColor: "gray" }}
                      rel="noreferrer"
                    >
                      <SmallLightText>
                        {transaction.info.merchant.website}
                      </SmallLightText>
                    </a>
                  )}
                  {transaction.info.merchant.email && (
                    <a
                      href={`mailto:${transaction.info.merchant.email}`}
                      style={{ textDecorationColor: "gray" }}
                    >
                      <SmallLightText>
                        {transaction.info.merchant.email}
                      </SmallLightText>
                    </a>
                  )}
                </div>
              </div>
            </Fragment>
          }
          kind="neutral"
        />
        <Part
          title={<i18n.Translate>Invoice ID</i18n.Translate>}
          text={transaction.info.orderId}
          kind="neutral"
        />
        <Part
          title={<i18n.Translate>Details</i18n.Translate>}
          text={<PurchaseDetails transaction={transaction} />}
          kind="neutral"
        />
      </TransactionTemplate>
    );
  }

  if (transaction.type === TransactionType.Deposit) {
    const total = Amounts.parseOrThrow(transaction.amountRaw);
    const payto = parsePaytoUri(transaction.targetPaytoUri);
    return (
      <TransactionTemplate>
        <Header
          timestamp={transaction.timestamp}
          type={i18n.str`Deposit`}
          total={total}
          kind="negative"
        >
          {!payto ? transaction.targetPaytoUri : <NicePayto payto={payto} />}
        </Header>
        {payto && <PartPayto payto={payto} kind="neutral" />}
        <Part
          title={<i18n.Translate>Details</i18n.Translate>}
          text={<DepositDetails transaction={transaction} />}
          kind="neutral"
        />
      </TransactionTemplate>
    );
  }

  if (transaction.type === TransactionType.Refresh) {
    const total = Amounts.sub(
      Amounts.parseOrThrow(transaction.amountRaw),
      Amounts.parseOrThrow(transaction.amountEffective),
    ).amount;

    return (
      <TransactionTemplate>
        <Header
          timestamp={transaction.timestamp}
          type={i18n.str`Refresh`}
          total={total}
          kind="negative"
        >
          {transaction.exchangeBaseUrl}
        </Header>
        <Part
          title={<i18n.Translate>Details</i18n.Translate>}
          text={<RefreshDetails transaction={transaction} />}
        />
      </TransactionTemplate>
    );
  }

  if (transaction.type === TransactionType.Tip) {
    const total = Amounts.parseOrThrow(transaction.amountEffective);

    return (
      <TransactionTemplate>
        <Header
          timestamp={transaction.timestamp}
          type={i18n.str`Tip`}
          total={total}
          kind="positive"
        >
          {transaction.merchantBaseUrl}
        </Header>
        {/* <Part
          title={<i18n.Translate>Merchant</i18n.Translate>}
          text={transaction.info.merchant.name}
          kind="neutral"
        />
        <Part
          title={<i18n.Translate>Invoice ID</i18n.Translate>}
          text={transaction.info.orderId}
          kind="neutral"
        /> */}
        <Part
          title={<i18n.Translate>Details</i18n.Translate>}
          text={<TipDetails transaction={transaction} />}
        />
      </TransactionTemplate>
    );
  }

  if (transaction.type === TransactionType.Refund) {
    const total = Amounts.parseOrThrow(transaction.amountEffective);
    return (
      <TransactionTemplate>
        <Header
          timestamp={transaction.timestamp}
          type={i18n.str`Refund`}
          total={total}
          kind="positive"
        >
          {transaction.info.summary}
        </Header>

        <Part
          title={<i18n.Translate>Merchant</i18n.Translate>}
          text={transaction.info.merchant.name}
          kind="neutral"
        />
        <Part
          title={<i18n.Translate>Original order ID</i18n.Translate>}
          text={
            <a
              href={Pages.balance_transaction.replace(
                ":tid",
                transaction.refundedTransactionId,
              )}
            >
              {transaction.info.orderId}
            </a>
          }
          kind="neutral"
        />
        <Part
          title={<i18n.Translate>Purchase summary</i18n.Translate>}
          text={transaction.info.summary}
          kind="neutral"
        />
        <Part
          title={<i18n.Translate>Details</i18n.Translate>}
          text={<RefundDetails transaction={transaction} />}
        />
      </TransactionTemplate>
    );
  }

  return <div />;
}

function DeliveryDetails({
  date,
  location,
}: {
  date: TalerProtocolTimestamp | undefined;
  location: Location | undefined;
}): VNode {
  const { i18n } = useTranslationContext();
  return (
    <PurchaseDetailsTable>
      {location && (
        <Fragment>
          {location.country && (
            <tr>
              <td>
                <i18n.Translate>Country</i18n.Translate>
              </td>
              <td>{location.country}</td>
            </tr>
          )}
          {location.address_lines && (
            <tr>
              <td>
                <i18n.Translate>Address lines</i18n.Translate>
              </td>
              <td>{location.address_lines}</td>
            </tr>
          )}
          {location.building_number && (
            <tr>
              <td>
                <i18n.Translate>Building number</i18n.Translate>
              </td>
              <td>{location.building_number}</td>
            </tr>
          )}
          {location.building_name && (
            <tr>
              <td>
                <i18n.Translate>Building name</i18n.Translate>
              </td>
              <td>{location.building_name}</td>
            </tr>
          )}
          {location.street && (
            <tr>
              <td>
                <i18n.Translate>Street</i18n.Translate>
              </td>
              <td>{location.street}</td>
            </tr>
          )}
          {location.post_code && (
            <tr>
              <td>
                <i18n.Translate>Post code</i18n.Translate>
              </td>
              <td>{location.post_code}</td>
            </tr>
          )}
          {location.town_location && (
            <tr>
              <td>
                <i18n.Translate>Town location</i18n.Translate>
              </td>
              <td>{location.town_location}</td>
            </tr>
          )}
          {location.town && (
            <tr>
              <td>
                <i18n.Translate>Town</i18n.Translate>
              </td>
              <td>{location.town}</td>
            </tr>
          )}
          {location.district && (
            <tr>
              <td>
                <i18n.Translate>District</i18n.Translate>
              </td>
              <td>{location.district}</td>
            </tr>
          )}
          {location.country_subdivision && (
            <tr>
              <td>
                <i18n.Translate>Country subdivision</i18n.Translate>
              </td>
              <td>{location.country_subdivision}</td>
            </tr>
          )}
        </Fragment>
      )}

      {!location || !date ? undefined : (
        <tr>
          <td colSpan={2}>
            <hr />
          </td>
        </tr>
      )}
      {date && (
        <Fragment>
          <tr>
            <td>Date</td>
            <td>
              <Time
                timestamp={AbsoluteTime.fromTimestamp(date)}
                format="dd MMMM yyyy, HH:mm"
              />
            </td>
          </tr>
        </Fragment>
      )}
    </PurchaseDetailsTable>
  );
}

function PurchaseDetails({
  transaction,
}: {
  transaction: TransactionPayment;
}): VNode {
  const { i18n } = useTranslationContext();

  const partialFee = Amounts.sub(
    Amounts.parseOrThrow(transaction.amountEffective),
    Amounts.parseOrThrow(transaction.amountRaw),
  ).amount;

  const refundRaw = Amounts.parseOrThrow(transaction.totalRefundRaw);

  const refundFee = Amounts.sub(
    refundRaw,
    Amounts.parseOrThrow(transaction.totalRefundEffective),
  ).amount;

  const fee = Amounts.sum([partialFee, refundFee]).amount;

  const hasProducts =
    transaction.info.products && transaction.info.products.length > 0;

  const hasShipping =
    transaction.info.delivery_date !== undefined ||
    transaction.info.delivery_location !== undefined;

  const showLargePic = (): void => {
    return;
  };

  const total = Amounts.sub(
    Amounts.parseOrThrow(transaction.amountEffective),
    Amounts.parseOrThrow(transaction.totalRefundEffective),
  ).amount;

  return (
    <PurchaseDetailsTable>
      <tr>
        <td>Price</td>
        <td>
          <Amount value={transaction.amountRaw} />
        </td>
      </tr>

      {Amounts.isNonZero(refundRaw) && (
        <tr>
          <td>Refunded</td>
          <td>
            <Amount value={transaction.totalRefundRaw} />
          </td>
        </tr>
      )}
      {Amounts.isNonZero(fee) && (
        <tr>
          <td>Transaction fees</td>
          <td>
            <Amount value={fee} />
          </td>
        </tr>
      )}
      <tr>
        <td colSpan={2}>
          <hr />
        </td>
      </tr>
      <tr>
        <td>Total</td>
        <td>
          <Amount value={total} />
        </td>
      </tr>
      {hasProducts && (
        <tr>
          <td colSpan={2}>
            <PartCollapsible
              big
              title={<i18n.Translate>Products</i18n.Translate>}
              text={
                <ListOfProducts>
                  {transaction.info.products?.map((p, k) => (
                    <Row key={k}>
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
                    </Row>
                  ))}
                </ListOfProducts>
              }
            />
          </td>
        </tr>
      )}
      {hasShipping && (
        <tr>
          <td colSpan={2}>
            <PartCollapsible
              big
              title={<i18n.Translate>Delivery</i18n.Translate>}
              text={
                <DeliveryDetails
                  date={transaction.info.delivery_date}
                  location={transaction.info.delivery_location}
                />
              }
            />
          </td>
        </tr>
      )}
    </PurchaseDetailsTable>
  );
}

function RefundDetails({
  transaction,
}: {
  transaction: TransactionRefund;
}): VNode {
  const { i18n } = useTranslationContext();

  const fee = Amounts.sub(
    Amounts.parseOrThrow(transaction.amountRaw),
    Amounts.parseOrThrow(transaction.amountEffective),
  ).amount;

  return (
    <PurchaseDetailsTable>
      <tr>
        <td>Amount</td>
        <td>
          <Amount value={transaction.amountRaw} />
        </td>
      </tr>

      {Amounts.isNonZero(fee) && (
        <tr>
          <td>Transaction fees</td>
          <td>
            <Amount value={fee} />
          </td>
        </tr>
      )}
      <tr>
        <td colSpan={2}>
          <hr />
        </td>
      </tr>
      <tr>
        <td>Total</td>
        <td>
          <Amount value={transaction.amountEffective} />
        </td>
      </tr>
    </PurchaseDetailsTable>
  );
}

function DepositDetails({
  transaction,
}: {
  transaction: TransactionDeposit;
}): VNode {
  const { i18n } = useTranslationContext();

  const fee = Amounts.sub(
    Amounts.parseOrThrow(transaction.amountRaw),
    Amounts.parseOrThrow(transaction.amountEffective),
  ).amount;

  return (
    <PurchaseDetailsTable>
      <tr>
        <td>Amount</td>
        <td>
          <Amount value={transaction.amountRaw} />
        </td>
      </tr>

      {Amounts.isNonZero(fee) && (
        <tr>
          <td>Transaction fees</td>
          <td>
            <Amount value={fee} />
          </td>
        </tr>
      )}
      <tr>
        <td colSpan={2}>
          <hr />
        </td>
      </tr>
      <tr>
        <td>Total transfer</td>
        <td>
          <Amount value={transaction.amountEffective} />
        </td>
      </tr>
    </PurchaseDetailsTable>
  );
}
function RefreshDetails({
  transaction,
}: {
  transaction: TransactionRefresh;
}): VNode {
  const { i18n } = useTranslationContext();

  const fee = Amounts.sub(
    Amounts.parseOrThrow(transaction.amountRaw),
    Amounts.parseOrThrow(transaction.amountEffective),
  ).amount;

  return (
    <PurchaseDetailsTable>
      <tr>
        <td>Amount</td>
        <td>
          <Amount value={transaction.amountRaw} />
        </td>
      </tr>
      <tr>
        <td colSpan={2}>
          <hr />
        </td>
      </tr>
      <tr>
        <td>Transaction fees</td>
        <td>
          <Amount value={fee} />
        </td>
      </tr>
    </PurchaseDetailsTable>
  );
}

function TipDetails({ transaction }: { transaction: TransactionTip }): VNode {
  const { i18n } = useTranslationContext();

  const fee = Amounts.sub(
    Amounts.parseOrThrow(transaction.amountRaw),
    Amounts.parseOrThrow(transaction.amountEffective),
  ).amount;

  return (
    <PurchaseDetailsTable>
      <tr>
        <td>Amount</td>
        <td>
          <Amount value={transaction.amountRaw} />
        </td>
      </tr>

      {Amounts.isNonZero(fee) && (
        <tr>
          <td>Transaction fees</td>
          <td>
            <Amount value={fee} />
          </td>
        </tr>
      )}
      <tr>
        <td colSpan={2}>
          <hr />
        </td>
      </tr>
      <tr>
        <td>Total</td>
        <td>
          <Amount value={transaction.amountEffective} />
        </td>
      </tr>
    </PurchaseDetailsTable>
  );
}

function WithdrawDetails({
  transaction,
}: {
  transaction: TransactionWithdrawal;
}): VNode {
  const { i18n } = useTranslationContext();

  const fee = Amounts.sub(
    Amounts.parseOrThrow(transaction.amountRaw),
    Amounts.parseOrThrow(transaction.amountEffective),
  ).amount;

  return (
    <PurchaseDetailsTable>
      <tr>
        <td>Withdraw</td>
        <td>
          <Amount value={transaction.amountRaw} />
        </td>
      </tr>

      {Amounts.isNonZero(fee) && (
        <tr>
          <td>Transaction fees</td>
          <td>
            <Amount value={fee} />
          </td>
        </tr>
      )}
      <tr>
        <td colSpan={2}>
          <hr />
        </td>
      </tr>
      <tr>
        <td>Total</td>
        <td>
          <Amount value={transaction.amountEffective} />
        </td>
      </tr>
    </PurchaseDetailsTable>
  );
}

function Header({
  timestamp,
  total,
  children,
  kind,
  type,
}: {
  timestamp: TalerProtocolTimestamp;
  total: AmountJson;
  children: ComponentChildren;
  kind: Kind;
  type: string;
}): VNode {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        flexDirection: "row",
      }}
    >
      <div>
        <SubTitle>{children}</SubTitle>
        <Time
          timestamp={AbsoluteTime.fromTimestamp(timestamp)}
          format="dd MMMM yyyy, HH:mm"
        />
      </div>
      <div>
        <SubTitle>
          <Part
            title={type}
            text={<Amount value={total} />}
            kind={kind}
            showSign
          />
        </SubTitle>
      </div>
    </div>
  );
}

function NicePayto({ payto }: { payto: PaytoUri }): VNode {
  if (payto.isKnown) {
    switch (payto.targetType) {
      case "bitcoin": {
        return <div>{payto.targetPath.substring(0, 20)}...</div>;
      }
      case "x-taler-bank": {
        const url = new URL("/", `https://${payto.host}`);
        return (
          <Fragment>
            <div>{payto.account}</div>
            <SmallLightText>
              <a href={url.href} target="_bank" rel="noreferrer">
                {url.toString()}
              </a>
            </SmallLightText>
          </Fragment>
        );
      }
      case "iban": {
        return <div>{payto.targetPath.substring(0, 20)}</div>;
      }
    }
  }
  return <Fragment>{stringifyPaytoUri(payto)}</Fragment>;
}
