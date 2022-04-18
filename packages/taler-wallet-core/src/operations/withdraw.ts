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
  AmountJson,
  Amounts,
  AmountString,
  BankWithdrawDetails,
  codecForTalerConfigResponse,
  codecForWithdrawOperationStatusResponse,
  codecForWithdrawResponse,
  DenomKeyType,
  Duration,
  durationFromSpec,
  ExchangeListItem,
  ExchangeWithdrawRequest,
  ForcedDenomSel,
  LibtoolVersion,
  Logger,
  NotificationType,
  parseWithdrawUri,
  TalerErrorCode,
  TalerErrorDetail,
  TalerProtocolTimestamp,
  UnblindedSignature,
  URL,
  VersionMatchResult,
  WithdrawResponse,
  WithdrawUriInfoResponse,
} from "@gnu-taler/taler-util";
import {
  CoinRecord,
  CoinSourceType,
  CoinStatus,
  DenominationRecord,
  DenominationVerificationStatus,
  DenomSelectionState,
  ExchangeDetailsRecord,
  ExchangeRecord,
  OperationStatus,
  PlanchetRecord,
  WithdrawalGroupRecord,
} from "../db.js";
import {
  getErrorDetailFromException,
  makeErrorDetail,
  TalerError,
} from "../errors.js";
import { InternalWalletState } from "../internal-wallet-state.js";
import { walletCoreDebugFlags } from "../util/debugFlags.js";
import {
  HttpRequestLibrary,
  readSuccessResponseJsonOrThrow,
} from "../util/http.js";
import { checkDbInvariant, checkLogicInvariant } from "../util/invariants.js";
import {
  resetRetryInfo,
  RetryInfo,
  updateRetryInfoTimeout,
} from "../util/retries.js";
import {
  WALLET_BANK_INTEGRATION_PROTOCOL_VERSION,
  WALLET_EXCHANGE_PROTOCOL_VERSION,
} from "../versions.js";
import { guardOperationException } from "./common.js";

/**
 * Logger for this file.
 */
const logger = new Logger("operations/withdraw.ts");

/**
 * Information about what will happen when creating a reserve.
 *
 * Sent to the wallet frontend to be rendered and shown to the user.
 */
export interface ExchangeWithdrawDetails {
  /**
   * Exchange that the reserve will be created at.
   *
   * FIXME: Should be its own record.
   */
  exchangeInfo: ExchangeRecord;

  exchangeDetails: ExchangeDetailsRecord;

  /**
   * Filtered wire info to send to the bank.
   */
  exchangeWireAccounts: string[];

  /**
   * Selected denominations for withdraw.
   */
  selectedDenoms: DenomSelectionState;

  /**
   * Does the wallet know about an auditor for
   * the exchange that the reserve.
   */
  isAudited: boolean;

  /**
   * Did the user already accept the current terms of service for the exchange?
   */
  termsOfServiceAccepted: boolean;

  /**
   * The exchange is trusted directly.
   */
  isTrusted: boolean;

  /**
   * The earliest deposit expiration of the selected coins.
   */
  earliestDepositExpiration: TalerProtocolTimestamp;

  /**
   * Number of currently offered denominations.
   */
  numOfferedDenoms: number;

  /**
   * Public keys of trusted auditors for the currency we're withdrawing.
   */
  trustedAuditorPubs: string[];

  /**
   * Result of checking the wallet's version
   * against the exchange's version.
   *
   * Older exchanges don't return version information.
   */
  versionMatch: VersionMatchResult | undefined;

  /**
   * Libtool-style version string for the exchange or "unknown"
   * for older exchanges.
   */
  exchangeVersion: string;

  /**
   * Libtool-style version string for the wallet.
   */
  walletVersion: string;

  withdrawalAmountRaw: AmountString;

  /**
   * Amount that will actually be added to the wallet's balance.
   */
  withdrawalAmountEffective: AmountString;
}

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

  let totalCoinValue = Amounts.getZero(amountAvailable.currency);
  let totalWithdrawCost = Amounts.getZero(amountAvailable.currency);

  denoms = denoms.filter(isWithdrawableDenom);
  denoms.sort((d1, d2) => Amounts.cmp(d2.value, d1.value));

  for (const d of denoms) {
    let count = 0;
    const cost = Amounts.add(d.value, d.feeWithdraw).amount;
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
        Amounts.mult(d.value, count).amount,
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
    totalCoinValue,
    totalWithdrawCost,
  };
}

export function selectForcedWithdrawalDenominations(
  amountAvailable: AmountJson,
  denoms: DenominationRecord[],
  forcedDenomSel: ForcedDenomSel,
): DenomSelectionState {
  let remaining = Amounts.copy(amountAvailable);

  const selectedDenoms: {
    count: number;
    denomPubHash: string;
  }[] = [];

  let totalCoinValue = Amounts.getZero(amountAvailable.currency);
  let totalWithdrawCost = Amounts.getZero(amountAvailable.currency);

  denoms = denoms.filter(isWithdrawableDenom);
  denoms.sort((d1, d2) => Amounts.cmp(d2.value, d1.value));

  for (const fds of forcedDenomSel.denoms) {
    const count = fds.count;
    const denom = denoms.find((x) => {
      return Amounts.cmp(x.value, fds.value) == 0;
    });
    if (!denom) {
      throw Error(
        `unable to find denom for forced selection (value ${fds.value})`,
      );
    }
    const cost = Amounts.add(denom.value, denom.feeWithdraw).amount;
    totalCoinValue = Amounts.add(
      totalCoinValue,
      Amounts.mult(denom.value, count).amount,
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
    totalCoinValue,
    totalWithdrawCost,
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
  const resp = await http.get(reqUrl.href);
  const status = await readSuccessResponseJsonOrThrow(
    resp,
    codecForWithdrawOperationStatusResponse(),
  );

  return {
    amount: Amounts.parseOrThrow(status.amount),
    confirmTransferUrl: status.confirm_transfer_url,
    extractedStatusUrl: reqUrl.href,
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
    .mktx((x) => ({ denominations: x.denominations }))
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
    .mktx((x) => ({
      planchets: x.planchets,
    }))
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
  let denomPubHash: string | undefined;
  for (let di = 0; di < withdrawalGroup.denomsSel.selectedDenoms.length; di++) {
    const d = withdrawalGroup.denomsSel.selectedDenoms[di];
    if (coinIdx >= ci && coinIdx < ci + d.count) {
      denomPubHash = d.denomPubHash;
      break;
    }
    ci += d.count;
  }
  if (!denomPubHash) {
    throw Error("invariant violated");
  }

  const { denom, reserve } = await ws.db
    .mktx((x) => ({
      reserves: x.reserves,
      denominations: x.denominations,
    }))
    .runReadOnly(async (tx) => {
      const denom = await tx.denominations.get([
        withdrawalGroup.exchangeBaseUrl,
        denomPubHash!,
      ]);
      if (!denom) {
        throw Error("invariant violated");
      }
      const reserve = await tx.reserves.get(withdrawalGroup.reservePub);
      if (!reserve) {
        throw Error("invariant violated");
      }
      return { denom, reserve };
    });
  const r = await ws.cryptoApi.createPlanchet({
    denomPub: denom.denomPub,
    feeWithdraw: denom.feeWithdraw,
    reservePriv: reserve.reservePriv,
    reservePub: reserve.reservePub,
    value: denom.value,
    coinIndex: coinIdx,
    secretSeed: withdrawalGroup.secretSeed,
  });
  const newPlanchet: PlanchetRecord = {
    blindingKey: r.blindingKey,
    coinEv: r.coinEv,
    coinEvHash: r.coinEvHash,
    coinIdx,
    coinPriv: r.coinPriv,
    coinPub: r.coinPub,
    denomPubHash: r.denomPubHash,
    reservePub: r.reservePub,
    withdrawalDone: false,
    withdrawSig: r.withdrawSig,
    withdrawalGroupId: withdrawalGroup.withdrawalGroupId,
    lastError: undefined,
  };
  await ws.db
    .mktx((x) => ({ planchets: x.planchets }))
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
    .mktx((x) => ({
      withdrawalGroups: x.withdrawalGroups,
      planchets: x.planchets,
      exchanges: x.exchanges,
      denominations: x.denominations,
    }))
    .runReadOnly(async (tx) => {
      let planchet = await tx.planchets.indexes.byGroupAndIndex.get([
        withdrawalGroup.withdrawalGroupId,
        coinIdx,
      ]);
      if (!planchet) {
        return;
      }
      if (planchet.withdrawalDone) {
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
        `reserves/${planchet.reservePub}/withdraw`,
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
      .mktx((x) => ({ planchets: x.planchets }))
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

async function processPlanchetVerifyAndStoreCoin(
  ws: InternalWalletState,
  withdrawalGroup: WithdrawalGroupRecord,
  coinIdx: number,
  resp: WithdrawResponse,
): Promise<void> {
  const d = await ws.db
    .mktx((x) => ({
      withdrawalGroups: x.withdrawalGroups,
      planchets: x.planchets,
      denominations: x.denominations,
    }))
    .runReadOnly(async (tx) => {
      let planchet = await tx.planchets.indexes.byGroupAndIndex.get([
        withdrawalGroup.withdrawalGroupId,
        coinIdx,
      ]);
      if (!planchet) {
        return;
      }
      if (planchet.withdrawalDone) {
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
      .mktx((x) => ({ planchets: x.planchets }))
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
    currentAmount: denomInfo.value,
    denomPubHash: planchet.denomPubHash,
    denomSig,
    coinEvHash: planchet.coinEvHash,
    exchangeBaseUrl: d.exchangeBaseUrl,
    status: CoinStatus.Fresh,
    coinSource: {
      type: CoinSourceType.Withdraw,
      coinIndex: coinIdx,
      reservePub: planchet.reservePub,
      withdrawalGroupId: withdrawalGroup.withdrawalGroupId,
    },
    suspended: false,
  };

  const planchetCoinPub = planchet.coinPub;

  const firstSuccess = await ws.db
    .mktx((x) => ({
      coins: x.coins,
      withdrawalGroups: x.withdrawalGroups,
      reserves: x.reserves,
      planchets: x.planchets,
    }))
    .runReadWrite(async (tx) => {
      const p = await tx.planchets.get(planchetCoinPub);
      if (!p || p.withdrawalDone) {
        return false;
      }
      p.withdrawalDone = true;
      await tx.planchets.put(p);
      await tx.coins.add(coin);
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
    .mktx((x) => ({
      exchanges: x.exchanges,
      exchangeDetails: x.exchangeDetails,
    }))
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
        let valid: boolean = false;
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
        .mktx((x) => ({ denominations: x.denominations }))
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

async function setupWithdrawalRetry(
  ws: InternalWalletState,
  withdrawalGroupId: string,
  options: {
    reset: boolean;
  },
): Promise<void> {
  await ws.db
    .mktx((x) => ({ withdrawalGroups: x.withdrawalGroups }))
    .runReadWrite(async (tx) => {
      const wsr = await tx.withdrawalGroups.get(withdrawalGroupId);
      if (!wsr) {
        return;
      }
      if (options.reset) {
        wsr.retryInfo = resetRetryInfo();
      } else {
        wsr.retryInfo = RetryInfo.increment(wsr.retryInfo);
      }
      await tx.withdrawalGroups.put(wsr);
    });
}

async function reportWithdrawalError(
  ws: InternalWalletState,
  withdrawalGroupId: string,
  err: TalerErrorDetail,
): Promise<void> {
  await ws.db
    .mktx((x) => ({ withdrawalGroups: x.withdrawalGroups }))
    .runReadWrite(async (tx) => {
      const wsr = await tx.withdrawalGroups.get(withdrawalGroupId);
      if (!wsr) {
        return;
      }
      if (!wsr.retryInfo) {
        logger.reportBreak();
      }
      wsr.lastError = err;
      await tx.withdrawalGroups.put(wsr);
    });
  ws.notify({ type: NotificationType.WithdrawOperationError, error: err });
}

export async function processWithdrawGroup(
  ws: InternalWalletState,
  withdrawalGroupId: string,
  options: {
    forceNow?: boolean;
  } = {},
): Promise<void> {
  const onOpErr = (e: TalerErrorDetail): Promise<void> =>
    reportWithdrawalError(ws, withdrawalGroupId, e);
  await guardOperationException(
    () => processWithdrawGroupImpl(ws, withdrawalGroupId, options),
    onOpErr,
  );
}

async function processWithdrawGroupImpl(
  ws: InternalWalletState,
  withdrawalGroupId: string,
  options: {
    forceNow?: boolean;
  } = {},
): Promise<void> {
  const forceNow = options.forceNow ?? false;
  logger.trace("processing withdraw group", withdrawalGroupId);
  await setupWithdrawalRetry(ws, withdrawalGroupId, { reset: forceNow });
  const withdrawalGroup = await ws.db
    .mktx((x) => ({ withdrawalGroups: x.withdrawalGroups }))
    .runReadOnly(async (tx) => {
      return tx.withdrawalGroups.get(withdrawalGroupId);
    });
  if (!withdrawalGroup) {
    // Withdrawal group doesn't exist yet, but reserve might exist
    // (and reference the yet to be created withdrawal group)
    const reservePub = await ws.db
      .mktx((x) => ({ reserves: x.reserves }))
      .runReadOnly(async (tx) => {
        const r = await tx.reserves.indexes.byInitialWithdrawalGroupId.get(
          withdrawalGroupId,
        );
        return r?.reservePub;
      });
    if (!reservePub) {
      logger.warn(
        "withdrawal group doesn't exist (and reserve doesn't exist either)",
      );
      return;
    }
    return await ws.reserveOps.processReserve(ws, reservePub, { forceNow });
  }

  await ws.exchangeOps.updateExchangeFromUrl(
    ws,
    withdrawalGroup.exchangeBaseUrl,
  );

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

  await Promise.all(work);

  let numFinished = 0;
  let finishedForFirstTime = false;
  let errorsPerCoin: Record<number, TalerErrorDetail> = {};

  await ws.db
    .mktx((x) => ({
      coins: x.coins,
      withdrawalGroups: x.withdrawalGroups,
      reserves: x.reserves,
      planchets: x.planchets,
    }))
    .runReadWrite(async (tx) => {
      const wg = await tx.withdrawalGroups.get(withdrawalGroupId);
      if (!wg) {
        return;
      }

      await tx.planchets.indexes.byGroup
        .iter(withdrawalGroupId)
        .forEach((x) => {
          if (x.withdrawalDone) {
            numFinished++;
          }
          if (x.lastError) {
            errorsPerCoin[x.coinIdx] = x.lastError;
          }
        });
      logger.trace(`now withdrawn ${numFinished} of ${numTotalCoins} coins`);
      if (wg.timestampFinish === undefined && numFinished === numTotalCoins) {
        finishedForFirstTime = true;
        wg.timestampFinish = TalerProtocolTimestamp.now();
        wg.operationStatus = OperationStatus.Finished;
        delete wg.lastError;
        wg.retryInfo = resetRetryInfo();
      }

      await tx.withdrawalGroups.put(wg);
    });

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
}

export async function getExchangeWithdrawalInfo(
  ws: InternalWalletState,
  exchangeBaseUrl: string,
  instructedAmount: AmountJson,
): Promise<ExchangeWithdrawDetails> {
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

  let earliestDepositExpiration: TalerProtocolTimestamp | undefined;
  for (let i = 0; i < selectedDenoms.selectedDenoms.length; i++) {
    const ds = selectedDenoms.selectedDenoms[i];
    // FIXME: Do in one transaction!
    const denom = await ws.db
      .mktx((x) => ({ denominations: x.denominations }))
      .runReadOnly(async (tx) => {
        return ws.getDenomInfo(ws, tx, exchangeBaseUrl, ds.denomPubHash);
      });
    checkDbInvariant(!!denom);
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
    .mktx((x) => ({ denominations: x.denominations }))
    .runReadOnly(async (tx) => {
      const ds = await tx.denominations.indexes.byExchangeBaseUrl.getAll(
        exchangeBaseUrl,
      );
      return ds.filter((x) => x.isOffered);
    });

  let versionMatch;
  if (exchangeDetails.protocolVersion) {
    versionMatch = LibtoolVersion.compare(
      WALLET_EXCHANGE_PROTOCOL_VERSION,
      exchangeDetails.protocolVersion,
    );

    if (
      versionMatch &&
      !versionMatch.compatible &&
      versionMatch.currentCmp === -1
    ) {
      console.warn(
        `wallet's support for exchange protocol version ${WALLET_EXCHANGE_PROTOCOL_VERSION} might be outdated ` +
          `(exchange has ${exchangeDetails.protocolVersion}), checking for updates`,
      );
    }
  }

  let tosAccepted = false;

  if (exchangeDetails.termsOfServiceLastEtag) {
    if (
      exchangeDetails.termsOfServiceAcceptedEtag ===
      exchangeDetails.termsOfServiceLastEtag
    ) {
      tosAccepted = true;
    }
  }

  const withdrawFee = Amounts.sub(
    selectedDenoms.totalWithdrawCost,
    selectedDenoms.totalCoinValue,
  ).amount;

  const ret: ExchangeWithdrawDetails = {
    earliestDepositExpiration,
    exchangeInfo: exchange,
    exchangeDetails,
    exchangeWireAccounts,
    exchangeVersion: exchangeDetails.protocolVersion || "unknown",
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
  };
  return ret;
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
    .mktx((x) => ({
      exchanges: x.exchanges,
      exchangeDetails: x.exchangeDetails,
    }))
    .runReadOnly(async (tx) => {
      const exchangeRecords = await tx.exchanges.iter().toArray();
      for (const r of exchangeRecords) {
        const details = await ws.exchangeOps.getExchangeDetails(tx, r.baseUrl);
        if (details) {
          exchanges.push({
            exchangeBaseUrl: details.exchangeBaseUrl,
            currency: details.currency,
            tos: {
              acceptedVersion: details.termsOfServiceAcceptedEtag,
              currentVersion: details.termsOfServiceLastEtag,
              contentType: details.termsOfServiceContentType,
              content: details.termsOfServiceText,
            },
            paytoUris: details.wireInfo.accounts.map((x) => x.payto_uri),
          });
        }
      }
    });

  return {
    amount: Amounts.stringify(info.amount),
    defaultExchangeBaseUrl: info.suggestedExchange,
    possibleExchanges: exchanges,
  };
}
