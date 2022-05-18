/*
 This file is part of GNU Taler
 (C) 2019 Taler Systems S.A.

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
  Amounts, BlindedDenominationSignature,
  codecForMerchantTipResponseV2, codecForTipPickupGetResponse, DenomKeyType, encodeCrock, getRandomBytes, j2s, Logger, NotificationType, parseTipUri, PrepareTipResult, TalerErrorCode, TalerErrorDetail, TalerProtocolTimestamp, TipPlanchetDetail, URL
} from "@gnu-taler/taler-util";
import { DerivedTipPlanchet } from "../crypto/cryptoTypes.js";
import {
  CoinRecord,
  CoinSourceType,
  CoinStatus, DenominationRecord, TipRecord
} from "../db.js";
import { makeErrorDetail } from "../errors.js";
import { InternalWalletState } from "../internal-wallet-state.js";
import {
  getHttpResponseErrorDetails,
  readSuccessResponseJsonOrThrow
} from "../util/http.js";
import { checkDbInvariant, checkLogicInvariant } from "../util/invariants.js";
import {
  RetryInfo
} from "../util/retries.js";
import { guardOperationException } from "./common.js";
import { updateExchangeFromUrl } from "./exchanges.js";
import {
  getCandidateWithdrawalDenoms, getExchangeWithdrawalInfo, selectWithdrawalDenominations, updateWithdrawalDenoms
} from "./withdraw.js";

const logger = new Logger("operations/tip.ts");

export async function prepareTip(
  ws: InternalWalletState,
  talerTipUri: string,
): Promise<PrepareTipResult> {
  const res = parseTipUri(talerTipUri);
  if (!res) {
    throw Error("invalid taler://tip URI");
  }

  let tipRecord = await ws.db
    .mktx((x) => ({
      tips: x.tips,
    }))
    .runReadOnly(async (tx) => {
      return tx.tips.indexes.byMerchantTipIdAndBaseUrl.get([
        res.merchantTipId,
        res.merchantBaseUrl,
      ]);
    });

  if (!tipRecord) {
    const tipStatusUrl = new URL(
      `tips/${res.merchantTipId}`,
      res.merchantBaseUrl,
    );
    logger.trace("checking tip status from", tipStatusUrl.href);
    const merchantResp = await ws.http.get(tipStatusUrl.href);
    const tipPickupStatus = await readSuccessResponseJsonOrThrow(
      merchantResp,
      codecForTipPickupGetResponse(),
    );
    logger.trace(`status ${j2s(tipPickupStatus)}`);

    const amount = Amounts.parseOrThrow(tipPickupStatus.tip_amount);

    logger.trace("new tip, creating tip record");
    await updateExchangeFromUrl(ws, tipPickupStatus.exchange_url);
    const withdrawDetails = await getExchangeWithdrawalInfo(
      ws,
      tipPickupStatus.exchange_url,
      amount,
    );

    const walletTipId = encodeCrock(getRandomBytes(32));
    await updateWithdrawalDenoms(ws, tipPickupStatus.exchange_url);
    const denoms = await getCandidateWithdrawalDenoms(
      ws,
      tipPickupStatus.exchange_url,
    );
    const selectedDenoms = selectWithdrawalDenominations(amount, denoms);

    const secretSeed = encodeCrock(getRandomBytes(64));
    const denomSelUid = encodeCrock(getRandomBytes(32));

    const newTipRecord: TipRecord = {
      walletTipId: walletTipId,
      acceptedTimestamp: undefined,
      tipAmountRaw: amount,
      tipExpiration: tipPickupStatus.expiration,
      exchangeBaseUrl: tipPickupStatus.exchange_url,
      merchantBaseUrl: res.merchantBaseUrl,
      createdTimestamp: TalerProtocolTimestamp.now(),
      merchantTipId: res.merchantTipId,
      tipAmountEffective: selectedDenoms.totalCoinValue,
      retryInfo: RetryInfo.reset(),
      lastError: undefined,
      denomsSel: selectedDenoms,
      pickedUpTimestamp: undefined,
      secretSeed,
      denomSelUid,
    };
    await ws.db
      .mktx((x) => ({
        tips: x.tips,
      }))
      .runReadWrite(async (tx) => {
        await tx.tips.put(newTipRecord);
      });
    tipRecord = newTipRecord;
  }

  const tipStatus: PrepareTipResult = {
    accepted: !!tipRecord && !!tipRecord.acceptedTimestamp,
    tipAmountRaw: Amounts.stringify(tipRecord.tipAmountRaw),
    exchangeBaseUrl: tipRecord.exchangeBaseUrl,
    merchantBaseUrl: tipRecord.merchantBaseUrl,
    expirationTimestamp: tipRecord.tipExpiration,
    tipAmountEffective: Amounts.stringify(tipRecord.tipAmountEffective),
    walletTipId: tipRecord.walletTipId,
  };

  return tipStatus;
}

async function reportTipError(
  ws: InternalWalletState,
  walletTipId: string,
  err: TalerErrorDetail,
): Promise<void> {
  await ws.db
    .mktx((x) => ({
      tips: x.tips,
    }))
    .runReadWrite(async (tx) => {
      const t = await tx.tips.get(walletTipId);
      if (!t) {
        return;
      }
      if (!t.retryInfo) {
        logger.reportBreak();
      }
      t.lastError = err;
      await tx.tips.put(t);
    });
  if (err) {
    ws.notify({ type: NotificationType.TipOperationError, error: err });
  }
}

async function setupTipRetry(
  ws: InternalWalletState,
  walletTipId: string,
  options: {
    reset: boolean;
  },
): Promise<void> {
  await ws.db
    .mktx((x) => ({
      tips: x.tips,
    }))
    .runReadWrite(async (tx) => {
      const t = await tx.tips.get(walletTipId);
      if (!t) {
        return;
      }
      if (options.reset) {
        t.retryInfo = RetryInfo.reset();
      } else {
        t.retryInfo = RetryInfo.increment(t.retryInfo);
      }
      delete t.lastError;
      await tx.tips.put(t);
    });
}

export async function processTip(
  ws: InternalWalletState,
  tipId: string,
  options: {
    forceNow?: boolean;
  } = {},
): Promise<void> {
  const onOpErr = (e: TalerErrorDetail): Promise<void> =>
    reportTipError(ws, tipId, e);
  await guardOperationException(
    () => processTipImpl(ws, tipId, options),
    onOpErr,
  );
}

async function resetTipRetry(
  ws: InternalWalletState,
  tipId: string,
): Promise<void> {
  await ws.db
    .mktx((x) => ({
      tips: x.tips,
    }))
    .runReadWrite(async (tx) => {
      const x = await tx.tips.get(tipId);
      if (x) {
        x.retryInfo = RetryInfo.reset();
        await tx.tips.put(x);
      }
    });
}

async function processTipImpl(
  ws: InternalWalletState,
  walletTipId: string,
  options: {
    forceNow?: boolean;
  } = {},
): Promise<void> {
  const forceNow = options.forceNow ?? false;
  if (forceNow) {
    await resetTipRetry(ws, walletTipId);
  }
  const tipRecord = await ws.db
    .mktx((x) => ({
      tips: x.tips,
    }))
    .runReadOnly(async (tx) => {
      return tx.tips.get(walletTipId);
    });
  if (!tipRecord) {
    return;
  }

  if (tipRecord.pickedUpTimestamp) {
    logger.warn("tip already picked up");
    return;
  }

  const denomsForWithdraw = tipRecord.denomsSel;

  const planchets: DerivedTipPlanchet[] = [];
  // Planchets in the form that the merchant expects
  const planchetsDetail: TipPlanchetDetail[] = [];
  const denomForPlanchet: { [index: number]: DenominationRecord } = [];

  for (const dh of denomsForWithdraw.selectedDenoms) {
    const denom = await ws.db
      .mktx((x) => ({
        denominations: x.denominations,
      }))
      .runReadOnly(async (tx) => {
        return tx.denominations.get([
          tipRecord.exchangeBaseUrl,
          dh.denomPubHash,
        ]);
      });
    checkDbInvariant(!!denom, "denomination should be in database");
    for (let i = 0; i < dh.count; i++) {
      const deriveReq = {
        denomPub: denom.denomPub,
        planchetIndex: planchets.length,
        secretSeed: tipRecord.secretSeed,
      };
      logger.trace(`deriving tip planchet: ${j2s(deriveReq)}`);
      const p = await ws.cryptoApi.createTipPlanchet(deriveReq);
      logger.trace(`derive result: ${j2s(p)}`);
      denomForPlanchet[planchets.length] = denom;
      planchets.push(p);
      planchetsDetail.push({
        coin_ev: p.coinEv,
        denom_pub_hash: denom.denomPubHash,
      });
    }
  }

  const tipStatusUrl = new URL(
    `tips/${tipRecord.merchantTipId}/pickup`,
    tipRecord.merchantBaseUrl,
  );

  const req = { planchets: planchetsDetail };
  logger.trace(`sending tip request: ${j2s(req)}`);
  const merchantResp = await ws.http.postJson(tipStatusUrl.href, req);

  logger.trace(`got tip response, status ${merchantResp.status}`);

  // Hide transient errors.
  if (
    tipRecord.retryInfo.retryCounter < 5 &&
    ((merchantResp.status >= 500 && merchantResp.status <= 599) ||
      merchantResp.status === 424)
  ) {
    logger.trace(`got transient tip error`);
    // FIXME: wrap in another error code that indicates a transient error
    const err = makeErrorDetail(
      TalerErrorCode.WALLET_UNEXPECTED_REQUEST_ERROR,
      getHttpResponseErrorDetails(merchantResp),
      "tip pickup failed (transient)",
    );
    await reportTipError(ws, tipRecord.walletTipId, err);
    // FIXME: Maybe we want to signal to the caller that the transient error happened?
    return;
  }
  let blindedSigs: BlindedDenominationSignature[] = [];

  const response = await readSuccessResponseJsonOrThrow(
    merchantResp,
    codecForMerchantTipResponseV2(),
  );
  blindedSigs = response.blind_sigs.map((x) => x.blind_sig);

  if (blindedSigs.length !== planchets.length) {
    throw Error("number of tip responses does not match requested planchets");
  }

  const newCoinRecords: CoinRecord[] = [];

  for (let i = 0; i < blindedSigs.length; i++) {
    const blindedSig = blindedSigs[i];

    const denom = denomForPlanchet[i];
    checkLogicInvariant(!!denom);
    const planchet = planchets[i];
    checkLogicInvariant(!!planchet);

    if (denom.denomPub.cipher !== DenomKeyType.Rsa) {
      throw Error("unsupported cipher");
    }

    if (blindedSig.cipher !== DenomKeyType.Rsa) {
      throw Error("unsupported cipher");
    }

    const denomSigRsa = await ws.cryptoApi.rsaUnblind({
      bk: planchet.blindingKey,
      blindedSig: blindedSig.blinded_rsa_signature,
      pk: denom.denomPub.rsa_public_key,
    });

    const isValid = await ws.cryptoApi.rsaVerify({
      hm: planchet.coinPub,
      pk: denom.denomPub.rsa_public_key,
      sig: denomSigRsa.sig,
    });

    if (!isValid) {
      await ws.db
        .mktx((x) => ({ tips: x.tips }))
        .runReadWrite(async (tx) => {
          const tipRecord = await tx.tips.get(walletTipId);
          if (!tipRecord) {
            return;
          }
          tipRecord.lastError = makeErrorDetail(
            TalerErrorCode.WALLET_TIPPING_COIN_SIGNATURE_INVALID,
            {},
            "invalid signature from the exchange (via merchant tip) after unblinding",
          );
          await tx.tips.put(tipRecord);
        });
      return;
    }

    newCoinRecords.push({
      blindingKey: planchet.blindingKey,
      coinPriv: planchet.coinPriv,
      coinPub: planchet.coinPub,
      coinSource: {
        type: CoinSourceType.Tip,
        coinIndex: i,
        walletTipId: walletTipId,
      },
      currentAmount: denom.value,
      denomPubHash: denom.denomPubHash,
      denomSig: { cipher: DenomKeyType.Rsa, rsa_signature: denomSigRsa.sig },
      exchangeBaseUrl: tipRecord.exchangeBaseUrl,
      status: CoinStatus.Fresh,
      suspended: false,
      coinEvHash: planchet.coinEvHash,
    });
  }

  await ws.db
    .mktx((x) => ({
      coins: x.coins,
      tips: x.tips,
      withdrawalGroups: x.withdrawalGroups,
    }))
    .runReadWrite(async (tx) => {
      const tr = await tx.tips.get(walletTipId);
      if (!tr) {
        return;
      }
      if (tr.pickedUpTimestamp) {
        return;
      }
      tr.pickedUpTimestamp = TalerProtocolTimestamp.now();
      tr.lastError = undefined;
      tr.retryInfo = RetryInfo.reset();
      await tx.tips.put(tr);
      for (const cr of newCoinRecords) {
        await tx.coins.put(cr);
      }
    });
}

export async function acceptTip(
  ws: InternalWalletState,
  tipId: string,
): Promise<void> {
  const found = await ws.db
    .mktx((x) => ({
      tips: x.tips,
    }))
    .runReadWrite(async (tx) => {
      const tipRecord = await tx.tips.get(tipId);
      if (!tipRecord) {
        logger.error("tip not found");
        return false;
      }
      tipRecord.acceptedTimestamp = TalerProtocolTimestamp.now();
      await tx.tips.put(tipRecord);
      return true;
    });
  if (found) {
    await processTip(ws, tipId);
  }
}
