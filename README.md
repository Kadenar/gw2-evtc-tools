# GW2 EVTC Tools

A static Vite + React website for Guild Wars 2 EVTC/ZEVTC utilities.

It includes two browser-only tools:

1. **Trigger ID Rewriter**
   - Upload a `.evtc`, `.zevtc`, or zipped EVTC file.
   - Detect the current EVTC encounter/trigger id from the header.
   - Rewrite only the supported trigger-id pairs:
     - Gorseval `15429` -> Sabetha `15375`
     - Twisted Castle `16247` -> Xera `16246`
   - Download the modified file.
   - File rewriting is local in the browser; no backend is used.

2. **Raid Session Timer**
   - Paste one or more dps.report links, or upload EVTC/ZEVTC logs directly to dps.report.
   - Fetch report metadata from dps.report.
   - Render separate timing sections for Wings 1-8 plus the full session.
   - Compute:
     - elapsed time per wing
     - combat time per wing
     - downtime per wing
     - total elapsed session time
     - total combat time
   - Export CSV or JSON.

## Tech stack

- Vite 5
- React 18
- TypeScript 5
- fflate, for client-side zipped/compressed EVTC handling
- No backend
- Ready for GitHub Pages

## Requirements

Use Node 20 or newer. Node 22 is also fine.

Check your version:

```bash
node -v
```


## NPM registry note

This project includes a local `.npmrc` forcing installs to use the public npm registry:

```txt
registry=https://registry.npmjs.org/
```

There is intentionally no `package-lock.json` in the starter zip. Run `npm install` on your machine to create a fresh lockfile

## Run locally

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Open the URL Vite prints in your terminal, usually:

```txt
http://localhost:5175
```

## Build locally

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Deploy to GitHub Pages

This project includes a GitHub Actions workflow at:

```txt
.github/workflows/deploy.yml
```

### Steps

1. Create a new GitHub repository.
2. Push this project to the repository's `main` branch.
3. In GitHub, go to:

```txt
Settings → Pages
```

4. Set **Build and deployment** to **GitHub Actions**.
5. Push to `main`.
6. The workflow will build the app and deploy the `dist` folder to GitHub Pages.

The Vite config automatically sets the correct `base` path from `GITHUB_REPOSITORY` during GitHub Actions builds.

## Notes on dps.report

The Raid Session Timer uses these dps.report endpoints from the browser:

- `GET /getUploadMetadata?permalink=...`
- `POST /uploadContent?json=1&generator=ei`

The app uploads files sequentially. dps.report currently rate-limits `/uploadContent`, so very large batches may need to be retried if the server returns a rate-limit response.

## Notes on EVTC trigger rewriting

The rewriter detects likely boss id offsets in the first 32 bytes of the EVTC payload and defaults to the known encounter id it finds. Current EVTC headers normally store the trigger/encounter id near the beginning of the file, and the app exposes the detected offset in the advanced panel.

Because EVTC files are a third-party combat log format, verify modified logs with Elite Insights or dps.report before relying on them for anything important.

## Privacy model

- Trigger rewriting is local only. The uploaded file is read in your browser and downloaded back to you.
- Pasted dps.report links are sent to dps.report to fetch metadata.
- Direct log uploads are sent from your browser to dps.report.
- This project has no server, database, or analytics by default.
