// Eenmalig hulpscript om de sample-CSV's te genereren. Niet onderdeel van de
// build-pipeline (die leest de gegenereerde CSV's via de adapters). Mag
// veilig verwijderd worden; data/sample/*.csv is het opgeleverde artefact.
import { writeFileSync } from 'node:fs';

function ean(n) {
  return String(n).padStart(13, '0');
}

// Basisset producten: [brand, line, packLabel, packSize, basePrice]
const PRODUCTS = [
  ['Oral-B', 'Precision Clean', '2 stuks', 2, 12.99],
  ['Oral-B', 'Precision Clean', '4 stuks', 4, 22.99],
  ['Oral-B', 'Precision Clean', '8 stuks', 8, 39.99],
  ['Oral-B', 'CrossAction', '2 stuks', 2, 13.49],
  ['Oral-B', 'CrossAction', '4-pack', 4, 23.99],
  ['Oral-B', 'CrossAction', '8-pack', 8, 41.99],
  ['Oral-B', 'CrossAction', '4 + 4', 8, 40.49],
  ['Oral-B', 'Sensitive', '2 stuks', 2, 11.99],
  ['Oral-B', 'Sensitive', '4 opzetborstels', 4, 20.99],
  ['Oral-B', 'Sensitive', 'set van 6', 6, 29.99],
  ['Oral-B', 'iO', '2 stuks', 2, 24.99],
  ['Oral-B', 'iO', '4 stuks', 4, 44.99],
  ['Oral-B', '3D White', '2 stuks', 2, 13.99],
  ['Oral-B', '3D White', '(x8)', 8, 42.99],
  ['Philips Sonicare', 'ProResults', '2 stuks', 2, 14.99],
  ['Philips Sonicare', 'ProResults', '4 stuks', 4, 26.99],
  ['Philips Sonicare', 'ProResults', '8 stuks', 8, 47.99],
  ['Philips Sonicare', 'DiamondClean', '2 stuks', 2, 19.99],
  ['Philips Sonicare', 'DiamondClean', '4-pack', 4, 35.99],
  ['Philips Sonicare', 'C3', '2 stuks', 2, 16.99],
  ['Philips Sonicare', 'C3', '4 opzetborstels', 4, 29.99],
  ['Philips Sonicare', 'C2', '2 stuks', 2, 15.49],
  ['Philips Sonicare', 'C2', 'set van 6', 6, 39.99],
  ['Philips Sonicare', 'W2', '2 stuks', 2, 17.99],
  ['Philips Sonicare', 'G3', '2 stuks', 2, 18.49],
  ['Jordan', 'Clean Slim', '2 stuks', 2, 7.99],
  ['Jordan', 'Clean Slim', '4 stuks', 4, 13.99],
  ['Jordan', 'Target Sensitive', '2 stuks', 2, 8.49],
  ['Jordan', 'Target Sensitive', '4 stuks', 4, 14.99],
  ['Jordan', 'Green Clean', '2 stuks', 2, 8.99],
  ['Oral-B', 'Precision Clean', 'set van 6', 6, 32.99],
  ['Oral-B', 'CrossAction', '2 + 2', 4, 24.49],
  ['Oral-B', 'Sensitive', '8-pack', 8, 38.99],
  ['Oral-B', 'iO', '8 stuks', 8, 79.99],
  ['Oral-B', '3D White', '4 stuks', 4, 24.99],
  ['Oral-B', '3D White', 'set van 6', 6, 33.99],
  ['Philips Sonicare', 'ProResults', 'set van 6', 6, 36.99],
  ['Philips Sonicare', 'DiamondClean', '8 stuks', 8, 67.99],
  ['Philips Sonicare', 'DiamondClean', '(x8)', 8, 68.49],
  ['Philips Sonicare', 'C3', '8-pack', 8, 54.99],
  ['Philips Sonicare', 'C2', '4 stuks', 4, 27.99],
  ['Philips Sonicare', 'W2', '4 opzetborstels', 4, 31.99],
  ['Philips Sonicare', 'G3', '4-pack', 4, 33.99],
  ['Philips Sonicare', 'InterCare', '2 stuks', 2, 16.49],
  ['Philips Sonicare', 'InterCare', '4 stuks', 4, 28.99],
];

// Compatible/generieke multipacks (geen line, isOEM=false via titel-keyword)
const GENERIC = [
  ['Compatible', null, 'geschikt voor Oral-B, 8 stuks', 8, 14.99],
  ['Compatible', null, 'vervangende opzetborstels Oral-B CrossAction, 4-pack', 4, 9.99],
  ['Compatible', null, 'geschikt voor Sonicare, set van 6', 6, 13.49],
  ['Compatible', null, 'universeel compatible opzetborstels, 8 stuks', 8, 12.99],
  ['Compatible', null, 'alternatief voor Oral-B Precision Clean (x8)', 8, 15.49],
];

let eanCounter = 8710000000001;
const bolRows = [];
const drogistRows = [];
let bolIdx = 0;
let drogistIdx = 0;

function bolImage(i) {
  return `https://images.bol.com/sample/opzetborstel-${i}.jpg`;
}
function drogistImage(i) {
  return `https://cdn.kruidvat.nl/sample/opzetborstel-${i}.jpg`;
}

const allItems = [...PRODUCTS.map((p) => ({ brand: p[0], line: p[1], pack: p[2], size: p[3], price: p[4] })),
  ...GENERIC.map((p) => ({ brand: p[0], line: p[1], pack: p[2], size: p[3], price: p[4] }))];

allItems.forEach((item, idx) => {
  const productEan = ean(eanCounter++);
  const title = item.line
    ? `${item.brand} ${item.line} opzetborstels, ${item.pack}`
    : `Opzetborstels ${item.pack}`;
  bolIdx++;
  bolRows.push({
    ean: productEan,
    title,
    brand: item.brand,
    price: item.price.toFixed(2),
    productUrl: `https://www.bol.com/nl/p/opzetborstel-${idx + 1}/${9000000000 + idx}/`,
    imageUrl: bolImage(idx + 1),
    category: 'Mondverzorging',
  });

  // ~55% van de items ook bij de drogist, met afwijkende prijs (soms duurder, soms goedkoper).
  if (idx % 2 === 0 || idx % 5 === 0) {
    drogistIdx++;
    const priceDelta = (((idx * 13) % 7) - 3) * 0.5; // varieer tussen -1.5 en +1.5
    const drogistPrice = Math.max(1, item.price + priceDelta);
    drogistRows.push({
      ean13: productEan,
      product_name: title,
      merk: item.brand,
      price: drogistPrice.toFixed(2),
      deeplink: `https://www.kruidvat.nl/mondverzorging/opzetborstel-${idx + 1}-${drogistIdx}`,
      image_url: drogistImage(idx + 1),
    });
  }
});

// Een paar drogist-exclusieve listings (geen EAN-match met bol), waaronder
// een paar met onherkenbare packSize (titel zonder enig aantal) om de
// "flaggedUnknownPackSize" -uitsluiting te testen.
const drogistExclusive = [
  ['Etos', 'Etos eigen merk opzetborstels geschikt voor Oral-B, 4 stuks', 'Etos', 6.99],
  ['Etos', 'Etos opzetborstels compatible Sonicare 8-pack', 'Etos', 11.49],
  ['Kruidvat', 'Kruidvat opzetborstels universeel compatible, 2 stuks', 'Kruidvat', 4.49],
  ['Kruidvat', 'Kruidvat opzetborstel multipack voordeelverpakking', 'Kruidvat', 9.99], // geen aantal -> unknown packSize
  ['Etos', 'Etos opzetborstels familieverpakking', 'Etos', 12.99], // geen aantal -> unknown packSize
];

drogistExclusive.forEach(([shopMerk, title, merk, price], i) => {
  drogistIdx++;
  drogistRows.push({
    ean13: '',
    product_name: title,
    merk,
    price: price.toFixed(2),
    deeplink: `https://www.kruidvat.nl/mondverzorging/exclusief-${i + 1}`,
    image_url: drogistImage(100 + i),
  });
});

function toCsv(rows, columns) {
  const header = columns.join(',');
  const lines = rows.map((row) =>
    columns
      .map((col) => {
        const val = String(row[col] ?? '');
        return /[",\n]/.test(val) ? `"${val.replace(/"/g, '""')}"` : val;
      })
      .join(','),
  );
  return [header, ...lines].join('\n') + '\n';
}

writeFileSync(
  'data/sample/bol-sample.csv',
  toCsv(bolRows, ['ean', 'title', 'brand', 'price', 'productUrl', 'imageUrl', 'category']),
);
writeFileSync(
  'data/sample/drogist-sample.csv',
  toCsv(drogistRows, ['ean13', 'product_name', 'merk', 'price', 'deeplink', 'image_url']),
);

console.log(`bol rows: ${bolRows.length}, drogist rows: ${drogistRows.length}`);
