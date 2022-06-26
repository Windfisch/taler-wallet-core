/*
 This file is part of GNU Anastasis
 (C) 2021-2022 Anastasis SARL

 GNU Anastasis is free software; you can redistribute it and/or modify it under the
 terms of the GNU Affero General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Anastasis is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License along with
 GNU Anastasis; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

/**
 * Imports.
 */
import { AmountString, HttpStatusCode } from "@gnu-taler/taler-util";

export enum ChallengeFeedbackStatus {
  Solved = "solved",
  CodeInFile = "code-in-file",
  CodeSent = "code-sent",
  ServerFailure = "server-failure",
  TruthUnknown = "truth-unknown",
  TalerPayment = "taler-payment",
  Unsupported = "unsupported",
  RateLimitExceeded = "rate-limit-exceeded",
  IbanInstructions = "iban-instructions",
  IncorrectAnswer = "incorrect-answer",
}

export type ChallengeFeedback =
  | ChallengeFeedbackSolved
  | ChallengeFeedbackCodeInFile
  | ChallengeFeedbackCodeSent
  | ChallengeFeedbackIncorrectAnswer
  | ChallengeFeedbackTalerPaymentRequired
  | ChallengeFeedbackServerFailure
  | ChallengeFeedbackRateLimitExceeded
  | ChallengeFeedbackTruthUnknown
  | ChallengeFeedbackUnsupported
  | ChallengeFeedbackBankTransferRequired;

/**
 * Challenge has been solved and the key share has
 * been retrieved.
 */
export interface ChallengeFeedbackSolved {
  state: ChallengeFeedbackStatus.Solved;
}

export interface ChallengeFeedbackIncorrectAnswer {
  state: ChallengeFeedbackStatus.IncorrectAnswer;
}

export interface ChallengeFeedbackCodeInFile {
  state: ChallengeFeedbackStatus.CodeInFile;
  filename: string;
  display_hint: string;
}

export interface ChallengeFeedbackCodeSent {
  state: ChallengeFeedbackStatus.CodeSent;
  display_hint: string;
  address_hint: string;
}

/**
 * The challenge given by the server is unsupported
 * by the current anastasis client.
 */
export interface ChallengeFeedbackUnsupported {
  state: ChallengeFeedbackStatus.Unsupported;

  /**
   * Human-readable identifier of the unsupported method.
   */
  unsupported_method: string;
}

/**
 * The user tried to answer too often with a wrong answer.
 */
export interface ChallengeFeedbackRateLimitExceeded {
  state: ChallengeFeedbackStatus.RateLimitExceeded;
}

/**
 * Instructions for performing authentication via an
 * IBAN bank transfer.
 */
export interface ChallengeFeedbackBankTransferRequired {
  state: ChallengeFeedbackStatus.IbanInstructions;

  /**
   * Amount that should be transferred for a successful authentication.
   */
  challenge_amount: AmountString;

  /**
   * Account that should be credited.
   */
  target_iban: string;

  /**
   * Creditor name.
   */
  target_business_name: string;

  /**
   * Unstructured remittance information that should
   * be contained in the bank transfer.
   */
  wire_transfer_subject: string;

  answer_code: number;
}

/**
 * The server experienced a temporary failure.
 */
export interface ChallengeFeedbackServerFailure {
  state: ChallengeFeedbackStatus.ServerFailure;
  http_status: HttpStatusCode | 0;

  /**
   * Taler-style error response, if available.
   */
  error_response?: any;
}

/**
 * The truth is unknown to the provider.  There
 * is no reason to continue trying to solve any
 * challenges in the policy.
 */
export interface ChallengeFeedbackTruthUnknown {
  state: ChallengeFeedbackStatus.TruthUnknown;
}

/**
 * A payment is required before the user can
 * even attempt to solve the challenge.
 */
export interface ChallengeFeedbackTalerPaymentRequired {
  state: ChallengeFeedbackStatus.TalerPayment;

  taler_pay_uri: string;

  provider: string;

  /**
   * FIXME: Why is this required?!
   */
  payment_secret: string;
}
