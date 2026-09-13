import { multiplyMoneyByQuantity, subtractMoney, sumMoney } from '@/lib/money';
export type PromotionCandidate = {
  id: string;
  productId?: string;
  storeId?: string;
  type: 'percentage' | 'fixed_price' | 'buy_n_pay_m';
  value: string | null;
  buyQuantity: number | null;
  payQuantity: number | null;
  startsAt: Date | string;
  endsAt: Date | string;
  isActive: boolean;
};
export function calculatePromotion(
  baseUnitPrice: string,
  quantity: string,
  promotion: PromotionCandidate | null,
  at = new Date(),
) {
  const baseSubtotal = multiplyMoneyByQuantity(baseUnitPrice, quantity);
  if (
    !promotion ||
    !promotion.isActive ||
    at < new Date(promotion.startsAt) ||
    at > new Date(promotion.endsAt)
  )
    return {
      applicable: false,
      effectiveSubtotal: baseSubtotal,
      savings: '0.00',
      reason: promotion ? 'not_current' : 'none',
      promotion: null,
    };
  if (
    promotion.type === 'buy_n_pay_m' &&
    (!Number.isInteger(Number(quantity)) ||
      !promotion.buyQuantity ||
      !promotion.payQuantity)
  )
    return {
      applicable: false,
      effectiveSubtotal: baseSubtotal,
      savings: '0.00',
      reason: 'decimal_quantity',
      promotion: null,
    };
  let effective = baseSubtotal;
  if (promotion.type === 'fixed_price')
    effective = multiplyMoneyByQuantity(promotion.value!, quantity);
  if (promotion.type === 'percentage') {
    const cents = BigInt(baseSubtotal.replace('.', ''));
    const discount = BigInt(promotion.value!.replace('.', ''));
    const result =
      (cents * (BigInt(10000) - discount) + BigInt(5000)) / BigInt(10000);
    effective = `${result / BigInt(100)}.${(result % BigInt(100)).toString().padStart(2, '0')}`;
  }
  if (promotion.type === 'buy_n_pay_m') {
    const q = Number(quantity);
    const groups = Math.floor(q / promotion.buyQuantity!);
    const remainder = q % promotion.buyQuantity!;
    effective = sumMoney([
      multiplyMoneyByQuantity(
        baseUnitPrice,
        String(groups * promotion.payQuantity!),
      ),
      multiplyMoneyByQuantity(baseUnitPrice, String(remainder)),
    ]);
  }
  return {
    applicable: true,
    effectiveSubtotal: effective,
    savings: subtractMoney(baseSubtotal, effective),
    reason: null,
    promotion,
  };
}
export function chooseBestPromotion(
  baseUnitPrice: string,
  quantity: string,
  promotions: PromotionCandidate[],
  at = new Date(),
) {
  const candidates = promotions
    .map((p) => ({
      p,
      result: calculatePromotion(baseUnitPrice, quantity, p, at),
    }))
    .filter((x) => x.result.applicable);
  candidates.sort(
    (a, b) =>
      a.result.effectiveSubtotal.localeCompare(b.result.effectiveSubtotal) ||
      a.p.id.localeCompare(b.p.id),
  );
  return (
    candidates[0] ?? {
      p: null,
      result: calculatePromotion(baseUnitPrice, quantity, null, at),
    }
  );
}
