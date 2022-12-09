/*
 This file is part of GNU Taler
 (C) 2022 Taler Systems S.A.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

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
