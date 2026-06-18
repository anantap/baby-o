/** Genormaliseerd opzetborstel-product, onafhankelijk van databron. */
export interface Product {
  /** Stabiele id, afgeleid van EAN of (shop+brand+title) als EAN ontbreekt. */
  id: string;
  ean: string | null;
  brand: string;
  /** Productlijn/serie, bv. "CrossAction", "DiamondClean". */
  line: string | null;
  title: string;
  /** Welk handvat/systeem de opzetborstel past, bv. "oral-b-click", "sonicare-click", "generic". */
  fitType: string;
  /** true = merk-origineel, false = compatible/huismerk. */
  isOEM: boolean;
  shop: string;
  /** Prijs in EUR voor de hele listing (alle koppen samen). */
  price: number;
  /** Aantal opzetborstels in de listing. null als onbekend (dan geen prijs-per-kop). */
  packSize: number | null;
  /** price / packSize, afgerond op 2 decimalen. null als packSize onbekend is. */
  pricePerHead: number | null;
  url: string;
  imageUrl: string | null;
  /** ISO-datumstring van laatste keer gezien in de feed. */
  lastSeen: string;
  /** true als packSize niet uit titel/veld kon worden afgeleid. */
  flaggedUnknownPackSize: boolean;
  /** Matchkey gebruikt om dezelfde kop over winkels heen te groeperen (EAN of brand+line+packSize). */
  matchKey: string;
}

/** Eén ruwe rij uit een bron, voordat normalisatie plaatsvindt. Vorm verschilt per adapter. */
export type RawRow = Record<string, string | number | null | undefined>;

export interface SourceAdapter {
  /** Korte naam van de bron, gebruikt als fallback shop-naam en in logs. */
  name: string;
  /** Haalt ruwe rijen op (CSV/XML/API). Werkt tegen sample-data als er geen credentials zijn. */
  fetch(): Promise<RawRow[]>;
  /** Zet één ruwe rij om naar een genormaliseerd Product (zonder matchKey/pricePerHead, die voegt de parser toe). */
  map(row: RawRow): RawProduct;
}

/** Product zoals een adapter het oplevert, voor de parser packSize/pricePerHead/matchKey toevoegt. */
export type RawProduct = Omit<
  Product,
  'pricePerHead' | 'flaggedUnknownPackSize' | 'matchKey' | 'id'
> & {
  /** Ruwe titel/veld waaruit de parser packSize probeert te halen als packSize nog null is. */
  packSizeHint: string;
};

/** Eén product-groep: alle listings die naar hetzelfde fysieke product matchen. */
export interface ProductGroup {
  /** URL-veilige id, afgeleid van matchKey, gebruikt in /product/[id]/. */
  id: string;
  matchKey: string;
  brand: string;
  line: string | null;
  fitType: string;
  isOEM: boolean;
  /** Representatieve titel (van de eerste/goedkoopste listing). */
  title: string;
  imageUrl: string | null;
  packSize: number | null;
  listings: Product[];
  /** Goedkoopste listing op pricePerHead, of null als geen listing een geldige pricePerHead heeft. */
  cheapest: Product | null;
}
