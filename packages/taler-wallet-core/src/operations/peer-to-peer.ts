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
import {
  AmountJson,
  Amounts,
  Logger,
  InitiatePeerPushPaymentResponse,
  InitiatePeerPushPaymentRequest,
  strcmp,
  CoinPublicKeyString,
  j2s,
  getRandomBytes,
  Duration,
  durationAdd,
  TalerProtocolTimestamp,
  AbsoluteTime,
  encodeCrock,
  AmountString,
  UnblindedSignature,
} from "@gnu-taler/taler-util";
import { CoinStatus } from "../db.js";
import { InternalWalletState } from "../internal-wallet-state.js";

const logger = new Logger("operations/peer-to-peer.ts");

export interface PeerCoinSelection {
  exchangeBaseUrl: string;

  /**
   * Info of Coins that were selected.
   */
  coins: {
    coinPub: string;
    coinPriv: string;
    contribution: AmountString;
    denomPubHash: string;
    denomSig: UnblindedSignature;
  }[];

  /**
   * How much of the deposit fees is the customer paying?
   */
  depositFees: AmountJson;
}

interface CoinInfo {
  /**
   * Public key of the coin.
   */
  coinPub: string;

  coinPriv: string;

  /**
   * Deposit fee for the coin.
   */
  feeDeposit: AmountJson;

  value: AmountJson;

  denomPubHash: string;

  denomSig: UnblindedSignature;
}

export async function initiatePeerToPeerPush(
  ws: InternalWalletState,
  req: InitiatePeerPushPaymentRequest,
): Promise<InitiatePeerPushPaymentResponse> {
  const instructedAmount = Amounts.parseOrThrow(req.amount);
  const coinSelRes: PeerCoinSelection | undefined = await ws.db
    .mktx((x) => ({
      exchanges: x.exchanges,
      coins: x.coins,
      denominations: x.denominations,
    }))
    .runReadOnly(async (tx) => {
      const exchanges = await tx.exchanges.iter().toArray();
      for (const exch of exchanges) {
        if (exch.detailsPointer?.currency !== instructedAmount.currency) {
          continue;
        }
        const coins = (
          await tx.coins.indexes.byBaseUrl.getAll(exch.baseUrl)
        ).filter((x) => x.status === CoinStatus.Fresh);
        const coinInfos: CoinInfo[] = [];
        for (const coin of coins) {
          const denom = await ws.getDenomInfo(
            ws,
            tx,
            coin.exchangeBaseUrl,
            coin.denomPubHash,
          );
          if (!denom) {
            throw Error("denom not found");
          }
          coinInfos.push({
            coinPub: coin.coinPub,
            feeDeposit: denom.feeDeposit,
            value: denom.value,
            denomPubHash: denom.denomPubHash,
            coinPriv: coin.coinPriv,
            denomSig: coin.denomSig,
          });
        }
        if (coinInfos.length === 0) {
          continue;
        }
        coinInfos.sort(
          (o1, o2) =>
            -Amounts.cmp(o1.value, o2.value) ||
            strcmp(o1.denomPubHash, o2.denomPubHash),
        );
        let amountAcc = Amounts.getZero(instructedAmount.currency);
        let depositFeesAcc = Amounts.getZero(instructedAmount.currency);
        const resCoins: {
          coinPub: string;
          coinPriv: string;
          contribution: AmountString;
          denomPubHash: string;
          denomSig: UnblindedSignature;
        }[] = [];
        for (const coin of coinInfos) {
          if (Amounts.cmp(amountAcc, instructedAmount) >= 0) {
            const res: PeerCoinSelection = {
              exchangeBaseUrl: exch.baseUrl,
              coins: resCoins,
              depositFees: depositFeesAcc,
            };
            return res;
          }
          const gap = Amounts.add(
            coin.feeDeposit,
            Amounts.sub(instructedAmount, amountAcc).amount,
          ).amount;
          const contrib = Amounts.min(gap, coin.value);
          amountAcc = Amounts.add(
            amountAcc,
            Amounts.sub(contrib, coin.feeDeposit).amount,
          ).amount;
          depositFeesAcc = Amounts.add(depositFeesAcc, coin.feeDeposit).amount;
          resCoins.push({
            coinPriv: coin.coinPriv,
            coinPub: coin.coinPub,
            contribution: Amounts.stringify(contrib),
            denomPubHash: coin.denomPubHash,
            denomSig: coin.denomSig,
          });
        }
        continue;
      }
      return undefined;
    });
  logger.info(`selected p2p coins: ${j2s(coinSelRes)}`);

  if (!coinSelRes) {
    throw Error("insufficient balance");
  }

  const pursePair = await ws.cryptoApi.createEddsaKeypair({});
  const mergePair = await ws.cryptoApi.createEddsaKeypair({});
  const hContractTerms = encodeCrock(getRandomBytes(64));
  const purseExpiration = AbsoluteTime.toTimestamp(
    AbsoluteTime.addDuration(
      AbsoluteTime.now(),
      Duration.fromSpec({ days: 2 }),
    ),
  );

  const purseSigResp = await ws.cryptoApi.signPurseCreation({
    hContractTerms,
    mergePub: mergePair.pub,
    minAge: 0,
    purseAmount: Amounts.stringify(instructedAmount),
    purseExpiration,
    pursePriv: pursePair.priv,
  });

  const depositSigsResp = await ws.cryptoApi.signPurseDeposits({
    exchangeBaseUrl: coinSelRes.exchangeBaseUrl,
    pursePub: pursePair.pub,
    coins: coinSelRes.coins,
  });

  const createPurseUrl = new URL(
    `purses/${pursePair.pub}/create`,
    coinSelRes.exchangeBaseUrl,
  );

  const httpResp = await ws.http.postJson(createPurseUrl.href, {
    amount: Amounts.stringify(instructedAmount),
    merge_pub: mergePair.pub,
    purse_sig: purseSigResp.sig,
    h_contract_terms: hContractTerms,
    purse_expiration: purseExpiration,
    deposits: depositSigsResp.deposits,
    min_age: 0,
  });

  const resp = await httpResp.json();

  logger.info(`resp: ${j2s(resp)}`);

  throw Error("not yet implemented");
}
