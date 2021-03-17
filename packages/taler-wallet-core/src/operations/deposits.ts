/*
 This file is part of GNU Taler
 (C) 2021 Taler Systems S.A.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

import { kdf } from "../crypto/primitives/kdf";
import {
  encodeCrock,
  getRandomBytes,
  stringToBytes,
} from "../crypto/talerCrypto";
import { selectPayCoins } from "../util/coinSelection";
import { canonicalJson } from "../util/helpers";
import { readSuccessResponseJsonOrThrow } from "../util/http";
import { initRetryInfo, updateRetryInfoTimeout } from "../util/retries";
import {
  Amounts,
  buildCodecForObject,
  Codec,
  codecForString,
  codecForTimestamp,
  codecOptional,
  ContractTerms,
  CreateDepositGroupRequest,
  CreateDepositGroupResponse,
  durationFromSpec,
  getTimestampNow,
  NotificationType,
  parsePaytoUri,
  TalerErrorDetails,
  Timestamp,
  timestampAddDuration,
  timestampTruncateToSecond,
  TrackDepositGroupRequest,
  TrackDepositGroupResponse,
} from "@gnu-taler/taler-util";
import { URL } from "../util/url";
import {
  applyCoinSpend,
  extractContractData,
  generateDepositPermissions,
  getCandidatePayCoins,
  getEffectiveDepositAmount,
  getTotalPaymentCost,
} from "./pay";
import { InternalWalletState } from "./state";
import { Logger } from "../util/logging.js";
import { DepositGroupRecord, Stores } from "../db.js";
import { guardOperationException } from "./errors.js";

/**
 * Logger.
 */
const logger = new Logger("deposits.ts");

interface DepositSuccess {
  // Optional base URL of the exchange for looking up wire transfers
  // associated with this transaction.  If not given,
  // the base URL is the same as the one used for this request.
  // Can be used if the base URL for /transactions/ differs from that
  // for /coins/, i.e. for load balancing.  Clients SHOULD
  // respect the transaction_base_url if provided.  Any HTTP server
  // belonging to an exchange MUST generate a 307 or 308 redirection
  // to the correct base URL should a client uses the wrong base
  // URL, or if the base URL has changed since the deposit.
  transaction_base_url?: string;

  // timestamp when the deposit was received by the exchange.
  exchange_timestamp: Timestamp;

  // the EdDSA signature of TALER_DepositConfirmationPS using a current
  // signing key of the exchange affirming the successful
  // deposit and that the exchange will transfer the funds after the refund
  // deadline, or as soon as possible if the refund deadline is zero.
  exchange_sig: string;

  // public EdDSA key of the exchange that was used to
  // generate the signature.
  // Should match one of the exchange's signing keys from /keys.  It is given
  // explicitly as the client might otherwise be confused by clock skew as to
  // which signing key was used.
  exchange_pub: string;
}

const codecForDepositSuccess = (): Codec<DepositSuccess> =>
  buildCodecForObject<DepositSuccess>()
    .property("exchange_pub", codecForString())
    .property("exchange_sig", codecForString())
    .property("exchange_timestamp", codecForTimestamp)
    .property("transaction_base_url", codecOptional(codecForString()))
    .build("DepositSuccess");

function hashWire(paytoUri: string, salt: string): string {
  const r = kdf(
    64,
    stringToBytes(paytoUri + "\0"),
    stringToBytes(salt + "\0"),
    stringToBytes("merchant-wire-signature"),
  );
  return encodeCrock(r);
}

async function resetDepositGroupRetry(
  ws: InternalWalletState,
  depositGroupId: string,
): Promise<void> {
  await ws.db.mutate(Stores.depositGroups, depositGroupId, (x) => {
    if (x.retryInfo.active) {
      x.retryInfo = initRetryInfo();
    }
    return x;
  });
}

async function incrementDepositRetry(
  ws: InternalWalletState,
  depositGroupId: string,
  err: TalerErrorDetails | undefined,
): Promise<void> {
  await ws.db.runWithWriteTransaction([Stores.depositGroups], async (tx) => {
    const r = await tx.get(Stores.depositGroups, depositGroupId);
    if (!r) {
      return;
    }
    if (!r.retryInfo) {
      return;
    }
    r.retryInfo.retryCounter++;
    updateRetryInfoTimeout(r.retryInfo);
    r.lastError = err;
    await tx.put(Stores.depositGroups, r);
  });
  if (err) {
    ws.notify({ type: NotificationType.DepositOperationError, error: err });
  }
}

export async function processDepositGroup(
  ws: InternalWalletState,
  depositGroupId: string,
  forceNow = false,
): Promise<void> {
  await ws.memoProcessDeposit.memo(depositGroupId, async () => {
    const onOpErr = (e: TalerErrorDetails): Promise<void> =>
      incrementDepositRetry(ws, depositGroupId, e);
    return await guardOperationException(
      async () => await processDepositGroupImpl(ws, depositGroupId, forceNow),
      onOpErr,
    );
  });
}

async function processDepositGroupImpl(
  ws: InternalWalletState,
  depositGroupId: string,
  forceNow: boolean = false,
): Promise<void> {
  if (forceNow) {
    await resetDepositGroupRetry(ws, depositGroupId);
  }
  const depositGroup = await ws.db.get(Stores.depositGroups, depositGroupId);
  if (!depositGroup) {
    logger.warn(`deposit group ${depositGroupId} not found`);
    return;
  }
  if (depositGroup.timestampFinished) {
    logger.trace(`deposit group ${depositGroupId} already finished`);
    return;
  }

  const contractData = extractContractData(
    depositGroup.contractTermsRaw,
    depositGroup.contractTermsHash,
    "",
  );

  const depositPermissions = await generateDepositPermissions(
    ws,
    depositGroup.payCoinSelection,
    contractData,
  );

  for (let i = 0; i < depositPermissions.length; i++) {
    if (depositGroup.depositedPerCoin[i]) {
      continue;
    }
    const perm = depositPermissions[i];
    const url = new URL(`/coins/${perm.coin_pub}/deposit`, perm.exchange_url);
    const httpResp = await ws.http.postJson(url.href, {
      contribution: Amounts.stringify(perm.contribution),
      wire: depositGroup.wire,
      h_wire: depositGroup.contractTermsRaw.h_wire,
      h_contract_terms: depositGroup.contractTermsHash,
      ub_sig: perm.ub_sig,
      timestamp: depositGroup.contractTermsRaw.timestamp,
      wire_transfer_deadline:
        depositGroup.contractTermsRaw.wire_transfer_deadline,
      refund_deadline: depositGroup.contractTermsRaw.refund_deadline,
      coin_sig: perm.coin_sig,
      denom_pub_hash: perm.h_denom,
      merchant_pub: depositGroup.merchantPub,
    });
    await readSuccessResponseJsonOrThrow(httpResp, codecForDepositSuccess());
    await ws.db.runWithWriteTransaction([Stores.depositGroups], async (tx) => {
      const dg = await tx.get(Stores.depositGroups, depositGroupId);
      if (!dg) {
        return;
      }
      dg.depositedPerCoin[i] = true;
      await tx.put(Stores.depositGroups, dg);
    });
  }

  await ws.db.runWithWriteTransaction([Stores.depositGroups], async (tx) => {
    const dg = await tx.get(Stores.depositGroups, depositGroupId);
    if (!dg) {
      return;
    }
    let allDeposited = true;
    for (const d of depositGroup.depositedPerCoin) {
      if (!d) {
        allDeposited = false;
      }
    }
    if (allDeposited) {
      dg.timestampFinished = getTimestampNow();
      await tx.put(Stores.depositGroups, dg);
    }
  });
}

export async function trackDepositGroup(
  ws: InternalWalletState,
  req: TrackDepositGroupRequest,
): Promise<TrackDepositGroupResponse> {
  const responses: {
    status: number;
    body: any;
  }[] = [];
  const depositGroup = await ws.db.get(
    Stores.depositGroups,
    req.depositGroupId,
  );
  if (!depositGroup) {
    throw Error("deposit group not found");
  }
  const contractData = extractContractData(
    depositGroup.contractTermsRaw,
    depositGroup.contractTermsHash,
    "",
  );

  const depositPermissions = await generateDepositPermissions(
    ws,
    depositGroup.payCoinSelection,
    contractData,
  );

  const wireHash = depositGroup.contractTermsRaw.h_wire;

  for (const dp of depositPermissions) {
    const url = new URL(
      `/deposits/${wireHash}/${depositGroup.merchantPub}/${depositGroup.contractTermsHash}/${dp.coin_pub}`,
      dp.exchange_url,
    );
    const sig = await ws.cryptoApi.signTrackTransaction({
      coinPub: dp.coin_pub,
      contractTermsHash: depositGroup.contractTermsHash,
      merchantPriv: depositGroup.merchantPriv,
      merchantPub: depositGroup.merchantPub,
      wireHash,
    });
    url.searchParams.set("merchant_sig", sig);
    const httpResp = await ws.http.get(url.href);
    const body = await httpResp.json();
    responses.push({
      body,
      status: httpResp.status,
    });
  }
  return {
    responses,
  };
}

export async function createDepositGroup(
  ws: InternalWalletState,
  req: CreateDepositGroupRequest,
): Promise<CreateDepositGroupResponse> {
  const p = parsePaytoUri(req.depositPaytoUri);
  if (!p) {
    throw Error("invalid payto URI");
  }

  const amount = Amounts.parseOrThrow(req.amount);

  const allExchanges = await ws.db.iter(Stores.exchanges).toArray();
  const exchangeInfos: { url: string; master_pub: string }[] = [];
  for (const e of allExchanges) {
    if (!e.details) {
      continue;
    }
    if (e.details.currency != amount.currency) {
      continue;
    }
    exchangeInfos.push({
      master_pub: e.details.masterPublicKey,
      url: e.baseUrl,
    });
  }

  const timestamp = getTimestampNow();
  const timestampRound = timestampTruncateToSecond(timestamp);
  const noncePair = await ws.cryptoApi.createEddsaKeypair();
  const merchantPair = await ws.cryptoApi.createEddsaKeypair();
  const wireSalt = encodeCrock(getRandomBytes(64));
  const wireHash = hashWire(req.depositPaytoUri, wireSalt);
  const contractTerms: ContractTerms = {
    auditors: [],
    exchanges: exchangeInfos,
    amount: req.amount,
    max_fee: Amounts.stringify(amount),
    max_wire_fee: Amounts.stringify(amount),
    wire_method: p.targetType,
    timestamp: timestampRound,
    merchant_base_url: "",
    summary: "",
    nonce: noncePair.pub,
    wire_transfer_deadline: timestampRound,
    order_id: "",
    h_wire: wireHash,
    pay_deadline: timestampAddDuration(
      timestampRound,
      durationFromSpec({ hours: 1 }),
    ),
    merchant: {
      name: "",
    },
    merchant_pub: merchantPair.pub,
    refund_deadline: { t_ms: 0 },
  };

  const contractTermsHash = await ws.cryptoApi.hashString(
    canonicalJson(contractTerms),
  );

  const contractData = extractContractData(
    contractTerms,
    contractTermsHash,
    "",
  );

  const candidates = await getCandidatePayCoins(ws, {
    allowedAuditors: contractData.allowedAuditors,
    allowedExchanges: contractData.allowedExchanges,
    amount: contractData.amount,
    maxDepositFee: contractData.maxDepositFee,
    maxWireFee: contractData.maxWireFee,
    timestamp: contractData.timestamp,
    wireFeeAmortization: contractData.wireFeeAmortization,
    wireMethod: contractData.wireMethod,
  });

  const payCoinSel = selectPayCoins({
    candidates,
    contractTermsAmount: contractData.amount,
    depositFeeLimit: contractData.maxDepositFee,
    wireFeeAmortization: contractData.wireFeeAmortization ?? 1,
    wireFeeLimit: contractData.maxWireFee,
    prevPayCoins: [],
  });

  if (!payCoinSel) {
    throw Error("insufficient funds");
  }

  const totalDepositCost = await getTotalPaymentCost(ws, payCoinSel);

  const depositGroupId = encodeCrock(getRandomBytes(32));

  const effectiveDepositAmount = await getEffectiveDepositAmount(
    ws,
    p.targetType,
    payCoinSel,
  );

  const depositGroup: DepositGroupRecord = {
    contractTermsHash,
    contractTermsRaw: contractTerms,
    depositGroupId,
    noncePriv: noncePair.priv,
    noncePub: noncePair.pub,
    timestampCreated: timestamp,
    timestampFinished: undefined,
    payCoinSelection: payCoinSel,
    depositedPerCoin: payCoinSel.coinPubs.map((x) => false),
    merchantPriv: merchantPair.priv,
    merchantPub: merchantPair.pub,
    totalPayCost: totalDepositCost,
    effectiveDepositAmount,
    wire: {
      payto_uri: req.depositPaytoUri,
      salt: wireSalt,
    },
    retryInfo: initRetryInfo(true),
    lastError: undefined,
  };

  await ws.db.runWithWriteTransaction(
    [
      Stores.depositGroups,
      Stores.coins,
      Stores.refreshGroups,
      Stores.denominations,
    ],
    async (tx) => {
      await applyCoinSpend(ws, tx, payCoinSel);
      await tx.put(Stores.depositGroups, depositGroup);
    },
  );

  await ws.db.put(Stores.depositGroups, depositGroup);

  return { depositGroupId };
}