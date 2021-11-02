import { h, VNode } from "preact";
import { AuthMethodSetupProps } from "../AuthenticationEditorScreen";

import { AuthMethodEmailSetup as EmailScreen } from "./AuthMethodEmailSetup";
import { AuthMethodIbanSetup as IbanScreen } from "./AuthMethodIbanSetup";
import { AuthMethodPostSetup as PostalScreen } from "./AuthMethodPostSetup";
import { AuthMethodQuestionSetup as QuestionScreen } from "./AuthMethodQuestionSetup";
import { AuthMethodSmsSetup as SmsScreen } from "./AuthMethodSmsSetup";
import { AuthMethodTotpSetup as TotpScreen } from "./AuthMethodTotpSetup";
import { AuthMethodVideoSetup as VideScreen } from "./AuthMethodVideoSetup";
import postalIcon from '../../../assets/icons/auth_method/postal.svg';
import questionIcon from '../../../assets/icons/auth_method/question.svg';
import smsIcon from '../../../assets/icons/auth_method/sms.svg';
import videoIcon from '../../../assets/icons/auth_method/video.svg';

interface AuthMethodConfiguration {
  icon: VNode;
  label: string;
  screen: (props: AuthMethodSetupProps) => VNode;
}
export type KnownAuthMethods = "sms" | "email" | "post" | "question" | "video" | "totp" | "iban";

type KnowMethodConfig = {
  [name in KnownAuthMethods]: AuthMethodConfiguration;
};

export const authMethods: KnowMethodConfig = {
  question: {
    icon: <img src={questionIcon} />,
    label: "Question",
    screen: QuestionScreen
  },
  sms: {
    icon: <img src={smsIcon} />,
    label: "SMS",
    screen: SmsScreen
  },
  email: {
    icon: <i class="mdi mdi-email" />,
    label: "Email",
    screen: EmailScreen
    
  },
  iban: {
    icon: <i class="mdi mdi-bank" />,
    label: "IBAN",
    screen: IbanScreen
    
  },
  post: {
    icon: <img src={postalIcon} />,
    label: "Physical mail",
    screen: PostalScreen
    
  },
  totp: {
    icon: <i class="mdi mdi-devices" />,
    label: "TOTP",
    screen: TotpScreen
    
  },
  video: {
    icon: <img src={videoIcon} />,
    label: "Video",
    screen: VideScreen
    
  }
}