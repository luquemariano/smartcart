import {
  multiplyMoneyByQuantity,
  percentageOfBudget,
  subtractMoney,
  sumMoney,
} from '@/lib/money';
import { addDecimalStrings } from '@/lib/decimal';

export type ShoppingSummary = {
  budgetAmount: string | null;
  currency: string;
  itemsTotal: string;
  remainingBudget: string | null;
  budgetUsagePercentage: string | null;
  itemsCount: number;
  totalQuantity: string;
  pricedItemsCount: number;
  unpricedItemsCount: number;
};

export type ShoppingItemForSummary = {
  quantity: string;
  unitPrice: string | null;
};

export function shoppingItemSubtotal(
  item: ShoppingItemForSummary,
): string | null {
  return item.unitPrice
    ? multiplyMoneyByQuantity(item.unitPrice, item.quantity)
    : null;
}

export function calculateShoppingSummary(
  budgetAmount: string | null,
  currency: string,
  items: ShoppingItemForSummary[],
): ShoppingSummary {
  const itemsTotal = sumMoney(items.map(shoppingItemSubtotal));
  const totalQuantity = items.reduce(
    (total, item) =>
      addDecimalStrings(total, item.quantity, 3, BigInt('999999999999')),
    '0',
  );
  const pricedItemsCount = items.filter(
    (item) => item.unitPrice !== null,
  ).length;
  return {
    budgetAmount,
    currency,
    itemsTotal,
    remainingBudget: budgetAmount
      ? subtractMoney(budgetAmount, itemsTotal)
      : null,
    budgetUsagePercentage: percentageOfBudget(itemsTotal, budgetAmount),
    itemsCount: items.length,
    totalQuantity,
    pricedItemsCount,
    unpricedItemsCount: items.length - pricedItemsCount,
  };
}
