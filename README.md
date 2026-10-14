# Little House Flower: website

This repo is the **customer-facing website** only. GitHub Pages publishes the root of `main`:

- Website: https://mpc0367.github.io/Little-House-Flower/

The **Studio** (the staff app) and the **back-end source** live in their own repo since 14 October 2026:

- Studio: https://mpc0367.github.io/little-house-flower-studio/
- Repo: https://github.com/MPC0367/little-house-flower-studio

The old Studio address, `/Little-House-Flower/studio/`, forwards to the new one (`studio/index.html`).

This is a client demonstration. Orders, payments and customer details are synthetic. No real order, notification, payment or Google Sheet update is sent. The website opens without a password, and its `/api/` requests go through `pages-sw.js` to the hosted demo back end. Do not use it for real customer data.

## What is here

- The deployable website files at the root: `index.html`, `storefront.js`, the stylesheets, `img/`, `media/` and `shared/`.
- `pages-access.js` and `pages-sw.js`: the hand-kept loader and the API bridge. They are not generated.
- `tests/homepage-intro-reload.mjs`: checks that the opening film plays on every homepage load.

The website files are **generated** from the back-end repo (`hosted-backend/public/`) by its `scripts/build-github-pages.mjs`, which writes into this folder when the two repos sit side by side. Do not edit generated files here by hand. Change them in the back-end repo and rebuild.

## The opening film

`media/little-house-flower-loading-v5-1080p.mp4` (4.4 s) plays at its own speed on every homepage load. The opening closes when the film reaches its 100% frame (3.3 s), so a visit sees about 3.5 seconds of film. The still poster is used only if the film cannot start, and it also stays for at least three seconds. With "reduce motion" set on the device, there is no opening.

## Checks

`npm run preview` serves this folder at `http://127.0.0.1:5590/Little-House-Flower/`. Its service worker expects a local back end on port 5580; without one the pages still draw, but their data does not load. `npm run test:intro` needs `LHF_PLAYWRIGHT_MODULE` pointing to an installed Playwright.

## Publishing

GitHub Pages publishes the root of `main`. Test locally first; publish only with the owner's authorization. Deploy back-end changes before the matching website update. Never commit a password, environment file, customer export or database.

The previous Apps Script configuration in `sheet.json` and `google/Code.gs` is preserved without changes. This demo never reads or sends orders to that configuration. The earlier production notes are in `docs/legacy-production.md`.
