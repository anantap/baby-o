# Opzetborstel Vergelijker

Statische prijsvergelijker voor opzetborstels van elektrische tandenborstels (Oral-B,
Philips Sonicare, Jordan, en compatible/huismerk-varianten) voor de Nederlandse markt. De
kernfunctie is **prijs per kop**: de listingprijs gedeeld door het aantal opzetborstels in de
verpakking, zodat een 8-pack en een los exemplaar eerlijk vergeleken kunnen worden.

Gebouwd met Astro (`output: 'static'`) + TypeScript. Geen server, geen database, geen
accounts. Data komt uitsluitend uit affiliate-productfeeds (geen scraping).

## Snel starten

```bash
npm install
npm run build:data   # leest de sample-feeds (of echte feeds, zie SETUP.md) -> src/data/*.json
npm run dev           # http://localhost:4321
```

```bash
npm test              # vitest: packSize-extractie, prijs-per-kop, matching
npm run build          # build:data + astro build -> dist/
```

Zonder enige credentials draait dit volledig tegen de meegeleverde sample-data in
`data/sample/*.csv` (~50 Bol-listings, ~35 drogist-listings, met overlappende EAN's zodat
"goedkoopste winkel per product" zichtbaar is op de detailpagina's).

## Architectuur

```
src/
  adapters/        bron-specifieke mapping naar het Product-type (zie hieronder)
    bol.ts            Bol.com affiliate-feed (CSV, sample of echte feed/API)
    affiliate-feed.ts generieke config-gedreven adapter voor TradeTracker/Daisycon/Awin-feeds
                       (Kruidvat, Etos, deonlinedrogist, ...). Nieuwe winkel = config-entry.
    amazon.ts          STUB voor Amazon PA-API 5.0, NIET actief tot ingeschakeld
    index.ts           ACTIVE_ADAPTERS-registry: welke bronnen meedoen in de build
  lib/
    types.ts          Product, ProductGroup, SourceAdapter, RawRow
    parse.ts          packSize-extractie, prijs-per-kop, normalisatie, matching/groeperen
    csv.ts             kleine eigen CSV-parser (geen dependency nodig voor onze feeds)
  data/
    products.json      gegenereerd door scripts/build-data.ts, platte lijst van alle listings
    meta.json           aantallen + generated-timestamp
  pages/
    index.astro                alle opzetborstels, gesorteerd op prijs per kop
    merk/[brand]/index.astro    gefilterd op merk
    type/[fitType]/index.astro  gefilterd op fit-type (oral-b-click / sonicare-click / generic)
    product/[id]/index.astro    detail: alle winkels voor één product, goedkoopste uitgelicht
scripts/
  build-data.ts       adapters -> parser -> src/data/products.json + meta.json
data/sample/          sample-CSV's waarmee de site zonder credentials draait
```

### Eén bron toevoegen

- **Drogist/affiliate-netwerk-feed (CSV)**: voeg een entry toe aan `FEED_CONFIGS` in
  `src/adapters/affiliate-feed.ts` met de kolomnamen van die feed. Geen nieuwe code nodig.
- **Heel andere bron** (andere API, ander formaat): maak een nieuw bestand in `src/adapters/`
  dat `SourceAdapter` implementeert en voeg het toe aan `ACTIVE_ADAPTERS` in
  `src/adapters/index.ts`.

Elke adapter is de enige plek die het bron-specifieke formaat kent. De rest van de app
(parser, pagina's) werkt uitsluitend met het genormaliseerde `Product`-type.

### Parser (`src/lib/parse.ts`)

- `extractPackSize` haalt het aantal opzetborstels uit rommelige titels: "8 stuks", "8-pack",
  "(x8)", "4 + 4", "set van 6", etc. Kan het niet bepalen? Dan `packSize = null`, het product
  wordt gevlagd (`flaggedUnknownPackSize`) en uitgesloten van de prijs-per-kop-ranking — er
  wordt nooit gegokt.
- `buildMatchKey` matcht producten over winkels heen op EAN (indien aanwezig), anders op
  genormaliseerd merk + lijn + packSize.
- `groupProducts` groepeert listings per matchKey en bepaalt de goedkoopste op `pricePerHead`
  voor de detailpagina.

Zie `src/lib/parse.test.ts` voor de testcases (vitest).

## Databron-refresh: twee opties

Beide regenereren `src/data/products.json` + `meta.json` en pushen de wijziging; Cloudflare
Pages deployt automatisch bij elke push naar de main-branch.

1. **GitHub Actions cron** (`.github/workflows/refresh-data.yml`) — draait dagelijks, leest
   secrets uit de repo-settings. Werkt prima voor de Bol Marketing API (OAuth) en voor
   HTTP-feeds van affiliate-netwerken. **Werkt niet** voor de Bol FTP-feed als die
   IP-whitelisting vereist (GitHub-runners hebben geen vast IP).
2. **Lokale cron/systemd-timer** (`deploy/systemd/opzetborstel-refresh.{service,timer}`) —
   draait op een machine met een vast IP, bv. een thuis-PC-Stick. Voorkeur als je de Bol
   FTP-feed gebruikt.

Zie `SETUP.md` voor de exacte stappen om dit morgen met echte credentials aan te zetten.

## Affiliate-links

Affiliate-deeplinks krijgen hun partner-/site-id uit env-vars (`BOL_SITE_ID`,
`FEED_<SHOP>_SUBID`, `AMAZON_PARTNER_TAG`). Ontbreekt een var, dan verschijnt een duidelijke
placeholder (`__BOL_SITE_ID_NIET_INGESTELD__`) in de link in plaats van een stille fout.
Credentials staan nooit hardcoded in code; zie `.env.example`.
