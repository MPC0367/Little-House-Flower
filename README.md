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

The opening is the supplied film, `media/little-house-flower-loading-v5-1080p.mp4` (4.4 s, the same file as `little-house-flower-loading-v5-1080p.mp4` in the owner's handover folder). It plays on every homepage load and on the first page of a browser session, and the Studio opens with it too. The rules are in `shared/opening-film.js` (built from the back-end repo):

- It plays once, from its first frame, at its own speed. It is never held, slowed, sped up or looped, and it is never on screen longer than the film: the cover fades over the film's last, still 100% frame and is gone when the film ends.
- It is never replaced by a still picture. The page starts downloading the film before anything else loads, so it normally starts the moment the cover appears. Until it moves, the cover is plain paper in the film's own colour.
- If the film cannot start within 2 s (a slow network, a missing file) or stops moving, the cover closes and the page shows without an opening. A device that refuses to play video by itself (for example an iPhone in Low Power Mode) gets the page at once.
- With "reduce motion" set on the device, there is no opening and the film is not downloaded.

`npm run test:intro` holds these rules here; the back-end repo's `tests/opening-film.mjs` checks them in four browsers, for the Studio too.

## Checks

`npm run preview` serves this folder at `http://127.0.0.1:5590/Little-House-Flower/`. Its service worker expects a local back end on port 5580; without one the pages still draw, but their data does not load. `npm run test:intro` needs `LHF_PLAYWRIGHT_MODULE` pointing to an installed Playwright.

## Publishing

GitHub Pages publishes the root of `main`. Test locally first; publish only with the owner's authorization. Deploy back-end changes before the matching website update. Never commit a password, environment file, customer export or database.

The previous Apps Script configuration in `sheet.json` and `google/Code.gs` is preserved without changes. This demo never reads or sends orders to that configuration. The earlier production notes are in `docs/legacy-production.md`.
