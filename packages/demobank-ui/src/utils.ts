import { canonicalizeBaseUrl } from "@gnu-taler/taler-util";

/**
 * Validate (the number part of) an amount.  If needed,
 * replace comma with a dot.  Returns 'false' whenever
 * the input is invalid, the valid amount otherwise.
 */
export function validateAmount(maybeAmount: string | undefined): string | undefined {
  const amountRegex = "^[0-9]+(.[0-9]+)?$";
  if (!maybeAmount) {
    console.log(`Entered amount (${maybeAmount}) mismatched <input> pattern.`);
    return;
  }
  if (typeof maybeAmount !== "undefined" || maybeAmount !== "") {
    console.log(`Maybe valid amount: ${maybeAmount}`);
    // tolerating comma instead of point.
    const re = RegExp(amountRegex);
    if (!re.test(maybeAmount)) {
      console.log(`Not using invalid amount '${maybeAmount}'.`);
      return;
    }
  }
  return maybeAmount;
}

/**
 * Extract IBAN from a Payto URI.
 */
export function getIbanFromPayto(url: string): string {
  const pathSplit = new URL(url).pathname.split("/");
  let lastIndex = pathSplit.length - 1;
  // Happens if the path ends with "/".
  if (pathSplit[lastIndex] === "") lastIndex--;
  const iban = pathSplit[lastIndex];
  return iban;
}

const maybeRootPath = "https://bank.demo.taler.net/demobanks/default/";

export function getBankBackendBaseUrl(): string {
  const overrideUrl = localStorage.getItem("bank-base-url");
  if (overrideUrl) {
    console.log(
      `using bank base URL ${overrideUrl} (override via bank-base-url localStorage)`,
    );
  } else {
    console.log(`using bank base URL (${maybeRootPath})`);
  }
  return canonicalizeBaseUrl(overrideUrl ? overrideUrl : maybeRootPath)

}

export function undefinedIfEmpty<T extends object>(obj: T): T | undefined {
  return Object.keys(obj).some((k) => (obj as any)[k] !== undefined)
    ? obj
    : undefined;
}

/**
 * Craft headers with Authorization and Content-Type.
 */
export function prepareHeaders(username?: string, password?: string): Headers {
  const headers = new Headers();
  if (username && password) {
    headers.append(
      "Authorization",
      `Basic ${window.btoa(`${username}:${password}`)}`,
    );
  }
  headers.append("Content-Type", "application/json");
  return headers;
}
