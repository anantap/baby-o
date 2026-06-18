# SETUP — wat je morgen moet doen

Genummerde, copy-paste-vriendelijke stappen om van sample-data naar een live site met echte
affiliate-data te gaan.

## 1. Bol.com affiliate-account

1. Ga naar het Bol partnerprogramma en maak een account aan (vereist een geldig
   KvK-nummer/btw-nummer voor een zakelijk affiliate-account).
2. Vraag een **Site-ID** aan voor deze site binnen het partnerportaal. Dit is de waarde voor
   `BOL_SITE_ID`.
3. Vraag **API Client Credentials** aan (Client ID + Client Secret) voor de Bol
   Marketing/Catalog API. Dit zijn `BOL_CLIENT_ID` en `BOL_CLIENT_SECRET`.
4. **Als je in plaats van de API de FTP-productfeed wilt gebruiken**: vraag feed-toegang aan
   in het partnerportaal en laat het vaste IP-adres van de machine die de feed ophaalt
   whitelisten (dit kan dagen duren). Dit is de reden dat de FTP-route alleen praktisch is
   vanaf een machine met een vast IP (zie stap 6, optie B) — GitHub Actions-runners hebben
   wisselende IP's.
5. **Belangrijk om te bevestigen**: de adapter in `src/adapters/bol.ts` is geschreven tegen
   een AANGENOMEN kolomschema, omdat de Bol-documentatie tijdens deze build niet publiek
   bereikbaar was (403 Forbidden zonder authenticatie). Zodra je toegang hebt tot een echte
   feed-export of API-response: open `src/adapters/bol.ts`, zoek alle `// TODO: bevestig tegen
   echte Bol-feed`-comments, en pas de kolomnamen/parsing aan op het echte schema.

## 2. Drogist/affiliate-netwerk-feeds (Kruidvat, Etos, etc.)

1. Sluit je aan bij het affiliate-netwerk dat de drogist gebruikt (TradeTracker, Daisycon of
   Awin — check de website van de drogist, vaak onderaan bij "Partners" of "Affiliate").
2. Vraag de productfeed-URL op voor de relevante advertiser (bv. Kruidvat, Etos).
3. Zet de feed-URL in `.env` als `FEED_KRUIDVAT_URL=...` (en eventueel een tracking-token als
   `FEED_KRUIDVAT_SUBID=...`).
4. Open `src/adapters/affiliate-feed.ts`, zoek de `FEED_CONFIGS`-array, en pas de
   `columns`-mapping aan op de daadwerkelijke kolomnamen in de feed die je net hebt
   gedownload (elk netwerk/advertiser gebruikt andere namen — er staan
   `// TODO: bevestig tegen echte feed`-comments op de plekken die aandacht nodig hebben).
5. Voor elke extra drogist: voeg een nieuwe entry toe aan `FEED_CONFIGS` met dezelfde aanpak.

## 3. Amazon PA-API (optioneel, later)

1. Word Amazon Associate en wacht tot je minimaal 3 kwalificerende verkopen hebt binnen 180
   dagen — pas dan geeft Amazon PA-API 5.0-toegang.
2. Vraag dan `AMAZON_ACCESS_KEY`, `AMAZON_SECRET_KEY` en `AMAZON_PARTNER_TAG` aan en zet ze in
   `.env`.
3. Open `src/adapters/index.ts` en voeg `amazonAdapter` toe aan `ACTIVE_ADAPTERS` (importeer
   'm boven aan het bestand vanuit `./amazon`).
4. Vervang in `src/adapters/amazon.ts` de `SAMPLE_ROWS`-fetch door een echte gesigneerde
   PA-API-aanroep (GetItems/SearchItems).

## 4. Lokale `.env` invullen

1. `cp .env.example .env`
2. Vul de waarden in die je in stap 1-3 hebt verzameld. Lege velden zijn veilig — je krijgt
   dan een duidelijke `__VAR_NIET_INGESTELD__`-placeholder in de link in plaats van een
   kapotte of stille fout.

## 5. Sample-feed naar echte feed omzetten en opnieuw draaien

1. Zodra `src/adapters/bol.ts` en/of `src/adapters/affiliate-feed.ts` zijn aangepast om een
   echte feed-URL/API te lezen in plaats van de sample-CSV: run lokaal
   `npm run build:data` opnieuw. Check de console-output (aantal rijen per bron) en bekijk
   `src/data/meta.json` voor de nieuwe aantallen.
2. `npm run dev` om de site lokaal te bekijken met de echte data.
3. Als alles goed lijkt: commit `src/data/products.json` + `src/data/meta.json` en push.

## 6. Cloudflare Pages-project aanmaken

1. Log in op het Cloudflare-dashboard → **Workers & Pages** → **Create application** → **Pages**
   → **Connect to Git**.
2. Selecteer deze repository en de branch die je wilt deployen (bv. `main`).
3. Build-instellingen:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/` (standaard)
4. **Environment variables** (Pages-project → Settings → Environment variables), zet hier
   dezelfde vars als in `.env`: `BOL_SITE_ID`, `BOL_CLIENT_ID`, `BOL_CLIENT_SECRET`,
   `FEED_KRUIDVAT_URL`, `FEED_KRUIDVAT_SUBID`, en (later) de `AMAZON_*`-vars. Dit zorgt dat
   `npm run build` (dat `build:data` aanroept) tijdens de Cloudflare-build met de juiste
   credentials draait.
5. Klik **Save and Deploy**. Elke push naar de gekoppelde branch triggert vanaf nu automatisch
   een nieuwe build + deploy.

## 7. Periodieke refresh inschakelen (kies optie A of B)

### Optie A — GitHub Actions (aanbevolen als je geen FTP-feed met IP-whitelist gebruikt)

1. Ga naar de repo → **Settings → Secrets and variables → Actions → New repository secret**.
2. Voeg secrets toe met exact deze namen: `BOL_CLIENT_ID`, `BOL_CLIENT_SECRET`, `BOL_SITE_ID`,
   `FEED_KRUIDVAT_URL`, `FEED_KRUIDVAT_SUBID` (en later eventueel Amazon-vars als je die ook
   in de workflow wilt gebruiken — voeg ze dan ook toe aan
   `.github/workflows/refresh-data.yml`).
3. De workflow (`.github/workflows/refresh-data.yml`) draait dagelijks om 04:00 UTC en kan ook
   handmatig gestart worden via de Actions-tab ("Run workflow").
4. Zorg dat **Settings → Actions → General → Workflow permissions** op "Read and write
   permissions" staat, anders kan de workflow niet pushen.

### Optie B — Lokale cron/systemd-timer (nodig bij Bol FTP-feed met IP-whitelist)

1. Clone de repo op de machine met het whitelisted vaste IP (bv. je thuis-PC-Stick).
2. Zet daar een `.env` met de echte credentials (zelfde inhoud als hierboven).
3. Pas `deploy/systemd/opzetborstel-refresh.service` aan: vul `User=` en `WorkingDirectory=`
   in met de echte gebruiker en het pad waar je de repo hebt gecloned.
4. Installeer:
   ```bash
   sudo cp deploy/systemd/opzetborstel-refresh.service deploy/systemd/opzetborstel-refresh.timer /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable --now opzetborstel-refresh.timer
   ```
5. Zorg dat git op die machine kan pushen zonder interactieve prompt (SSH-key of een
   credential helper) — de service draait non-interactief.
6. Test handmatig: `sudo systemctl start opzetborstel-refresh.service` en check
   `journalctl -u opzetborstel-refresh.service` op fouten.

## 8. Checklist samengevat

- [ ] Bol Site-ID + Client ID/Secret aangevraagd, in `.env` en Cloudflare Pages env vars gezet
- [ ] `src/adapters/bol.ts` TODO's gecontroleerd tegen echte feed-schema
- [ ] Minstens één drogist-feed-URL aangevraagd, `FEED_CONFIGS` kolommen geverifieerd
- [ ] Cloudflare Pages-project aangemaakt, build command `npm run build`, output `dist`
- [ ] Refresh-pad gekozen (GitHub Actions secrets ÓF lokale systemd-timer) en getest
- [ ] `npm run build:data && npm run dev` lokaal gecheckt met echte data voordat je pusht
