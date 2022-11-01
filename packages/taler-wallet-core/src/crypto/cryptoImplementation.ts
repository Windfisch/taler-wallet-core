/*
 This file is part of GNU Taler
 (C) 2019-2020 Taler Systems SA

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
 * Implementation of crypto-related high-level functions for the Taler wallet.
 *
 * @author Florian Dold <dold@taler.net>
 */

/**
 * Imports.
 */

import {
  AgeCommitmentProof,
  AgeRestriction,
  AmountJson,
  Amounts,
  AmountString,
  BlindedDenominationSignature,
  bufferForUint32,
  buildSigPS,
  CoinDepositPermission,
  CoinEnvelope,
  createHashContext,
  decodeCrock,
  decryptContractForDeposit,
  decryptContractForMerge,
  DenomKeyType,
  DepositInfo,
  ecdheGetPublic,
  eddsaGetPublic,
  EddsaPublicKeyString,
  eddsaSign,
  eddsaVerify,
  encodeCrock,
  encryptContractForDeposit,
  encryptContractForMerge,
  ExchangeProtocolVersion,
  getRandomBytes,
  GlobalFees,
  hash,
  HashCodeString,
  hashCoinEv,
  hashCoinEvInner,
  hashCoinPub,
  hashDenomPub,
  hashTruncate32,
  kdf,
  kdfKw,
  keyExchangeEcdheEddsa,
  Logger,
  MakeSyncSignatureRequest,
  PlanchetCreationRequest,
  PlanchetUnblindInfo,
  PurseDeposit,
  RecoupRefreshRequest,
  RecoupRequest,
  RefreshPlanchetInfo,
  rsaBlind,
  rsaUnblind,
  rsaVerify,
  setupTipPlanchet,
  stringToBytes,
  TalerProtocolDuration,
  TalerProtocolTimestamp,
  TalerSignaturePurpose,
  UnblindedSignature,
  WireFee,
  WithdrawalPlanchet,
} from "@gnu-taler/taler-util";
import bigint from "big-integer";
// FIXME: Crypto should not use DB Types!
import { DenominationRecord } from "../db.js";
import {
  CreateRecoupRefreshReqRequest,
  CreateRecoupReqRequest,
  DecryptContractForDepositRequest,
  DecryptContractForDepositResponse,
  DecryptContractRequest,
  DecryptContractResponse,
  DerivedRefreshSession,
  DerivedTipPlanchet,
  DeriveRefreshSessionRequest,
  DeriveTipRequest,
  EncryptContractForDepositRequest,
  EncryptContractForDepositResponse,
  EncryptContractRequest,
  EncryptContractResponse,
  EncryptedContract,
  SignPurseMergeRequest,
  SignPurseMergeResponse,
  SignReservePurseCreateRequest,
  SignReservePurseCreateResponse,
  SignTrackTransactionRequest,
} from "./cryptoTypes.js";

const logger = new Logger("cryptoImplementation.ts");

/**
 * Interface for (asynchronous) cryptographic operations that
 * Taler uses.
 */
export interface TalerCryptoInterface {
  /**
   * Create a pre-coin of the given denomination to be withdrawn from then given
   * reserve.
   */
  createPlanchet(req: PlanchetCreationRequest): Promise<WithdrawalPlanchet>;

  eddsaSign(req: EddsaSignRequest): Promise<EddsaSignResponse>;

  /**
   * Create a planchet used for tipping, including the private keys.
   */
  createTipPlanchet(req: DeriveTipRequest): Promise<DerivedTipPlanchet>;

  signTrackTransaction(
    req: SignTrackTransactionRequest,
  ): Promise<EddsaSigningResult>;

  createRecoupRequest(req: CreateRecoupReqRequest): Promise<RecoupRequest>;

  createRecoupRefreshRequest(
    req: CreateRecoupRefreshReqRequest,
  ): Promise<RecoupRefreshRequest>;

  isValidPaymentSignature(
    req: PaymentSignatureValidationRequest,
  ): Promise<ValidationResult>;

  isValidWireFee(req: WireFeeValidationRequest): Promise<ValidationResult>;

  isValidGlobalFees(
    req: GlobalFeesValidationRequest,
  ): Promise<ValidationResult>;

  isValidDenom(req: DenominationValidationRequest): Promise<ValidationResult>;

  isValidWireAccount(
    req: WireAccountValidationRequest,
  ): Promise<ValidationResult>;

  isValidContractTermsSignature(
    req: ContractTermsValidationRequest,
  ): Promise<ValidationResult>;

  createEddsaKeypair(req: unknown): Promise<EddsaKeypair>;

  eddsaGetPublic(req: EddsaGetPublicRequest): Promise<EddsaGetPublicResponse>;

  unblindDenominationSignature(
    req: UnblindDenominationSignatureRequest,
  ): Promise<UnblindedSignature>;

  rsaUnblind(req: RsaUnblindRequest): Promise<RsaUnblindResponse>;

  rsaVerify(req: RsaVerificationRequest): Promise<ValidationResult>;

  rsaBlind(req: RsaBlindRequest): Promise<RsaBlindResponse>;

  signDepositPermission(
    depositInfo: DepositInfo,
  ): Promise<CoinDepositPermission>;

  deriveRefreshSession(
    req: DeriveRefreshSessionRequest,
  ): Promise<DerivedRefreshSession>;

  hashString(req: HashStringRequest): Promise<HashStringResult>;

  signCoinLink(req: SignCoinLinkRequest): Promise<EddsaSigningResult>;

  makeSyncSignature(req: MakeSyncSignatureRequest): Promise<EddsaSigningResult>;

  setupRefreshPlanchet(
    req: SetupRefreshPlanchetRequest,
  ): Promise<FreshCoinEncoded>;

  setupWithdrawalPlanchet(
    req: SetupWithdrawalPlanchetRequest,
  ): Promise<FreshCoinEncoded>;

  keyExchangeEcdheEddsa(
    req: KeyExchangeEcdheEddsaRequest,
  ): Promise<KeyExchangeResult>;

  ecdheGetPublic(req: EddsaGetPublicRequest): Promise<EddsaGetPublicResponse>;

  setupRefreshTransferPub(
    req: SetupRefreshTransferPubRequest,
  ): Promise<TransferPubResponse>;

  signPurseCreation(req: SignPurseCreationRequest): Promise<EddsaSigningResult>;

  signPurseDeposits(
    req: SignPurseDepositsRequest,
  ): Promise<SignPurseDepositsResponse>;

  encryptContractForMerge(
    req: EncryptContractRequest,
  ): Promise<EncryptContractResponse>;

  decryptContractForMerge(
    req: DecryptContractRequest,
  ): Promise<DecryptContractResponse>;

  encryptContractForDeposit(
    req: EncryptContractForDepositRequest,
  ): Promise<EncryptContractForDepositResponse>;

  decryptContractForDeposit(
    req: DecryptContractForDepositRequest,
  ): Promise<DecryptContractForDepositResponse>;

  signPurseMerge(req: SignPurseMergeRequest): Promise<SignPurseMergeResponse>;

  signReservePurseCreate(
    req: SignReservePurseCreateRequest,
  ): Promise<SignReservePurseCreateResponse>;
}

/**
 * Implementation of the Taler crypto interface where every function
 * always throws.  Only useful in practice as a way to iterate through
 * all possible crypto functions.
 *
 * (This list can be easily auto-generated by your favorite IDE).
 */
export const nullCrypto: TalerCryptoInterface = {
  createPlanchet: function (
    req: PlanchetCreationRequest,
  ): Promise<WithdrawalPlanchet> {
    throw new Error("Function not implemented.");
  },
  eddsaSign: function (req: EddsaSignRequest): Promise<EddsaSignResponse> {
    throw new Error("Function not implemented.");
  },
  createTipPlanchet: function (
    req: DeriveTipRequest,
  ): Promise<DerivedTipPlanchet> {
    throw new Error("Function not implemented.");
  },
  signTrackTransaction: function (
    req: SignTrackTransactionRequest,
  ): Promise<EddsaSigningResult> {
    throw new Error("Function not implemented.");
  },
  createRecoupRequest: function (
    req: CreateRecoupReqRequest,
  ): Promise<RecoupRequest> {
    throw new Error("Function not implemented.");
  },
  createRecoupRefreshRequest: function (
    req: CreateRecoupRefreshReqRequest,
  ): Promise<RecoupRefreshRequest> {
    throw new Error("Function not implemented.");
  },
  isValidPaymentSignature: function (
    req: PaymentSignatureValidationRequest,
  ): Promise<ValidationResult> {
    throw new Error("Function not implemented.");
  },
  isValidWireFee: function (
    req: WireFeeValidationRequest,
  ): Promise<ValidationResult> {
    throw new Error("Function not implemented.");
  },
  isValidDenom: function (
    req: DenominationValidationRequest,
  ): Promise<ValidationResult> {
    throw new Error("Function not implemented.");
  },
  isValidWireAccount: function (
    req: WireAccountValidationRequest,
  ): Promise<ValidationResult> {
    throw new Error("Function not implemented.");
  },
  isValidGlobalFees: function (
    req: GlobalFeesValidationRequest,
  ): Promise<ValidationResult> {
    throw new Error("Function not implemented.");
  },
  isValidContractTermsSignature: function (
    req: ContractTermsValidationRequest,
  ): Promise<ValidationResult> {
    throw new Error("Function not implemented.");
  },
  createEddsaKeypair: function (req: unknown): Promise<EddsaKeypair> {
    throw new Error("Function not implemented.");
  },
  eddsaGetPublic: function (req: EddsaGetPublicRequest): Promise<EddsaKeypair> {
    throw new Error("Function not implemented.");
  },
  unblindDenominationSignature: function (
    req: UnblindDenominationSignatureRequest,
  ): Promise<UnblindedSignature> {
    throw new Error("Function not implemented.");
  },
  rsaUnblind: function (req: RsaUnblindRequest): Promise<RsaUnblindResponse> {
    throw new Error("Function not implemented.");
  },
  rsaVerify: function (req: RsaVerificationRequest): Promise<ValidationResult> {
    throw new Error("Function not implemented.");
  },
  signDepositPermission: function (
    depositInfo: DepositInfo,
  ): Promise<CoinDepositPermission> {
    throw new Error("Function not implemented.");
  },
  deriveRefreshSession: function (
    req: DeriveRefreshSessionRequest,
  ): Promise<DerivedRefreshSession> {
    throw new Error("Function not implemented.");
  },
  hashString: function (req: HashStringRequest): Promise<HashStringResult> {
    throw new Error("Function not implemented.");
  },
  signCoinLink: function (
    req: SignCoinLinkRequest,
  ): Promise<EddsaSigningResult> {
    throw new Error("Function not implemented.");
  },
  makeSyncSignature: function (
    req: MakeSyncSignatureRequest,
  ): Promise<EddsaSigningResult> {
    throw new Error("Function not implemented.");
  },
  setupRefreshPlanchet: function (
    req: SetupRefreshPlanchetRequest,
  ): Promise<FreshCoinEncoded> {
    throw new Error("Function not implemented.");
  },
  rsaBlind: function (req: RsaBlindRequest): Promise<RsaBlindResponse> {
    throw new Error("Function not implemented.");
  },
  keyExchangeEcdheEddsa: function (
    req: KeyExchangeEcdheEddsaRequest,
  ): Promise<KeyExchangeResult> {
    throw new Error("Function not implemented.");
  },
  setupWithdrawalPlanchet: function (
    req: SetupWithdrawalPlanchetRequest,
  ): Promise<FreshCoinEncoded> {
    throw new Error("Function not implemented.");
  },
  ecdheGetPublic: function (
    req: EddsaGetPublicRequest,
  ): Promise<EddsaGetPublicResponse> {
    throw new Error("Function not implemented.");
  },
  setupRefreshTransferPub: function (
    req: SetupRefreshTransferPubRequest,
  ): Promise<TransferPubResponse> {
    throw new Error("Function not implemented.");
  },
  signPurseCreation: function (
    req: SignPurseCreationRequest,
  ): Promise<EddsaSigningResult> {
    throw new Error("Function not implemented.");
  },
  signPurseDeposits: function (
    req: SignPurseDepositsRequest,
  ): Promise<SignPurseDepositsResponse> {
    throw new Error("Function not implemented.");
  },
  encryptContractForMerge: function (
    req: EncryptContractRequest,
  ): Promise<EncryptContractResponse> {
    throw new Error("Function not implemented.");
  },
  decryptContractForMerge: function (
    req: DecryptContractRequest,
  ): Promise<DecryptContractResponse> {
    throw new Error("Function not implemented.");
  },
  signPurseMerge: function (
    req: SignPurseMergeRequest,
  ): Promise<SignPurseMergeResponse> {
    throw new Error("Function not implemented.");
  },
  encryptContractForDeposit: function (
    req: EncryptContractForDepositRequest,
  ): Promise<EncryptContractForDepositResponse> {
    throw new Error("Function not implemented.");
  },
  decryptContractForDeposit: function (
    req: DecryptContractForDepositRequest,
  ): Promise<DecryptContractForDepositResponse> {
    throw new Error("Function not implemented.");
  },
  signReservePurseCreate: function (
    req: SignReservePurseCreateRequest,
  ): Promise<SignReservePurseCreateResponse> {
    throw new Error("Function not implemented.");
  },
};

export type WithArg<X> = X extends (req: infer T) => infer R
  ? (tci: TalerCryptoInterfaceR, req: T) => R
  : never;

export type TalerCryptoInterfaceR = {
  [x in keyof TalerCryptoInterface]: WithArg<TalerCryptoInterface[x]>;
};

export interface SignCoinLinkRequest {
  oldCoinPriv: string;
  newDenomHash: string;
  oldCoinPub: string;
  transferPub: string;
  coinEv: CoinEnvelope;
}

export interface SetupRefreshPlanchetRequest {
  transferSecret: string;
  coinNumber: number;
}

export interface SetupWithdrawalPlanchetRequest {
  secretSeed: string;
  coinNumber: number;
}

export interface SignPurseCreationRequest {
  pursePriv: string;
  purseExpiration: TalerProtocolTimestamp;
  purseAmount: AmountString;
  hContractTerms: HashCodeString;
  mergePub: EddsaPublicKeyString;
  minAge: number;
}

export interface SignPurseDepositsRequest {
  pursePub: string;
  exchangeBaseUrl: string;
  coins: {
    coinPub: string;
    coinPriv: string;
    contribution: AmountString;
    denomPubHash: string;
    denomSig: UnblindedSignature;
    ageCommitmentProof: AgeCommitmentProof | undefined;
  }[];
}

export interface SignPurseDepositsResponse {
  deposits: PurseDeposit[];
}

export interface RsaVerificationRequest {
  hm: string;
  sig: string;
  pk: string;
}

export interface RsaBlindRequest {
  hm: string;
  bks: string;
  pub: string;
}

export interface EddsaSigningResult {
  sig: string;
}

export interface ValidationResult {
  valid: boolean;
}

export interface HashStringRequest {
  str: string;
}

export interface HashStringResult {
  h: string;
}

export interface WireFeeValidationRequest {
  type: string;
  wf: WireFee;
  masterPub: string;
}

export interface GlobalFeesValidationRequest {
  gf: GlobalFees;
  masterPub: string;
}

export interface DenominationValidationRequest {
  denom: DenominationRecord;
  masterPub: string;
}

export interface PaymentSignatureValidationRequest {
  sig: string;
  contractHash: string;
  merchantPub: string;
}

export interface ContractTermsValidationRequest {
  contractTermsHash: string;
  sig: string;
  merchantPub: string;
}

export interface WireAccountValidationRequest {
  versionCurrent: ExchangeProtocolVersion;
  paytoUri: string;
  sig: string;
  masterPub: string;
}

export interface EddsaKeypair {
  priv: string;
  pub: string;
}

export interface EddsaGetPublicRequest {
  priv: string;
}

export interface EddsaGetPublicResponse {
  pub: string;
}

export interface EcdheGetPublicRequest {
  priv: string;
}

export interface EcdheGetPublicResponse {
  pub: string;
}

export interface UnblindDenominationSignatureRequest {
  planchet: PlanchetUnblindInfo;
  evSig: BlindedDenominationSignature;
}

export interface FreshCoinEncoded {
  coinPub: string;
  coinPriv: string;
  bks: string;
}

export interface RsaUnblindRequest {
  blindedSig: string;
  bk: string;
  pk: string;
}

export interface RsaBlindResponse {
  blinded: string;
}

export interface RsaUnblindResponse {
  sig: string;
}

export interface KeyExchangeEcdheEddsaRequest {
  ecdhePriv: string;
  eddsaPub: string;
}

export interface KeyExchangeResult {
  h: string;
}

export interface SetupRefreshTransferPubRequest {
  secretSeed: string;
  transferPubIndex: number;
}

export interface TransferPubResponse {
  transferPub: string;
  transferPriv: string;
}

/**
 * JS-native implementation of the Taler crypto worker operations.
 */
export const nativeCryptoR: TalerCryptoInterfaceR = {
  async eddsaSign(
    tci: TalerCryptoInterfaceR,
    req: EddsaSignRequest,
  ): Promise<EddsaSignResponse> {
    return {
      sig: encodeCrock(eddsaSign(decodeCrock(req.msg), decodeCrock(req.priv))),
    };
  },

  async rsaBlind(
    tci: TalerCryptoInterfaceR,
    req: RsaBlindRequest,
  ): Promise<RsaBlindResponse> {
    const res = rsaBlind(
      decodeCrock(req.hm),
      decodeCrock(req.bks),
      decodeCrock(req.pub),
    );
    return {
      blinded: encodeCrock(res),
    };
  },

  async setupRefreshPlanchet(
    tci: TalerCryptoInterfaceR,
    req: SetupRefreshPlanchetRequest,
  ): Promise<FreshCoinEncoded> {
    const transferSecret = decodeCrock(req.transferSecret);
    const coinNumber = req.coinNumber;
    // See TALER_transfer_secret_to_planchet_secret in C impl
    const planchetMasterSecret = kdfKw({
      ikm: transferSecret,
      outputLength: 32,
      salt: bufferForUint32(coinNumber),
      info: stringToBytes("taler-coin-derivation"),
    });

    const coinPriv = kdfKw({
      ikm: planchetMasterSecret,
      outputLength: 32,
      salt: stringToBytes("coin"),
    });

    const bks = kdfKw({
      ikm: planchetMasterSecret,
      outputLength: 32,
      salt: stringToBytes("bks"),
    });

    const coinPrivEnc = encodeCrock(coinPriv);
    const coinPubRes = await tci.eddsaGetPublic(tci, {
      priv: coinPrivEnc,
    });

    return {
      bks: encodeCrock(bks),
      coinPriv: coinPrivEnc,
      coinPub: coinPubRes.pub,
    };
  },

  async setupWithdrawalPlanchet(
    tci: TalerCryptoInterfaceR,
    req: SetupWithdrawalPlanchetRequest,
  ): Promise<FreshCoinEncoded> {
    const info = stringToBytes("taler-withdrawal-coin-derivation");
    const saltArrBuf = new ArrayBuffer(4);
    const salt = new Uint8Array(saltArrBuf);
    const saltDataView = new DataView(saltArrBuf);
    saltDataView.setUint32(0, req.coinNumber);
    const out = kdf(64, decodeCrock(req.secretSeed), salt, info);
    const coinPriv = out.slice(0, 32);
    const bks = out.slice(32, 64);
    const coinPrivEnc = encodeCrock(coinPriv);
    const coinPubRes = await tci.eddsaGetPublic(tci, {
      priv: coinPrivEnc,
    });
    return {
      bks: encodeCrock(bks),
      coinPriv: coinPrivEnc,
      coinPub: coinPubRes.pub,
    };
  },

  async createPlanchet(
    tci: TalerCryptoInterfaceR,
    req: PlanchetCreationRequest,
  ): Promise<WithdrawalPlanchet> {
    const denomPub = req.denomPub;
    if (denomPub.cipher === DenomKeyType.Rsa) {
      const reservePub = decodeCrock(req.reservePub);
      const derivedPlanchet = await tci.setupWithdrawalPlanchet(tci, {
        coinNumber: req.coinIndex,
        secretSeed: req.secretSeed,
      });

      let maybeAcp: AgeCommitmentProof | undefined = undefined;
      let maybeAgeCommitmentHash: string | undefined = undefined;
      if (denomPub.age_mask) {
        const age = req.restrictAge || AgeRestriction.AGE_UNRESTRICTED;
        logger.info(`creating age-restricted planchet (age ${age})`);
        maybeAcp = await AgeRestriction.restrictionCommit(
          denomPub.age_mask,
          age,
        );
        maybeAgeCommitmentHash = AgeRestriction.hashCommitment(
          maybeAcp.commitment,
        );
      }

      const coinPubHash = hashCoinPub(
        derivedPlanchet.coinPub,
        maybeAgeCommitmentHash,
      );

      const blindResp = await tci.rsaBlind(tci, {
        bks: derivedPlanchet.bks,
        hm: encodeCrock(coinPubHash),
        pub: denomPub.rsa_public_key,
      });
      const coinEv: CoinEnvelope = {
        cipher: DenomKeyType.Rsa,
        rsa_blinded_planchet: blindResp.blinded,
      };
      const amountWithFee = Amounts.add(req.value, req.feeWithdraw).amount;
      const denomPubHash = hashDenomPub(req.denomPub);
      const evHash = hashCoinEv(coinEv, encodeCrock(denomPubHash));
      const withdrawRequest = buildSigPS(
        TalerSignaturePurpose.WALLET_RESERVE_WITHDRAW,
      )
        .put(amountToBuffer(amountWithFee))
        .put(denomPubHash)
        .put(evHash)
        .build();

      const sigResult = await tci.eddsaSign(tci, {
        msg: encodeCrock(withdrawRequest),
        priv: req.reservePriv,
      });

      const planchet: WithdrawalPlanchet = {
        blindingKey: derivedPlanchet.bks,
        coinEv,
        coinPriv: derivedPlanchet.coinPriv,
        coinPub: derivedPlanchet.coinPub,
        coinValue: req.value,
        denomPub,
        denomPubHash: encodeCrock(denomPubHash),
        reservePub: encodeCrock(reservePub),
        withdrawSig: sigResult.sig,
        coinEvHash: encodeCrock(evHash),
        ageCommitmentProof: maybeAcp,
      };
      return planchet;
    } else {
      throw Error("unsupported cipher, unable to create planchet");
    }
  },

  async createTipPlanchet(
    tci: TalerCryptoInterfaceR,
    req: DeriveTipRequest,
  ): Promise<DerivedTipPlanchet> {
    if (req.denomPub.cipher !== DenomKeyType.Rsa) {
      throw Error(`unsupported cipher (${req.denomPub.cipher})`);
    }
    const fc = await setupTipPlanchet(
      decodeCrock(req.secretSeed),
      req.denomPub,
      req.planchetIndex,
    );
    const maybeAch = fc.ageCommitmentProof
      ? AgeRestriction.hashCommitment(fc.ageCommitmentProof.commitment)
      : undefined;
    const denomPub = decodeCrock(req.denomPub.rsa_public_key);
    const coinPubHash = hashCoinPub(encodeCrock(fc.coinPub), maybeAch);
    const blindResp = await tci.rsaBlind(tci, {
      bks: encodeCrock(fc.bks),
      hm: encodeCrock(coinPubHash),
      pub: encodeCrock(denomPub),
    });
    const coinEv = {
      cipher: DenomKeyType.Rsa,
      rsa_blinded_planchet: blindResp.blinded,
    };
    const tipPlanchet: DerivedTipPlanchet = {
      blindingKey: encodeCrock(fc.bks),
      coinEv,
      coinEvHash: encodeCrock(
        hashCoinEv(coinEv, encodeCrock(hashDenomPub(req.denomPub))),
      ),
      coinPriv: encodeCrock(fc.coinPriv),
      coinPub: encodeCrock(fc.coinPub),
      ageCommitmentProof: fc.ageCommitmentProof,
    };
    return tipPlanchet;
  },

  async signTrackTransaction(
    tci: TalerCryptoInterfaceR,
    req: SignTrackTransactionRequest,
  ): Promise<EddsaSigningResult> {
    const p = buildSigPS(TalerSignaturePurpose.MERCHANT_TRACK_TRANSACTION)
      .put(decodeCrock(req.contractTermsHash))
      .put(decodeCrock(req.wireHash))
      .put(decodeCrock(req.merchantPub))
      .put(decodeCrock(req.coinPub))
      .build();
    return { sig: encodeCrock(eddsaSign(p, decodeCrock(req.merchantPriv))) };
  },

  /**
   * Create and sign a message to recoup a coin.
   */
  async createRecoupRequest(
    tci: TalerCryptoInterfaceR,
    req: CreateRecoupReqRequest,
  ): Promise<RecoupRequest> {
    const p = buildSigPS(TalerSignaturePurpose.WALLET_COIN_RECOUP)
      .put(decodeCrock(req.denomPubHash))
      .put(decodeCrock(req.blindingKey))
      .build();

    const coinPriv = decodeCrock(req.coinPriv);
    const coinSig = eddsaSign(p, coinPriv);
    if (req.denomPub.cipher === DenomKeyType.Rsa) {
      const paybackRequest: RecoupRequest = {
        coin_blind_key_secret: req.blindingKey,
        coin_sig: encodeCrock(coinSig),
        denom_pub_hash: req.denomPubHash,
        denom_sig: req.denomSig,
        // FIXME!
        ewv: {
          cipher: "RSA",
        },
      };
      return paybackRequest;
    } else {
      throw new Error();
    }
  },

  /**
   * Create and sign a message to recoup a coin.
   */
  async createRecoupRefreshRequest(
    tci: TalerCryptoInterfaceR,
    req: CreateRecoupRefreshReqRequest,
  ): Promise<RecoupRefreshRequest> {
    const p = buildSigPS(TalerSignaturePurpose.WALLET_COIN_RECOUP_REFRESH)
      .put(decodeCrock(req.denomPubHash))
      .put(decodeCrock(req.blindingKey))
      .build();

    const coinPriv = decodeCrock(req.coinPriv);
    const coinSig = eddsaSign(p, coinPriv);
    if (req.denomPub.cipher === DenomKeyType.Rsa) {
      const recoupRequest: RecoupRefreshRequest = {
        coin_blind_key_secret: req.blindingKey,
        coin_sig: encodeCrock(coinSig),
        denom_pub_hash: req.denomPubHash,
        denom_sig: req.denomSig,
        // FIXME!
        ewv: {
          cipher: "RSA",
        },
      };
      return recoupRequest;
    } else {
      throw new Error();
    }
  },

  /**
   * Check if a payment signature is valid.
   */
  async isValidPaymentSignature(
    tci: TalerCryptoInterfaceR,
    req: PaymentSignatureValidationRequest,
  ): Promise<ValidationResult> {
    const { contractHash, sig, merchantPub } = req;
    const p = buildSigPS(TalerSignaturePurpose.MERCHANT_PAYMENT_OK)
      .put(decodeCrock(contractHash))
      .build();
    const sigBytes = decodeCrock(sig);
    const pubBytes = decodeCrock(merchantPub);
    return { valid: eddsaVerify(p, sigBytes, pubBytes) };
  },

  /**
   * Check if a wire fee is correctly signed.
   */
  async isValidWireFee(
    tci: TalerCryptoInterfaceR,
    req: WireFeeValidationRequest,
  ): Promise<ValidationResult> {
    const { type, wf, masterPub } = req;
    const p = buildSigPS(TalerSignaturePurpose.MASTER_WIRE_FEES)
      .put(hash(stringToBytes(type + "\0")))
      .put(timestampRoundedToBuffer(wf.startStamp))
      .put(timestampRoundedToBuffer(wf.endStamp))
      .put(amountToBuffer(wf.wireFee))
      .put(amountToBuffer(wf.closingFee))
      .build();
    const sig = decodeCrock(wf.sig);
    const pub = decodeCrock(masterPub);
    return { valid: eddsaVerify(p, sig, pub) };
  },

  /**
   * Check if a global fee is correctly signed.
   */
  async isValidGlobalFees(
    tci: TalerCryptoInterfaceR,
    req: GlobalFeesValidationRequest,
  ): Promise<ValidationResult> {
    const { gf, masterPub } = req;
    const p = buildSigPS(TalerSignaturePurpose.GLOBAL_FEES)
      .put(timestampRoundedToBuffer(gf.start_date))
      .put(timestampRoundedToBuffer(gf.end_date))
      .put(durationRoundedToBuffer(gf.purse_timeout))
      .put(durationRoundedToBuffer(gf.history_expiration))
      .put(amountToBuffer(Amounts.parseOrThrow(gf.history_fee)))
      .put(amountToBuffer(Amounts.parseOrThrow(gf.account_fee)))
      .put(amountToBuffer(Amounts.parseOrThrow(gf.purse_fee)))
      .put(bufferForUint32(gf.purse_account_limit))
      .build();
    const sig = decodeCrock(gf.master_sig);
    const pub = decodeCrock(masterPub);
    return { valid: eddsaVerify(p, sig, pub) };
  },
  /**
   * Check if the signature of a denomination is valid.
   */
  async isValidDenom(
    tci: TalerCryptoInterfaceR,
    req: DenominationValidationRequest,
  ): Promise<ValidationResult> {
    const { masterPub, denom } = req;
    const value: AmountJson = {
      currency: denom.currency,
      fraction: denom.amountFrac,
      value: denom.amountVal,
    };
    const p = buildSigPS(TalerSignaturePurpose.MASTER_DENOMINATION_KEY_VALIDITY)
      .put(decodeCrock(masterPub))
      .put(timestampRoundedToBuffer(denom.stampStart))
      .put(timestampRoundedToBuffer(denom.stampExpireWithdraw))
      .put(timestampRoundedToBuffer(denom.stampExpireDeposit))
      .put(timestampRoundedToBuffer(denom.stampExpireLegal))
      .put(amountToBuffer(value))
      .put(amountToBuffer(denom.fees.feeWithdraw))
      .put(amountToBuffer(denom.fees.feeDeposit))
      .put(amountToBuffer(denom.fees.feeRefresh))
      .put(amountToBuffer(denom.fees.feeRefund))
      .put(decodeCrock(denom.denomPubHash))
      .build();
    const sig = decodeCrock(denom.masterSig);
    const pub = decodeCrock(masterPub);
    const res = eddsaVerify(p, sig, pub);
    return { valid: res };
  },

  async isValidWireAccount(
    tci: TalerCryptoInterfaceR,
    req: WireAccountValidationRequest,
  ): Promise<ValidationResult> {
    const { sig, masterPub, paytoUri } = req;
    const paytoHash = hashTruncate32(stringToBytes(paytoUri + "\0"));
    const p = buildSigPS(TalerSignaturePurpose.MASTER_WIRE_DETAILS)
      .put(paytoHash)
      .build();
    return { valid: eddsaVerify(p, decodeCrock(sig), decodeCrock(masterPub)) };
  },

  async isValidContractTermsSignature(
    tci: TalerCryptoInterfaceR,
    req: ContractTermsValidationRequest,
  ): Promise<ValidationResult> {
    const cthDec = decodeCrock(req.contractTermsHash);
    const p = buildSigPS(TalerSignaturePurpose.MERCHANT_CONTRACT)
      .put(cthDec)
      .build();
    return {
      valid: eddsaVerify(p, decodeCrock(req.sig), decodeCrock(req.merchantPub)),
    };
  },

  /**
   * Create a new EdDSA key pair.
   */
  async createEddsaKeypair(tci: TalerCryptoInterfaceR): Promise<EddsaKeypair> {
    const eddsaPriv = encodeCrock(getRandomBytes(32));
    const eddsaPubRes = await tci.eddsaGetPublic(tci, {
      priv: eddsaPriv,
    });
    return {
      priv: eddsaPriv,
      pub: eddsaPubRes.pub,
    };
  },

  async eddsaGetPublic(
    tci: TalerCryptoInterfaceR,
    req: EddsaGetPublicRequest,
  ): Promise<EddsaKeypair> {
    return {
      priv: req.priv,
      pub: encodeCrock(eddsaGetPublic(decodeCrock(req.priv))),
    };
  },

  async unblindDenominationSignature(
    tci: TalerCryptoInterfaceR,
    req: UnblindDenominationSignatureRequest,
  ): Promise<UnblindedSignature> {
    if (req.evSig.cipher === DenomKeyType.Rsa) {
      if (req.planchet.denomPub.cipher !== DenomKeyType.Rsa) {
        throw new Error(
          "planchet cipher does not match blind signature cipher",
        );
      }
      const denomSig = rsaUnblind(
        decodeCrock(req.evSig.blinded_rsa_signature),
        decodeCrock(req.planchet.denomPub.rsa_public_key),
        decodeCrock(req.planchet.blindingKey),
      );
      return {
        cipher: DenomKeyType.Rsa,
        rsa_signature: encodeCrock(denomSig),
      };
    } else {
      throw Error(`unblinding for cipher ${req.evSig.cipher} not implemented`);
    }
  },

  /**
   * Unblind a blindly signed value.
   */
  async rsaUnblind(
    tci: TalerCryptoInterfaceR,
    req: RsaUnblindRequest,
  ): Promise<RsaUnblindResponse> {
    const denomSig = rsaUnblind(
      decodeCrock(req.blindedSig),
      decodeCrock(req.pk),
      decodeCrock(req.bk),
    );
    return { sig: encodeCrock(denomSig) };
  },

  /**
   * Unblind a blindly signed value.
   */
  async rsaVerify(
    tci: TalerCryptoInterfaceR,
    req: RsaVerificationRequest,
  ): Promise<ValidationResult> {
    return {
      valid: rsaVerify(
        hash(decodeCrock(req.hm)),
        decodeCrock(req.sig),
        decodeCrock(req.pk),
      ),
    };
  },

  /**
   * Generate updated coins (to store in the database)
   * and deposit permissions for each given coin.
   */
  async signDepositPermission(
    tci: TalerCryptoInterfaceR,
    depositInfo: DepositInfo,
  ): Promise<CoinDepositPermission> {
    // FIXME: put extensions here if used
    const hExt = new Uint8Array(64);
    let hAgeCommitment: Uint8Array;
    let minimumAgeSig: string | undefined = undefined;
    if (depositInfo.ageCommitmentProof) {
      const ach = AgeRestriction.hashCommitment(
        depositInfo.ageCommitmentProof.commitment,
      );
      hAgeCommitment = decodeCrock(ach);
      if (depositInfo.requiredMinimumAge != null) {
        minimumAgeSig = encodeCrock(
          AgeRestriction.commitmentAttest(
            depositInfo.ageCommitmentProof,
            depositInfo.requiredMinimumAge,
          ),
        );
      }
    } else {
      // All zeros.
      hAgeCommitment = new Uint8Array(32);
    }
    let d: Uint8Array;
    if (depositInfo.denomKeyType === DenomKeyType.Rsa) {
      d = buildSigPS(TalerSignaturePurpose.WALLET_COIN_DEPOSIT)
        .put(decodeCrock(depositInfo.contractTermsHash))
        .put(hAgeCommitment)
        .put(hExt)
        .put(decodeCrock(depositInfo.wireInfoHash))
        .put(decodeCrock(depositInfo.denomPubHash))
        .put(timestampRoundedToBuffer(depositInfo.timestamp))
        .put(timestampRoundedToBuffer(depositInfo.refundDeadline))
        .put(amountToBuffer(depositInfo.spendAmount))
        .put(amountToBuffer(depositInfo.feeDeposit))
        .put(decodeCrock(depositInfo.merchantPub))
        .build();
    } else {
      throw Error("unsupported exchange protocol version");
    }
    const coinSigRes = await this.eddsaSign(tci, {
      msg: encodeCrock(d),
      priv: depositInfo.coinPriv,
    });

    if (depositInfo.denomKeyType === DenomKeyType.Rsa) {
      const s: CoinDepositPermission = {
        coin_pub: depositInfo.coinPub,
        coin_sig: coinSigRes.sig,
        contribution: Amounts.stringify(depositInfo.spendAmount),
        h_denom: depositInfo.denomPubHash,
        exchange_url: depositInfo.exchangeBaseUrl,
        ub_sig: {
          cipher: DenomKeyType.Rsa,
          rsa_signature: depositInfo.denomSig.rsa_signature,
        },
      };

      if (depositInfo.requiredMinimumAge != null) {
        // These are only required by the merchant
        s.minimum_age_sig = minimumAgeSig;
        s.age_commitment =
          depositInfo.ageCommitmentProof?.commitment.publicKeys;
      } else if (depositInfo.ageCommitmentProof) {
        s.h_age_commitment = encodeCrock(hAgeCommitment);
      }

      return s;
    } else {
      throw Error(
        `unsupported denomination cipher (${depositInfo.denomKeyType})`,
      );
    }
  },

  async deriveRefreshSession(
    tci: TalerCryptoInterfaceR,
    req: DeriveRefreshSessionRequest,
  ): Promise<DerivedRefreshSession> {
    const {
      newCoinDenoms,
      feeRefresh: meltFee,
      kappa,
      meltCoinDenomPubHash,
      meltCoinPriv,
      meltCoinPub,
      sessionSecretSeed: refreshSessionSecretSeed,
    } = req;

    const currency = newCoinDenoms[0].value.currency;
    let valueWithFee = Amounts.getZero(currency);

    for (const ncd of newCoinDenoms) {
      const t = Amounts.add(ncd.value, ncd.feeWithdraw).amount;
      valueWithFee = Amounts.add(
        valueWithFee,
        Amounts.mult(t, ncd.count).amount,
      ).amount;
    }

    // melt fee
    valueWithFee = Amounts.add(valueWithFee, meltFee).amount;

    const sessionHc = createHashContext();

    const transferPubs: string[] = [];
    const transferPrivs: string[] = [];

    const planchetsForGammas: RefreshPlanchetInfo[][] = [];

    for (let i = 0; i < kappa; i++) {
      const transferKeyPair = await tci.setupRefreshTransferPub(tci, {
        secretSeed: refreshSessionSecretSeed,
        transferPubIndex: i,
      });
      sessionHc.update(decodeCrock(transferKeyPair.transferPub));
      transferPrivs.push(transferKeyPair.transferPriv);
      transferPubs.push(transferKeyPair.transferPub);
    }

    for (const denomSel of newCoinDenoms) {
      for (let i = 0; i < denomSel.count; i++) {
        if (denomSel.denomPub.cipher === DenomKeyType.Rsa) {
          const denomPubHash = hashDenomPub(denomSel.denomPub);
          sessionHc.update(denomPubHash);
        } else {
          throw new Error();
        }
      }
    }

    sessionHc.update(decodeCrock(meltCoinPub));
    sessionHc.update(amountToBuffer(valueWithFee));

    for (let i = 0; i < kappa; i++) {
      const planchets: RefreshPlanchetInfo[] = [];
      for (let j = 0; j < newCoinDenoms.length; j++) {
        const denomSel = newCoinDenoms[j];
        for (let k = 0; k < denomSel.count; k++) {
          const coinIndex = planchets.length;
          const transferSecretRes = await tci.keyExchangeEcdheEddsa(tci, {
            ecdhePriv: transferPrivs[i],
            eddsaPub: meltCoinPub,
          });
          let coinPub: Uint8Array;
          let coinPriv: Uint8Array;
          let blindingFactor: Uint8Array;
          let fresh: FreshCoinEncoded = await tci.setupRefreshPlanchet(tci, {
            coinNumber: coinIndex,
            transferSecret: transferSecretRes.h,
          });
          let newAc: AgeCommitmentProof | undefined = undefined;
          let newAch: HashCodeString | undefined = undefined;
          if (req.meltCoinAgeCommitmentProof) {
            newAc = await AgeRestriction.commitmentDerive(
              req.meltCoinAgeCommitmentProof,
              decodeCrock(transferSecretRes.h),
            );
            newAch = AgeRestriction.hashCommitment(newAc.commitment);
          }
          coinPriv = decodeCrock(fresh.coinPriv);
          coinPub = decodeCrock(fresh.coinPub);
          blindingFactor = decodeCrock(fresh.bks);
          const coinPubHash = hashCoinPub(fresh.coinPub, newAch);
          if (denomSel.denomPub.cipher !== DenomKeyType.Rsa) {
            throw Error("unsupported cipher, can't create refresh session");
          }
          const blindResult = await tci.rsaBlind(tci, {
            bks: encodeCrock(blindingFactor),
            hm: encodeCrock(coinPubHash),
            pub: denomSel.denomPub.rsa_public_key,
          });
          const coinEv: CoinEnvelope = {
            cipher: DenomKeyType.Rsa,
            rsa_blinded_planchet: blindResult.blinded,
          };
          const coinEvHash = hashCoinEv(
            coinEv,
            encodeCrock(hashDenomPub(denomSel.denomPub)),
          );
          const planchet: RefreshPlanchetInfo = {
            blindingKey: encodeCrock(blindingFactor),
            coinEv,
            coinPriv: encodeCrock(coinPriv),
            coinPub: encodeCrock(coinPub),
            coinEvHash: encodeCrock(coinEvHash),
            maxAge: req.meltCoinMaxAge,
            ageCommitmentProof: newAc,
          };
          planchets.push(planchet);
          hashCoinEvInner(coinEv, sessionHc);
        }
      }
      planchetsForGammas.push(planchets);
    }

    const sessionHash = sessionHc.finish();
    let confirmData: Uint8Array;
    let hAgeCommitment: Uint8Array;
    if (req.meltCoinAgeCommitmentProof) {
      hAgeCommitment = decodeCrock(
        AgeRestriction.hashCommitment(
          req.meltCoinAgeCommitmentProof.commitment,
        ),
      );
    } else {
      hAgeCommitment = new Uint8Array(32);
    }
    confirmData = buildSigPS(TalerSignaturePurpose.WALLET_COIN_MELT)
      .put(sessionHash)
      .put(decodeCrock(meltCoinDenomPubHash))
      .put(hAgeCommitment)
      .put(amountToBuffer(valueWithFee))
      .put(amountToBuffer(meltFee))
      .build();

    const confirmSigResp = await tci.eddsaSign(tci, {
      msg: encodeCrock(confirmData),
      priv: meltCoinPriv,
    });

    const refreshSession: DerivedRefreshSession = {
      confirmSig: confirmSigResp.sig,
      hash: encodeCrock(sessionHash),
      meltCoinPub: meltCoinPub,
      planchetsForGammas: planchetsForGammas,
      transferPrivs,
      transferPubs,
      meltValueWithFee: valueWithFee,
    };

    return refreshSession;
  },

  /**
   * Hash a string including the zero terminator.
   */
  async hashString(
    tci: TalerCryptoInterfaceR,
    req: HashStringRequest,
  ): Promise<HashStringResult> {
    const b = stringToBytes(req.str + "\0");
    return { h: encodeCrock(hash(b)) };
  },

  async signCoinLink(
    tci: TalerCryptoInterfaceR,
    req: SignCoinLinkRequest,
  ): Promise<EddsaSigningResult> {
    const coinEvHash = hashCoinEv(req.coinEv, req.newDenomHash);
    // FIXME: fill in
    const hAgeCommitment = new Uint8Array(32);
    const coinLink = buildSigPS(TalerSignaturePurpose.WALLET_COIN_LINK)
      .put(decodeCrock(req.newDenomHash))
      .put(decodeCrock(req.transferPub))
      .put(hAgeCommitment)
      .put(coinEvHash)
      .build();
    return tci.eddsaSign(tci, {
      msg: encodeCrock(coinLink),
      priv: req.oldCoinPriv,
    });
  },

  async makeSyncSignature(
    tci: TalerCryptoInterfaceR,
    req: MakeSyncSignatureRequest,
  ): Promise<EddsaSigningResult> {
    const hNew = decodeCrock(req.newHash);
    let hOld: Uint8Array;
    if (req.oldHash) {
      hOld = decodeCrock(req.oldHash);
    } else {
      hOld = new Uint8Array(64);
    }
    const sigBlob = buildSigPS(TalerSignaturePurpose.SYNC_BACKUP_UPLOAD)
      .put(hOld)
      .put(hNew)
      .build();
    const uploadSig = eddsaSign(sigBlob, decodeCrock(req.accountPriv));
    return { sig: encodeCrock(uploadSig) };
  },
  async keyExchangeEcdheEddsa(
    tci: TalerCryptoInterfaceR,
    req: KeyExchangeEcdheEddsaRequest,
  ): Promise<KeyExchangeResult> {
    return {
      h: encodeCrock(
        keyExchangeEcdheEddsa(
          decodeCrock(req.ecdhePriv),
          decodeCrock(req.eddsaPub),
        ),
      ),
    };
  },
  async ecdheGetPublic(
    tci: TalerCryptoInterfaceR,
    req: EcdheGetPublicRequest,
  ): Promise<EcdheGetPublicResponse> {
    return {
      pub: encodeCrock(ecdheGetPublic(decodeCrock(req.priv))),
    };
  },
  async setupRefreshTransferPub(
    tci: TalerCryptoInterfaceR,
    req: SetupRefreshTransferPubRequest,
  ): Promise<TransferPubResponse> {
    const info = stringToBytes("taler-transfer-pub-derivation");
    const saltArrBuf = new ArrayBuffer(4);
    const salt = new Uint8Array(saltArrBuf);
    const saltDataView = new DataView(saltArrBuf);
    saltDataView.setUint32(0, req.transferPubIndex);
    const out = kdf(32, decodeCrock(req.secretSeed), salt, info);
    const transferPriv = encodeCrock(out);
    return {
      transferPriv,
      transferPub: (await tci.ecdheGetPublic(tci, { priv: transferPriv })).pub,
    };
  },
  async signPurseCreation(
    tci: TalerCryptoInterfaceR,
    req: SignPurseCreationRequest,
  ): Promise<EddsaSigningResult> {
    const sigBlob = buildSigPS(TalerSignaturePurpose.WALLET_PURSE_CREATE)
      .put(timestampRoundedToBuffer(req.purseExpiration))
      .put(amountToBuffer(Amounts.parseOrThrow(req.purseAmount)))
      .put(decodeCrock(req.hContractTerms))
      .put(decodeCrock(req.mergePub))
      .put(bufferForUint32(req.minAge))
      .build();
    return await tci.eddsaSign(tci, {
      msg: encodeCrock(sigBlob),
      priv: req.pursePriv,
    });
  },
  async signPurseDeposits(
    tci: TalerCryptoInterfaceR,
    req: SignPurseDepositsRequest,
  ): Promise<SignPurseDepositsResponse> {
    const hExchangeBaseUrl = hash(stringToBytes(req.exchangeBaseUrl + "\0"));
    const deposits: PurseDeposit[] = [];
    for (const c of req.coins) {
      let haveAch: boolean;
      let maybeAch: Uint8Array;
      if (c.ageCommitmentProof) {
        haveAch = true;
        maybeAch = decodeCrock(
          AgeRestriction.hashCommitment(c.ageCommitmentProof.commitment),
        );
      } else {
        haveAch = false;
        maybeAch = new Uint8Array(32);
      }
      const sigBlob = buildSigPS(TalerSignaturePurpose.WALLET_PURSE_DEPOSIT)
        .put(amountToBuffer(Amounts.parseOrThrow(c.contribution)))
        .put(decodeCrock(c.denomPubHash))
        .put(maybeAch)
        .put(decodeCrock(req.pursePub))
        .put(hExchangeBaseUrl)
        .build();
      const sigResp = await tci.eddsaSign(tci, {
        msg: encodeCrock(sigBlob),
        priv: c.coinPriv,
      });
      deposits.push({
        amount: c.contribution,
        coin_pub: c.coinPub,
        coin_sig: sigResp.sig,
        denom_pub_hash: c.denomPubHash,
        ub_sig: c.denomSig,
        age_commitment: c.ageCommitmentProof
          ? c.ageCommitmentProof.commitment.publicKeys
          : undefined,
      });
    }
    return {
      deposits,
    };
  },
  async encryptContractForMerge(
    tci: TalerCryptoInterfaceR,
    req: EncryptContractRequest,
  ): Promise<EncryptContractResponse> {
    const contractKeyPair = await this.createEddsaKeypair(tci, {});
    const enc = await encryptContractForMerge(
      decodeCrock(req.pursePub),
      decodeCrock(contractKeyPair.priv),
      decodeCrock(req.mergePriv),
      req.contractTerms,
    );
    const sigBlob = buildSigPS(TalerSignaturePurpose.WALLET_PURSE_ECONTRACT)
      .put(hash(enc))
      .put(decodeCrock(contractKeyPair.pub))
      .build();
    const sig = eddsaSign(sigBlob, decodeCrock(req.pursePriv));
    return {
      econtract: {
        contract_pub: contractKeyPair.pub,
        econtract: encodeCrock(enc),
        econtract_sig: encodeCrock(sig),
      },
      contractPriv: contractKeyPair.priv,
    };
  },
  async decryptContractForMerge(
    tci: TalerCryptoInterfaceR,
    req: DecryptContractRequest,
  ): Promise<DecryptContractResponse> {
    const res = await decryptContractForMerge(
      decodeCrock(req.ciphertext),
      decodeCrock(req.pursePub),
      decodeCrock(req.contractPriv),
    );
    return {
      contractTerms: res.contractTerms,
      mergePriv: encodeCrock(res.mergePriv),
    };
  },
  async encryptContractForDeposit(
    tci: TalerCryptoInterfaceR,
    req: EncryptContractForDepositRequest,
  ): Promise<EncryptContractForDepositResponse> {
    const contractKeyPair = await this.createEddsaKeypair(tci, {});
    const enc = await encryptContractForDeposit(
      decodeCrock(req.pursePub),
      decodeCrock(contractKeyPair.priv),
      req.contractTerms,
    );
    const sigBlob = buildSigPS(TalerSignaturePurpose.WALLET_PURSE_ECONTRACT)
      .put(hash(enc))
      .put(decodeCrock(contractKeyPair.pub))
      .build();
    const sig = eddsaSign(sigBlob, decodeCrock(req.pursePriv));
    return {
      econtract: {
        contract_pub: contractKeyPair.pub,
        econtract: encodeCrock(enc),
        econtract_sig: encodeCrock(sig),
      },
      contractPriv: contractKeyPair.priv,
    };
  },
  async decryptContractForDeposit(
    tci: TalerCryptoInterfaceR,
    req: DecryptContractForDepositRequest,
  ): Promise<DecryptContractForDepositResponse> {
    const res = await decryptContractForDeposit(
      decodeCrock(req.ciphertext),
      decodeCrock(req.pursePub),
      decodeCrock(req.contractPriv),
    );
    return {
      contractTerms: res.contractTerms,
    };
  },
  async signPurseMerge(
    tci: TalerCryptoInterfaceR,
    req: SignPurseMergeRequest,
  ): Promise<SignPurseMergeResponse> {
    const mergeSigBlob = buildSigPS(TalerSignaturePurpose.WALLET_PURSE_MERGE)
      .put(timestampRoundedToBuffer(req.mergeTimestamp))
      .put(decodeCrock(req.pursePub))
      .put(hashTruncate32(stringToBytes(req.reservePayto + "\0")))
      .build();
    const mergeSigResp = await tci.eddsaSign(tci, {
      msg: encodeCrock(mergeSigBlob),
      priv: req.mergePriv,
    });

    const reserveSigBlob = buildSigPS(
      TalerSignaturePurpose.WALLET_ACCOUNT_MERGE,
    )
      .put(timestampRoundedToBuffer(req.purseExpiration))
      .put(amountToBuffer(Amounts.parseOrThrow(req.purseAmount)))
      .put(amountToBuffer(Amounts.parseOrThrow(req.purseFee)))
      .put(decodeCrock(req.contractTermsHash))
      .put(decodeCrock(req.pursePub))
      .put(timestampRoundedToBuffer(req.mergeTimestamp))
      // FIXME: put in min_age
      .put(bufferForUint32(0))
      .put(bufferForUint32(req.flags))
      .build();

    logger.info(
      `signing WALLET_ACCOUNT_MERGE over ${encodeCrock(reserveSigBlob)}`,
    );

    const reserveSigResp = await tci.eddsaSign(tci, {
      msg: encodeCrock(reserveSigBlob),
      priv: req.reservePriv,
    });

    return {
      mergeSig: mergeSigResp.sig,
      accountSig: reserveSigResp.sig,
    };
  },
  async signReservePurseCreate(
    tci: TalerCryptoInterfaceR,
    req: SignReservePurseCreateRequest,
  ): Promise<SignReservePurseCreateResponse> {
    const mergeSigBlob = buildSigPS(TalerSignaturePurpose.WALLET_PURSE_MERGE)
      .put(timestampRoundedToBuffer(req.mergeTimestamp))
      .put(decodeCrock(req.pursePub))
      .put(hashTruncate32(stringToBytes(req.reservePayto + "\0")))
      .build();
    const mergeSigResp = await tci.eddsaSign(tci, {
      msg: encodeCrock(mergeSigBlob),
      priv: req.mergePriv,
    });

    logger.info(`payto URI: ${req.reservePayto}`);
    logger.info(`signing WALLET_PURSE_MERGE over ${encodeCrock(mergeSigBlob)}`);

    const reserveSigBlob = buildSigPS(
      TalerSignaturePurpose.WALLET_ACCOUNT_MERGE,
    )
      .put(timestampRoundedToBuffer(req.purseExpiration))
      .put(amountToBuffer(Amounts.parseOrThrow(req.purseAmount)))
      .put(amountToBuffer(Amounts.parseOrThrow(req.purseFee)))
      .put(decodeCrock(req.contractTermsHash))
      .put(decodeCrock(req.pursePub))
      .put(timestampRoundedToBuffer(req.mergeTimestamp))
      // FIXME: put in min_age
      .put(bufferForUint32(0))
      .put(bufferForUint32(req.flags))
      .build();

    logger.info(
      `signing WALLET_ACCOUNT_MERGE over ${encodeCrock(reserveSigBlob)}`,
    );

    const reserveSigResp = await tci.eddsaSign(tci, {
      msg: encodeCrock(reserveSigBlob),
      priv: req.reservePriv,
    });

    const mergePub = encodeCrock(eddsaGetPublic(decodeCrock(req.mergePriv)));

    const purseSigBlob = buildSigPS(TalerSignaturePurpose.WALLET_PURSE_CREATE)
      .put(timestampRoundedToBuffer(req.purseExpiration))
      .put(amountToBuffer(Amounts.parseOrThrow(req.purseAmount)))
      .put(decodeCrock(req.contractTermsHash))
      .put(decodeCrock(mergePub))
      // FIXME: add age!
      .put(bufferForUint32(0))
      .build();

    const purseSigResp = await tci.eddsaSign(tci, {
      msg: encodeCrock(purseSigBlob),
      priv: req.pursePriv,
    });

    return {
      mergeSig: mergeSigResp.sig,
      accountSig: reserveSigResp.sig,
      purseSig: purseSigResp.sig,
    };
  },
};

function amountToBuffer(amount: AmountJson): Uint8Array {
  const buffer = new ArrayBuffer(8 + 4 + 12);
  const dvbuf = new DataView(buffer);
  const u8buf = new Uint8Array(buffer);
  const curr = stringToBytes(amount.currency);
  if (typeof dvbuf.setBigUint64 !== "undefined") {
    dvbuf.setBigUint64(0, BigInt(amount.value));
  } else {
    const arr = bigint(amount.value).toArray(2 ** 8).value;
    let offset = 8 - arr.length;
    for (let i = 0; i < arr.length; i++) {
      dvbuf.setUint8(offset++, arr[i]);
    }
  }
  dvbuf.setUint32(8, amount.fraction);
  u8buf.set(curr, 8 + 4);

  return u8buf;
}

function timestampRoundedToBuffer(ts: TalerProtocolTimestamp): Uint8Array {
  const b = new ArrayBuffer(8);
  const v = new DataView(b);
  // The buffer we sign over represents the timestamp in microseconds.
  if (typeof v.setBigUint64 !== "undefined") {
    const s = BigInt(ts.t_s) * BigInt(1000 * 1000);
    v.setBigUint64(0, s);
  } else {
    const s =
      ts.t_s === "never" ? bigint.zero : bigint(ts.t_s).multiply(1000 * 1000);
    const arr = s.toArray(2 ** 8).value;
    let offset = 8 - arr.length;
    for (let i = 0; i < arr.length; i++) {
      v.setUint8(offset++, arr[i]);
    }
  }
  return new Uint8Array(b);
}

function durationRoundedToBuffer(ts: TalerProtocolDuration): Uint8Array {
  const b = new ArrayBuffer(8);
  const v = new DataView(b);
  // The buffer we sign over represents the timestamp in microseconds.
  if (typeof v.setBigUint64 !== "undefined") {
    const s = BigInt(ts.d_us);
    v.setBigUint64(0, s);
  } else {
    const s = ts.d_us === "forever" ? bigint.zero : bigint(ts.d_us);
    const arr = s.toArray(2 ** 8).value;
    let offset = 8 - arr.length;
    for (let i = 0; i < arr.length; i++) {
      v.setUint8(offset++, arr[i]);
    }
  }
  return new Uint8Array(b);
}

export interface EddsaSignRequest {
  msg: string;
  priv: string;
}

export interface EddsaSignResponse {
  sig: string;
}

export const nativeCrypto: TalerCryptoInterface = Object.fromEntries(
  Object.keys(nativeCryptoR).map((name) => {
    return [
      name,
      (req: any) =>
        nativeCryptoR[name as keyof TalerCryptoInterfaceR](nativeCryptoR, req),
    ];
  }),
) as any;
