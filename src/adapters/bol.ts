import type { RawProduct, RawRow, SourceAdapter } from '../lib/types';
import { parseCsv } from '../lib/csv';
import { detectFitType, detectIsOEM, normalizeBrand } from '../lib/parse';
import { readFile } from 'node:fs/promises';

/**
 * Adapter voor de Bol.com affiliate productfeed.
 *
 * Bol levert affiliate-partners een productfeed via FTP (CSV/XML) of via de
 * Marketing/Catalog API met OAuth client-credentials. Pogingen om de officiele
 * Bol affiliate-documentatie (partnerprogramma.bol.com, api.bol.com) te fetchen
 * gaven een 403 (geen publieke toegang zonder auth). Daarom is de mapping hier
 * gebaseerd op het publiek bekende, gangbare Bol-feed-formaat (CSV met Engelse
 * kolomnamen, zoals te zien bij vergelijkbare affiliate-integraties). ELKE
 * kolomnaam hieronder is een aanname en moet bevestigd worden zodra er
 * toegang is tot de echte feed of API-respons.
 *
 * Verwachte CSV-kolommen (aanname):
 *   ean, title, brand, price, productUrl, imageUrl, category
 * // TODO: bevestig tegen echte Bol-feed (kolomnamen, encoding, scheidingsteken)
 */

const SAMPLE_FEED_PATH = new URL('../../data/sample/bol-sample.csv', import.meta.url);

function buildAffiliateUrl(productUrl: string): string {
  const siteId = process.env.BOL_SITE_ID;
  if (!siteId) {
    // Geen site-id geconfigureerd: duidelijke placeholder zodat dit niet stil faalt.
    return `${productUrl}${productUrl.includes('?') ? '&' : '?'}site_id=__BOL_SITE_ID_NIET_INGESTELD__`;
  }
  // TODO: bevestig tegen echte Bol-feed - exacte affiliate-tracking parameter
  // (Bol gebruikt doorgaans "Referrer" + "subid" via hun linkshare-systeem; dit
  // is een redelijke aanname voor een directe deeplink-parameter).
  return `${productUrl}${productUrl.includes('?') ? '&' : '?'}site_id=${encodeURIComponent(siteId)}`;
}

export const bolAdapter: SourceAdapter = {
  name: 'Bol.com',

  async fetch(): Promise<RawRow[]> {
    // Echte integratie zou hier de Bol FTP-feed downloaden of de Marketing
    // API aanroepen met BOL_CLIENT_ID/BOL_CLIENT_SECRET. Tot die credentials
    // er zijn, lezen we de sample-CSV zodat de pipeline end-to-end werkt.
    // TODO: bevestig tegen echte Bol-feed - vervang door FTP-download of API-call
    const text = await readFile(SAMPLE_FEED_PATH, 'utf-8');
    return parseCsv(text);
  },

  map(row: RawRow): RawProduct {
    const ean = String(row.ean ?? '').trim() || null;
    const title = String(row.title ?? '').trim();
    const brandRaw = String(row.brand ?? '').trim();
    const brand = normalizeBrand(brandRaw);
    const price = Number(row.price ?? 0);
    const productUrl = String(row.productUrl ?? '').trim();
    const imageUrl = String(row.imageUrl ?? '').trim() || null;

    return {
      ean,
      brand,
      line: extractLine(title, brand),
      title,
      fitType: detectFitType(brand, title),
      isOEM: detectIsOEM(brand, title),
      shop: 'Bol.com',
      price,
      packSize: null,
      packSizeHint: title,
      url: buildAffiliateUrl(productUrl),
      imageUrl,
      lastSeen: new Date().toISOString(),
    };
  },
};

/** Beste-poging om een productlijn/serie uit de titel te halen, bv. "CrossAction", "DiamondClean". */
function extractLine(title: string, brand: string): string | null {
  const known = [
    'CrossAction',
    'Precision Clean',
    'Sensitive',
    'iO',
    '3D White',
    'ProResults',
    'DiamondClean',
    'C3',
    'C2',
    'W2',
    'G3',
    'InterCare',
  ];
  for (const line of known) {
    if (title.toLowerCase().includes(line.toLowerCase())) return line;
  }
  return null;
}
