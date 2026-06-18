import { describe, expect, it } from 'vitest';
import {
  buildMatchKey,
  calcPricePerHead,
  detectFitType,
  detectIsOEM,
  extractPackSize,
  groupProducts,
  normalizeBrand,
  round2,
} from './parse';
import type { Product } from './types';

describe('extractPackSize', () => {
  it.each([
    ['8 stuks', 8],
    ['Oral-B CrossAction opzetborstels, 8 stuks', 8],
    ['8-pack opzetborstels', 8],
    ['8 pack', 8],
    ['8pack', 8],
    ['Opzetborstels (x8)', 8],
    ['x8 opzetborstels', 8],
    ['8x opzetborstels', 8],
    ['set van 6', 6],
    ['Philips Sonicare set van 6 opzetborstels', 6],
    ['4 + 4 opzetborstels', 8],
    ['4+4', 8],
    ['2 + 2 stuks', 4],
    ['8 opzetborstels', 8],
    ['4 opzetborstel', 4],
    ['6 koppen', 6],
    ['2 kop', 2],
  ])('extraheert %s -> %i', (text, expected) => {
    expect(extractPackSize(text)).toBe(expected);
  });

  it.each([
    ['Opzetborstels voordeelverpakking', null],
    ['Geschikt voor Oral-B', null],
    ['', null],
  ])('geeft null voor onherkenbare tekst: %s', (text, expected) => {
    expect(extractPackSize(text)).toBe(expected);
  });
});

describe('round2', () => {
  it('rondt normaal af', () => {
    expect(round2(1.005)).toBeCloseTo(1.01, 2);
    expect(round2(12.999)).toBe(13);
    expect(round2(5.554)).toBe(5.55);
  });
});

describe('calcPricePerHead', () => {
  it('deelt prijs door packSize en rondt af', () => {
    expect(calcPricePerHead(39.99, 8)).toBe(5.0);
    expect(calcPricePerHead(10, 3)).toBe(3.33);
  });

  it('geeft null als packSize null of 0 is', () => {
    expect(calcPricePerHead(10, null)).toBeNull();
    expect(calcPricePerHead(10, 0)).toBeNull();
  });
});

describe('normalizeBrand', () => {
  it.each([
    ['oral-b', 'Oral-B'],
    ['Oral B', 'Oral-B'],
    ['ORALB', 'Oral-B'],
    ['philips', 'Philips Sonicare'],
    ['Sonicare', 'Philips Sonicare'],
    ['Jordan', 'Jordan'],
    ['Onbekend Merk', 'Onbekend Merk'],
  ])('normaliseert %s -> %s', (input, expected) => {
    expect(normalizeBrand(input)).toBe(expected);
  });
});

describe('detectFitType', () => {
  it('herkent Oral-B click-fit', () => {
    expect(detectFitType('Oral-B', 'Oral-B CrossAction opzetborstels')).toBe('oral-b-click');
  });

  it('herkent Sonicare click-fit', () => {
    expect(detectFitType('Philips Sonicare', 'ProResults opzetborstels')).toBe('sonicare-click');
  });

  it('valt terug op generic', () => {
    expect(detectFitType('Jordan', 'Jordan opzetborstels')).toBe('generic');
  });
});

describe('detectIsOEM', () => {
  it('herkent compatible-keywords als niet-OEM', () => {
    expect(detectIsOEM('Compatible', 'geschikt voor Oral-B, 8 stuks')).toBe(false);
    expect(detectIsOEM('Compatible', 'vervangende opzetborstels')).toBe(false);
    expect(detectIsOEM('Compatible', 'universeel compatible opzetborstels')).toBe(false);
  });

  it('beschouwt merkproducten zonder keywords als OEM', () => {
    expect(detectIsOEM('Oral-B', 'Oral-B CrossAction opzetborstels, 8 stuks')).toBe(true);
  });
});

describe('buildMatchKey', () => {
  it('gebruikt EAN als die beschikbaar is', () => {
    expect(buildMatchKey({ ean: '1234', brand: 'Oral-B', line: 'CrossAction', packSize: 8 })).toBe(
      'ean:1234',
    );
  });

  it('valt terug op brand+line+packSize zonder EAN', () => {
    expect(
      buildMatchKey({ ean: null, brand: 'Oral-B', line: 'CrossAction', packSize: 8 }),
    ).toBe('key:oral-b:crossaction:8');
  });
});

function makeProduct(overrides: Partial<Product>): Product {
  return {
    id: 'id',
    ean: '1234',
    brand: 'Oral-B',
    line: 'CrossAction',
    title: 'Oral-B CrossAction opzetborstels, 8 stuks',
    fitType: 'oral-b-click',
    isOEM: true,
    shop: 'Bol.com',
    price: 39.99,
    packSize: 8,
    pricePerHead: 5.0,
    url: 'https://example.com',
    imageUrl: null,
    lastSeen: '2024-01-01T00:00:00.000Z',
    flaggedUnknownPackSize: false,
    matchKey: 'ean:1234',
    ...overrides,
  };
}

describe('groupProducts', () => {
  it('groepeert listings met dezelfde matchKey en pikt de goedkoopste op pricePerHead', () => {
    const products: Product[] = [
      makeProduct({ id: 'a', shop: 'Bol.com', price: 39.99, pricePerHead: 5.0 }),
      makeProduct({ id: 'b', shop: 'Kruidvat', price: 35.99, pricePerHead: 4.5 }),
    ];
    const groups = groupProducts(products);
    expect(groups).toHaveLength(1);
    expect(groups[0].listings).toHaveLength(2);
    expect(groups[0].cheapest?.id).toBe('b');
  });

  it('sluit listings zonder pricePerHead uit van cheapest, zonder te crashen', () => {
    const products: Product[] = [
      makeProduct({ id: 'a', packSize: null, pricePerHead: null, flaggedUnknownPackSize: true }),
    ];
    const groups = groupProducts(products);
    expect(groups[0].cheapest).toBeNull();
  });
});
