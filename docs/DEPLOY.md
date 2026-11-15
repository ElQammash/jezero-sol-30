# Deploying Jezero: Sol 30

## Build

```bash
npm ci
npm test
npm run build
```

`dist/` contains the whole site:
- the game (`index.html`, `assets/`)
- the real terrain (`terrain/`), the NASA model (`models/`) and audio (`audio/`)
- the offline service worker (`sw.js`) and app manifest
- `.htaccess` (HTTPS redirect, caching)
- `api/` (PHP cloud save)

## Upload to Hostinger (hPanel)
1. Zip the **contents** of `dist`, including the hidden `.htaccess` files:
   ```bash
   cd dist; tar -a -cf ../site.zip * .htaccess; cd ..
   ```
   Do not use PowerShell `Compress-Archive`. It writes `\` in paths, which breaks extraction on Linux servers.
2. In hPanel, go to **Websites → File Manager → public_html**, upload `site.zip`, and **Extract** it there.
3. **Security → SSL** must be active. Installing the game and playing offline both need HTTPS.

## Cloud save
- No setup is needed. The API creates an SQLite database in a `jezero-data/` folder next to `public_html`, so it is never served and survives redeploys.
- **To use MySQL instead:** copy `api/config.example.php` to `api/config.local.php` on the server and fill in the database details.
- **Check it:** `https://<domain>/api/save.php` should answer `{"error":"Not logged in"}`.

## Rebuilding the real terrain (optional)
```bash
npx tsx scripts/terrain.ts
```
This reads the HiRISE and CTX Cloud-Optimized GeoTIFFs from the USGS servers. Only the window around the landing site is downloaded.

## Checks
```bash
npm run paths            # balance report
node scripts/playtest.mjs http://localhost:5173 BBACAA ar   # full play-through in headless Chrome (dev server)
```
