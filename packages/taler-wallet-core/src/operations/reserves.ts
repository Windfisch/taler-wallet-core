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

import {
  AcceptWithdrawalResponse,
  addPaytoQueryParams,
  Amounts,
  canonicalizeBaseUrl,
  codecForBankWithdrawalOperationPostResponse,
  codecForReserveStatus,
  codecForWithdrawOperationStatusResponse,
  CreateReserveRequest,
  CreateReserveResponse,
  Duration,
  durationMax,
  durationMin,
  encodeCrock,
  getRandomBytes,
  j2s,
  Logger,
  NotificationType,
  randomBytes,
  TalerErrorCode,
  TalerErrorDetail,
  AbsoluteTime,
  URL,
} from "@gnu-taler/taler-util";
import { InternalWalletState } from "../common.js";
import {
  OperationStatus,
  ReserveBankInfo,
  ReserveRecord,
  ReserveRecordStatus,
  WalletStoresV1,
  WithdrawalGroupRecord,
} from "../db.js";
import { guardOperationException, TalerError } from "../errors.js";
import { assertUnreachable } from "../util/assertUnreachable.js";
import {
  readSuccessResponseJsonOrErrorCode,
  readSuccessResponseJsonOrThrow,
  throwUnexpectedRequestError,
} from "../util/http.js";
import { GetReadOnlyAccess } from "../util/query.js";
import {
  getRetryDuration,
  initRetryInfo,
  updateRetryInfoTimeout,
} from "../util/retries.js";
import {
  getExchangeDetails,
  getExchangePaytoUri,
  getExchangeTrust,
  updateExchangeFromUrl,
} from "./exchanges.js";
import {
  denomSelectionInfoToState,
  getBankWithdrawalInfo,
  getCandidateWithdrawalDenoms,
  processWithdrawGroup,
  selectWithdrawalDenominations,
  updateWithdrawalDenoms,
} from "./withdraw.js";

const logger = new Logger("taler-wallet-core:reserves.ts");

/**
 * Reset the retry counter for the reserve
 * and reset the last error.
 */
async function resetReserveRetry(
  ws: InternalWalletState,
  reservePub: string,
): Promise<void> {
  await ws.db
    .mktx((x) => ({
      reserves: x.reserves,
    }))
    .runReadWrite(async (tx) => {
      const x = await tx.reserves.get(reservePub);
      if (x) {
        x.retryInfo = initRetryInfo();
        delete x.lastError;
        await tx.reserves.put(x);
      }
    });
}

/**
 * Increment the retry counter for the reserve and
 * reset the last eror.
 */
async function incrementReserveRetry(
  ws: InternalWalletState,
  reservePub: string,
): Promise<void> {
  await ws.db
    .mktx((x) => ({
      reserves: x.reserves,
    }))
    .runReadWrite(async (tx) => {
      const r = await tx.reserves.get(reservePub);
      if (!r) {
        return;
      }
      if (!r.retryInfo) {
        r.retryInfo = initRetryInfo();
      } else {
        r.retryInfo.retryCounter++;
        updateRetryInfoTimeout(r.retryInfo);
      }
      delete r.lastError;
      await tx.reserves.put(r);
    });
}

/**
 * Report an error that happened while processing the reserve.
 *
 * Logs the error via a notification and by storing it in the database.
 */
async function reportReserveError(
  ws: InternalWalletState,
  reservePub: string,
  err: TalerErrorDetail,
): Promise<void> {
  await ws.db
    .mktx((x) => ({
      reserves: x.reserves,
    }))
    .runReadWrite(async (tx) => {
      const r = await tx.reserves.get(reservePub);
      if (!r) {
        return;
      }
      if (!r.retryInfo) {
        logger.error(`got reserve error for inactive reserve (no retryInfo)`);
        return;
      }
      r.lastError = err;
      await tx.reserves.put(r);
    });
  ws.notify({
    type: NotificationType.ReserveOperationError,
    error: err,
  });
}

/**
 * Create a reserve, but do not flag it as confirmed yet.
 *
 * Adds the corresponding exchange as a trusted exchange if it is neither
 * audited nor trusted already.
 */
export async function createReserve(
  ws: InternalWalletState,
  req: CreateReserveRequest,
): Promise<CreateReserveResponse> {
  const keypair = await ws.cryptoApi.createEddsaKeypair();
  const now = AbsoluteTime.toTimestamp(AbsoluteTime.now());
  const canonExchange = canonicalizeBaseUrl(req.exchange);

  let reserveStatus;
  if (req.bankWithdrawStatusUrl) {
    reserveStatus = ReserveRecordStatus.RegisteringBank;
  } else {
    reserveStatus = ReserveRecordStatus.QueryingStatus;
  }

  let bankInfo: ReserveBankInfo | undefined;

  if (req.bankWithdrawStatusUrl) {
    if (!req.exchangePaytoUri) {
      throw Error(
        "Exchange payto URI must be specified for a bank-integrated withdrawal",
      );
    }
    bankInfo = {
      statusUrl: req.bankWithdrawStatusUrl,
      exchangePaytoUri: req.exchangePaytoUri,
    };
  }

  const initialWithdrawalGroupId = encodeCrock(getRandomBytes(32));

  await updateWithdrawalDenoms(ws, canonExchange);
  const denoms = await getCandidateWithdrawalDenoms(ws, canonExchange);
  const denomSelInfo = selectWithdrawalDenominations(req.amount, denoms);
  const initialDenomSel = denomSelectionInfoToState(denomSelInfo);

  const reserveRecord: ReserveRecord = {
    instructedAmount: req.amount,
    initialWithdrawalGroupId,
    initialDenomSel,
    initialWithdrawalStarted: false,
    timestampCreated: now,
    exchangeBaseUrl: canonExchange,
    reservePriv: keypair.priv,
    reservePub: keypair.pub,
    senderWire: req.senderWire,
    timestampBankConfirmed: undefined,
    timestampReserveInfoPosted: undefined,
    bankInfo,
    reserveStatus,
    retryInfo: initRetryInfo(),
    lastError: undefined,
    currency: req.amount.currency,
    operationStatus: OperationStatus.Pending,
  };

  const exchangeInfo = await updateExchangeFromUrl(ws, req.exchange);
  const exchangeDetails = exchangeInfo.exchangeDetails;
  if (!exchangeDetails) {
    logger.trace(exchangeDetails);
    throw Error("exchange not updated");
  }
  const { isAudited, isTrusted } = await getExchangeTrust(
    ws,
    exchangeInfo.exchange,
  );

  const resp = await ws.db
    .mktx((x) => ({
      exchangeTrust: x.exchangeTrust,
      reserves: x.reserves,
      bankWithdrawUris: x.bankWithdrawUris,
    }))
    .runReadWrite(async (tx) => {
      // Check if we have already created a reserve for that bankWithdrawStatusUrl
      if (reserveRecord.bankInfo?.statusUrl) {
        const bwi = await tx.bankWithdrawUris.get(
          reserveRecord.bankInfo.statusUrl,
        );
        if (bwi) {
          const otherReserve = await tx.reserves.get(bwi.reservePub);
          if (otherReserve) {
            logger.trace(
              "returning existing reserve for bankWithdrawStatusUri",
            );
            return {
              exchange: otherReserve.exchangeBaseUrl,
              reservePub: otherReserve.reservePub,
            };
          }
        }
        await tx.bankWithdrawUris.put({
          reservePub: reserveRecord.reservePub,
          talerWithdrawUri: reserveRecord.bankInfo.statusUrl,
        });
      }
      if (!isAudited && !isTrusted) {
        await tx.exchangeTrust.put({
          currency: reserveRecord.currency,
          exchangeBaseUrl: reserveRecord.exchangeBaseUrl,
          exchangeMasterPub: exchangeDetails.masterPublicKey,
          uids: [encodeCrock(getRandomBytes(32))],
        });
      }
      await tx.reserves.put(reserveRecord);
      const r: CreateReserveResponse = {
        exchange: canonExchange,
        reservePub: keypair.pub,
      };
      return r;
    });

  if (reserveRecord.reservePub === resp.reservePub) {
    // Only emit notification when a new reserve was created.
    ws.notify({
      type: NotificationType.ReserveCreated,
      reservePub: reserveRecord.reservePub,
    });
  }

  // Asynchronously process the reserve, but return
  // to the caller already.
  processReserve(ws, resp.reservePub, true).catch((e) => {
    logger.error("Processing reserve (after createReserve) failed:", e);
  });

  return resp;
}

/**
 * Re-query the status of a reserve.
 */
export async function forceQueryReserve(
  ws: InternalWalletState,
  reservePub: string,
): Promise<void> {
  await ws.db
    .mktx((x) => ({
      reserves: x.reserves,
    }))
    .runReadWrite(async (tx) => {
      const reserve = await tx.reserves.get(reservePub);
      if (!reserve) {
        return;
      }
      // Only force status query where it makes sense
      switch (reserve.reserveStatus) {
        case ReserveRecordStatus.Dormant:
          reserve.reserveStatus = ReserveRecordStatus.QueryingStatus;
          reserve.operationStatus = OperationStatus.Pending;
          reserve.retryInfo = initRetryInfo();
          break;
        default:
          break;
      }
      await tx.reserves.put(reserve);
    });
  await processReserve(ws, reservePub, true);
}

/**
 * First fetch information required to withdraw from the reserve,
 * then deplete the reserve, withdrawing coins until it is empty.
 *
 * The returned promise resolves once the reserve is set to the
 * state "Dormant".
 */
export async function processReserve(
  ws: InternalWalletState,
  reservePub: string,
  forceNow = false,
): Promise<void> {
  return ws.memoProcessReserve.memo(reservePub, async () => {
    const onOpError = (err: TalerErrorDetail): Promise<void> =>
      reportReserveError(ws, reservePub, err);
    await guardOperationException(
      () => processReserveImpl(ws, reservePub, forceNow),
      onOpError,
    );
  });
}

async function registerReserveWithBank(
  ws: InternalWalletState,
  reservePub: string,
): Promise<void> {
  const reserve = await ws.db
    .mktx((x) => ({
      reserves: x.reserves,
    }))
    .runReadOnly(async (tx) => {
      return await tx.reserves.get(reservePub);
    });
  switch (reserve?.reserveStatus) {
    case ReserveRecordStatus.WaitConfirmBank:
    case ReserveRecordStatus.RegisteringBank:
      break;
    default:
      return;
  }
  const bankInfo = reserve.bankInfo;
  if (!bankInfo) {
    return;
  }
  const bankStatusUrl = bankInfo.statusUrl;
  const httpResp = await ws.http.postJson(
    bankStatusUrl,
    {
      reserve_pub: reservePub,
      selected_exchange: bankInfo.exchangePaytoUri,
    },
    {
      timeout: getReserveRequestTimeout(reserve),
    },
  );
  await readSuccessResponseJsonOrThrow(
    httpResp,
    codecForBankWithdrawalOperationPostResponse(),
  );
  await ws.db
    .mktx((x) => ({
      reserves: x.reserves,
    }))
    .runReadWrite(async (tx) => {
      const r = await tx.reserves.get(reservePub);
      if (!r) {
        return;
      }
      switch (r.reserveStatus) {
        case ReserveRecordStatus.RegisteringBank:
        case ReserveRecordStatus.WaitConfirmBank:
          break;
        default:
          return;
      }
      r.timestampReserveInfoPosted = AbsoluteTime.toTimestamp(
        AbsoluteTime.now(),
      );
      r.reserveStatus = ReserveRecordStatus.WaitConfirmBank;
      r.operationStatus = OperationStatus.Pending;
      if (!r.bankInfo) {
        throw Error("invariant failed");
      }
      r.retryInfo = initRetryInfo();
      await tx.reserves.put(r);
    });
  ws.notify({ type: NotificationType.ReserveRegisteredWithBank });
  return processReserveBankStatus(ws, reservePub);
}

export function getReserveRequestTimeout(r: ReserveRecord): Duration {
  return durationMax(
    { d_ms: 60000 },
    durationMin({ d_ms: 5000 }, getRetryDuration(r.retryInfo)),
  );
}

async function processReserveBankStatus(
  ws: InternalWalletState,
  reservePub: string,
): Promise<void> {
  const reserve = await ws.db
    .mktx((x) => ({
      reserves: x.reserves,
    }))
    .runReadOnly(async (tx) => {
      return tx.reserves.get(reservePub);
    });
  switch (reserve?.reserveStatus) {
    case ReserveRecordStatus.WaitConfirmBank:
    case ReserveRecordStatus.RegisteringBank:
      break;
    default:
      return;
  }
  const bankStatusUrl = reserve.bankInfo?.statusUrl;
  if (!bankStatusUrl) {
    return;
  }

  const statusResp = await ws.http.get(bankStatusUrl, {
    timeout: getReserveRequestTimeout(reserve),
  });
  const status = await readSuccessResponseJsonOrThrow(
    statusResp,
    codecForWithdrawOperationStatusResponse(),
  );

  if (status.aborted) {
    logger.trace("bank aborted the withdrawal");
    await ws.db
      .mktx((x) => ({
        reserves: x.reserves,
      }))
      .runReadWrite(async (tx) => {
        const r = await tx.reserves.get(reservePub);
        if (!r) {
          return;
        }
        switch (r.reserveStatus) {
          case ReserveRecordStatus.RegisteringBank:
          case ReserveRecordStatus.WaitConfirmBank:
            break;
          default:
            return;
        }
        const now = AbsoluteTime.toTimestamp(AbsoluteTime.now());
        r.timestampBankConfirmed = now;
        r.reserveStatus = ReserveRecordStatus.BankAborted;
        r.operationStatus = OperationStatus.Finished;
        r.retryInfo = initRetryInfo();
        await tx.reserves.put(r);
      });
    return;
  }

  if (status.selection_done) {
    if (reserve.reserveStatus === ReserveRecordStatus.RegisteringBank) {
      await registerReserveWithBank(ws, reservePub);
      return await processReserveBankStatus(ws, reservePub);
    }
  } else {
    await registerReserveWithBank(ws, reservePub);
    return await processReserveBankStatus(ws, reservePub);
  }

  await ws.db
    .mktx((x) => ({
      reserves: x.reserves,
    }))
    .runReadWrite(async (tx) => {
      const r = await tx.reserves.get(reservePub);
      if (!r) {
        return;
      }
      if (status.transfer_done) {
        switch (r.reserveStatus) {
          case ReserveRecordStatus.RegisteringBank:
          case ReserveRecordStatus.WaitConfirmBank:
            break;
          default:
            return;
        }
        const now = AbsoluteTime.toTimestamp(AbsoluteTime.now());
        r.timestampBankConfirmed = now;
        r.reserveStatus = ReserveRecordStatus.QueryingStatus;
        r.operationStatus = OperationStatus.Pending;
        r.retryInfo = initRetryInfo();
      } else {
        switch (r.reserveStatus) {
          case ReserveRecordStatus.WaitConfirmBank:
            break;
          default:
            return;
        }
        if (r.bankInfo) {
          r.bankInfo.confirmUrl = status.confirm_transfer_url;
        }
      }
      await tx.reserves.put(r);
    });
}

/**
 * Update the information about a reserve that is stored in the wallet
 * by querying the reserve's exchange.
 *
 * If the reserve have funds that are not allocated in a withdrawal group yet
 * and are big enough to withdraw with available denominations,
 * create a new withdrawal group for the remaining amount.
 */
async function updateReserve(
  ws: InternalWalletState,
  reservePub: string,
): Promise<{ ready: boolean }> {
  const reserve = await ws.db
    .mktx((x) => ({
      reserves: x.reserves,
    }))
    .runReadOnly(async (tx) => {
      return tx.reserves.get(reservePub);
    });
  if (!reserve) {
    throw Error("reserve not in db");
  }

  if (reserve.reserveStatus !== ReserveRecordStatus.QueryingStatus) {
    return { ready: true };
  }

  const resp = await ws.http.get(
    new URL(`reserves/${reservePub}`, reserve.exchangeBaseUrl).href,
    {
      timeout: getReserveRequestTimeout(reserve),
    },
  );

  const result = await readSuccessResponseJsonOrErrorCode(
    resp,
    codecForReserveStatus(),
  );

  if (result.isError) {
    if (
      resp.status === 404 &&
      result.talerErrorResponse.code ===
        TalerErrorCode.EXCHANGE_RESERVES_STATUS_UNKNOWN
    ) {
      ws.notify({
        type: NotificationType.ReserveNotYetFound,
        reservePub,
      });
      return { ready: false };
    } else {
      throwUnexpectedRequestError(resp, result.talerErrorResponse);
    }
  }

  logger.trace(`got reserve status ${j2s(result.response)}`);

  const reserveInfo = result.response;
  const reserveBalance = Amounts.parseOrThrow(reserveInfo.balance);
  const currency = reserveBalance.currency;

  await updateWithdrawalDenoms(ws, reserve.exchangeBaseUrl);
  const denoms = await getCandidateWithdrawalDenoms(
    ws,
    reserve.exchangeBaseUrl,
  );

  const newWithdrawalGroup = await ws.db
    .mktx((x) => ({
      planchets: x.planchets,
      withdrawalGroups: x.withdrawalGroups,
      reserves: x.reserves,
      denominations: x.denominations,
    }))
    .runReadWrite(async (tx) => {
      const newReserve = await tx.reserves.get(reserve.reservePub);
      if (!newReserve) {
        return;
      }
      let amountReservePlus = reserveBalance;
      let amountReserveMinus = Amounts.getZero(currency);

      // Subtract amount allocated in unfinished withdrawal groups
      // for this reserve from the available amount.
      await tx.withdrawalGroups.indexes.byReservePub
        .iter(reservePub)
        .forEachAsync(async (wg) => {
          if (wg.timestampFinish) {
            return;
          }
          await tx.planchets.indexes.byGroup
            .iter(wg.withdrawalGroupId)
            .forEachAsync(async (pr) => {
              if (pr.withdrawalDone) {
                return;
              }
              const denomInfo = await ws.getDenomInfo(
                ws,
                tx,
                wg.exchangeBaseUrl,
                pr.denomPubHash,
              );
              if (!denomInfo) {
                logger.error(`no denom info found for ${pr.denomPubHash}`);
                return;
              }
              amountReserveMinus = Amounts.add(
                amountReserveMinus,
                denomInfo.value,
                denomInfo.feeWithdraw,
              ).amount;
            });
        });

      const remainingAmount = Amounts.sub(
        amountReservePlus,
        amountReserveMinus,
      ).amount;
      const denomSelInfo = selectWithdrawalDenominations(
        remainingAmount,
        denoms,
      );

      logger.trace(
        `Remaining unclaimed amount in reseve is ${Amounts.stringify(
          remainingAmount,
        )} and can be withdrawn with ${
          denomSelInfo.selectedDenoms.length
        } coins`,
      );

      if (denomSelInfo.selectedDenoms.length === 0) {
        newReserve.reserveStatus = ReserveRecordStatus.Dormant;
        newReserve.operationStatus = OperationStatus.Finished;
        delete newReserve.lastError;
        delete newReserve.retryInfo;
        await tx.reserves.put(newReserve);
        return;
      }

      let withdrawalGroupId: string;

      if (!newReserve.initialWithdrawalStarted) {
        withdrawalGroupId = newReserve.initialWithdrawalGroupId;
        newReserve.initialWithdrawalStarted = true;
      } else {
        withdrawalGroupId = encodeCrock(randomBytes(32));
      }

      const withdrawalRecord: WithdrawalGroupRecord = {
        withdrawalGroupId: withdrawalGroupId,
        exchangeBaseUrl: reserve.exchangeBaseUrl,
        reservePub: reserve.reservePub,
        rawWithdrawalAmount: remainingAmount,
        timestampStart: AbsoluteTime.toTimestamp(AbsoluteTime.now()),
        retryInfo: initRetryInfo(),
        lastError: undefined,
        denomsSel: denomSelectionInfoToState(denomSelInfo),
        secretSeed: encodeCrock(getRandomBytes(64)),
        denomSelUid: encodeCrock(getRandomBytes(32)),
        operationStatus: OperationStatus.Pending,
      };

      delete newReserve.lastError;
      delete newReserve.retryInfo;
      newReserve.reserveStatus = ReserveRecordStatus.Dormant;
      newReserve.operationStatus = OperationStatus.Finished;

      await tx.reserves.put(newReserve);
      await tx.withdrawalGroups.put(withdrawalRecord);
      return withdrawalRecord;
    });

  if (newWithdrawalGroup) {
    logger.trace("processing new withdraw group");
    ws.notify({
      type: NotificationType.WithdrawGroupCreated,
      withdrawalGroupId: newWithdrawalGroup.withdrawalGroupId,
    });
    await processWithdrawGroup(ws, newWithdrawalGroup.withdrawalGroupId);
  }

  return { ready: true };
}

async function processReserveImpl(
  ws: InternalWalletState,
  reservePub: string,
  forceNow = false,
): Promise<void> {
  const reserve = await ws.db
    .mktx((x) => ({
      reserves: x.reserves,
    }))
    .runReadOnly(async (tx) => {
      return tx.reserves.get(reservePub);
    });
  if (!reserve) {
    logger.error(
      `not processing reserve: reserve ${reservePub} does not exist`,
    );
    return;
  }
  if (forceNow) {
    await resetReserveRetry(ws, reservePub);
  } else if (
    reserve.retryInfo &&
    !AbsoluteTime.isExpired(reserve.retryInfo.nextRetry)
  ) {
    logger.trace("processReserve retry not due yet");
    return;
  }
  await incrementReserveRetry(ws, reservePub);
  logger.trace(
    `Processing reserve ${reservePub} with status ${reserve.reserveStatus}`,
  );
  switch (reserve.reserveStatus) {
    case ReserveRecordStatus.RegisteringBank:
      await processReserveBankStatus(ws, reservePub);
      return await processReserveImpl(ws, reservePub, true);
    case ReserveRecordStatus.QueryingStatus:
      const res = await updateReserve(ws, reservePub);
      if (res.ready) {
        return await processReserveImpl(ws, reservePub, true);
      }
      break;
    case ReserveRecordStatus.Dormant:
      // nothing to do
      break;
    case ReserveRecordStatus.WaitConfirmBank:
      await processReserveBankStatus(ws, reservePub);
      break;
    case ReserveRecordStatus.BankAborted:
      break;
    default:
      console.warn("unknown reserve record status:", reserve.reserveStatus);
      assertUnreachable(reserve.reserveStatus);
      break;
  }
}

/**
 * Create a reserve for a bank-integrated withdrawal from
 * a taler://withdraw URI.
 */
export async function createTalerWithdrawReserve(
  ws: InternalWalletState,
  talerWithdrawUri: string,
  selectedExchange: string,
): Promise<AcceptWithdrawalResponse> {
  await updateExchangeFromUrl(ws, selectedExchange);
  const withdrawInfo = await getBankWithdrawalInfo(ws.http, talerWithdrawUri);
  const exchangePaytoUri = await getExchangePaytoUri(
    ws,
    selectedExchange,
    withdrawInfo.wireTypes,
  );
  const reserve = await createReserve(ws, {
    amount: withdrawInfo.amount,
    bankWithdrawStatusUrl: withdrawInfo.extractedStatusUrl,
    exchange: selectedExchange,
    senderWire: withdrawInfo.senderWire,
    exchangePaytoUri: exchangePaytoUri,
  });
  // We do this here, as the reserve should be registered before we return,
  // so that we can redirect the user to the bank's status page.
  await processReserveBankStatus(ws, reserve.reservePub);
  const processedReserve = await ws.db
    .mktx((x) => ({
      reserves: x.reserves,
    }))
    .runReadOnly(async (tx) => {
      return tx.reserves.get(reserve.reservePub);
    });
  if (processedReserve?.reserveStatus === ReserveRecordStatus.BankAborted) {
    throw TalerError.fromDetail(
      TalerErrorCode.WALLET_WITHDRAWAL_OPERATION_ABORTED_BY_BANK,
      {},
    );
  }
  return {
    reservePub: reserve.reservePub,
    confirmTransferUrl: withdrawInfo.confirmTransferUrl,
  };
}

/**
 * Get payto URIs that can be used to fund a reserve.
 */
export async function getFundingPaytoUris(
  tx: GetReadOnlyAccess<{
    reserves: typeof WalletStoresV1.reserves;
    exchanges: typeof WalletStoresV1.exchanges;
    exchangeDetails: typeof WalletStoresV1.exchangeDetails;
  }>,
  reservePub: string,
): Promise<string[]> {
  const r = await tx.reserves.get(reservePub);
  if (!r) {
    logger.error(`reserve ${reservePub} not found (DB corrupted?)`);
    return [];
  }
  const exchangeDetails = await getExchangeDetails(tx, r.exchangeBaseUrl);
  if (!exchangeDetails) {
    logger.error(`exchange ${r.exchangeBaseUrl} not found (DB corrupted?)`);
    return [];
  }
  const plainPaytoUris =
    exchangeDetails.wireInfo?.accounts.map((x) => x.payto_uri) ?? [];
  if (!plainPaytoUris) {
    logger.error(`exchange ${r.exchangeBaseUrl} has no wire info`);
    return [];
  }
  return plainPaytoUris.map((x) =>
    addPaytoQueryParams(x, {
      amount: Amounts.stringify(r.instructedAmount),
      message: `Taler Withdrawal ${r.reservePub}`,
    }),
  );
}
