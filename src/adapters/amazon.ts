import type { RawProduct, RawRow, SourceAdapter } from '../lib/types';
import { detectFitType, detectIsOEM, normalizeBrand } from '../lib/parse';

/**
 * STUB-adapter voor Amazon Product Advertising API (PA-API 5.0).
 *
 * NIET in de actieve registry (zie src/adapters/index.ts) tot er voldoende
 * kwalificerende Amazon Associates-sales zijn: PA-API 5.0 vereist minimaal
 * 3 verkopen binnen de laatste 180 dagen voordat toegang vrijgeschakeld wordt.
 * Tot die tijd kan deze adapter alleen tegen sample-data draaien.
 *
 * Schakel in door amazonAdapter toe te voegen aan ACTIVE_ADAPTERS in index.ts
 * en de AMAZON_* env-vars in .env te zetten (zie .env.example).
 */

const SAMPLE_ROWS: RawRow[] = [
  {
    asin: 'B07XXXXAMZ',
    title: 'Oral-B CrossAction Opzetborstels 8-pack (Amazon sample)',
    brand: 'Oral-B',
    price: 24.99,
    detailPageUrl: 'https://www.amazon.nl/dp/B07XXXXAMZ',
    imageUrl: 'https://images.example.com/amazon-sample-1.jpg',
  },
];

function buildAffiliateUrl(detailPageUrl: string): string {
  const tag = process.env.AMAZON_PARTNER_TAG;
  if (!tag) {
    return `${detailPageUrl}?tag=__AMAZON_PARTNER_TAG_NIET_INGESTELD__`;
  }
  return `${detailPageUrl}?tag=${encodeURIComponent(tag)}`;
}

export const amazonAdapter: SourceAdapter = {
  name: 'Amazon.nl',

  async fetch(): Promise<RawRow[]> {
    // Echte implementatie: signeer een request naar PA-API 5.0 GetItems/SearchItems
    // met AMAZON_ACCESS_KEY/AMAZON_SECRET_KEY/AMAZON_PARTNER_TAG/AMAZON_HOST/AMAZON_REGION.
    // Pas inschakelen na kwalificerende sales (zie module-comment hierboven).
    return SAMPLE_ROWS;
  },

  map(row: RawRow): RawProduct {
    const title = String(row.title ?? '').trim();
    const brand = normalizeBrand(String(row.brand ?? '').trim());
    const price = Number(row.price ?? 0);
    const detailPageUrl = String(row.detailPageUrl ?? '').trim();
    const imageUrl = String(row.imageUrl ?? '').trim() || null;

    return {
      ean: null, // PA-API geeft doorgaans geen EAN terug, alleen ASIN.
      brand,
      line: null,
      title,
      fitType: detectFitType(brand, title),
      isOEM: detectIsOEM(brand, title),
      shop: 'Amazon.nl',
      price,
      packSize: null,
      packSizeHint: title,
      url: buildAffiliateUrl(detailPageUrl),
      imageUrl,
      lastSeen: new Date().toISOString(),
    };
  },
};
