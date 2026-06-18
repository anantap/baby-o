# NOTES — aannames, beslissingen, dubbelchecken

Gebouwd autonoom, 's nachts, zonder credentials. Hier staat alles wat ik heb aangenomen of
besloten, zodat je het morgen kunt verifiëren.

## Bol.com feed-schema (belangrijkste aanname)

Ik heb geprobeerd de officiële Bol affiliate-documentatie te fetchen
(`api.bol.com/marketing/docs/v1/`, `partnerprogramma.bol.com/affiliate/marketing-api`) — beide
gaven **403 Forbidden** zonder authenticatie. Ik kon het echte feed-schema dus niet bevestigen.

`src/adapters/bol.ts` is geschreven tegen een **aangenomen** CSV-schema:
`ean, title, brand, price, productUrl, imageUrl, category`. Elke regel die hierop steunt heeft
een `// TODO: bevestig tegen echte Bol-feed`-comment. Dingen die zeker anders kunnen zijn in de
echte feed:
- Kolomnamen kunnen Nederlands zijn in plaats van Engels, of anders gecapitaliseerd.
- De affiliate-tracking-parameter is aangenomen als `site_id=...` in de query-string; Bol's
  echte linkshare-mechanisme kan een ander formaat gebruiken (bv. een apart
  link-generatie-endpoint in plaats van een query-param).
- FTP vs. API: ik weet niet welke je gaat gebruiken. De adapter doet nu een lokale file-read
  van de sample-CSV; bij FTP moet je een download-stap toevoegen, bij de API een
  OAuth-client-credentials-call + JSON-parsing in plaats van CSV.
- EAN-veldnaam, encoding (UTF-8 vs Latin-1) en scheidingsteken (comma vs semicolon, gangbaar in
  NL-feeds) zijn aannames.

**Actie voor jou**: zodra je een echte feed-sample of API-response hebt, vergelijk die met de
TODO's in `src/adapters/bol.ts` en pas de mapping aan.

## Drogist/affiliate-netwerk-feeds

Ook hier aangenomen kolomnamen (`product_name`, `price`, `ean13`, `merk`, `deeplink`,
`image_url` voor de Kruidvat-sample-config) — gemarkeerd met TODO's in
`src/adapters/affiliate-feed.ts`. De tracking-parameter is aangenomen als `subid=...`; dit
verschilt per netwerk (TradeTracker/Daisycon/Awin gebruiken soms `clickref` of een ander
mechanisme). Dit is bewust **config-gedreven** opgezet: één nieuwe drogist toevoegen is één
entry in `FEED_CONFIGS`, geen nieuwe code — dus het risico van een verkeerde aanname is laag
qua impact (je past alleen die config aan, niet de adapter-logica).

## Amazon

Niet actief in de registry. PA-API 5.0 vereist 3+ kwalificerende verkopen binnen 180 dagen
voor toegang — dat heb je vrijwel zeker nog niet. De adapter is wel volledig uitgewerkt tegen
sample-data zodat je 'm alleen hoeft te activeren (1 import + 1 regel in
`src/adapters/index.ts`) zodra je toegang hebt.

## Parser-beslissingen

- **packSize-extractie is conservatief**: kan ik het aantal niet met een herkend patroon
  bepalen, dan wordt het product gevlagd en **uitgesloten** van de prijs-per-kop-ranking in
  plaats van een gok te doen. Dit raakt 2 van de 5 drogist-only sample-listings expres (titels
  als "voordeelverpakking" zonder aantal) — controleer of dit in de praktijk vaak genoeg
  voorkomt om een aanvullend patroon te rechtvaardigen, of dat het zo moet blijven.
- **Matching over winkels**: EAN heeft voorrang; zonder EAN val ik terug op
  merk+lijn+packSize. Dit betekent dat twee identieke producten zonder EAN én zonder
  herkende "lijn" (bv. een titel die geen van de bekende lijnnamen in
  `extractLine()`/`bol.ts` bevat) NIET gematcht worden, ook al zijn ze in werkelijkheid
  hetzelfde product. Controleer dit als er veel listings zonder EAN binnenkomen.
- **OEM-detectie** is keyword-gebaseerd op de titel ("geschikt voor", "compatible",
  "vervangende", "huismerk", "alternatief voor", "universeel"). Een merkproduct waarvan de
  titel toevallig zo'n woord bevat (onwaarschijnlijk, maar mogelijk) zou ten onrechte als
  compatible gemarkeerd worden.
- **Brand-normalisatie** kent alleen Oral-B, Philips/Sonicare en Jordan aliassen. Nieuwe merken
  komen door als hun ruwe naam — voeg toe aan `BRAND_ALIASES` in `src/lib/parse.ts` indien
  nodig.

## Sample-data

`data/sample/bol-sample.csv` (50 rijen) en `data/sample/drogist-sample.csv` (35 rijen) zijn
gegenereerd met `scripts/gen-sample-data.mjs` (eenmalig hulpscript, niet onderdeel van de
build-pipeline — mag verwijderd worden of opnieuw gedraaid worden om nieuwe sample-data te
maken). EAN's zijn fictieve, plausibele 13-cijferige nummers (geen geldige EAN-13-checksum,
puur voor matching-doeleinden in deze sample). Een groot deel van de drogist-rijen deelt een
EAN met een Bol-rij maar heeft een andere prijs, specifiek om de "goedkoopste winkel per
product"-vergelijking op de detailpagina's te demonstreren.

## UI/UX

UI is bewust kaal gehouden (platte CSS, system-font stack, geen framework) zoals gevraagd — jij
ontwerpt dit later zelf. De sorteer-toggle op de homepage is een klein inline `<script>` dat
DOM-rijen omdraait (geen tweede serverside route, geen state-management-library).

## Wat ik NIET heb gebouwd (bewust, buiten scope)

- Geen blog, nieuwsbrief, cookiebanner, login/accounts — expliciet uitgesloten in de opdracht.
- Geen web scraping — alleen adapters tegen feeds/API's.
- Geen UI-framework (React/Vue/etc.) — platte Astro + vanilla script.

## Te dubbelchecken vóór live gebruik

1. `src/adapters/bol.ts` tegen een echte Bol-feed of API-response.
2. `src/adapters/affiliate-feed.ts` `FEED_CONFIGS`-kolommen tegen de echte Kruidvat/Etos-feed.
3. De affiliate-trackingparameter-aannames (`site_id`, `subid`) tegen de daadwerkelijke
   linkshare-mechanismen van Bol en het gekozen affiliate-netwerk.
4. Of de OEM-keyword-lijst en de bekende-lijnnamen-lijst (`extractLine` in `bol.ts`) volledig
   genoeg zijn voor de echte productcatalogus.
