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

/**
 * Selection of coins for payments.
 *
 * @author Florian Dold
 */

/**
 * Imports.
 */
import {
  AgeCommitmentProof,
  AmountJson,
  Amounts,
  DenominationPubKey,
  Logger,
} from "@gnu-taler/taler-util";

const logger = new Logger("coinSelection.ts");

/**
 * Structure to describe a coin that is available to be
 * used in a payment.
 */
export interface AvailableCoinInfo {
  /**
   * Public key of the coin.
   */
  coinPub: string;

  /**
   * Coin's denomination public key.
   *
   * FIXME: We should only need the denomPubHash here, if at all.
   */
  denomPub: DenominationPubKey;

  /**
   * Full value of the coin.
   */
  value: AmountJson;

  /**
   * Amount still remaining (typically the full amount,
   * as coins are always refreshed after use.)
   */
  availableAmount: AmountJson;

  /**
   * Deposit fee for the coin.
   */
  feeDeposit: AmountJson;

  exchangeBaseUrl: string;

  maxAge: number;
  ageCommitmentProof?: AgeCommitmentProof;
}

export type PreviousPayCoins = {
  coinPub: string;
  contribution: AmountJson;
  feeDeposit: AmountJson;
  exchangeBaseUrl: string;
}[];

export interface CoinCandidateSelection {
  candidateCoins: AvailableCoinInfo[];
  wireFeesPerExchange: Record<string, AmountJson>;
}

export interface SelectPayCoinRequest {
  candidates: CoinCandidateSelection;
  contractTermsAmount: AmountJson;
  depositFeeLimit: AmountJson;
  wireFeeLimit: AmountJson;
  wireFeeAmortization: number;
  prevPayCoins?: PreviousPayCoins;
  requiredMinimumAge?: number;
}

export interface CoinSelectionTally {
  /**
   * Amount that still needs to be paid.
   * May increase during the computation when fees need to be covered.
   */
  amountPayRemaining: AmountJson;

  /**
   * Allowance given by the merchant towards wire fees
   */
  amountWireFeeLimitRemaining: AmountJson;

  /**
   * Allowance given by the merchant towards deposit fees
   * (and wire fees after wire fee limit is exhausted)
   */
  amountDepositFeeLimitRemaining: AmountJson;

  customerDepositFees: AmountJson;

  customerWireFees: AmountJson;

  wireFeeCoveredForExchange: Set<string>;
}

/**
 * Account for the fees of spending a coin.
 */
export function tallyFees(
  tally: CoinSelectionTally,
  wireFeesPerExchange: Record<string, AmountJson>,
  wireFeeAmortization: number,
  exchangeBaseUrl: string,
  feeDeposit: AmountJson,
): CoinSelectionTally {
  const currency = tally.amountPayRemaining.currency;
  let amountWireFeeLimitRemaining = tally.amountWireFeeLimitRemaining;
  let amountDepositFeeLimitRemaining = tally.amountDepositFeeLimitRemaining;
  let customerDepositFees = tally.customerDepositFees;
  let customerWireFees = tally.customerWireFees;
  let amountPayRemaining = tally.amountPayRemaining;
  const wireFeeCoveredForExchange = new Set(tally.wireFeeCoveredForExchange);

  if (!tally.wireFeeCoveredForExchange.has(exchangeBaseUrl)) {
    const wf =
      wireFeesPerExchange[exchangeBaseUrl] ?? Amounts.zeroOfCurrency(currency);
    const wfForgiven = Amounts.min(amountWireFeeLimitRemaining, wf);
    amountWireFeeLimitRemaining = Amounts.sub(
      amountWireFeeLimitRemaining,
      wfForgiven,
    ).amount;
    // The remaining, amortized amount needs to be paid by the
    // wallet or covered by the deposit fee allowance.
    let wfRemaining = Amounts.divide(
      Amounts.sub(wf, wfForgiven).amount,
      wireFeeAmortization,
    );

    // This is the amount forgiven via the deposit fee allowance.
    const wfDepositForgiven = Amounts.min(
      amountDepositFeeLimitRemaining,
      wfRemaining,
    );
    amountDepositFeeLimitRemaining = Amounts.sub(
      amountDepositFeeLimitRemaining,
      wfDepositForgiven,
    ).amount;

    wfRemaining = Amounts.sub(wfRemaining, wfDepositForgiven).amount;
    customerWireFees = Amounts.add(customerWireFees, wfRemaining).amount;
    amountPayRemaining = Amounts.add(amountPayRemaining, wfRemaining).amount;

    wireFeeCoveredForExchange.add(exchangeBaseUrl);
  }

  const dfForgiven = Amounts.min(feeDeposit, amountDepositFeeLimitRemaining);

  amountDepositFeeLimitRemaining = Amounts.sub(
    amountDepositFeeLimitRemaining,
    dfForgiven,
  ).amount;

  // How much does the user spend on deposit fees for this coin?
  const dfRemaining = Amounts.sub(feeDeposit, dfForgiven).amount;
  customerDepositFees = Amounts.add(customerDepositFees, dfRemaining).amount;
  amountPayRemaining = Amounts.add(amountPayRemaining, dfRemaining).amount;

  return {
    amountDepositFeeLimitRemaining,
    amountPayRemaining,
    amountWireFeeLimitRemaining,
    customerDepositFees,
    customerWireFees,
    wireFeeCoveredForExchange,
  };
}
