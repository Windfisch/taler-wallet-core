/*
 This file is part of GNU Taler
 (C) 2019 GNUnet e.V.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

/**
 * Imports.
 */
import { InternalWalletState } from "./state";
import {
  Stores,
  TipRecord,
  ProposalStatus,
  ProposalRecord,
  PlanchetRecord,
  CoinRecord,
} from "../types/dbTypes";
import * as Amounts from "../util/amounts";
import { AmountJson } from "../util/amounts";
import {
  HistoryQuery,
  HistoryEvent,
  HistoryEventType,
  OrderShortInfo,
  ReserveType,
  ReserveCreationDetail,
  VerbosePayCoinDetails,
  VerboseWithdrawDetails,
  VerboseRefreshDetails,
} from "../types/history";
import { assertUnreachable } from "../util/assertUnreachable";
import { TransactionHandle, Store } from "../util/query";
import { ReserveTransactionType } from "../types/ReserveTransaction";
import { timestampCmp } from "../util/time";

/**
 * Create an event ID from the type and the primary key for the event.
 */
function makeEventId(type: HistoryEventType, ...args: string[]) {
  return type + ";" + args.map(x => encodeURIComponent(x)).join(";");
}

function getOrderShortInfo(
  proposal: ProposalRecord,
): OrderShortInfo | undefined {
  const download = proposal.download;
  if (!download) {
    return undefined;
  }
  return {
    amount: Amounts.toString(download.contractData.amount),
    orderId: download.contractData.orderId,
    merchantBaseUrl: download.contractData.merchantBaseUrl,
    proposalId: proposal.proposalId,
    summary: download.contractData.summary,
  };
}

async function collectProposalHistory(
  tx: TransactionHandle,
  history: HistoryEvent[],
  historyQuery?: HistoryQuery,
) {
  tx.iter(Stores.proposals).forEachAsync(async proposal => {
    const status = proposal.proposalStatus;
    switch (status) {
      case ProposalStatus.ACCEPTED:
        {
          const shortInfo = getOrderShortInfo(proposal);
          if (!shortInfo) {
            break;
          }
          history.push({
            type: HistoryEventType.OrderAccepted,
            eventId: makeEventId(
              HistoryEventType.OrderAccepted,
              proposal.proposalId,
            ),
            orderShortInfo: shortInfo,
            timestamp: proposal.timestamp,
          });
        }
        break;
      case ProposalStatus.DOWNLOADING:
      case ProposalStatus.PROPOSED:
        // no history event needed
        break;
      case ProposalStatus.REFUSED:
        {
          const shortInfo = getOrderShortInfo(proposal);
          if (!shortInfo) {
            break;
          }
          history.push({
            type: HistoryEventType.OrderRefused,
            eventId: makeEventId(
              HistoryEventType.OrderRefused,
              proposal.proposalId,
            ),
            orderShortInfo: shortInfo,
            timestamp: proposal.timestamp,
          });
        }
        break;
      case ProposalStatus.REPURCHASE:
        {
          const alreadyPaidProposal = await tx.get(
            Stores.proposals,
            proposal.repurchaseProposalId,
          );
          if (!alreadyPaidProposal) {
            break;
          }
          const alreadyPaidOrderShortInfo = getOrderShortInfo(
            alreadyPaidProposal,
          );
          if (!alreadyPaidOrderShortInfo) {
            break;
          }
          const newOrderShortInfo = getOrderShortInfo(proposal);
          if (!newOrderShortInfo) {
            break;
          }
          history.push({
            type: HistoryEventType.OrderRedirected,
            eventId: makeEventId(
              HistoryEventType.OrderRedirected,
              proposal.proposalId,
            ),
            alreadyPaidOrderShortInfo,
            newOrderShortInfo,
            timestamp: proposal.timestamp,
          });
        }
        break;
      default:
        assertUnreachable(status);
    }
  });
}

/**
 * Retrive the full event history for this wallet.
 */
export async function getHistory(
  ws: InternalWalletState,
  historyQuery?: HistoryQuery,
): Promise<{ history: HistoryEvent[] }> {
  const history: HistoryEvent[] = [];

  // FIXME: do pagination instead of generating the full history
  // We uniquely identify history rows via their timestamp.
  // This works as timestamps are guaranteed to be monotonically
  // increasing even

  await ws.db.runWithReadTransaction(
    [
      Stores.currencies,
      Stores.coins,
      Stores.denominations,
      Stores.exchanges,
      Stores.exchangeUpdatedEvents,
      Stores.proposals,
      Stores.purchases,
      Stores.refreshGroups,
      Stores.reserves,
      Stores.tips,
      Stores.withdrawalSession,
      Stores.payEvents,
      Stores.refundEvents,
      Stores.reserveUpdatedEvents,
    ],
    async tx => {
      tx.iter(Stores.exchanges).forEach(exchange => {
        history.push({
          type: HistoryEventType.ExchangeAdded,
          builtIn: false,
          eventId: makeEventId(
            HistoryEventType.ExchangeAdded,
            exchange.baseUrl,
          ),
          exchangeBaseUrl: exchange.baseUrl,
          timestamp: exchange.timestampAdded,
        });
      });

      tx.iter(Stores.exchangeUpdatedEvents).forEach(eu => {
        history.push({
          type: HistoryEventType.ExchangeUpdated,
          eventId: makeEventId(
            HistoryEventType.ExchangeUpdated,
            eu.exchangeBaseUrl,
          ),
          exchangeBaseUrl: eu.exchangeBaseUrl,
          timestamp: eu.timestamp,
        });
      });

      tx.iter(Stores.withdrawalSession).forEach(wsr => {
        if (wsr.timestampFinish) {
          const cs: PlanchetRecord[] = [];
          wsr.planchets.forEach((x) => {
            if (x) {
              cs.push(x);
            }
          });

          let verboseDetails: VerboseWithdrawDetails | undefined = undefined;
          if (historyQuery?.verboseDetails) {
            verboseDetails = {
              coins: cs.map((x) => ({
                value: Amounts.toString(x.coinValue),
                denomPub: x.denomPub,
              })),
            };
          }
          
          history.push({
            type: HistoryEventType.Withdrawn,
            withdrawSessionId: wsr.withdrawSessionId,
            eventId: makeEventId(
              HistoryEventType.Withdrawn,
              wsr.withdrawSessionId,
            ),
            amountWithdrawnEffective: Amounts.toString(wsr.totalCoinValue),
            amountWithdrawnRaw: Amounts.toString(wsr.rawWithdrawalAmount),
            exchangeBaseUrl: wsr.exchangeBaseUrl,
            timestamp: wsr.timestampFinish,
            withdrawalSource: wsr.source,
            verboseDetails,
          });
        }
      });

      await collectProposalHistory(tx, history, historyQuery);

      await tx.iter(Stores.payEvents).forEachAsync(async pe => {
        const proposal = await tx.get(Stores.proposals, pe.proposalId);
        if (!proposal) {
          return;
        }
        const purchase = await tx.get(Stores.purchases, pe.proposalId);
        if (!purchase) {
          return;
        }
        const orderShortInfo = getOrderShortInfo(proposal);
        if (!orderShortInfo) {
          return;
        }
        let verboseDetails: VerbosePayCoinDetails | undefined = undefined;
        if (historyQuery?.verboseDetails) {
          const coins: {
            value: string,
            contribution: string;
            denomPub: string;
          }[] = [];
          for (const x of purchase.payReq.coins) {
            const c = await tx.get(Stores.coins, x.coin_pub);
            if (!c) {
              // FIXME: what to do here??
              continue;
            }
            const d = await tx.get(Stores.denominations, [c.exchangeBaseUrl, c.denomPub]);
            if (!d) {
              // FIXME: what to do here??
              continue;
            }
            coins.push({
              contribution: x.contribution,
              denomPub: c.denomPub,
              value: Amounts.toString(d.value),
            });
          }
          verboseDetails = { coins }; 
        }
        const amountPaidWithFees = Amounts.sum(
          purchase.payReq.coins.map(x => Amounts.parseOrThrow(x.contribution)),
        ).amount;
        history.push({
          type: HistoryEventType.PaymentSent,
          eventId: makeEventId(HistoryEventType.PaymentSent, pe.proposalId),
          orderShortInfo,
          replay: pe.isReplay,
          sessionId: pe.sessionId,
          timestamp: pe.timestamp,
          numCoins: purchase.payReq.coins.length,
          amountPaidWithFees: Amounts.toString(amountPaidWithFees),
          verboseDetails,
        });
      });

      await tx.iter(Stores.refreshGroups).forEachAsync(async rg => {
        if (!rg.timestampFinished) {
          return;
        }
        let numInputCoins = 0;
        let numRefreshedInputCoins = 0;
        let numOutputCoins = 0;
        const amountsRaw: AmountJson[] = [];
        const amountsEffective: AmountJson[] = [];
        for (let i = 0; i < rg.refreshSessionPerCoin.length; i++) {
          const session = rg.refreshSessionPerCoin[i];
          numInputCoins++;
          const c = await tx.get(Stores.coins, rg.oldCoinPubs[i]);
          if (!c) {
            continue;
          }
          if (session) {
            numRefreshedInputCoins++;
            amountsRaw.push(session.amountRefreshInput);
            amountsRaw.push(c.currentAmount);
            amountsEffective.push(session.amountRefreshOutput);
            numOutputCoins += session.newDenoms.length;
          } else {
            amountsRaw.push(c.currentAmount);
          }
        }
        let amountRefreshedRaw = Amounts.sum(amountsRaw).amount;
        let amountRefreshedEffective: AmountJson;
        if (amountsEffective.length == 0) {
          amountRefreshedEffective = Amounts.getZero(
            amountRefreshedRaw.currency,
          );
        } else {
          amountRefreshedEffective = Amounts.sum(amountsEffective).amount;
        }
        let verboseDetails: VerboseRefreshDetails | undefined = undefined;
        if (historyQuery?.verboseDetails) {
          const outputCoins: {
            value: string;
            denomPub: string,
          }[] = [];
          for (const rs of rg.refreshSessionPerCoin) {
            if (!rs) {
              continue;
            }
            for (const nd of rs.newDenoms) {
              if (!nd) {
                continue;
              }
              const d = await tx.get(Stores.denominations, [rs.exchangeBaseUrl, nd]);
              if (!d) {
                continue;
              }
              outputCoins.push({
                denomPub: d.denomPub,
                value: Amounts.toString(d.value),
              });
            }
          }
          verboseDetails = {
            outputCoins: outputCoins,
          }
        }
        history.push({
          type: HistoryEventType.Refreshed,
          refreshGroupId: rg.refreshGroupId,
          eventId: makeEventId(HistoryEventType.Refreshed, rg.refreshGroupId),
          timestamp: rg.timestampFinished,
          refreshReason: rg.reason,
          amountRefreshedEffective: Amounts.toString(amountRefreshedEffective),
          amountRefreshedRaw: Amounts.toString(amountRefreshedRaw),
          numInputCoins,
          numOutputCoins,
          numRefreshedInputCoins,
          verboseDetails,
        });
      });

      tx.iter(Stores.reserveUpdatedEvents).forEachAsync(async ru => {
        const reserve = await tx.get(Stores.reserves, ru.reservePub);
        if (!reserve) {
          return;
        }
        let reserveCreationDetail: ReserveCreationDetail;
        if (reserve.bankWithdrawStatusUrl) {
          reserveCreationDetail = {
            type: ReserveType.TalerBankWithdraw,
            bankUrl: reserve.bankWithdrawStatusUrl,
          };
        } else {
          reserveCreationDetail = {
            type: ReserveType.Manual,
          };
        }
        history.push({
          type: HistoryEventType.ReserveBalanceUpdated,
          eventId: makeEventId(
            HistoryEventType.ReserveBalanceUpdated,
            ru.reserveUpdateId,
          ),
          amountExpected: ru.amountExpected,
          amountReserveBalance: ru.amountReserveBalance,
          timestamp: ru.timestamp,
          newHistoryTransactions: ru.newHistoryTransactions,
          reserveShortInfo: {
            exchangeBaseUrl: reserve.exchangeBaseUrl,
            reserveCreationDetail,
            reservePub: reserve.reservePub,
          },
        });
      });

      tx.iter(Stores.tips).forEach(tip => {
        if (tip.acceptedTimestamp) {
          history.push({
            type: HistoryEventType.TipAccepted,
            eventId: makeEventId(HistoryEventType.TipAccepted, tip.tipId),
            timestamp: tip.acceptedTimestamp,
            tipId: tip.tipId,
            tipAmountRaw: Amounts.toString(tip.amount),
          });
        }
      });

      tx.iter(Stores.refundEvents).forEachAsync(async re => {
        const proposal = await tx.get(Stores.proposals, re.proposalId);
        if (!proposal) {
          return;
        }
        const purchase = await tx.get(Stores.purchases, re.proposalId);
        if (!purchase) {
          return;
        }
        const orderShortInfo = getOrderShortInfo(proposal);
        if (!orderShortInfo) {
          return;
        }
        const purchaseAmount = purchase.contractData.amount;
        let amountRefundedRaw = Amounts.getZero(purchaseAmount.currency);
        let amountRefundedInvalid = Amounts.getZero(purchaseAmount.currency);
        let amountRefundedEffective = Amounts.getZero(purchaseAmount.currency);
        Object.keys(purchase.refundState.refundsDone).forEach((x, i) => {
          const r = purchase.refundState.refundsDone[x];
          if (r.refundGroupId !== re.refundGroupId) {
            return;
          }
          const refundAmount = Amounts.parseOrThrow(r.perm.refund_amount);
          const refundFee = Amounts.parseOrThrow(r.perm.refund_fee);
          amountRefundedRaw = Amounts.add(amountRefundedRaw, refundAmount)
            .amount;
          amountRefundedEffective = Amounts.add(
            amountRefundedEffective,
            refundAmount,
          ).amount;
          amountRefundedEffective = Amounts.sub(
            amountRefundedEffective,
            refundFee,
          ).amount;
        });
        Object.keys(purchase.refundState.refundsFailed).forEach((x, i) => {
          const r = purchase.refundState.refundsFailed[x];
          if (r.refundGroupId !== re.refundGroupId) {
            return;
          }
          const ra = Amounts.parseOrThrow(r.perm.refund_amount);
          const refundFee = Amounts.parseOrThrow(r.perm.refund_fee);
          amountRefundedRaw = Amounts.add(amountRefundedRaw, ra).amount;
          amountRefundedInvalid = Amounts.add(amountRefundedInvalid, ra).amount;
          amountRefundedEffective = Amounts.sub(
            amountRefundedEffective,
            refundFee,
          ).amount;
        });
        history.push({
          type: HistoryEventType.Refund,
          eventId: makeEventId(HistoryEventType.Refund, re.refundGroupId),
          refundGroupId: re.refundGroupId,
          orderShortInfo,
          timestamp: re.timestamp,
          amountRefundedEffective: Amounts.toString(amountRefundedEffective),
          amountRefundedRaw: Amounts.toString(amountRefundedRaw),
          amountRefundedInvalid: Amounts.toString(amountRefundedInvalid),
        });
      });
    },
  );

  history.sort((h1, h2) => timestampCmp(h1.timestamp, h2.timestamp));

  return { history };
}
