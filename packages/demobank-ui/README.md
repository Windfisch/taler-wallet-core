# Taler Demobank UI

## CLI Commands

- `pnpm install`: Installs dependencies

- `pnpm run build`: Create a roduction-ready build under `dist/`.

- `pnpm run check`: Run type checker

- `pnpm run lint`: Pass TypeScript files using ESLint

## Testing

By default, the demobank-ui points to `https://bank.demo.taler.net/demobanks/default/`
as the bank access API base URL.

This can be changed for testing by setting the URL via local storage (via your browser's devtools):
```
localStorage.setItem("bank-base-url", OTHER_URL);
```
