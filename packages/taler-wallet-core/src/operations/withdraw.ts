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
  AmountJson,
  AmountLike,
  Amounts,
  AmountString,
  BankWithdrawDetails,
  canonicalizeBaseUrl,
  codecForBankWithdrawalOperationPostResponse,
  codecForReserveStatus,
  codecForTalerConfigResponse,
  codecForWithdrawBatchResponse,
  codecForWithdrawOperationStatusResponse,
  codecForWithdrawResponse,
  DenomKeyType,
  Duration,
  durationFromSpec, encodeCrock,
  ExchangeListItem,
  ExchangeWithdrawRequest,
  ForcedDenomSel,
  getRandomBytes,
  j2s,
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
  WithdrawBatchResponse,
  WithdrawResponse,
  WithdrawUriInfoResponse
} from "@gnu-taler/taler-util";
import { EddsaKeypair } from "../crypto/cryptoImplementation.js";
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
  ReserveBankInfo,
  ReserveRecordStatus,
  WalletStoresV1,
  WithdrawalGroupRecord
} from "../db.js";
import {
  getErrorDetailFromException,
  makeErrorDetail,
  TalerError
} from "../errors.js";
import { InternalWalletState } from "../internal-wallet-state.js";
import { assertUnreachable } from "../util/assertUnreachable.js";
import { walletCoreDebugFlags } from "../util/debugFlags.js";
import {
  HttpRequestLibrary,
  readSuccessResponseJsonOrErrorCode,
  readSuccessResponseJsonOrThrow,
  throwUnexpectedRequestError
} from "../util/http.js";
import { checkDbInvariant, checkLogicInvariant } from "../util/invariants.js";
import {
  DbAccess,
  GetReadOnlyAccess
} from "../util/query.js";
import { RetryInfo } from "../util/retries.js";
import {
  WALLET_BANK_INTEGRATION_PROTOCOL_VERSION,
  WALLET_EXCHANGE_PROTOCOL_VERSION
} from "../versions.js";
import { guardOperationException } from "./common.js";
import {
  getExchangeDetails,
  getExchangePaytoUri,
  getExchangeTrust,
  updateExchangeFromUrl
} from "./exchanges.js";

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
    for (; ;) {
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
    .mktx((x) => ({
      denominations: x.denominations,
    }))
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
    feeWithdraw: denom.feeWithdraw,
    reservePriv: withdrawalGroup.reservePriv,
    reservePub: withdrawalGroup.reservePub,
    value: denom.value,
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
    reservePub: r.reservePub,
    withdrawalDone: false,
    withdrawSig: r.withdrawSig,
    withdrawalGroupId: withdrawalGroup.withdrawalGroupId,
    ageCommitmentProof: r.ageCommitmentProof,
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
    .mktx((x) => ({
      withdrawalGroups: x.withdrawalGroups,
      planchets: x.planchets,
      exchanges: x.exchanges,
      denominations: x.denominations,
    }))
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
        if (planchet.withdrawalDone) {
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

  try {
    const resp = await ws.http.postJson(reqUrl, d);
    const r = await readSuccessResponseJsonOrThrow(
      resp,
      codecForWithdrawBatchResponse(),
    );
    return r;
  } catch (e) {
    const errDetail = getErrorDetailFromException(e);
    logger.trace("withdrawal batch request failed", e);
    logger.trace(e);
    await ws.db
      .mktx((x) => ({ withdrawalGroups: x.withdrawalGroups }))
      .runReadWrite(async (tx) => {
        let wg = await tx.withdrawalGroups.get(
          withdrawalGroup.withdrawalGroupId,
        );
        if (!wg) {
          return;
        }
        wg.lastError = errDetail;
        await tx.withdrawalGroups.put(wg);
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
    ageCommitmentProof: planchet.ageCommitmentProof,
  };

  const planchetCoinPub = planchet.coinPub;

  // Check if this is the first time that the whole
  // withdrawal succeeded.  If so, mark the withdrawal
  // group as finished.
  const firstSuccess = await ws.db
    .mktx((x) => ({
      coins: x.coins,
      withdrawalGroups: x.withdrawalGroups,
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
          `Validating denomination (${current + 1}/${denominations.length
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
        wsr.retryInfo = RetryInfo.reset();
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
): Promise<{ ready: boolean }> {
  const withdrawalGroup = await getWithdrawalGroupRecordTx(ws.db, {
    withdrawalGroupId,
  });
  checkDbInvariant(!!withdrawalGroup);
  if (withdrawalGroup.reserveStatus !== ReserveRecordStatus.QueryingStatus) {
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
    .mktx((x) => ({
      withdrawalGroups: x.withdrawalGroups,
    }))
    .runReadWrite(async (tx) => {
      const wg = await tx.withdrawalGroups.get(withdrawalGroupId);
      if (!wg) {
        logger.warn(`withdrawal group ${withdrawalGroupId} not found`);
        return;
      }
      wg.reserveStatus = ReserveRecordStatus.Dormant;
      await tx.withdrawalGroups.put(wg);
    });

  return { ready: true };
}

export async function processWithdrawalGroup(
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
    throw Error(`withdrawal group ${withdrawalGroupId} not found`);
  }

  switch (withdrawalGroup.reserveStatus) {
    case ReserveRecordStatus.RegisteringBank:
      await processReserveBankStatus(ws, withdrawalGroupId);
      return await processWithdrawGroupImpl(ws, withdrawalGroupId, {
        forceNow: true,
      });
    case ReserveRecordStatus.QueryingStatus: {
      const res = await queryReserve(ws, withdrawalGroupId);
      if (res.ready) {
        return await processWithdrawGroupImpl(ws, withdrawalGroupId, {
          forceNow: true,
        });
      }
      return;
    }
    case ReserveRecordStatus.WaitConfirmBank:
      await processReserveBankStatus(ws, withdrawalGroupId);
      return;
    case ReserveRecordStatus.BankAborted:
      // FIXME
      return;
    case ReserveRecordStatus.Dormant:
      // We can try to withdraw, nothing needs to be done with the reserve.
      break;
    default:
      logger.warn(
        "unknown reserve record status:",
        withdrawalGroup.reserveStatus,
      );
      assertUnreachable(withdrawalGroup.reserveStatus);
      break;
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

  if (ws.batchWithdrawal) {
    const resp = await processPlanchetExchangeBatchRequest(ws, withdrawalGroup);
    if (!resp) {
      return;
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
  let finishedForFirstTime = false;
  let errorsPerCoin: Record<number, TalerErrorDetail> = {};

  await ws.db
    .mktx((x) => ({
      coins: x.coins,
      withdrawalGroups: x.withdrawalGroups,
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
        wg.retryInfo = RetryInfo.reset();
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
      logger.warn(
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
    .mktx((x) => ({
      exchanges: x.exchanges,
      exchangeDetails: x.exchangeDetails,
      denominations: x.denominations,
    }))
    .runReadOnly(async (tx) => {
      const exchangeRecords = await tx.exchanges.iter().toArray();
      for (const r of exchangeRecords) {
        const details = await ws.exchangeOps.getExchangeDetails(tx, r.baseUrl);
        const denominations = await tx.denominations.indexes
          .byExchangeBaseUrl.iter(r.baseUrl).toArray();
        if (details && denominations) {


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
            auditors: details.auditors,
            wireInfo: details.wireInfo,
            denominations: denominations
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

export async function getFundingPaytoUrisTx(
  ws: InternalWalletState,
  withdrawalGroupId: string,
): Promise<string[]> {
  return await ws.db
    .mktx((x) => ({
      exchanges: x.exchanges,
      exchangeDetails: x.exchangeDetails,
      withdrawalGroups: x.withdrawalGroups,
    }))
    .runReadWrite((tx) => getFundingPaytoUris(tx, withdrawalGroupId));
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
  return plainPaytoUris.map((x) =>
    addPaytoQueryParams(x, {
      amount: Amounts.stringify(withdrawalGroup.instructedAmount),
      message: `Taler Withdrawal ${withdrawalGroup.reservePub}`,
    }),
  );
}

async function getWithdrawalGroupRecordTx(
  db: DbAccess<typeof WalletStoresV1>,
  req: {
    withdrawalGroupId: string;
  },
): Promise<WithdrawalGroupRecord | undefined> {
  return await db
    .mktx((x) => ({
      withdrawalGroups: x.withdrawalGroups,
    }))
    .runReadOnly(async (tx) => {
      return tx.withdrawalGroups.get(req.withdrawalGroupId);
    });
}

export function getReserveRequestTimeout(r: WithdrawalGroupRecord): Duration {
  return Duration.max(
    { d_ms: 60000 },
    Duration.min({ d_ms: 5000 }, RetryInfo.getDuration(r.retryInfo)),
  );
}

async function registerReserveWithBank(
  ws: InternalWalletState,
  withdrawalGroupId: string,
): Promise<void> {
  const withdrawalGroup = await ws.db
    .mktx((x) => ({
      withdrawalGroups: x.withdrawalGroups,
    }))
    .runReadOnly(async (tx) => {
      return await tx.withdrawalGroups.get(withdrawalGroupId);
    });
  switch (withdrawalGroup?.reserveStatus) {
    case ReserveRecordStatus.WaitConfirmBank:
    case ReserveRecordStatus.RegisteringBank:
      break;
    default:
      return;
  }
  const bankInfo = withdrawalGroup.bankInfo;
  if (!bankInfo) {
    return;
  }
  const bankStatusUrl = bankInfo.statusUrl;
  const httpResp = await ws.http.postJson(
    bankStatusUrl,
    {
      reserve_pub: withdrawalGroup.reservePub,
      selected_exchange: bankInfo.exchangePaytoUri,
    },
    {
      timeout: getReserveRequestTimeout(withdrawalGroup),
    },
  );
  await readSuccessResponseJsonOrThrow(
    httpResp,
    codecForBankWithdrawalOperationPostResponse(),
  );
  await ws.db
    .mktx((x) => ({
      withdrawalGroups: x.withdrawalGroups,
    }))
    .runReadWrite(async (tx) => {
      const r = await tx.withdrawalGroups.get(withdrawalGroupId);
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
      if (!r.bankInfo) {
        throw Error("invariant failed");
      }
      r.bankInfo.timestampReserveInfoPosted = AbsoluteTime.toTimestamp(
        AbsoluteTime.now(),
      );
      r.reserveStatus = ReserveRecordStatus.WaitConfirmBank;
      r.operationStatus = OperationStatus.Pending;
      r.retryInfo = RetryInfo.reset();
      await tx.withdrawalGroups.put(r);
    });
  ws.notify({ type: NotificationType.ReserveRegisteredWithBank });
  return processReserveBankStatus(ws, withdrawalGroupId);
}

async function processReserveBankStatus(
  ws: InternalWalletState,
  withdrawalGroupId: string,
): Promise<void> {
  const withdrawalGroup = await getWithdrawalGroupRecordTx(ws.db, {
    withdrawalGroupId,
  });
  switch (withdrawalGroup?.reserveStatus) {
    case ReserveRecordStatus.WaitConfirmBank:
    case ReserveRecordStatus.RegisteringBank:
      break;
    default:
      return;
  }
  const bankStatusUrl = withdrawalGroup.bankInfo?.statusUrl;
  if (!bankStatusUrl) {
    return;
  }

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
      .mktx((x) => ({
        withdrawalGroups: x.withdrawalGroups,
      }))
      .runReadWrite(async (tx) => {
        const r = await tx.withdrawalGroups.get(withdrawalGroupId);
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
        if (!r.bankInfo) {
          throw Error("invariant failed");
        }
        const now = AbsoluteTime.toTimestamp(AbsoluteTime.now());
        r.bankInfo.timestampBankConfirmed = now;
        r.reserveStatus = ReserveRecordStatus.BankAborted;
        r.operationStatus = OperationStatus.Finished;
        r.retryInfo = RetryInfo.reset();
        await tx.withdrawalGroups.put(r);
      });
    return;
  }

  // Bank still needs to know our reserve info
  if (!status.selection_done) {
    await registerReserveWithBank(ws, withdrawalGroupId);
    return await processReserveBankStatus(ws, withdrawalGroupId);
  }

  // FIXME: Why do we do this?!
  if (withdrawalGroup.reserveStatus === ReserveRecordStatus.RegisteringBank) {
    await registerReserveWithBank(ws, withdrawalGroupId);
    return await processReserveBankStatus(ws, withdrawalGroupId);
  }

  await ws.db
    .mktx((x) => ({
      withdrawalGroups: x.withdrawalGroups,
    }))
    .runReadWrite(async (tx) => {
      const r = await tx.withdrawalGroups.get(withdrawalGroupId);
      if (!r) {
        return;
      }
      // Re-check reserve status within transaction
      switch (r.reserveStatus) {
        case ReserveRecordStatus.RegisteringBank:
        case ReserveRecordStatus.WaitConfirmBank:
          break;
        default:
          return;
      }
      if (status.transfer_done) {
        logger.info("withdrawal: transfer confirmed by bank.");
        const now = AbsoluteTime.toTimestamp(AbsoluteTime.now());
        if (!r.bankInfo) {
          throw Error("invariant failed");
        }
        r.bankInfo.timestampBankConfirmed = now;
        r.reserveStatus = ReserveRecordStatus.QueryingStatus;
        r.operationStatus = OperationStatus.Pending;
        r.retryInfo = RetryInfo.reset();
      } else {
        logger.info("withdrawal: transfer not yet confirmed by bank");
        if (r.bankInfo) {
          r.bankInfo.confirmUrl = status.confirm_transfer_url;
        }
        r.retryInfo = RetryInfo.increment(r.retryInfo);
      }
      await tx.withdrawalGroups.put(r);
    });
}

export async function internalCreateWithdrawalGroup(
  ws: InternalWalletState,
  args: {
    reserveStatus: ReserveRecordStatus;
    amount: AmountJson;
    bankInfo?: ReserveBankInfo;
    exchangeBaseUrl: string;
    forcedDenomSel?: ForcedDenomSel;
    reserveKeyPair?: EddsaKeypair;
    restrictAge?: number;
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
    instructedAmount: amount,
    timestampStart: now,
    lastError: undefined,
    operationStatus: OperationStatus.Pending,
    rawWithdrawalAmount: initialDenomSel.totalWithdrawCost,
    secretSeed,
    reservePriv: reserveKeyPair.priv,
    reservePub: reserveKeyPair.pub,
    reserveStatus: args.reserveStatus,
    retryInfo: RetryInfo.reset(),
    withdrawalGroupId,
    bankInfo: args.bankInfo,
    restrictAge: args.restrictAge,
    senderWire: undefined,
    timestampFinish: undefined,
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
    .mktx((x) => ({
      withdrawalGroups: x.withdrawalGroups,
      exchanges: x.exchanges,
      exchangeDetails: x.exchangeDetails,
      exchangeTrust: x.exchangeTrust,
    }))
    .runReadWrite(async (tx) => {
      await tx.withdrawalGroups.add(withdrawalGroup);

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
  await updateExchangeFromUrl(ws, req.selectedExchange);
  const withdrawInfo = await getBankWithdrawalInfo(
    ws.http,
    req.talerWithdrawUri,
  );
  const exchangePaytoUri = await getExchangePaytoUri(
    ws,
    req.selectedExchange,
    withdrawInfo.wireTypes,
  );

  const withdrawalGroup = await internalCreateWithdrawalGroup(ws, {
    amount: withdrawInfo.amount,
    exchangeBaseUrl: req.selectedExchange,
    forcedDenomSel: req.forcedDenomSel,
    reserveStatus: ReserveRecordStatus.RegisteringBank,
    bankInfo: {
      exchangePaytoUri,
      statusUrl: withdrawInfo.extractedStatusUrl,
      confirmUrl: withdrawInfo.confirmTransferUrl,
    },
  });

  const withdrawalGroupId = withdrawalGroup.withdrawalGroupId;

  // We do this here, as the reserve should be registered before we return,
  // so that we can redirect the user to the bank's status page.
  await processReserveBankStatus(ws, withdrawalGroupId);
  const processedWithdrawalGroup = await getWithdrawalGroupRecordTx(ws.db, {
    withdrawalGroupId,
  });
  if (
    processedWithdrawalGroup?.reserveStatus === ReserveRecordStatus.BankAborted
  ) {
    throw TalerError.fromDetail(
      TalerErrorCode.WALLET_WITHDRAWAL_OPERATION_ABORTED_BY_BANK,
      {},
    );
  }

  // Start withdrawal in the background.
  await processWithdrawalGroup(ws, withdrawalGroupId, { forceNow: true }).catch(
    (err) => {
      logger.error("Processing withdrawal (after creation) failed:", err);
    },
  );

  return {
    reservePub: withdrawalGroup.reservePub,
    confirmTransferUrl: withdrawInfo.confirmTransferUrl,
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
    exchangeBaseUrl: req.exchangeBaseUrl,
    bankInfo: undefined,
    forcedDenomSel: req.forcedDenomSel,
    restrictAge: req.restrictAge,
    reserveStatus: ReserveRecordStatus.QueryingStatus,
  });

  const withdrawalGroupId = withdrawalGroup.withdrawalGroupId;

  const exchangePaytoUris = await ws.db
    .mktx((x) => ({
      withdrawalGroups: x.withdrawalGroups,
      exchanges: x.exchanges,
      exchangeDetails: x.exchangeDetails,
      exchangeTrust: x.exchangeTrust,
    }))
    .runReadWrite(async (tx) => {
      return await getFundingPaytoUris(tx, withdrawalGroup.withdrawalGroupId);
    });

  // Start withdrawal in the background.
  await processWithdrawalGroup(ws, withdrawalGroupId, { forceNow: true }).catch(
    (err) => {
      logger.error("Processing withdrawal (after creation) failed:", err);
    },
  );

  return {
    reservePub: withdrawalGroup.reservePub,
    exchangePaytoUris: exchangePaytoUris,
  };
}
