import { AmountString, j2s, Logger } from "@gnu-taler/taler-util";
import { AuthMethod, Policy, PolicyProvider } from "./reducer-types.js";

const logger = new Logger("anastasis-core:policy-suggestion.ts");

/**
 * Provider information used during provider/method mapping.
 */
export interface ProviderInfo {
  url: string;
  methodCost: Record<string, AmountString>;
}

export function suggestPolicies(
  methods: AuthMethod[],
  providers: ProviderInfo[],
): PolicySelectionResult {
  const numMethods = methods.length;
  if (numMethods === 0) {
    throw Error("no methods");
  }
  let numSel: number;
  if (numMethods <= 2) {
    numSel = numMethods;
  } else if (numMethods <= 4) {
    numSel = numMethods - 1;
  } else if (numMethods <= 6) {
    numSel = numMethods - 2;
  } else if (numMethods == 7) {
    numSel = numMethods - 3;
  } else {
    numSel = 4;
  }
  const policies: Policy[] = [];
  const selections = enumerateMethodSelections(numSel, numMethods);
  logger.info(`selections: ${j2s(selections)}`);
  for (const sel of selections) {
    const p = assignProviders(policies, methods, providers, sel);
    if (p) {
      policies.push(p);
    }
  }
  return {
    policies,
    policy_providers: providers.map((x) => ({
      provider_url: x.url,
    })),
  };
}

/**
 * Assign providers to a method selection.
 *
 * The evaluation of the assignment is made with respect to
 * previously generated policies.
 */
function assignProviders(
  existingPolicies: Policy[],
  methods: AuthMethod[],
  providers: ProviderInfo[],
  methodSelection: number[],
): Policy | undefined {
  const providerSelections = enumerateProviderMappings(
    methodSelection.length,
    providers.length,
  );

  let bestProvSel: ProviderSelection | undefined;
  let bestDiversity = 0;

  for (const provSel of providerSelections) {
    // First, check if selection is even possible with the methods offered
    let possible = true;
    for (const methIndex in provSel) {
      const provIndex = provSel[methIndex];
      const meth = methods[methIndex];
      const prov = providers[provIndex];
      if (!prov.methodCost[meth.type]) {
        possible = false;
        break;
      }
    }
    if (!possible) {
      continue;
    }

    // Evaluate diversity, always prefer policies
    // that increase diversity.
    const providerSet = new Set<string>();
    for (const pol of existingPolicies) {
      for (const m of pol.methods) {
        providerSet.add(m.provider);
      }
    }
    for (const provIndex of provSel) {
      const prov = providers[provIndex];
      providerSet.add(prov.url);
    }

    const diversity = providerSet.size;
    if (!bestProvSel || diversity > bestDiversity) {
      bestProvSel = provSel;
      bestDiversity = diversity;
    }
    // TODO: also evaluate costs and duplicates (same challenge at same provider)
  }

  if (!bestProvSel) {
    return undefined;
  }

  return {
    methods: bestProvSel.map((x, i) => ({
      authentication_method: methodSelection[i],
      provider: providers[x].url,
    })),
  };
}

type ProviderSelection = number[];

/**
 * Compute provider mappings.
 * Enumerates all n-combinations with repetition of m providers.
 */
function enumerateProviderMappings(n: number, m: number): ProviderSelection[] {
  const selections: ProviderSelection[] = [];
  const a = new Array(n);
  const sel = (i: number, start: number = 0) => {
    if (i === n) {
      selections.push([...a]);
      return;
    }
    for (let j = start; j < m; j++) {
      a[i] = j;
      sel(i + 1, j);
    }
  };
  sel(0);
  return selections;
}

interface PolicySelectionResult {
  policies: Policy[];
  policy_providers: PolicyProvider[];
}

type MethodSelection = number[];

/**
 * Compute method selections.
 * Enumerates all n-combinations without repetition of m methods.
 */
function enumerateMethodSelections(n: number, m: number): MethodSelection[] {
  const selections: MethodSelection[] = [];
  const a = new Array(n);
  const sel = (i: number, start: number = 0) => {
    if (i === n) {
      selections.push([...a]);
      return;
    }
    for (let j = start; j < m; j++) {
      a[i] = j;
      sel(i + 1, j + 1);
    }
  };
  sel(0);
  return selections;
}
