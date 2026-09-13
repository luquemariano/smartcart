export const DEFAULT_CURRENCY = 'ARS' as const;
export const MONEY_SCALE = 2;
export const MAX_MONEY_AMOUNT = '9999999999999999.99';

export class MoneyInputError extends Error {}

function canonicalMoney(value: string): string {
  const [whole, fraction = ''] = value.split('.');
  const normalizedWhole = whole.replace(/^0+(?=\d)/, '') || '0';
  return `${normalizedWhole}.${fraction.padEnd(MONEY_SCALE, '0')}`;
}

function compareDecimal(left: string, right: string): number {
  const [leftWhole, leftFraction] = canonicalMoney(left).split('.');
  const [rightWhole, rightFraction] = canonicalMoney(right).split('.');
  if (leftWhole.length !== rightWhole.length)
    return leftWhole.length > rightWhole.length ? 1 : -1;
  if (leftWhole !== rightWhole) return leftWhole > rightWhole ? 1 : -1;
  if (leftFraction === rightFraction) return 0;
  return leftFraction > rightFraction ? 1 : -1;
}

export function parseMoneyInput(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string')
    throw new MoneyInputError('El presupuesto debe ser texto decimal.');
  const trimmed = value.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(trimmed))
    throw new MoneyInputError(
      'Usá un importe positivo con hasta 2 decimales y punto decimal.',
    );
  const result = canonicalMoney(trimmed);
  if (result === '0.00')
    throw new MoneyInputError('El presupuesto debe ser mayor a cero.');
  if (compareDecimal(result, MAX_MONEY_AMOUNT) > 0)
    throw new MoneyInputError('El presupuesto supera el máximo permitido.');
  return result;
}

export function serializeMoney(
  value: string | null | undefined,
): string | null {
  return parseMoneyInput(value);
}

export function formatMoney(
  value: string | null | undefined,
  currency: string = DEFAULT_CURRENCY,
): string {
  if (!value) return 'Sin presupuesto';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    currencyDisplay: 'symbol',
    minimumFractionDigits: MONEY_SCALE,
    maximumFractionDigits: MONEY_SCALE,
  }).format(Number(value));
}
