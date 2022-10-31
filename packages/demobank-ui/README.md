# Taler Demobank UI

## CLI Commands

- `pnpm install`: Installs dependencies

- `pnpm run build`: Create a production-ready build under `dist/`.

- `pnpm run check`: Run type checker

- `pnpm run lint`: Pass TypeScript files using ESLint

## Testing

By default, the demobank-ui points to `https://bank.demo.taler.net/demobanks/default/`
as the bank access API base URL.

This can be changed for testing by setting the URL via local storage (via your browser's devtools):
```
localStorage.setItem("bank-base-url", OTHER_URL);
```

## Customizing Per-Deployment Settings

To customize per-deployment settings, make sure that the
`demobank-ui-settings.js` file is served alongside the UI.

This file is loaded before the SPA and can do customizations by
changing `globalThis.`.

For example, the following settings would correspond
to the default settings:

```
globalThis.talerDemobankSettings = {
  allowRegistrations: true,
  bankName: "Taler Bank",
  // Show explainer text and navbar to other demo sites
  showDemoNav: true,
  // Names and links for other demo sites to show in the navbar
  demoSites: [
    ["Landing", "https://demo.taler.net/"],
    ["Bank", "https://bank.demo.taler.net/"],
    ["Essay Shop", "https://shop.demo.taler.net/"],
    ["Donations", "https://donations.demo.taler.net/"],
    ["Survey", "https://donations.demo.taler.net/"],
  ],
};
```
