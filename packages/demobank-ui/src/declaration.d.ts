declare module "*.css" {
  const mapping: Record<string, string>;
  export default mapping;
}
declare module "*.svg" {
  const content: any;
  export default content;
}
declare module "*.jpeg" {
  const content: any;
  export default content;
}
declare module "*.png" {
  const content: any;
  export default content;
}
declare module "jed" {
  const x: any;
  export = x;
}

/**********************************************
 * Type definitions for states and API calls. *
 *********************************************/

/**
 * Request body of POST /transactions.
 *
 * If the amount appears twice: both as a Payto parameter and
 * in the JSON dedicate field, the one on the Payto URI takes
 * precedence.
 */
interface TransactionRequestType {
  paytoUri: string;
  amount?: string; // with currency.
}

/**
 * Request body of /register.
 */
interface CredentialsRequestType {
  username?: string;
  password?: string;
  repeatPassword?: string;
}

/**
 * Request body of /register.
 */
// interface LoginRequestType {
//   username: string;
//   password: string;
// }

interface WireTransferRequestType {
  iban?: string;
  subject?: string;
  amount?: string;
}
