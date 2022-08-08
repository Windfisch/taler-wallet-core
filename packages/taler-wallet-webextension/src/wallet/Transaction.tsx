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
  AbsoluteTime,
  AmountJson,
  Amounts,
  Location,
  MerchantInfo,
  NotificationType,
  OrderShortInfo,
  parsePaytoUri,
  PaytoUri,
  stringifyPaytoUri,
  TalerProtocolTimestamp,
  Transaction,
  TransactionDeposit,
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
import { ShowFullContractTermPopup } from "../components/ShowFullContractTermPopup.js";
import {
  CenteredDialog,
  InfoBox,
  ListOfProducts,
  Overlay,
  Row,
  SmallLightText,
  SubTitle,
  WarningBox,
} from "../components/styled/index.js";
import { Time } from "../components/Time.js";
import { useTranslationContext } from "../context/translation.js";
import { useAsyncAsHook } from "../hooks/useAsyncAsHook.js";
import { Button } from "../mui/Button.js";
import { Pages } from "../NavigationBar.js";
import * as wxApi from "../wxApi.js";

interface Props {
  tid: string;
  goToWalletHistory: (currency?: string) => Promise<void>;
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
    return wxApi.onUpdateNotification(
      [NotificationType.WithdrawGroupFinished],
      () => {
        state?.retry();
      },
    );
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
      onRefund={(id) => wxApi.applyRefundFromPurchaseId(id).then()}
      onBack={() => goToWalletHistory(currency)}
    />
  );
}

export interface WalletTransactionProps {
  transaction: Transaction;
  onDelete: () => Promise<void>;
  onRetry: () => Promise<void>;
  onRefund: (id: string) => Promise<void>;
  onBack: () => Promise<void>;
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

  async function doCheckBeforeForget(): Promise<void> {
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
              <Button variant="contained" onClick={onRetry}>
                <i18n.Translate>Retry</i18n.Translate>
              </Button>
            ) : null}
            <Button
              variant="contained"
              color="error"
              onClick={doCheckBeforeForget}
            >
              <i18n.Translate>Forget</i18n.Translate>
            </Button>
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
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={async () => setConfirmBeforeForget(false)}
                >
                  <i18n.Translate>Cancel</i18n.Translate>
                </Button>

                <Button variant="contained" color="error" onClick={onDelete}>
                  <i18n.Translate>Confirm</i18n.Translate>
                </Button>
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

    const price = {
      raw: Amounts.parseOrThrow(transaction.amountRaw),
      effective: Amounts.parseOrThrow(transaction.amountEffective),
    };
    const refund = {
      raw: Amounts.parseOrThrow(transaction.totalRefundRaw),
      effective: Amounts.parseOrThrow(transaction.totalRefundEffective),
    };
    const total = Amounts.sub(price.effective, refund.effective).amount;

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
                          href={Pages.balanceTransaction({
                            tid: r.transactionId,
                          })}
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
                <Button
                  variant="contained"
                  onClick={() => onRefund(transaction.proposalId)}
                >
                  <i18n.Translate>Accept</i18n.Translate>
                </Button>
              </div>
            </div>
          </InfoBox>
        )}
        <Part
          title={<i18n.Translate>Merchant</i18n.Translate>}
          text={<MerchantDetails merchant={transaction.info.merchant} />}
          kind="neutral"
        />
        <Part
          title={<i18n.Translate>Invoice ID</i18n.Translate>}
          text={transaction.info.orderId}
          kind="neutral"
        />
        <Part
          title={<i18n.Translate>Details</i18n.Translate>}
          text={
            <PurchaseDetails
              price={price}
              refund={refund}
              info={transaction.info}
              proposalId={transaction.proposalId}
            />
          }
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
          text={<MerchantDetails merchant={transaction.merchant} />}
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
              href={Pages.balanceTransaction({
                tid: transaction.refundedTransactionId,
              })}
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

export function MerchantDetails({
  merchant,
}: {
  merchant: MerchantInfo;
}): VNode {
  return (
    <div style={{ display: "flex", flexDirection: "row" }}>
      {merchant.logo && (
        <div>
          <img
            src={merchant.logo}
            style={{ width: 64, height: 64, margin: 4 }}
          />
        </div>
      )}
      <div>
        <p style={{ marginTop: 0 }}>{merchant.name}</p>
        {merchant.website && (
          <a
            href={merchant.website}
            target="_blank"
            style={{ textDecorationColor: "gray" }}
            rel="noreferrer"
          >
            <SmallLightText>{merchant.website}</SmallLightText>
          </a>
        )}
        {merchant.email && (
          <a
            href={`mailto:${merchant.email}`}
            style={{ textDecorationColor: "gray" }}
          >
            <SmallLightText>{merchant.email}</SmallLightText>
          </a>
        )}
      </div>
    </div>
  );
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

export interface AmountWithFee {
  effective: AmountJson;
  raw: AmountJson;
}
export function PurchaseDetails({
  price,
  refund,
  info,
  proposalId,
}: {
  price: AmountWithFee;
  refund?: AmountWithFee;
  info: OrderShortInfo;
  proposalId: string;
}): VNode {
  const { i18n } = useTranslationContext();

  const partialFee = Amounts.sub(price.effective, price.raw).amount;

  const refundFee = !refund
    ? Amounts.getZero(price.effective.currency)
    : Amounts.sub(refund.raw, refund.effective).amount;

  const fee = Amounts.sum([partialFee, refundFee]).amount;

  const hasProducts = info.products && info.products.length > 0;

  const hasShipping =
    info.delivery_date !== undefined || info.delivery_location !== undefined;

  const showLargePic = (): void => {
    return;
  };

  const total = !refund
    ? price.effective
    : Amounts.sub(price.effective, refund.effective).amount;

  return (
    <PurchaseDetailsTable>
      <tr>
        <td>Price</td>
        <td>
          <Amount value={price.raw} />
        </td>
      </tr>

      {refund && Amounts.isNonZero(refund.raw) && (
        <tr>
          <td>Refunded</td>
          <td>
            <Amount value={refund.raw} negative />
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
                  {info.products?.map((p, k) => (
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
                  date={info.delivery_date}
                  location={info.delivery_location}
                />
              }
            />
          </td>
        </tr>
      )}
      <tr>
        <td>
          <ShowFullContractTermPopup proposalId={proposalId} />
        </td>
      </tr>
    </PurchaseDetailsTable>
  );
}

function RefundDetails({
  transaction,
}: {
  transaction: TransactionRefund;
}): VNode {
  const { i18n } = useTranslationContext();

  const r = Amounts.parseOrThrow(transaction.amountRaw);
  const e = Amounts.parseOrThrow(transaction.amountEffective);
  const fee = Amounts.sub(r, e).amount;

  const maxFrac = [r, e, fee]
    .map((a) => Amounts.maxFractionalDigits(a))
    .reduce((c, p) => Math.max(c, p), 0);

  return (
    <PurchaseDetailsTable>
      <tr>
        <td>Amount</td>
        <td>
          <Amount value={transaction.amountRaw} maxFracSize={maxFrac} />
        </td>
      </tr>

      {Amounts.isNonZero(fee) && (
        <tr>
          <td>Transaction fees</td>
          <td>
            <Amount value={fee} negative maxFracSize={maxFrac} />
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
          <Amount value={transaction.amountEffective} maxFracSize={maxFrac} />
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
  const r = Amounts.parseOrThrow(transaction.amountRaw);
  const e = Amounts.parseOrThrow(transaction.amountEffective);
  const fee = Amounts.sub(r, e).amount;

  const maxFrac = [r, e, fee]
    .map((a) => Amounts.maxFractionalDigits(a))
    .reduce((c, p) => Math.max(c, p), 0);

  return (
    <PurchaseDetailsTable>
      <tr>
        <td>Amount</td>
        <td>
          <Amount value={transaction.amountRaw} maxFracSize={maxFrac} />
        </td>
      </tr>

      {Amounts.isNonZero(fee) && (
        <tr>
          <td>Transaction fees</td>
          <td>
            <Amount value={fee} negative maxFracSize={maxFrac} />
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
          <Amount value={transaction.amountEffective} maxFracSize={maxFrac} />
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

  const r = Amounts.parseOrThrow(transaction.amountRaw);
  const e = Amounts.parseOrThrow(transaction.amountEffective);
  const fee = Amounts.sub(r, e).amount;

  const maxFrac = [r, e, fee]
    .map((a) => Amounts.maxFractionalDigits(a))
    .reduce((c, p) => Math.max(c, p), 0);

  return (
    <PurchaseDetailsTable>
      <tr>
        <td>Amount</td>
        <td>
          <Amount value={transaction.amountRaw} maxFracSize={maxFrac} />
        </td>
      </tr>
      <tr>
        <td>Transaction fees</td>
        <td>
          <Amount value={fee} negative maxFracSize={maxFrac} />
        </td>
      </tr>
      <tr>
        <td colSpan={2}>
          <hr />
        </td>
      </tr>
      <tr>
        <td>Total</td>
        <td>
          <Amount value={transaction.amountEffective} maxFracSize={maxFrac} />
        </td>
      </tr>
    </PurchaseDetailsTable>
  );
}

function TipDetails({ transaction }: { transaction: TransactionTip }): VNode {
  const { i18n } = useTranslationContext();

  const r = Amounts.parseOrThrow(transaction.amountRaw);
  const e = Amounts.parseOrThrow(transaction.amountEffective);
  const fee = Amounts.sub(r, e).amount;

  const maxFrac = [r, e, fee]
    .map((a) => Amounts.maxFractionalDigits(a))
    .reduce((c, p) => Math.max(c, p), 0);

  return (
    <PurchaseDetailsTable>
      <tr>
        <td>Amount</td>
        <td>
          <Amount value={transaction.amountRaw} maxFracSize={maxFrac} />
        </td>
      </tr>

      {Amounts.isNonZero(fee) && (
        <tr>
          <td>Transaction fees</td>
          <td>
            <Amount value={fee} negative maxFracSize={maxFrac} />
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
          <Amount value={transaction.amountEffective} maxFracSize={maxFrac} />
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

  const r = Amounts.parseOrThrow(transaction.amountRaw);
  const e = Amounts.parseOrThrow(transaction.amountEffective);
  const fee = Amounts.sub(r, e).amount;

  const maxFrac = [r, e, fee]
    .map((a) => Amounts.maxFractionalDigits(a))
    .reduce((c, p) => Math.max(c, p), 0);

  return (
    <PurchaseDetailsTable>
      <tr>
        <td>Withdraw</td>
        <td>
          <Amount value={transaction.amountRaw} maxFracSize={maxFrac} />
        </td>
      </tr>

      {Amounts.isNonZero(fee) && (
        <tr>
          <td>Transaction fees</td>
          <td>
            <Amount value={fee} negative maxFracSize={maxFrac} />
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
          <Amount value={transaction.amountEffective} maxFracSize={maxFrac} />
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
            text={<Amount value={total} negative={kind === "negative"} />}
            kind={kind}
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
