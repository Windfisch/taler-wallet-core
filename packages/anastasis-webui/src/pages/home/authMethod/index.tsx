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
import { AuthMethod } from "@gnu-taler/anastasis-core";
import { h, VNode } from "preact";
import postalIcon from "../../../assets/icons/auth_method/postal.svg";
import questionIcon from "../../../assets/icons/auth_method/question.svg";
import smsIcon from "../../../assets/icons/auth_method/sms.svg";
import { AuthMethodEmailSetup as EmailSetup } from "./AuthMethodEmailSetup.js";
import { AuthMethodEmailSolve as EmailSolve } from "./AuthMethodEmailSolve.js";
import { AuthMethodIbanSetup as IbanSetup } from "./AuthMethodIbanSetup.js";
import { AuthMethodIbanSolve as IbanSolve } from "./AuthMethodIbanSolve.js";
import { AuthMethodPostSetup as PostalSetup } from "./AuthMethodPostSetup.js";
import { AuthMethodPostSolve as PostalSolve } from "./AuthMethodPostSolve.js";
import { AuthMethodQuestionSetup as QuestionSetup } from "./AuthMethodQuestionSetup.js";
import { AuthMethodQuestionSolve as QuestionSolve } from "./AuthMethodQuestionSolve.js";
import { AuthMethodSmsSetup as SmsSetup } from "./AuthMethodSmsSetup.js";
import { AuthMethodSmsSolve as SmsSolve } from "./AuthMethodSmsSolve.js";
import { AuthMethodTotpSetup as TotpSetup } from "./AuthMethodTotpSetup.js";
import { AuthMethodTotpSolve as TotpSolve } from "./AuthMethodTotpSolve.js";

export type AuthMethodWithRemove = AuthMethod & { remove: () => void };

export interface AuthMethodSetupProps {
  method: string;
  addAuthMethod: (x: any) => void;
  configured: AuthMethodWithRemove[];
  cancel: () => void;
}

export interface AuthMethodSolveProps {
  id: string;
}

interface AuthMethodConfiguration {
  icon: VNode;
  label: string;
  setup: (props: AuthMethodSetupProps) => VNode;
  solve: (props: AuthMethodSolveProps) => VNode;
  skip?: boolean;
}

const ALL_METHODS = [
  "sms",
  "email",
  "post",
  "question",
  "totp",
  "iban",
] as const;
export type KnownAuthMethods = typeof ALL_METHODS[number];
export function isKnownAuthMethods(value: string): value is KnownAuthMethods {
  return ALL_METHODS.includes(value as KnownAuthMethods);
}

type KnowMethodConfig = {
  [name in KnownAuthMethods]: AuthMethodConfiguration;
};

export const authMethods: KnowMethodConfig = {
  question: {
    icon: <img src={questionIcon} />,
    label: "Question",
    setup: QuestionSetup,
    solve: QuestionSolve,
  },
  sms: {
    icon: <img src={smsIcon} />,
    label: "SMS",
    setup: SmsSetup,
    solve: SmsSolve,
  },
  email: {
    icon: <i class="mdi mdi-email" />,
    label: "Email",
    setup: EmailSetup,
    solve: EmailSolve,
  },
  iban: {
    icon: <i class="mdi mdi-bank" />,
    label: "IBAN",
    setup: IbanSetup,
    solve: IbanSolve,
  },
  post: {
    icon: <img src={postalIcon} />,
    label: "Physical mail",
    setup: PostalSetup,
    solve: PostalSolve,
  },
  totp: {
    icon: <i class="mdi mdi-devices" />,
    label: "TOTP",
    setup: TotpSetup,
    solve: TotpSolve,
  },
};
