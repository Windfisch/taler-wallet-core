export interface BankUiSettings {
  allowRegistrations: boolean;
  showDemoNav: boolean;
  bankName: string;
  demoSites: [string, string][];
}

/**
 * Global settings for the demobank UI.
 */
const defaultSettings: BankUiSettings = {
  allowRegistrations: true,
  bankName: "Taler Bank",
  showDemoNav: true,
  demoSites: [
    ["Landing", "https://demo.taler.net/"],
    ["Bank", "https://bank.demo.taler.net/"],
    ["Essay Shop", "https://shop.demo.taler.net/"],
    ["Donations", "https://donations.demo.taler.net/"],
    ["Survey", "https://survey.demo.taler.net/"],
  ],
};

export const bankUiSettings: BankUiSettings =
  "talerDemobankSettings" in globalThis
    ? (globalThis as any).talerDemobankSettings
    : defaultSettings;
