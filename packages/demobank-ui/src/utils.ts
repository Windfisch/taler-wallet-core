
/**
 * Validate (the number part of) an amount.  If needed,
 * replace comma with a dot.  Returns 'false' whenever
 * the input is invalid, the valid amount otherwise.
 */
export function validateAmount(maybeAmount: string): any {
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
      return false;
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

export function getBankBackendBaseUrl(): string {
  const overrideUrl = localStorage.getItem("bank-base-url");
  if (overrideUrl) {
    console.log(
      `using bank base URL ${overrideUrl} (override via bank-base-url localStorage)`,
    );
    return overrideUrl;
  }
  const maybeRootPath = "https://bank.demo.taler.net/demobanks/default/";
  if (!maybeRootPath.endsWith("/")) return `${maybeRootPath}/`;
  console.log(`using bank base URL (${maybeRootPath})`);
  return maybeRootPath;
}
