# Little House Flower

The upgraded storefront and bilingual Studio are published on the existing GitHub Pages site:

- Website: https://mpc0367.github.io/Little-House-Flower/
- Studio: https://mpc0367.github.io/Little-House-Flower/studio/

GitHub Pages serves the website files. The permanent hosted demo API handles password checks, automatic flower previews, shared sample orders, staff changes and images. Neither part depends on the owner's Mac being awake. Visitors use the on-page demo password form; no ChatGPT account is needed. The same password unlocks Studio and can be changed under **Settings → Password protection**.

This is a client demonstration. Orders, payments and customer details are synthetic. No real order, notification, payment or Google Sheet update is sent. Static code and shop photographs in this public repository are public; demo API records and uploaded references require authenticated sessions. Do not use this demo for real customer data.

## Included work

The storefront includes the supplied loading video, readiness-aware playback with no Skip control, authentic shop photography, the made-to-order configurator and automatic image previews. Studio includes English/Thai controls, clickable orders, design details and requested dates, enlarged product images, calendar, earnings and password settings.

- Root files: the deployable GitHub Pages build, including `studio/`, `img/`, `media/` and `shared/`.
- `pages-access.js`, `pages-access.css`, `pages-sw.js`: password entry and the project-scoped API bridge. Only opaque expiring session tokens are stored in IndexedDB; passwords and API responses are not cached.
- `hosted-backend/`: the complete tracked source for the cloud demo backend and its original frontend assets. Runtime secrets and private database/storage contents are excluded.
- `local-preview/`: the original local application and follow-up work, retained for development.
- `scripts/build-github-pages.mjs`: exports the frontend assets and adjusts all paths for `/Little-House-Flower/`.
- `tests/github-pages-smoke.mjs`: WebKit verification of access, customization, checkout, Studio and loading playback.

## Development and checks

Run `npm run build` to regenerate the deployed frontend from `hosted-backend/public/`. The Pages access/proxy files remain at the root. Run `npm run preview` for the static preview on `http://127.0.0.1:5590/Little-House-Flower/`; its service worker uses a separately started local backend at port5580. On GitHub it always uses the permanent hosted API.

The backend has its own build, migration and deployment workflow, documented in `hosted-backend/README.md`. Configure its `DEMO_PASSWORD` as a secret runtime value. Never commit a password, environment file, customer export, database or hosting credential.

Browser verification accepts `LHF_TEST_URL`, `LHF_ENV_FILE` pointing to an ignored development password file, and `LHF_PLAYWRIGHT_MODULE` pointing to an installed Playwright module. Run `npm run test:pages`. Node API/security tests are in `hosted-backend/tests/`.

## Publishing

GitHub Pages publishes the root of `main`. Test locally first; publish only with the owner's authorization. Backend changes must be deployed separately before the corresponding Pages update. Review `git diff --check` and confirm no private runtime files are staged.

The previous Apps Script configuration in `sheet.json` and `google/Code.gs` is preserved without changes. This demo never reads or sends orders to that configuration. The previous production documentation is retained in `docs/legacy-production.md` for a later, explicitly authorized production migration.
