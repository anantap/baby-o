import type { RawProduct, RawRow, SourceAdapter } from '../lib/types';
import { parseCsv } from '../lib/csv';
import { detectFitType, detectIsOEM, normalizeBrand } from '../lib/parse';
import { readFile } from 'node:fs/promises';

/**
 * Generieke, config-gedreven adapter voor CSV-productfeeds van Nederlandse
 * affiliate-netwerken (TradeTracker, Daisycon, Awin) zoals gebruikt door
 * drogisterijen (Kruidvat, Etos, deonlinedrogist, etc.). Elke advertiser
 * levert andere kolomnamen; één nieuwe winkel toevoegen is één entry in
 * `FEED_CONFIGS` hieronder, geen nieuwe code.
 */

export interface FeedColumnMap {
  title: string;
  price: string;
  ean?: string;
  brand?: string;
  url: string;
  image?: string;
  /** Kolom die packSize-hints kan bevatten als die los van de titel staat. */
  packSizeHint?: string;
}

export interface FeedConfig {
  shop: string;
  /** URL van de live affiliate-feed. Bij lokale dev/build zonder credentials wordt samplePath gebruikt. */
  feedUrl?: string;
  /** Pad naar sample-CSV, relatief aan repo-root, voor draaien zonder echte feed-toegang. */
  samplePath: string;
  columns: FeedColumnMap;
  /** Env-var-naam met een trackingtoken/subId dat aan elke productlink wordt toegevoegd. */
  trackingEnvVar?: string;
}

/**
 * Actieve feed-configs. Voeg hier een entry toe per drogist/netwerk-feed.
 * // TODO: bevestig tegen echte feed - kolomnamen verschillen per netwerk/advertiser
 *   (TradeTracker en Daisycon gebruiken doorgaans Engelse kolomnamen zoals
 *   hieronder, maar dit moet bevestigd worden zodra een echte feed-URL bekend is).
 */
export const FEED_CONFIGS: FeedConfig[] = [
  {
    shop: 'Kruidvat',
    feedUrl: process.env.FEED_KRUIDVAT_URL,
    samplePath: 'data/sample/drogist-sample.csv',
    columns: {
      title: 'product_name',
      price: 'price',
      ean: 'ean13',
      brand: 'merk',
      url: 'deeplink',
      image: 'image_url',
    },
    trackingEnvVar: 'FEED_KRUIDVAT_SUBID',
  },
];

function buildAffiliateUrl(rawUrl: string, trackingEnvVar?: string): string {
  if (!trackingEnvVar) return rawUrl;
  const token = process.env[trackingEnvVar];
  if (!token) {
    return `${rawUrl}${rawUrl.includes('?') ? '&' : '?'}subid=__${trackingEnvVar}_NIET_INGESTELD__`;
  }
  // TODO: bevestig tegen echte feed - exacte tracking-parameternaam per netwerk
  // (TradeTracker/Daisycon/Awin gebruiken vaak "subid" of "clickref"; "subid" is
  // hier als redelijke default aangenomen).
  return `${rawUrl}${rawUrl.includes('?') ? '&' : '?'}subid=${encodeURIComponent(token)}`;
}

function makeAdapter(config: FeedConfig): SourceAdapter {
  return {
    name: config.shop,

    async fetch(): Promise<RawRow[]> {
      // Met een echte feedUrl zou dit een HTTP GET naar het netwerk doen.
      // Zonder credentials lezen we de sample-CSV.
      // TODO: bevestig tegen echte feed - vervang door fetch(config.feedUrl)
      const samplePath = new URL(`../../${config.samplePath}`, import.meta.url);
      const text = await readFile(samplePath, 'utf-8');
      return parseCsv(text);
    },

    map(row: RawRow): RawProduct {
      const cols = config.columns;
      const title = String(row[cols.title] ?? '').trim();
      const brandRaw = cols.brand ? String(row[cols.brand] ?? '').trim() : '';
      const brand = normalizeBrand(brandRaw || guessBrandFromTitle(title));
      const ean = cols.ean ? String(row[cols.ean] ?? '').trim() || null : null;
      const price = Number(row[cols.price] ?? 0);
      const rawUrl = String(row[cols.url] ?? '').trim();
      const imageUrl = cols.image ? String(row[cols.image] ?? '').trim() || null : null;
      const packSizeHint = cols.packSizeHint ? String(row[cols.packSizeHint] ?? '') : title;

      return {
        ean,
        brand,
        line: null,
        title,
        fitType: detectFitType(brand, title),
        isOEM: detectIsOEM(brand, title),
        shop: config.shop,
        price,
        packSize: null,
        packSizeHint,
        url: buildAffiliateUrl(rawUrl, config.trackingEnvVar),
        imageUrl,
        lastSeen: new Date().toISOString(),
      };
    },
  };
}

function guessBrandFromTitle(title: string): string {
  const known = ['Oral-B', 'Philips', 'Sonicare', 'Jordan'];
  for (const brand of known) {
    if (title.toLowerCase().includes(brand.toLowerCase())) return brand;
  }
  return 'Overig';
}

/** Eén SourceAdapter per geconfigureerde feed. */
export const affiliateFeedAdapters: SourceAdapter[] = FEED_CONFIGS.map(makeAdapter);
