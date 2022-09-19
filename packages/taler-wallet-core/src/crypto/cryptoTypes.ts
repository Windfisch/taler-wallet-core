/*
 This file is part of GNU Taler
 (C) 2020 Taler Systems SA

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

/**
 * Types used by the wallet crypto worker.
 *
 * These types are defined in a separate file make tree shaking easier, since
 * some components use these types (via RPC) but do not depend on the wallet
 * code directly.
 *
 * @author Florian Dold <dold@taler.net>
 */

/**
 * Imports.
 */
import {
  AgeCommitmentProof,
  AmountJson,
  AmountString,
  CoinEnvelope,
  DenominationPubKey,
  EddsaPublicKeyString,
  EddsaSignatureString,
  ExchangeProtocolVersion,
  RefreshPlanchetInfo,
  TalerProtocolTimestamp,
  UnblindedSignature,
  WalletAccountMergeFlags,
} from "@gnu-taler/taler-util";

export interface RefreshNewDenomInfo {
  count: number;
  value: AmountJson;
  feeWithdraw: AmountJson;
  denomPub: DenominationPubKey;
  denomPubHash: string;
}

/**
 * Request to derive a refresh session from the refresh session
 * secret seed.
 */
export interface DeriveRefreshSessionRequest {
  exchangeProtocolVersion: ExchangeProtocolVersion;
  sessionSecretSeed: string;
  kappa: number;
  meltCoinPub: string;
  meltCoinPriv: string;
  meltCoinDenomPubHash: string;
  meltCoinMaxAge: number;
  meltCoinAgeCommitmentProof?: AgeCommitmentProof;
  newCoinDenoms: RefreshNewDenomInfo[];
  feeRefresh: AmountJson;
}

/**
 *
 */
export interface DerivedRefreshSession {
  /**
   * Public key that's being melted in this session.
   */
  meltCoinPub: string;

  /**
   * Signature to confirm the melting.
   */
  confirmSig: string;

  /**
   * Planchets for each cut-and-choose instance.
   */
  planchetsForGammas: RefreshPlanchetInfo[][];

  /**
   * The transfer keys, kappa of them.
   */
  transferPubs: string[];

  /**
   * Private keys for the transfer public keys.
   */
  transferPrivs: string[];

  /**
   * Hash of the session.
   */
  hash: string;

  /**
   * Exact value that is being melted.
   */
  meltValueWithFee: AmountJson;
}

export interface DeriveTipRequest {
  secretSeed: string;
  denomPub: DenominationPubKey;
  planchetIndex: number;
}

/**
 * Tipping planchet stored in the database.
 */
export interface DerivedTipPlanchet {
  blindingKey: string;
  coinEv: CoinEnvelope;
  coinEvHash: string;
  coinPriv: string;
  coinPub: string;
  ageCommitmentProof: AgeCommitmentProof | undefined;
}

export interface SignTrackTransactionRequest {
  contractTermsHash: string;
  wireHash: string;
  coinPub: string;
  merchantPriv: string;
  merchantPub: string;
}

/**
 * Request to create a recoup request payload.
 */
export interface CreateRecoupReqRequest {
  coinPub: string;
  coinPriv: string;
  blindingKey: string;
  denomPub: DenominationPubKey;
  denomPubHash: string;
  denomSig: UnblindedSignature;
}

/**
 * Request to create a recoup-refresh request payload.
 */
export interface CreateRecoupRefreshReqRequest {
  coinPub: string;
  coinPriv: string;
  blindingKey: string;
  denomPub: DenominationPubKey;
  denomPubHash: string;
  denomSig: UnblindedSignature;
}

export interface EncryptedContract {
  /**
   * Encrypted contract.
   */
  econtract: string;

  /**
   * Signature over the (encrypted) contract.
   */
  econtract_sig: EddsaSignatureString;

  /**
   * Ephemeral public key for the DH operation to decrypt the encrypted contract.
   */
  contract_pub: EddsaPublicKeyString;
}

export interface EncryptContractRequest {
  contractTerms: any;

  pursePub: string;
  pursePriv: string;

  mergePriv: string;
}

export interface EncryptContractResponse {
  econtract: EncryptedContract;

  contractPriv: string;
}

export interface EncryptContractForDepositRequest {
  contractTerms: any;

  pursePub: string;
  pursePriv: string;
}

export interface EncryptContractForDepositResponse {
  econtract: EncryptedContract;

  contractPriv: string;
}

export interface DecryptContractRequest {
  ciphertext: string;
  pursePub: string;
  contractPriv: string;
}

export interface DecryptContractResponse {
  contractTerms: any;
  mergePriv: string;
}

export interface DecryptContractForDepositRequest {
  ciphertext: string;
  pursePub: string;
  contractPriv: string;
}

export interface DecryptContractForDepositResponse {
  contractTerms: any;
}

export interface SignPurseMergeRequest {
  mergeTimestamp: TalerProtocolTimestamp;

  pursePub: string;

  reservePayto: string;

  reservePriv: string;

  mergePriv: string;

  purseExpiration: TalerProtocolTimestamp;

  purseAmount: AmountString;
  purseFee: AmountString;

  contractTermsHash: string;

  /**
   * Flags.
   */
  flags: WalletAccountMergeFlags;
}

export interface SignPurseMergeResponse {
  /**
   * Signature made by the purse's merge private key.
   */
  mergeSig: string;

  accountSig: string;
}

export interface SignReservePurseCreateRequest {
  mergeTimestamp: TalerProtocolTimestamp;

  pursePub: string;

  pursePriv: string;

  reservePayto: string;

  reservePriv: string;

  mergePriv: string;

  purseExpiration: TalerProtocolTimestamp;

  purseAmount: AmountString;
  purseFee: AmountString;

  contractTermsHash: string;

  /**
   * Flags.
   */
  flags: WalletAccountMergeFlags;
}

/**
 * Response with signatures needed for creation of a purse
 * from a reserve for a PULL payment.
 */
export interface SignReservePurseCreateResponse {
  /**
   * Signature made by the purse's merge private key.
   */
  mergeSig: string;

  accountSig: string;

  purseSig: string;
}
