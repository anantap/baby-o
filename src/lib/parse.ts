import type { Product, ProductGroup, RawProduct } from './types';

/**
 * Probeert het aantal opzetborstels uit een titel/hint-string te halen.
 * Geeft null terug als niets met voldoende zekerheid herkend wordt.
 *
 * Herkende patronen (in volgorde van proberen):
 *   "8 stuks", "8 opzetborstels", "8 koppen"
 *   "8-pack", "8 pack", "8pack"
 *   "(x8)", "x8", "8x"
 *   "set van 6"
 *   "4 + 4", "4+4" (worden opgeteld)
 */
export function extractPackSize(text: string): number | null {
  if (!text) return null;
  const t = text.toLowerCase();

  // "4 + 4" of "4+4" -> som van de twee getallen
  const plusMatch = t.match(/(\d+)\s*\+\s*(\d+)/);
  if (plusMatch) {
    const a = parseInt(plusMatch[1], 10);
    const b = parseInt(plusMatch[2], 10);
    if (a > 0 && b > 0) return a + b;
  }

  // "set van 6"
  const setMatch = t.match(/set van (\d+)/);
  if (setMatch) {
    const n = parseInt(setMatch[1], 10);
    if (n > 0) return n;
  }

  // "8 stuks" / "8 opzetborstels" / "8 koppen" / "8 borstels"
  const woordMatch = t.match(/(\d+)\s*(stuks|opzetborstels|opzetborstel|koppen|kop|borstels|borstel)/);
  if (woordMatch) {
    const n = parseInt(woordMatch[1], 10);
    if (n > 0) return n;
  }

  // "8-pack" / "8 pack" / "8pack"
  const packMatch = t.match(/(\d+)[\s-]*pack/);
  if (packMatch) {
    const n = parseInt(packMatch[1], 10);
    if (n > 0) return n;
  }

  // "(x8)" / "x8" / "8x"
  const xMatch = t.match(/\(x(\d+)\)/) ?? t.match(/(?:^|\s)x(\d+)(?:\s|$)/) ?? t.match(/(\d+)x(?:\s|$)/);
  if (xMatch) {
    const n = parseInt(xMatch[1], 10);
    if (n > 0) return n;
  }

  return null;
}

/** Rondt af op 2 decimalen, normale wiskundige afronding. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function calcPricePerHead(price: number, packSize: number | null): number | null {
  if (packSize === null || packSize <= 0) return null;
  return round2(price / packSize);
}

const BRAND_ALIASES: Record<string, string> = {
  'oral-b': 'Oral-B',
  'oral b': 'Oral-B',
  oralb: 'Oral-B',
  philips: 'Philips Sonicare',
  sonicare: 'Philips Sonicare',
  'philips sonicare': 'Philips Sonicare',
  jordan: 'Jordan',
};

export function normalizeBrand(raw: string): string {
  const key = raw.trim().toLowerCase();
  return BRAND_ALIASES[key] ?? raw.trim();
}

/** Herkent het handvat-systeem waarop de opzetborstel past. */
export function detectFitType(brand: string, title: string): string {
  const t = title.toLowerCase();
  const b = brand.toLowerCase();
  if (b.includes('oral-b') || t.includes('oral-b') || t.includes('oral b')) {
    return 'oral-b-click';
  }
  if (b.includes('sonicare') || t.includes('sonicare') || t.includes('philips')) {
    return 'sonicare-click';
  }
  return 'generic';
}

const OEM_NEGATIVE_KEYWORDS = [
  'geschikt voor',
  'compatible',
  'vervangende',
  'vervangend',
  'huismerk',
  'alternatief voor',
  'universeel',
];

/** true = origineel merkproduct, false = compatible/huismerk variant. */
export function detectIsOEM(brand: string, title: string): boolean {
  const t = title.toLowerCase();
  if (OEM_NEGATIVE_KEYWORDS.some((kw) => t.includes(kw))) return false;
  return true;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Matchkey om dezelfde fysieke kop over winkels heen te groeperen: EAN als beschikbaar, anders brand+line+packSize. */
export function buildMatchKey(p: {
  ean: string | null;
  brand: string;
  line: string | null;
  packSize: number | null;
}): string {
  if (p.ean) return `ean:${p.ean}`;
  const line = p.line ? slugify(p.line) : 'unknown-line';
  const pack = p.packSize ?? 'unknown';
  return `key:${slugify(p.brand)}:${line}:${pack}`;
}

function buildId(matchKey: string, shop: string, price: number): string {
  return slugify(`${matchKey}-${shop}-${price}`);
}

/** Zet een RawProduct (van een adapter) om naar een volledig genormaliseerd Product. */
export function finalizeProduct(raw: RawProduct): Product {
  const brand = normalizeBrand(raw.brand);
  let packSize = raw.packSize;
  if (packSize === null) {
    packSize = extractPackSize(raw.packSizeHint) ?? extractPackSize(raw.title);
  }
  const flaggedUnknownPackSize = packSize === null;
  const pricePerHead = calcPricePerHead(raw.price, packSize);
  const matchKey = buildMatchKey({ ean: raw.ean, brand, line: raw.line, packSize });

  return {
    ...raw,
    brand,
    packSize,
    pricePerHead,
    flaggedUnknownPackSize,
    matchKey,
    id: buildId(matchKey, raw.shop, raw.price),
  };
}

/** Groepeert producten op matchKey en bepaalt per groep de goedkoopste listing op pricePerHead. */
export function groupProducts(products: Product[]): ProductGroup[] {
  const groups = new Map<string, Product[]>();
  for (const p of products) {
    const list = groups.get(p.matchKey) ?? [];
    list.push(p);
    groups.set(p.matchKey, list);
  }

  const result: ProductGroup[] = [];
  for (const [matchKey, listings] of groups) {
    const withPrice = listings.filter((l) => l.pricePerHead !== null);
    const cheapest =
      withPrice.length > 0
        ? withPrice.reduce((a, b) => (a.pricePerHead! <= b.pricePerHead! ? a : b))
        : null;
    const representative = cheapest ?? listings[0];
    result.push({
      id: slugify(matchKey),
      matchKey,
      brand: representative.brand,
      line: representative.line,
      fitType: representative.fitType,
      isOEM: representative.isOEM,
      title: representative.title,
      imageUrl: representative.imageUrl,
      packSize: representative.packSize,
      listings,
      cheapest,
    });
  }
  return result;
}
