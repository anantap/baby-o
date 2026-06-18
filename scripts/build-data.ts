import { writeFile, mkdir } from 'node:fs/promises';
import { ACTIVE_ADAPTERS } from '../src/adapters/index';
import { finalizeProduct, groupProducts } from '../src/lib/parse';
import type { Product } from '../src/lib/types';

// products.json is de platte lijst van alle listings (één per winkel-aanbieding).
// Pagina's groeperen ze zelf via groupProducts() uit src/lib/parse voor de
// detail-/winkel-vergelijking, zodat er één bron van waarheid is voor de
// matchlogica.
async function main() {
  const allProducts: Product[] = [];

  for (const adapter of ACTIVE_ADAPTERS) {
    const rows = await adapter.fetch();
    for (const row of rows) {
      const raw = adapter.map(row);
      if (!raw.title || !raw.price) continue;
      allProducts.push(finalizeProduct(raw));
    }
    console.log(`[build-data] ${adapter.name}: ${rows.length} rijen verwerkt`);
  }

  const groups = groupProducts(allProducts);

  await mkdir('src/data', { recursive: true });
  await writeFile('src/data/products.json', JSON.stringify(allProducts, null, 2));

  const flaggedCount = allProducts.filter((p) => p.flaggedUnknownPackSize).length;
  const meta = {
    generatedAt: new Date().toISOString(),
    sources: ACTIVE_ADAPTERS.map((a) => a.name),
    totalListings: allProducts.length,
    totalProducts: groups.length,
    flaggedUnknownPackSize: flaggedCount,
  };
  await writeFile('src/data/meta.json', JSON.stringify(meta, null, 2));

  console.log(
    `[build-data] klaar: ${allProducts.length} listings -> ${groups.length} producten ` +
      `(${flaggedCount} met onbekende packSize uitgesloten van prijs-per-kop ranking)`,
  );
}

main().catch((err) => {
  console.error('[build-data] mislukt:', err);
  process.exit(1);
});
