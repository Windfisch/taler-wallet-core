/*
 This file is part of GNU Taler
 (C) 2020 Taler Systems S.A.

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
 * Type declarations for backup.
 *
 * Contains some redundancy with the other type declarations,
 * as the backup schema must be very stable.
 *
 * @author Florian Dold <dold@taler.net>
 */

type BackupAmountString = string;

/**
 * Content of the backup.
 *
 * The contents of the wallet must be serialized in a deterministic
 * way across implementations, so that the normalized backup content
 * JSON is identical when the wallet's content is identical.
 */
export interface WalletBackupContentV1 {
  schemaId: "gnu-taler-wallet-backup";

  schemaVersion: 1;

  /**
   * Monotonically increasing clock of the wallet,
   * used to determine causality when merging backups.
   */
  clock: number;

  walletRootPub: string;

  /**
   * Per-exchange data sorted by exchange master public key.
   */
  exchanges: BackupExchangeData[];

  reserves: ReserveBackupData[];

  coins: BackupCoin[];

  planchets: BackupWithdrawalPlanchet[];

  refreshSessions: BackupRefreshSession[];
}

export interface BackupRefreshSession {

}


export interface BackupReserve {
  reservePub: string;
  reservePriv: string;
  /**
   * The exchange base URL.
   */
  exchangeBaseUrl: string;

  bankConfirmUrl?: string;

  /**
   * Wire information (as payto URI) for the bank account that
   * transfered funds for this reserve.
   */
  senderWire?: string;
}

export interface ReserveBackupData {
  /**
   * The reserve public key.
   */
  reservePub: string;

  /**
   * The reserve private key.
   */
  reservePriv: string;

  /**
   * The exchange base URL.
   */
  exchangeBaseUrl: string;

  instructedAmount: string;

  /**
   * Wire information (as payto URI) for the bank account that
   * transfered funds for this reserve.
   */
  senderWire?: string;
}

export interface BackupExchangeData {
  exchangeBaseUrl: string;
  exchangeMasterPub: string;

  /**
   * ETag for last terms of service download.
   */
  termsOfServiceAcceptedEtag: string | undefined;
}


export interface BackupWithdrawalPlanchet {
  coinSource: BackupWithdrawCoinSource | BackupTipCoinSource;
  blindingKey: string;
  coinPriv: string;
  coinPub: string;
  denomPubHash: string;

  /**
   * Base URL that identifies the exchange from which we are getting the
   * coin.
   */
  exchangeBaseUrl: string;
}


export enum BackupCoinSourceType {
  Withdraw = "withdraw",
  Refresh = "refresh",
  Tip = "tip",
}

export interface BackupWithdrawCoinSource {
  type: BackupCoinSourceType.Withdraw;
  withdrawalGroupId: string;

  /**
   * Index of the coin in the withdrawal session.
   */
  coinIndex: number;

  /**
   * Reserve public key for the reserve we got this coin from.
   */
  reservePub: string;
}

export interface BackupRefreshCoinSource {
  type: BackupCoinSourceType.Refresh;
  oldCoinPub: string;
}

export interface BackupTipCoinSource {
  type: BackupCoinSourceType.Tip;
  walletTipId: string;
  coinIndex: number;
}

export type BackupCoinSource =
  | BackupWithdrawCoinSource
  | BackupRefreshCoinSource
  | BackupTipCoinSource;

/**
 * Coin that has been withdrawn and might have been
 * (partially) spent.
 */
export interface BackupCoin {
  /**
   * Public key of the coin.
   */
  coinPub: string;

  /**
   * Private key of the coin.
   */
  coinPriv: string;

  /**
   * Where did the coin come from (withdrawal/refresh/tip)?
   * Used for recouping coins.
   */
  coinSource: BackupCoinSource;

  /**
   * Is the coin still fresh
   */
  fresh: boolean;

  /**
   * Blinding key used when withdrawing the coin.
   * Potentionally used again during payback.
   */
  blindingKey: string;

  /**
   * Amount that's left on the coin.
   */
  currentAmount: BackupAmountString;

  /**
   * Base URL that identifies the exchange from which we got the
   * coin.
   */
  exchangeBaseUrl: string;
}
