import {
  multiplyMoneyByQuantity,
  percentageOfBudget,
  subtractMoney,
  sumMoney,
} from '@/lib/money';

export type ShoppingSummary = {
  budgetAmount: string | null;
  currency: string;
  itemsTotal: string;
  remainingBudget: string | null;
  budgetUsagePercentage: string | null;
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
  return {
    budgetAmount,
    currency,
    itemsTotal,
    remainingBudget: budgetAmount
      ? subtractMoney(budgetAmount, itemsTotal)
      : null,
    budgetUsagePercentage: percentageOfBudget(itemsTotal, budgetAmount),
  };
}
