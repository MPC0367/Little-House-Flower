# Little House Flower

The upgraded storefront and bilingual Studio are published on the existing GitHub Pages site:

- Website: https://mpc0367.github.io/Little-House-Flower/
- Studio: https://mpc0367.github.io/Little-House-Flower/studio/

GitHub Pages serves the website files. The permanent hosted API handles automatic flower previews, shared sample orders, staff changes and images. Neither part depends on the owner's Mac being awake. The storefront and Studio open directly, with no password, account, or client-demo welcome screen.

This is a client demonstration. Orders, payments and customer details are synthetic. No real order, notification, payment or Google Sheet update is sent. The website, Studio and sample order records are intentionally accessible without passwords. Customer upload/receipt ownership still uses anonymous sessions; deployment file uploads retain separate operator credentials. Do not use this demo for real customer data.

## Included work

The storefront includes the supplied loading video on every homepage load and reload, readiness-aware playback with no Skip control, authentic shop photography, the made-to-order configurator and automatic image previews. Studio includes English/Thai controls, clickable orders, design details and requested dates, enlarged product images, calendar, earnings and settings.

- Root files: the deployable GitHub Pages build, including `studio/`, `img/`, `media/` and `shared/`.
- `pages-access.js`, `pages-sw.js`: immediate application startup and the project-scoped API bridge. The supplied loading animation remains the only opening screen. Anonymous customer session tokens are stored in IndexedDB; API responses are not cached.
- `hosted-backend/`: the complete tracked source for the cloud demo backend and its original frontend assets. Runtime secrets and private database/storage contents are excluded.
- `local-preview/`: the original local application and follow-up work, retained for development.
- `scripts/build-github-pages.mjs`: exports the frontend assets and adjusts all paths for `/Little-House-Flower/`.
- `tests/github-pages-smoke.mjs`: WebKit verification of access, customization, checkout, Studio and loading playback.

## Development and checks

Run `npm run build` to regenerate the deployed frontend from `hosted-backend/public/`. The startup/proxy files remain at the root. Run `npm run preview` for the static preview on `http://127.0.0.1:5590/Little-House-Flower/`; its service worker uses a separately started local backend at port5580. On GitHub it always uses the permanent hosted API.

The backend has its own build, migration and deployment workflow, documented in `hosted-backend/README.md`. Set `LHF_PUBLIC_PREVIEW=true` to enable the explicitly authorized open sample-data workspace. This flag is only honored when the database has its synthetic-data marker. The internal `DEMO_PASSWORD` secret is retained solely for deployment uploads; it is not required by website or Studio visitors. Never commit a password, environment file, customer export, database or hosting credential.

Browser verification accepts `LHF_TEST_URL` and `LHF_PLAYWRIGHT_MODULE` pointing to an installed Playwright module. It runs from fresh sessions without any password or authorization credentials. Run `npm run test:pages`. Node API/security tests are in `hosted-backend/tests/`.

## Publishing

GitHub Pages publishes the root of `main`. Test locally first; publish only with the owner's authorization. Backend changes must be deployed separately before the corresponding Pages update. Review `git diff --check` and confirm no private runtime files are staged.

The previous Apps Script configuration in `sheet.json` and `google/Code.gs` is preserved without changes. This demo never reads or sends orders to that configuration. The previous production documentation is retained in `docs/legacy-production.md` for a later, explicitly authorized production migration.
