/** Preço de mercado comparado ao valor de tabela. */

export type SupplyBand = 'local' | 'sistema' | 'ausente';

export interface PlanetDeposits {
  id: string;
  deposits: Array<{ resourceId: string }>;
}

/** Onde o recurso existe em relação ao planeta em que a troca acontece. */
export function resourceSupplyBand(
  resourceId: string,
  planetId: string | null,
  planets: PlanetDeposits[]
): SupplyBand {
  if (!planetId) return 'sistema';
  const here = planets.find((planet) => planet.id === planetId);
  if (here?.deposits.some((deposit) => deposit.resourceId === resourceId)) return 'local';
  if (planets.some((planet) => planet.deposits.some((deposit) => deposit.resourceId === resourceId))) {
    return 'sistema';
  }
  return 'ausente';
}

/** Local −15%, outro mundo do sistema 0%, ausente no sistema +15%. */
export function supplyFactor(band: SupplyBand): number {
  if (band === 'local') return 0.85;
  if (band === 'ausente') return 1.15;
  return 1;
}

/**
 * A partir da primeira unidade, cada bloco de 10 unidades já vendidas
 * naquele planeta deixa o pagamento 2% mais baixo.
 */
export function saturationFactor(unitsAlreadySold: number): number {
  const steps = Math.floor(Math.max(0, unitsAlreadySold) / 10) + 1;
  return Math.max(0.2, 1 - steps * 0.02);
}

export function tableDeltaPct(price: number, tablePrice: number): number {
  if (tablePrice <= 0) return 0;
  return Math.round(((price - tablePrice) / tablePrice) * 100);
}

export function formatTablePct(pct: number): string {
  const n = Math.round(pct);
  if (n > 0) return `+${n}%`;
  return `${n}%`;
}

export function unitBuyPrice(tablePrice: number, band: SupplyBand, personalMult: number): number {
  return Math.max(1, Math.round(tablePrice * supplyFactor(band) * personalMult));
}

export function unitSellPrice(
  tablePrice: number,
  band: SupplyBand,
  tradePriceBonus: number,
  unitsAlreadySold: number,
  saturate: boolean
): number {
  const place = tablePrice * supplyFactor(band) * (1 + Math.max(0, tradePriceBonus));
  const worn = saturate ? place * saturationFactor(unitsAlreadySold) : place;
  return Math.max(1, Math.round(worn));
}

/** Soma o pagamento unidade a unidade, porque o desconto muda a cada 10. */
export function quoteSale(
  tablePrice: number,
  band: SupplyBand,
  tradePriceBonus: number,
  unitsAlreadySold: number,
  qty: number,
  saturate: boolean
): { nextUnit: number; total: number } {
  const safeQty = Math.max(0, Math.floor(qty));
  const nextUnit = unitSellPrice(tablePrice, band, tradePriceBonus, unitsAlreadySold, saturate);
  let total = 0;
  for (let i = 0; i < safeQty; i++) {
    total += unitSellPrice(tablePrice, band, tradePriceBonus, unitsAlreadySold + i, saturate);
  }
  return { nextUnit, total };
}
