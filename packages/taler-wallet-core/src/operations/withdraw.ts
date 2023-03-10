/*
 This file is part of GNU Taler
 (C) 2019-2021 Taler Systems SA

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
import {
  AbsoluteTime,
  AcceptManualWithdrawalResult,
  AcceptWithdrawalResponse,
  addPaytoQueryParams,
  AgeRestriction,
  AmountJson,
  AmountLike,
  Amounts,
  AmountString,
  BankWithdrawDetails,
  CancellationToken,
  canonicalizeBaseUrl,
  codecForBankWithdrawalOperationPostResponse,
  codecForReserveStatus,
  codecForTalerConfigResponse,
  codecForWithdrawBatchResponse,
  codecForWithdrawOperationStatusResponse,
  codecForWithdrawResponse,
  CoinStatus,
  DenomKeyType,
  DenomSelectionState,
  Duration,
  durationFromSpec,
  encodeCrock,
  ExchangeListItem,
  ExchangeWithdrawalDetails,
  ExchangeWithdrawRequest,
  ForcedDenomSel,
  getRandomBytes,
  HttpStatusCode,
  j2s,
  LibtoolVersion,
  Logger,
  NotificationType,
  parseWithdrawUri,
  TalerErrorCode,
  TalerErrorDetail,
  TalerProtocolTimestamp,
  TransactionType,
  UnblindedSignature,
  URL,
  WithdrawBatchResponse,
  WithdrawResponse,
  WithdrawUriInfoResponse,
} from "@gnu-taler/taler-util";
import { EddsaKeypair } from "../crypto/cryptoImplementation.js";
import {
  CoinRecord,
  CoinSourceType,
  DenominationRecord,
  DenominationVerificationStatus,
  PlanchetRecord,
  PlanchetStatus,
  WalletStoresV1,
  WgInfo,
  WithdrawalGroupRecord,
  WithdrawalGroupStatus,
  WithdrawalRecordType,
} from "../db.js";
import {
  getErrorDetailFromException,
  makeErrorDetail,
  TalerError,
} from "../errors.js";
import { InternalWalletState } from "../internal-wallet-state.js";
import {
  getExchangeTosStatus,
  makeCoinAvailable,
  makeExchangeListItem,
  runOperationWithErrorReporting,
} from "../operations/common.js";
import { walletCoreDebugFlags } from "../util/debugFlags.js";
import {
  HttpRequestLibrary,
  readSuccessResponseJsonOrErrorCode,
  readSuccessResponseJsonOrThrow,
  throwUnexpectedRequestError,
} from "../util/http.js";
import {
  checkDbInvariant,
  checkLogicInvariant,
  InvariantViolatedError,
} from "../util/invariants.js";
import { DbAccess, GetReadOnlyAccess } from "../util/query.js";
import {
  OperationAttemptResult,
  OperationAttemptResultType,
  RetryTags,
} from "../util/retries.js";
import {
  WALLET_BANK_INTEGRATION_PROTOCOL_VERSION,
  WALLET_EXCHANGE_PROTOCOL_VERSION,
} from "../versions.js";
import {
  makeTransactionId,
  storeOperationError,
  storeOperationPending,
} from "./common.js";
import {
  getExchangeDetails,
  getExchangePaytoUri,
  getExchangeTrust,
  updateExchangeFromUrl,
} from "./exchanges.js";

/**
 * Logger for this file.
 */
const logger = new Logger("operations/withdraw.ts");

/**
 * Check if a denom is withdrawable based on the expiration time,
 * revocation and offered state.
 */
export function isWithdrawableDenom(d: DenominationRecord): boolean {
  const now = AbsoluteTime.now();
  const start = AbsoluteTime.fromTimestamp(d.stampStart);
  const withdrawExpire = AbsoluteTime.fromTimestamp(d.stampExpireWithdraw);
  const started = AbsoluteTime.cmp(now, start) >= 0;
  let lastPossibleWithdraw: AbsoluteTime;
  if (walletCoreDebugFlags.denomselAllowLate) {
    lastPossibleWithdraw = start;
  } else {
    lastPossibleWithdraw = AbsoluteTime.subtractDuraction(
      withdrawExpire,
      durationFromSpec({ minutes: 5 }),
    );
  }
  const remaining = Duration.getRemaining(lastPossibleWithdraw, now);
  const stillOkay = remaining.d_ms !== 0;
  return started && stillOkay && !d.isRevoked && d.isOffered;
}

/**
 * Get a list of denominations (with repetitions possible)
 * whose total value is as close as possible to the available
 * amount, but never larger.
 */
export function selectWithdrawalDenominations(
  amountAvailable: AmountJson,
  denoms: DenominationRecord[],
): DenomSelectionState {
  let remaining = Amounts.copy(amountAvailable);

  const selectedDenoms: {
    count: number;
    denomPubHash: string;
  }[] = [];

  let totalCoinValue = Amounts.zeroOfCurrency(amountAvailable.currency);
  let totalWithdrawCost = Amounts.zeroOfCurrency(amountAvailable.currency);

  denoms = denoms.filter(isWithdrawableDenom);
  denoms.sort((d1, d2) =>
    Amounts.cmp(
      DenominationRecord.getValue(d2),
      DenominationRecord.getValue(d1),
    ),
  );

  for (const d of denoms) {
    let count = 0;
    const cost = Amounts.add(
      DenominationRecord.getValue(d),
      d.fees.feeWithdraw,
    ).amount;
    for (;;) {
      if (Amounts.cmp(remaining, cost) < 0) {
        break;
      }
      remaining = Amounts.sub(remaining, cost).amount;
      count++;
    }
    if (count > 0) {
      totalCoinValue = Amounts.add(
        totalCoinValue,
        Amounts.mult(DenominationRecord.getValue(d), count).amount,
      ).amount;
      totalWithdrawCost = Amounts.add(
        totalWithdrawCost,
        Amounts.mult(cost, count).amount,
      ).amount;
      selectedDenoms.push({
        count,
        denomPubHash: d.denomPubHash,
      });
    }

    if (Amounts.isZero(remaining)) {
      break;
    }
  }

  if (logger.shouldLogTrace()) {
    logger.trace(
      `selected withdrawal denoms for ${Amounts.stringify(totalCoinValue)}`,
    );
    for (const sd of selectedDenoms) {
      logger.trace(`denom_pub_hash=${sd.denomPubHash}, count=${sd.count}`);
    }
    logger.trace("(end of withdrawal denom list)");
  }

  return {
    selectedDenoms,
    totalCoinValue: Amounts.stringify(totalCoinValue),
    totalWithdrawCost: Amounts.stringify(totalCoinValue),
  };
}

export function selectForcedWithdrawalDenominations(
  amountAvailable: AmountJson,
  denoms: DenominationRecord[],
  forcedDenomSel: ForcedDenomSel,
): DenomSelectionState {
  const selectedDenoms: {
    count: number;
    denomPubHash: string;
  }[] = [];

  let totalCoinValue = Amounts.zeroOfCurrency(amountAvailable.currency);
  let totalWithdrawCost = Amounts.zeroOfCurrency(amountAvailable.currency);

  denoms = denoms.filter(isWithdrawableDenom);
  denoms.sort((d1, d2) =>
    Amounts.cmp(
      DenominationRecord.getValue(d2),
      DenominationRecord.getValue(d1),
    ),
  );

  for (const fds of forcedDenomSel.denoms) {
    const count = fds.count;
    const denom = denoms.find((x) => {
      return Amounts.cmp(DenominationRecord.getValue(x), fds.value) == 0;
    });
    if (!denom) {
      throw Error(
        `unable to find denom for forced selection (value ${fds.value})`,
      );
    }
    const cost = Amounts.add(
      DenominationRecord.getValue(denom),
      denom.fees.feeWithdraw,
    ).amount;
    totalCoinValue = Amounts.add(
      totalCoinValue,
      Amounts.mult(DenominationRecord.getValue(denom), count).amount,
    ).amount;
    totalWithdrawCost = Amounts.add(
      totalWithdrawCost,
      Amounts.mult(cost, count).amount,
    ).amount;
    selectedDenoms.push({
      count,
      denomPubHash: denom.denomPubHash,
    });
  }

  return {
    selectedDenoms,
    totalCoinValue: Amounts.stringify(totalCoinValue),
    totalWithdrawCost: Amounts.stringify(totalWithdrawCost),
  };
}

/**
 * Get information about a withdrawal from
 * a taler://withdraw URI by asking the bank.
 *
 * FIXME: Move into bank client.
 */
export async function getBankWithdrawalInfo(
  http: HttpRequestLibrary,
  talerWithdrawUri: string,
): Promise<BankWithdrawDetails> {
  const uriResult = parseWithdrawUri(talerWithdrawUri);
  if (!uriResult) {
    throw Error(`can't parse URL ${talerWithdrawUri}`);
  }

  const configReqUrl = new URL("config", uriResult.bankIntegrationApiBaseUrl);

  const configResp = await http.get(configReqUrl.href);
  const config = await readSuccessResponseJsonOrThrow(
    configResp,
    codecForTalerConfigResponse(),
  );

  const versionRes = LibtoolVersion.compare(
    WALLET_BANK_INTEGRATION_PROTOCOL_VERSION,
    config.version,
  );
  if (versionRes?.compatible != true) {
    throw TalerError.fromDetail(
      TalerErrorCode.WALLET_BANK_INTEGRATION_PROTOCOL_VERSION_INCOMPATIBLE,
      {
        exchangeProtocolVersion: config.version,
        walletProtocolVersion: WALLET_BANK_INTEGRATION_PROTOCOL_VERSION,
      },
      "bank integration protocol version not compatible with wallet",
    );
  }

  const reqUrl = new URL(
    `withdrawal-operation/${uriResult.withdrawalOperationId}`,
    uriResult.bankIntegrationApiBaseUrl,
  );

  logger.info(`bank withdrawal status URL: ${reqUrl.href}}`);

  const resp = await http.get(reqUrl.href);
  const status = await readSuccessResponseJsonOrThrow(
    resp,
    codecForWithdrawOperationStatusResponse(),
  );

  logger.info(`bank withdrawal operation status: ${j2s(status)}`);

  return {
    amount: Amounts.parseOrThrow(status.amount),
    confirmTransferUrl: status.confirm_transfer_url,
    selectionDone: status.selection_done,
    senderWire: status.sender_wire,
    suggestedExchange: status.suggested_exchange,
    transferDone: status.transfer_done,
    wireTypes: status.wire_types,
  };
}

/**
 * Return denominations that can potentially used for a withdrawal.
 */
export async function getCandidateWithdrawalDenoms(
  ws: InternalWalletState,
  exchangeBaseUrl: string,
): Promise<DenominationRecord[]> {
  return await ws.db
    .mktx((x) => [x.denominations])
    .runReadOnly(async (tx) => {
      const allDenoms = await tx.denominations.indexes.byExchangeBaseUrl.getAll(
        exchangeBaseUrl,
      );
      return allDenoms.filter(isWithdrawableDenom);
    });
}

/**
 * Generate a planchet for a coin index in a withdrawal group.
 * Does not actually withdraw the coin yet.
 *
 * Split up so that we can parallelize the crypto, but serialize
 * the exchange requests per reserve.
 */
async function processPlanchetGenerate(
  ws: InternalWalletState,
  withdrawalGroup: WithdrawalGroupRecord,
  coinIdx: number,
): Promise<void> {
  let planchet = await ws.db
    .mktx((x) => [x.planchets])
    .runReadOnly(async (tx) => {
      return tx.planchets.indexes.byGroupAndIndex.get([
        withdrawalGroup.withdrawalGroupId,
        coinIdx,
      ]);
    });
  if (planchet) {
    return;
  }
  let ci = 0;
  let maybeDenomPubHash: string | undefined;
  for (let di = 0; di < withdrawalGroup.denomsSel.selectedDenoms.length; di++) {
    const d = withdrawalGroup.denomsSel.selectedDenoms[di];
    if (coinIdx >= ci && coinIdx < ci + d.count) {
      maybeDenomPubHash = d.denomPubHash;
      break;
    }
    ci += d.count;
  }
  if (!maybeDenomPubHash) {
    throw Error("invariant violated");
  }
  const denomPubHash = maybeDenomPubHash;

  const denom = await ws.db
    .mktx((x) => [x.denominations])
    .runReadOnly(async (tx) => {
      return ws.getDenomInfo(
        ws,
        tx,
        withdrawalGroup.exchangeBaseUrl,
        denomPubHash,
      );
    });
  checkDbInvariant(!!denom);
  const r = await ws.cryptoApi.createPlanchet({
    denomPub: denom.denomPub,
    feeWithdraw: Amounts.parseOrThrow(denom.feeWithdraw),
    reservePriv: withdrawalGroup.reservePriv,
    reservePub: withdrawalGroup.reservePub,
    value: Amounts.parseOrThrow(denom.value),
    coinIndex: coinIdx,
    secretSeed: withdrawalGroup.secretSeed,
    restrictAge: withdrawalGroup.restrictAge,
  });
  const newPlanchet: PlanchetRecord = {
    blindingKey: r.blindingKey,
    coinEv: r.coinEv,
    coinEvHash: r.coinEvHash,
    coinIdx,
    coinPriv: r.coinPriv,
    coinPub: r.coinPub,
    denomPubHash: r.denomPubHash,
    planchetStatus: PlanchetStatus.Pending,
    withdrawSig: r.withdrawSig,
    withdrawalGroupId: withdrawalGroup.withdrawalGroupId,
    ageCommitmentProof: r.ageCommitmentProof,
    lastError: undefined,
  };
  await ws.db
    .mktx((x) => [x.planchets])
    .runReadWrite(async (tx) => {
      const p = await tx.planchets.indexes.byGroupAndIndex.get([
        withdrawalGroup.withdrawalGroupId,
        coinIdx,
      ]);
      if (p) {
        planchet = p;
        return;
      }
      await tx.planchets.put(newPlanchet);
      planchet = newPlanchet;
    });
}

/**
 * Send the withdrawal request for a generated planchet to the exchange.
 *
 * The verification of the response is done asynchronously to enable parallelism.
 */
async function processPlanchetExchangeRequest(
  ws: InternalWalletState,
  withdrawalGroup: WithdrawalGroupRecord,
  coinIdx: number,
): Promise<WithdrawResponse | undefined> {
  logger.info(
    `processing planchet exchange request ${withdrawalGroup.withdrawalGroupId}/${coinIdx}`,
  );
  const d = await ws.db
    .mktx((x) => [
      x.withdrawalGroups,
      x.planchets,
      x.exchanges,
      x.denominations,
    ])
    .runReadOnly(async (tx) => {
      let planchet = await tx.planchets.indexes.byGroupAndIndex.get([
        withdrawalGroup.withdrawalGroupId,
        coinIdx,
      ]);
      if (!planchet) {
        return;
      }
      if (planchet.planchetStatus === PlanchetStatus.WithdrawalDone) {
        logger.warn("processPlanchet: planchet already withdrawn");
        return;
      }
      const exchange = await tx.exchanges.get(withdrawalGroup.exchangeBaseUrl);
      if (!exchange) {
        logger.error("db inconsistent: exchange for planchet not found");
        return;
      }

      const denom = await ws.getDenomInfo(
        ws,
        tx,
        withdrawalGroup.exchangeBaseUrl,
        planchet.denomPubHash,
      );

      if (!denom) {
        logger.error("db inconsistent: denom for planchet not found");
        return;
      }

      logger.trace(
        `processing planchet #${coinIdx} in withdrawal ${withdrawalGroup.withdrawalGroupId}`,
      );

      const reqBody: ExchangeWithdrawRequest = {
        denom_pub_hash: planchet.denomPubHash,
        reserve_sig: planchet.withdrawSig,
        coin_ev: planchet.coinEv,
      };
      const reqUrl = new URL(
        `reserves/${withdrawalGroup.reservePub}/withdraw`,
        exchange.baseUrl,
      ).href;

      return { reqUrl, reqBody };
    });

  if (!d) {
    return;
  }
  const { reqUrl, reqBody } = d;

  try {
    const resp = await ws.http.postJson(reqUrl, reqBody);
    if (resp.status === HttpStatusCode.UnavailableForLegalReasons) {
      logger.info("withdrawal requires KYC");
      await ws.db
        .mktx((x) => [x.planchets])
        .runReadWrite(async (tx) => {
          let planchet = await tx.planchets.indexes.byGroupAndIndex.get([
            withdrawalGroup.withdrawalGroupId,
            coinIdx,
          ]);
          if (!planchet) {
            return;
          }
          planchet.planchetStatus = PlanchetStatus.KycRequired;
          await tx.planchets.put(planchet);
        });
      return;
    }
    const r = await readSuccessResponseJsonOrThrow(
      resp,
      codecForWithdrawResponse(),
    );
    return r;
  } catch (e) {
    const errDetail = getErrorDetailFromException(e);
    logger.trace("withdrawal request failed", e);
    logger.trace(e);
    await ws.db
      .mktx((x) => [x.planchets])
      .runReadWrite(async (tx) => {
        let planchet = await tx.planchets.indexes.byGroupAndIndex.get([
          withdrawalGroup.withdrawalGroupId,
          coinIdx,
        ]);
        if (!planchet) {
          return;
        }
        planchet.lastError = errDetail;
        await tx.planchets.put(planchet);
      });
    return;
  }
}

/**
 * Send the withdrawal request for a generated planchet to the exchange.
 *
 * The verification of the response is done asynchronously to enable parallelism.
 */
async function processPlanchetExchangeBatchRequest(
  ws: InternalWalletState,
  withdrawalGroup: WithdrawalGroupRecord,
): Promise<WithdrawBatchResponse | undefined> {
  logger.info(
    `processing planchet exchange batch request ${withdrawalGroup.withdrawalGroupId}`,
  );
  const numTotalCoins = withdrawalGroup.denomsSel.selectedDenoms
    .map((x) => x.count)
    .reduce((a, b) => a + b);
  const d = await ws.db
    .mktx((x) => [
      x.withdrawalGroups,
      x.planchets,
      x.exchanges,
      x.denominations,
    ])
    .runReadOnly(async (tx) => {
      const reqBody: { planchets: ExchangeWithdrawRequest[] } = {
        planchets: [],
      };
      const exchange = await tx.exchanges.get(withdrawalGroup.exchangeBaseUrl);
      if (!exchange) {
        logger.error("db inconsistent: exchange for planchet not found");
        return;
      }

      for (let coinIdx = 0; coinIdx < numTotalCoins; coinIdx++) {
        let planchet = await tx.planchets.indexes.byGroupAndIndex.get([
          withdrawalGroup.withdrawalGroupId,
          coinIdx,
        ]);
        if (!planchet) {
          return;
        }
        if (planchet.planchetStatus === PlanchetStatus.WithdrawalDone) {
          logger.warn("processPlanchet: planchet already withdrawn");
          return;
        }
        const denom = await ws.getDenomInfo(
          ws,
          tx,
          withdrawalGroup.exchangeBaseUrl,
          planchet.denomPubHash,
        );

        if (!denom) {
          logger.error("db inconsistent: denom for planchet not found");
          return;
        }

        const planchetReq: ExchangeWithdrawRequest = {
          denom_pub_hash: planchet.denomPubHash,
          reserve_sig: planchet.withdrawSig,
          coin_ev: planchet.coinEv,
        };
        reqBody.planchets.push(planchetReq);
      }
      return reqBody;
    });

  if (!d) {
    return;
  }

  const reqUrl = new URL(
    `reserves/${withdrawalGroup.reservePub}/batch-withdraw`,
    withdrawalGroup.exchangeBaseUrl,
  ).href;

  const resp = await ws.http.postJson(reqUrl, d);
  const r = await readSuccessResponseJsonOrThrow(
    resp,
    codecForWithdrawBatchResponse(),
  );
  return r;
}

async function processPlanchetVerifyAndStoreCoin(
  ws: InternalWalletState,
  withdrawalGroup: WithdrawalGroupRecord,
  coinIdx: number,
  resp: WithdrawResponse,
): Promise<void> {
  const d = await ws.db
    .mktx((x) => [x.withdrawalGroups, x.planchets, x.denominations])
    .runReadOnly(async (tx) => {
      let planchet = await tx.planchets.indexes.byGroupAndIndex.get([
        withdrawalGroup.withdrawalGroupId,
        coinIdx,
      ]);
      if (!planchet) {
        return;
      }
      if (planchet.planchetStatus === PlanchetStatus.WithdrawalDone) {
        logger.warn("processPlanchet: planchet already withdrawn");
        return;
      }
      const denomInfo = await ws.getDenomInfo(
        ws,
        tx,
        withdrawalGroup.exchangeBaseUrl,
        planchet.denomPubHash,
      );
      if (!denomInfo) {
        return;
      }
      return {
        planchet,
        denomInfo,
        exchangeBaseUrl: withdrawalGroup.exchangeBaseUrl,
      };
    });

  if (!d) {
    return;
  }

  const { planchet, denomInfo } = d;

  const planchetDenomPub = denomInfo.denomPub;
  if (planchetDenomPub.cipher !== DenomKeyType.Rsa) {
    throw Error(`cipher (${planchetDenomPub.cipher}) not supported`);
  }

  let evSig = resp.ev_sig;
  if (!(evSig.cipher === DenomKeyType.Rsa)) {
    throw Error("unsupported cipher");
  }

  const denomSigRsa = await ws.cryptoApi.rsaUnblind({
    bk: planchet.blindingKey,
    blindedSig: evSig.blinded_rsa_signature,
    pk: planchetDenomPub.rsa_public_key,
  });

  const isValid = await ws.cryptoApi.rsaVerify({
    hm: planchet.coinPub,
    pk: planchetDenomPub.rsa_public_key,
    sig: denomSigRsa.sig,
  });

  if (!isValid) {
    await ws.db
      .mktx((x) => [x.planchets])
      .runReadWrite(async (tx) => {
        let planchet = await tx.planchets.indexes.byGroupAndIndex.get([
          withdrawalGroup.withdrawalGroupId,
          coinIdx,
        ]);
        if (!planchet) {
          return;
        }
        planchet.lastError = makeErrorDetail(
          TalerErrorCode.WALLET_EXCHANGE_COIN_SIGNATURE_INVALID,
          {},
          "invalid signature from the exchange after unblinding",
        );
        await tx.planchets.put(planchet);
      });
    return;
  }

  let denomSig: UnblindedSignature;
  if (planchetDenomPub.cipher === DenomKeyType.Rsa) {
    denomSig = {
      cipher: planchetDenomPub.cipher,
      rsa_signature: denomSigRsa.sig,
    };
  } else {
    throw Error("unsupported cipher");
  }

  const coin: CoinRecord = {
    blindingKey: planchet.blindingKey,
    coinPriv: planchet.coinPriv,
    coinPub: planchet.coinPub,
    denomPubHash: planchet.denomPubHash,
    denomSig,
    coinEvHash: planchet.coinEvHash,
    exchangeBaseUrl: d.exchangeBaseUrl,
    status: CoinStatus.Fresh,
    coinSource: {
      type: CoinSourceType.Withdraw,
      coinIndex: coinIdx,
      reservePub: withdrawalGroup.reservePub,
      withdrawalGroupId: withdrawalGroup.withdrawalGroupId,
    },
    maxAge: withdrawalGroup.restrictAge ?? AgeRestriction.AGE_UNRESTRICTED,
    ageCommitmentProof: planchet.ageCommitmentProof,
    spendAllocation: undefined,
  };

  const planchetCoinPub = planchet.coinPub;

  // Check if this is the first time that the whole
  // withdrawal succeeded.  If so, mark the withdrawal
  // group as finished.
  const firstSuccess = await ws.db
    .mktx((x) => [
      x.coins,
      x.denominations,
      x.coinAvailability,
      x.withdrawalGroups,
      x.planchets,
    ])
    .runReadWrite(async (tx) => {
      const p = await tx.planchets.get(planchetCoinPub);
      if (!p || p.planchetStatus === PlanchetStatus.WithdrawalDone) {
        return false;
      }
      p.planchetStatus = PlanchetStatus.WithdrawalDone;
      await tx.planchets.put(p);
      await makeCoinAvailable(ws, tx, coin);
      return true;
    });

  if (firstSuccess) {
    ws.notify({
      type: NotificationType.CoinWithdrawn,
    });
  }
}

/**
 * Make sure that denominations that currently can be used for withdrawal
 * are validated, and the result of validation is stored in the database.
 */
export async function updateWithdrawalDenoms(
  ws: InternalWalletState,
  exchangeBaseUrl: string,
): Promise<void> {
  logger.trace(
    `updating denominations used for withdrawal for ${exchangeBaseUrl}`,
  );
  const exchangeDetails = await ws.db
    .mktx((x) => [x.exchanges, x.exchangeDetails])
    .runReadOnly(async (tx) => {
      return ws.exchangeOps.getExchangeDetails(tx, exchangeBaseUrl);
    });
  if (!exchangeDetails) {
    logger.error("exchange details not available");
    throw Error(`exchange ${exchangeBaseUrl} details not available`);
  }
  // First do a pass where the validity of candidate denominations
  // is checked and the result is stored in the database.
  logger.trace("getting candidate denominations");
  const denominations = await getCandidateWithdrawalDenoms(ws, exchangeBaseUrl);
  logger.trace(`got ${denominations.length} candidate denominations`);
  const batchSize = 500;
  let current = 0;

  while (current < denominations.length) {
    const updatedDenominations: DenominationRecord[] = [];
    // Do a batch of batchSize
    for (
      let batchIdx = 0;
      batchIdx < batchSize && current < denominations.length;
      batchIdx++, current++
    ) {
      const denom = denominations[current];
      if (
        denom.verificationStatus === DenominationVerificationStatus.Unverified
      ) {
        logger.trace(
          `Validating denomination (${current + 1}/${
            denominations.length
          }) signature of ${denom.denomPubHash}`,
        );
        let valid = false;
        if (ws.insecureTrustExchange) {
          valid = true;
        } else {
          const res = await ws.cryptoApi.isValidDenom({
            denom,
            masterPub: exchangeDetails.masterPublicKey,
          });
          valid = res.valid;
        }
        logger.trace(`Done validating ${denom.denomPubHash}`);
        if (!valid) {
          logger.warn(
            `Signature check for denomination h=${denom.denomPubHash} failed`,
          );
          denom.verificationStatus = DenominationVerificationStatus.VerifiedBad;
        } else {
          denom.verificationStatus =
            DenominationVerificationStatus.VerifiedGood;
        }
        updatedDenominations.push(denom);
      }
    }
    if (updatedDenominations.length > 0) {
      logger.trace("writing denomination batch to db");
      await ws.db
        .mktx((x) => [x.denominations])
        .runReadWrite(async (tx) => {
          for (let i = 0; i < updatedDenominations.length; i++) {
            const denom = updatedDenominations[i];
            await tx.denominations.put(denom);
          }
        });
      logger.trace("done with DB write");
    }
  }
}

/**
 * Update the information about a reserve that is stored in the wallet
 * by querying the reserve's exchange.
 *
 * If the reserve have funds that are not allocated in a withdrawal group yet
 * and are big enough to withdraw with available denominations,
 * create a new withdrawal group for the remaining amount.
 */
async function queryReserve(
  ws: InternalWalletState,
  withdrawalGroupId: string,
  cancellationToken: CancellationToken,
): Promise<{ ready: boolean }> {
  const withdrawalGroup = await getWithdrawalGroupRecordTx(ws.db, {
    withdrawalGroupId,
  });
  checkDbInvariant(!!withdrawalGroup);
  if (withdrawalGroup.status !== WithdrawalGroupStatus.QueryingStatus) {
    return { ready: true };
  }
  const reservePub = withdrawalGroup.reservePub;

  const reserveUrl = new URL(
    `reserves/${reservePub}`,
    withdrawalGroup.exchangeBaseUrl,
  );
  reserveUrl.searchParams.set("timeout_ms", "30000");

  logger.info(`querying reserve status via ${reserveUrl}`);

  const resp = await ws.http.get(reserveUrl.href, {
    timeout: getReserveRequestTimeout(withdrawalGroup),
    cancellationToken,
  });

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

  await ws.db
    .mktx((x) => [x.withdrawalGroups])
    .runReadWrite(async (tx) => {
      const wg = await tx.withdrawalGroups.get(withdrawalGroupId);
      if (!wg) {
        logger.warn(`withdrawal group ${withdrawalGroupId} not found`);
        return;
      }
      wg.status = WithdrawalGroupStatus.Ready;
      wg.reserveBalanceAmount = Amounts.stringify(result.response.balance);
      await tx.withdrawalGroups.put(wg);
    });

  return { ready: true };
}

enum BankStatusResultCode {
  Done = "done",
  Waiting = "waiting",
  Aborted = "aborted",
}

export async function processWithdrawalGroup(
  ws: InternalWalletState,
  withdrawalGroupId: string,
  options: object = {},
): Promise<OperationAttemptResult> {
  logger.trace("processing withdrawal group", withdrawalGroupId);
  const withdrawalGroup = await ws.db
    .mktx((x) => [x.withdrawalGroups])
    .runReadOnly(async (tx) => {
      return tx.withdrawalGroups.get(withdrawalGroupId);
    });

  if (!withdrawalGroup) {
    throw Error(`withdrawal group ${withdrawalGroupId} not found`);
  }

  const retryTag = RetryTags.forWithdrawal(withdrawalGroup);

  // We're already running!
  if (ws.activeLongpoll[retryTag]) {
    logger.info("withdrawal group already in long-polling, returning!");
    return {
      type: OperationAttemptResultType.Longpoll,
    };
  }

  switch (withdrawalGroup.status) {
    case WithdrawalGroupStatus.RegisteringBank:
      await processReserveBankStatus(ws, withdrawalGroupId);
      return await processWithdrawalGroup(ws, withdrawalGroupId, {
        forceNow: true,
      });
    case WithdrawalGroupStatus.QueryingStatus: {
      const doQueryAsync = async () => {
        if (ws.stopped) {
          logger.trace("not long-polling reserve, wallet already stopped");
          await storeOperationPending(ws, retryTag);
          return;
        }
        const cts = CancellationToken.create();
        let res: { ready: boolean } | undefined = undefined;
        try {
          ws.activeLongpoll[retryTag] = {
            cancel: () => {
              logger.trace("cancel of reserve longpoll requested");
              cts.cancel();
            },
          };
          res = await queryReserve(ws, withdrawalGroupId, cts.token);
        } catch (e) {
          await storeOperationError(
            ws,
            retryTag,
            getErrorDetailFromException(e),
          );
          return;
        }
        delete ws.activeLongpoll[retryTag];
        if (!res.ready) {
          await storeOperationPending(ws, retryTag);
        }
        ws.latch.trigger();
      };
      doQueryAsync();
      logger.trace(
        "returning early from withdrawal for long-polling in background",
      );
      return {
        type: OperationAttemptResultType.Longpoll,
      };
    }
    case WithdrawalGroupStatus.WaitConfirmBank: {
      const res = await processReserveBankStatus(ws, withdrawalGroupId);
      switch (res.status) {
        case BankStatusResultCode.Aborted:
        case BankStatusResultCode.Done:
          return {
            type: OperationAttemptResultType.Finished,
            result: undefined,
          };
        case BankStatusResultCode.Waiting: {
          return {
            type: OperationAttemptResultType.Pending,
            result: undefined,
          };
        }
      }
      break;
    }
    case WithdrawalGroupStatus.BankAborted: {
      // FIXME
      return {
        type: OperationAttemptResultType.Pending,
        result: undefined,
      };
    }
    case WithdrawalGroupStatus.Finished:
      // We can try to withdraw, nothing needs to be done with the reserve.
      break;
    case WithdrawalGroupStatus.Ready:
      // Continue with the actual withdrawal!
      break;
    default:
      throw new InvariantViolatedError(
        `unknown reserve record status: ${withdrawalGroup.status}`,
      );
  }

  await ws.exchangeOps.updateExchangeFromUrl(
    ws,
    withdrawalGroup.exchangeBaseUrl,
  );

  if (withdrawalGroup.denomsSel.selectedDenoms.length === 0) {
    logger.warn("Finishing empty withdrawal group (no denoms)");
    await ws.db
      .mktx((x) => [x.withdrawalGroups])
      .runReadWrite(async (tx) => {
        const wg = await tx.withdrawalGroups.get(withdrawalGroupId);
        if (!wg) {
          return;
        }
        wg.status = WithdrawalGroupStatus.Finished;
        wg.timestampFinish = TalerProtocolTimestamp.now();
        await tx.withdrawalGroups.put(wg);
      });
    return {
      type: OperationAttemptResultType.Finished,
      result: undefined,
    };
  }

  const numTotalCoins = withdrawalGroup.denomsSel.selectedDenoms
    .map((x) => x.count)
    .reduce((a, b) => a + b);

  let work: Promise<void>[] = [];

  for (let i = 0; i < numTotalCoins; i++) {
    work.push(processPlanchetGenerate(ws, withdrawalGroup, i));
  }

  // Generate coins concurrently (parallelism only happens in the crypto API workers)
  await Promise.all(work);

  work = [];

  if (ws.batchWithdrawal) {
    const resp = await processPlanchetExchangeBatchRequest(ws, withdrawalGroup);
    if (!resp) {
      throw Error("unable to do batch withdrawal");
    }
    for (let coinIdx = 0; coinIdx < numTotalCoins; coinIdx++) {
      work.push(
        processPlanchetVerifyAndStoreCoin(
          ws,
          withdrawalGroup,
          coinIdx,
          resp.ev_sigs[coinIdx],
        ),
      );
    }
  } else {
    for (let coinIdx = 0; coinIdx < numTotalCoins; coinIdx++) {
      const resp = await processPlanchetExchangeRequest(
        ws,
        withdrawalGroup,
        coinIdx,
      );
      if (!resp) {
        continue;
      }
      work.push(
        processPlanchetVerifyAndStoreCoin(ws, withdrawalGroup, coinIdx, resp),
      );
    }
  }

  await Promise.all(work);

  let numFinished = 0;
  let numKycRequired = 0;
  let finishedForFirstTime = false;
  let errorsPerCoin: Record<number, TalerErrorDetail> = {};

  await ws.db
    .mktx((x) => [x.coins, x.withdrawalGroups, x.planchets])
    .runReadWrite(async (tx) => {
      const wg = await tx.withdrawalGroups.get(withdrawalGroupId);
      if (!wg) {
        return;
      }

      await tx.planchets.indexes.byGroup
        .iter(withdrawalGroupId)
        .forEach((x) => {
          if (x.planchetStatus === PlanchetStatus.WithdrawalDone) {
            numFinished++;
          }
          if (x.planchetStatus === PlanchetStatus.KycRequired) {
            numKycRequired++;
          }
          if (x.lastError) {
            errorsPerCoin[x.coinIdx] = x.lastError;
          }
        });
      logger.info(`now withdrawn ${numFinished} of ${numTotalCoins} coins`);
      if (wg.timestampFinish === undefined && numFinished === numTotalCoins) {
        finishedForFirstTime = true;
        wg.timestampFinish = TalerProtocolTimestamp.now();
        wg.status = WithdrawalGroupStatus.Finished;
      }

      await tx.withdrawalGroups.put(wg);
    });
  if (numKycRequired > 0) {
    throw TalerError.fromDetail(
      TalerErrorCode.WALLET_WITHDRAWAL_KYC_REQUIRED,
      {},
      `KYC check required for withdrawal (not yet implemented in wallet-core)`,
    );
  }
  if (numFinished != numTotalCoins) {
    throw TalerError.fromDetail(
      TalerErrorCode.WALLET_WITHDRAWAL_GROUP_INCOMPLETE,
      {
        errorsPerCoin,
      },
      `withdrawal did not finish (${numFinished} / ${numTotalCoins} coins withdrawn)`,
    );
  }

  if (finishedForFirstTime) {
    ws.notify({
      type: NotificationType.WithdrawGroupFinished,
      reservePub: withdrawalGroup.reservePub,
    });
  }

  return {
    type: OperationAttemptResultType.Finished,
    result: undefined,
  };
}

const AGE_MASK_GROUPS = "8:10:12:14:16:18"
  .split(":")
  .map((n) => parseInt(n, 10));

export async function getExchangeWithdrawalInfo(
  ws: InternalWalletState,
  exchangeBaseUrl: string,
  instructedAmount: AmountJson,
  ageRestricted: number | undefined,
): Promise<ExchangeWithdrawalDetails> {
  const { exchange, exchangeDetails } =
    await ws.exchangeOps.updateExchangeFromUrl(ws, exchangeBaseUrl);
  await updateWithdrawalDenoms(ws, exchangeBaseUrl);
  const denoms = await getCandidateWithdrawalDenoms(ws, exchangeBaseUrl);
  const selectedDenoms = selectWithdrawalDenominations(
    instructedAmount,
    denoms,
  );

  if (selectedDenoms.selectedDenoms.length === 0) {
    throw Error(
      `unable to withdraw from ${exchangeBaseUrl}, can't select denominations for instructed amount (${Amounts.stringify(
        instructedAmount,
      )}`,
    );
  }

  const exchangeWireAccounts: string[] = [];
  for (const account of exchangeDetails.wireInfo.accounts) {
    exchangeWireAccounts.push(account.payto_uri);
  }

  const { isTrusted, isAudited } = await ws.exchangeOps.getExchangeTrust(
    ws,
    exchange,
  );

  let hasDenomWithAgeRestriction = false;

  let earliestDepositExpiration: TalerProtocolTimestamp | undefined;
  for (let i = 0; i < selectedDenoms.selectedDenoms.length; i++) {
    const ds = selectedDenoms.selectedDenoms[i];
    // FIXME: Do in one transaction!
    const denom = await ws.db
      .mktx((x) => [x.denominations])
      .runReadOnly(async (tx) => {
        return ws.getDenomInfo(ws, tx, exchangeBaseUrl, ds.denomPubHash);
      });
    checkDbInvariant(!!denom);
    hasDenomWithAgeRestriction =
      hasDenomWithAgeRestriction || denom.denomPub.age_mask > 0;
    const expireDeposit = denom.stampExpireDeposit;
    if (!earliestDepositExpiration) {
      earliestDepositExpiration = expireDeposit;
      continue;
    }
    if (
      AbsoluteTime.cmp(
        AbsoluteTime.fromTimestamp(expireDeposit),
        AbsoluteTime.fromTimestamp(earliestDepositExpiration),
      ) < 0
    ) {
      earliestDepositExpiration = expireDeposit;
    }
  }

  checkLogicInvariant(!!earliestDepositExpiration);

  const possibleDenoms = await ws.db
    .mktx((x) => [x.denominations])
    .runReadOnly(async (tx) => {
      const ds = await tx.denominations.indexes.byExchangeBaseUrl.getAll(
        exchangeBaseUrl,
      );
      return ds.filter((x) => x.isOffered);
    });

  let versionMatch;
  if (exchangeDetails.protocolVersionRange) {
    versionMatch = LibtoolVersion.compare(
      WALLET_EXCHANGE_PROTOCOL_VERSION,
      exchangeDetails.protocolVersionRange,
    );

    if (
      versionMatch &&
      !versionMatch.compatible &&
      versionMatch.currentCmp === -1
    ) {
      logger.warn(
        `wallet's support for exchange protocol version ${WALLET_EXCHANGE_PROTOCOL_VERSION} might be outdated ` +
          `(exchange has ${exchangeDetails.protocolVersionRange}), checking for updates`,
      );
    }
  }

  let tosAccepted = false;
  if (exchangeDetails.tosAccepted?.timestamp) {
    if (exchangeDetails.tosAccepted.etag === exchangeDetails.tosCurrentEtag) {
      tosAccepted = true;
    }
  }

  const paytoUris = exchangeDetails.wireInfo.accounts.map((x) => x.payto_uri);
  if (!paytoUris) {
    throw Error("exchange is in invalid state");
  }

  const ret: ExchangeWithdrawalDetails = {
    earliestDepositExpiration,
    exchangePaytoUris: paytoUris,
    exchangeWireAccounts,
    exchangeVersion: exchangeDetails.protocolVersionRange || "unknown",
    isAudited,
    isTrusted,
    numOfferedDenoms: possibleDenoms.length,
    selectedDenoms,
    // FIXME: delete this field / replace by something we can display to the user
    trustedAuditorPubs: [],
    versionMatch,
    walletVersion: WALLET_EXCHANGE_PROTOCOL_VERSION,
    termsOfServiceAccepted: tosAccepted,
    withdrawalAmountEffective: Amounts.stringify(selectedDenoms.totalCoinValue),
    withdrawalAmountRaw: Amounts.stringify(instructedAmount),
    // TODO: remove hardcoding, this should be calculated from the denominations info
    // force enabled for testing
    ageRestrictionOptions: hasDenomWithAgeRestriction
      ? AGE_MASK_GROUPS
      : undefined,
  };
  return ret;
}

export interface GetWithdrawalDetailsForUriOpts {
  restrictAge?: number;
}

/**
 * Get more information about a taler://withdraw URI.
 *
 * As side effects, the bank (via the bank integration API) is queried
 * and the exchange suggested by the bank is permanently added
 * to the wallet's list of known exchanges.
 */
export async function getWithdrawalDetailsForUri(
  ws: InternalWalletState,
  talerWithdrawUri: string,
  opts: GetWithdrawalDetailsForUriOpts = {},
): Promise<WithdrawUriInfoResponse> {
  logger.trace(`getting withdrawal details for URI ${talerWithdrawUri}`);
  const info = await getBankWithdrawalInfo(ws.http, talerWithdrawUri);
  logger.trace(`got bank info`);
  if (info.suggestedExchange) {
    // FIXME: right now the exchange gets permanently added,
    // we might want to only temporarily add it.
    try {
      await ws.exchangeOps.updateExchangeFromUrl(ws, info.suggestedExchange);
    } catch (e) {
      // We still continued if it failed, as other exchanges might be available.
      // We don't want to fail if the bank-suggested exchange is broken/offline.
      logger.trace(
        `querying bank-suggested exchange (${info.suggestedExchange}) failed`,
      );
    }
  }

  // Extract information about possible exchanges for the withdrawal
  // operation from the database.

  const exchanges: ExchangeListItem[] = [];

  await ws.db
    .mktx((x) => [
      x.exchanges,
      x.exchangeDetails,
      x.exchangeTos,
      x.denominations,
      x.operationRetries,
    ])
    .runReadOnly(async (tx) => {
      const exchangeRecords = await tx.exchanges.iter().toArray();
      for (const r of exchangeRecords) {
        const exchangeDetails = await ws.exchangeOps.getExchangeDetails(
          tx,
          r.baseUrl,
        );
        const denominations = await tx.denominations.indexes.byExchangeBaseUrl
          .iter(r.baseUrl)
          .toArray();
        const retryRecord = await tx.operationRetries.get(
          RetryTags.forExchangeUpdate(r),
        );
        if (exchangeDetails && denominations) {
          exchanges.push(
            makeExchangeListItem(r, exchangeDetails, retryRecord?.lastError),
          );
        }
      }
    });

  return {
    amount: Amounts.stringify(info.amount),
    defaultExchangeBaseUrl: info.suggestedExchange,
    possibleExchanges: exchanges,
  };
}

export async function getFundingPaytoUrisTx(
  ws: InternalWalletState,
  withdrawalGroupId: string,
): Promise<string[]> {
  return await ws.db
    .mktx((x) => [x.exchanges, x.exchangeDetails, x.withdrawalGroups])
    .runReadWrite((tx) => getFundingPaytoUris(tx, withdrawalGroupId));
}

export function augmentPaytoUrisForWithdrawal(
  plainPaytoUris: string[],
  reservePub: string,
  instructedAmount: AmountLike,
): string[] {
  return plainPaytoUris.map((x) =>
    addPaytoQueryParams(x, {
      amount: Amounts.stringify(instructedAmount),
      message: `Taler Withdrawal ${reservePub}`,
    }),
  );
}

/**
 * Get payto URIs that can be used to fund a withdrawal operation.
 */
export async function getFundingPaytoUris(
  tx: GetReadOnlyAccess<{
    withdrawalGroups: typeof WalletStoresV1.withdrawalGroups;
    exchanges: typeof WalletStoresV1.exchanges;
    exchangeDetails: typeof WalletStoresV1.exchangeDetails;
  }>,
  withdrawalGroupId: string,
): Promise<string[]> {
  const withdrawalGroup = await tx.withdrawalGroups.get(withdrawalGroupId);
  checkDbInvariant(!!withdrawalGroup);
  const exchangeDetails = await getExchangeDetails(
    tx,
    withdrawalGroup.exchangeBaseUrl,
  );
  if (!exchangeDetails) {
    logger.error(`exchange ${withdrawalGroup.exchangeBaseUrl} not found`);
    return [];
  }
  const plainPaytoUris =
    exchangeDetails.wireInfo?.accounts.map((x) => x.payto_uri) ?? [];
  if (!plainPaytoUris) {
    logger.error(
      `exchange ${withdrawalGroup.exchangeBaseUrl} has no wire info`,
    );
    return [];
  }
  return augmentPaytoUrisForWithdrawal(
    plainPaytoUris,
    withdrawalGroup.reservePub,
    withdrawalGroup.instructedAmount,
  );
}

async function getWithdrawalGroupRecordTx(
  db: DbAccess<typeof WalletStoresV1>,
  req: {
    withdrawalGroupId: string;
  },
): Promise<WithdrawalGroupRecord | undefined> {
  return await db
    .mktx((x) => [x.withdrawalGroups])
    .runReadOnly(async (tx) => {
      return tx.withdrawalGroups.get(req.withdrawalGroupId);
    });
}

export function getReserveRequestTimeout(r: WithdrawalGroupRecord): Duration {
  return { d_ms: 60000 };
}

export function getBankStatusUrl(talerWithdrawUri: string): string {
  const uriResult = parseWithdrawUri(talerWithdrawUri);
  if (!uriResult) {
    throw Error(`can't parse withdrawal URL ${talerWithdrawUri}`);
  }
  const url = new URL(
    `withdrawal-operation/${uriResult.withdrawalOperationId}`,
    uriResult.bankIntegrationApiBaseUrl,
  );
  return url.href;
}

async function registerReserveWithBank(
  ws: InternalWalletState,
  withdrawalGroupId: string,
): Promise<void> {
  const withdrawalGroup = await ws.db
    .mktx((x) => [x.withdrawalGroups])
    .runReadOnly(async (tx) => {
      return await tx.withdrawalGroups.get(withdrawalGroupId);
    });
  switch (withdrawalGroup?.status) {
    case WithdrawalGroupStatus.WaitConfirmBank:
    case WithdrawalGroupStatus.RegisteringBank:
      break;
    default:
      return;
  }
  if (
    withdrawalGroup.wgInfo.withdrawalType != WithdrawalRecordType.BankIntegrated
  ) {
    throw Error();
  }
  const bankInfo = withdrawalGroup.wgInfo.bankInfo;
  if (!bankInfo) {
    return;
  }
  const bankStatusUrl = getBankStatusUrl(bankInfo.talerWithdrawUri);
  const reqBody = {
    reserve_pub: withdrawalGroup.reservePub,
    selected_exchange: bankInfo.exchangePaytoUri,
  };
  logger.info(`registering reserve with bank: ${j2s(reqBody)}`);
  const httpResp = await ws.http.postJson(bankStatusUrl, reqBody, {
    timeout: getReserveRequestTimeout(withdrawalGroup),
  });
  await readSuccessResponseJsonOrThrow(
    httpResp,
    codecForBankWithdrawalOperationPostResponse(),
  );
  await ws.db
    .mktx((x) => [x.withdrawalGroups])
    .runReadWrite(async (tx) => {
      const r = await tx.withdrawalGroups.get(withdrawalGroupId);
      if (!r) {
        return;
      }
      switch (r.status) {
        case WithdrawalGroupStatus.RegisteringBank:
        case WithdrawalGroupStatus.WaitConfirmBank:
          break;
        default:
          return;
      }
      if (r.wgInfo.withdrawalType !== WithdrawalRecordType.BankIntegrated) {
        throw Error("invariant failed");
      }
      r.wgInfo.bankInfo.timestampReserveInfoPosted = AbsoluteTime.toTimestamp(
        AbsoluteTime.now(),
      );
      r.status = WithdrawalGroupStatus.WaitConfirmBank;
      await tx.withdrawalGroups.put(r);
    });
  ws.notify({ type: NotificationType.ReserveRegisteredWithBank });
}

interface BankStatusResult {
  status: BankStatusResultCode;
}

async function processReserveBankStatus(
  ws: InternalWalletState,
  withdrawalGroupId: string,
): Promise<BankStatusResult> {
  const withdrawalGroup = await getWithdrawalGroupRecordTx(ws.db, {
    withdrawalGroupId,
  });
  switch (withdrawalGroup?.status) {
    case WithdrawalGroupStatus.WaitConfirmBank:
    case WithdrawalGroupStatus.RegisteringBank:
      break;
    default:
      return {
        status: BankStatusResultCode.Done,
      };
  }

  if (
    withdrawalGroup.wgInfo.withdrawalType != WithdrawalRecordType.BankIntegrated
  ) {
    throw Error("wrong withdrawal record type");
  }
  const bankInfo = withdrawalGroup.wgInfo.bankInfo;
  if (!bankInfo) {
    return {
      status: BankStatusResultCode.Done,
    };
  }

  const bankStatusUrl = getBankStatusUrl(bankInfo.talerWithdrawUri);

  const statusResp = await ws.http.get(bankStatusUrl, {
    timeout: getReserveRequestTimeout(withdrawalGroup),
  });
  const status = await readSuccessResponseJsonOrThrow(
    statusResp,
    codecForWithdrawOperationStatusResponse(),
  );

  if (status.aborted) {
    logger.info("bank aborted the withdrawal");
    await ws.db
      .mktx((x) => [x.withdrawalGroups])
      .runReadWrite(async (tx) => {
        const r = await tx.withdrawalGroups.get(withdrawalGroupId);
        if (!r) {
          return;
        }
        switch (r.status) {
          case WithdrawalGroupStatus.RegisteringBank:
          case WithdrawalGroupStatus.WaitConfirmBank:
            break;
          default:
            return;
        }
        if (r.wgInfo.withdrawalType !== WithdrawalRecordType.BankIntegrated) {
          throw Error("invariant failed");
        }
        const now = AbsoluteTime.toTimestamp(AbsoluteTime.now());
        r.wgInfo.bankInfo.timestampBankConfirmed = now;
        r.status = WithdrawalGroupStatus.BankAborted;
        await tx.withdrawalGroups.put(r);
      });
    return {
      status: BankStatusResultCode.Aborted,
    };
  }

  // Bank still needs to know our reserve info
  if (!status.selection_done) {
    await registerReserveWithBank(ws, withdrawalGroupId);
    return await processReserveBankStatus(ws, withdrawalGroupId);
  }

  // FIXME: Why do we do this?!
  if (withdrawalGroup.status === WithdrawalGroupStatus.RegisteringBank) {
    await registerReserveWithBank(ws, withdrawalGroupId);
    return await processReserveBankStatus(ws, withdrawalGroupId);
  }

  await ws.db
    .mktx((x) => [x.withdrawalGroups])
    .runReadWrite(async (tx) => {
      const r = await tx.withdrawalGroups.get(withdrawalGroupId);
      if (!r) {
        return;
      }
      // Re-check reserve status within transaction
      switch (r.status) {
        case WithdrawalGroupStatus.RegisteringBank:
        case WithdrawalGroupStatus.WaitConfirmBank:
          break;
        default:
          return;
      }
      if (r.wgInfo.withdrawalType !== WithdrawalRecordType.BankIntegrated) {
        throw Error("invariant failed");
      }
      if (status.transfer_done) {
        logger.info("withdrawal: transfer confirmed by bank.");
        const now = AbsoluteTime.toTimestamp(AbsoluteTime.now());
        r.wgInfo.bankInfo.timestampBankConfirmed = now;
        r.status = WithdrawalGroupStatus.QueryingStatus;
      } else {
        logger.info("withdrawal: transfer not yet confirmed by bank");
        r.wgInfo.bankInfo.confirmUrl = status.confirm_transfer_url;
        r.senderWire = status.sender_wire;
      }
      await tx.withdrawalGroups.put(r);
    });

  if (status.transfer_done) {
    return {
      status: BankStatusResultCode.Done,
    };
  } else {
    return {
      status: BankStatusResultCode.Waiting,
    };
  }
}

export async function internalCreateWithdrawalGroup(
  ws: InternalWalletState,
  args: {
    reserveStatus: WithdrawalGroupStatus;
    amount: AmountJson;
    exchangeBaseUrl: string;
    forcedDenomSel?: ForcedDenomSel;
    reserveKeyPair?: EddsaKeypair;
    restrictAge?: number;
    wgInfo: WgInfo;
  },
): Promise<WithdrawalGroupRecord> {
  const reserveKeyPair =
    args.reserveKeyPair ?? (await ws.cryptoApi.createEddsaKeypair({}));
  const now = AbsoluteTime.toTimestamp(AbsoluteTime.now());
  const secretSeed = encodeCrock(getRandomBytes(32));
  const canonExchange = canonicalizeBaseUrl(args.exchangeBaseUrl);
  const withdrawalGroupId = encodeCrock(getRandomBytes(32));
  const amount = args.amount;

  await updateWithdrawalDenoms(ws, canonExchange);
  const denoms = await getCandidateWithdrawalDenoms(ws, canonExchange);

  let initialDenomSel: DenomSelectionState;
  const denomSelUid = encodeCrock(getRandomBytes(16));
  if (args.forcedDenomSel) {
    logger.warn("using forced denom selection");
    initialDenomSel = selectForcedWithdrawalDenominations(
      amount,
      denoms,
      args.forcedDenomSel,
    );
  } else {
    initialDenomSel = selectWithdrawalDenominations(amount, denoms);
  }

  const withdrawalGroup: WithdrawalGroupRecord = {
    denomSelUid,
    denomsSel: initialDenomSel,
    exchangeBaseUrl: canonExchange,
    instructedAmount: Amounts.stringify(amount),
    timestampStart: now,
    rawWithdrawalAmount: initialDenomSel.totalWithdrawCost,
    effectiveWithdrawalAmount: initialDenomSel.totalCoinValue,
    secretSeed,
    reservePriv: reserveKeyPair.priv,
    reservePub: reserveKeyPair.pub,
    status: args.reserveStatus,
    withdrawalGroupId,
    restrictAge: args.restrictAge,
    senderWire: undefined,
    timestampFinish: undefined,
    wgInfo: args.wgInfo,
  };

  const exchangeInfo = await updateExchangeFromUrl(ws, canonExchange);
  const exchangeDetails = exchangeInfo.exchangeDetails;
  if (!exchangeDetails) {
    logger.trace(exchangeDetails);
    throw Error("exchange not updated");
  }
  const { isAudited, isTrusted } = await getExchangeTrust(
    ws,
    exchangeInfo.exchange,
  );

  await ws.db
    .mktx((x) => [
      x.withdrawalGroups,
      x.reserves,
      x.exchanges,
      x.exchangeDetails,
      x.exchangeTrust,
    ])
    .runReadWrite(async (tx) => {
      await tx.withdrawalGroups.add(withdrawalGroup);
      await tx.reserves.put({
        reservePub: withdrawalGroup.reservePub,
        reservePriv: withdrawalGroup.reservePriv,
      });

      if (!isAudited && !isTrusted) {
        await tx.exchangeTrust.put({
          currency: amount.currency,
          exchangeBaseUrl: canonExchange,
          exchangeMasterPub: exchangeDetails.masterPublicKey,
          uids: [encodeCrock(getRandomBytes(32))],
        });
      }
    });

  return withdrawalGroup;
}

export async function acceptWithdrawalFromUri(
  ws: InternalWalletState,
  req: {
    talerWithdrawUri: string;
    selectedExchange: string;
    forcedDenomSel?: ForcedDenomSel;
    restrictAge?: number;
  },
): Promise<AcceptWithdrawalResponse> {
  const selectedExchange = canonicalizeBaseUrl(req.selectedExchange);
  logger.info(
    `accepting withdrawal via ${req.talerWithdrawUri}, canonicalized selected exchange ${selectedExchange}`,
  );
  const existingWithdrawalGroup = await ws.db
    .mktx((x) => [x.withdrawalGroups])
    .runReadOnly(async (tx) => {
      return await tx.withdrawalGroups.indexes.byTalerWithdrawUri.get(
        req.talerWithdrawUri,
      );
    });

  if (existingWithdrawalGroup) {
    let url: string | undefined;
    if (
      existingWithdrawalGroup.wgInfo.withdrawalType ===
      WithdrawalRecordType.BankIntegrated
    ) {
      url = existingWithdrawalGroup.wgInfo.bankInfo.confirmUrl;
    }
    return {
      reservePub: existingWithdrawalGroup.reservePub,
      confirmTransferUrl: url,
      transactionId: makeTransactionId(
        TransactionType.Withdrawal,
        existingWithdrawalGroup.withdrawalGroupId,
      ),
    };
  }

  await updateExchangeFromUrl(ws, selectedExchange);
  const withdrawInfo = await getBankWithdrawalInfo(
    ws.http,
    req.talerWithdrawUri,
  );
  const exchangePaytoUri = await getExchangePaytoUri(
    ws,
    selectedExchange,
    withdrawInfo.wireTypes,
  );

  const withdrawalGroup = await internalCreateWithdrawalGroup(ws, {
    amount: withdrawInfo.amount,
    exchangeBaseUrl: req.selectedExchange,
    wgInfo: {
      withdrawalType: WithdrawalRecordType.BankIntegrated,
      bankInfo: {
        exchangePaytoUri,
        talerWithdrawUri: req.talerWithdrawUri,
        confirmUrl: withdrawInfo.confirmTransferUrl,
        timestampBankConfirmed: undefined,
        timestampReserveInfoPosted: undefined,
      },
    },
    restrictAge: req.restrictAge,
    forcedDenomSel: req.forcedDenomSel,
    reserveStatus: WithdrawalGroupStatus.RegisteringBank,
  });

  const withdrawalGroupId = withdrawalGroup.withdrawalGroupId;

  // We do this here, as the reserve should be registered before we return,
  // so that we can redirect the user to the bank's status page.
  await processReserveBankStatus(ws, withdrawalGroupId);
  const processedWithdrawalGroup = await getWithdrawalGroupRecordTx(ws.db, {
    withdrawalGroupId,
  });
  if (processedWithdrawalGroup?.status === WithdrawalGroupStatus.BankAborted) {
    throw TalerError.fromDetail(
      TalerErrorCode.WALLET_WITHDRAWAL_OPERATION_ABORTED_BY_BANK,
      {},
    );
  }

  // Start withdrawal in the background
  processWithdrawalGroup(ws, withdrawalGroupId, {
    forceNow: true,
  }).catch((err) => {
    logger.error("Processing withdrawal (after creation) failed:", err);
  });

  return {
    reservePub: withdrawalGroup.reservePub,
    confirmTransferUrl: withdrawInfo.confirmTransferUrl,
    transactionId: makeTransactionId(
      TransactionType.Withdrawal,
      withdrawalGroupId,
    ),
  };
}

/**
 * Create a manual withdrawal operation.
 *
 * Adds the corresponding exchange as a trusted exchange if it is neither
 * audited nor trusted already.
 *
 * Asynchronously starts the withdrawal.
 */
export async function createManualWithdrawal(
  ws: InternalWalletState,
  req: {
    exchangeBaseUrl: string;
    amount: AmountLike;
    restrictAge?: number;
    forcedDenomSel?: ForcedDenomSel;
  },
): Promise<AcceptManualWithdrawalResult> {
  const withdrawalGroup = await internalCreateWithdrawalGroup(ws, {
    amount: Amounts.jsonifyAmount(req.amount),
    wgInfo: {
      withdrawalType: WithdrawalRecordType.BankManual,
    },
    exchangeBaseUrl: req.exchangeBaseUrl,
    forcedDenomSel: req.forcedDenomSel,
    restrictAge: req.restrictAge,
    reserveStatus: WithdrawalGroupStatus.QueryingStatus,
  });

  const withdrawalGroupId = withdrawalGroup.withdrawalGroupId;

  const exchangePaytoUris = await ws.db
    .mktx((x) => [
      x.withdrawalGroups,
      x.exchanges,
      x.exchangeDetails,
      x.exchangeTrust,
    ])
    .runReadWrite(async (tx) => {
      return await getFundingPaytoUris(tx, withdrawalGroup.withdrawalGroupId);
    });

  // Start withdrawal in the background (do not await!)
  // FIXME: We could also interrupt the task look if it is waiting and
  // rely on retry handling to re-process the withdrawal group.
  runOperationWithErrorReporting(
    ws,
    RetryTags.forWithdrawal(withdrawalGroup),
    async () => {
      return await processWithdrawalGroup(ws, withdrawalGroupId, {
        forceNow: true,
      });
    },
  );

  return {
    reservePub: withdrawalGroup.reservePub,
    exchangePaytoUris: exchangePaytoUris,
    transactionId: makeTransactionId(
      TransactionType.Withdrawal,
      withdrawalGroupId,
    ),
  };
}
