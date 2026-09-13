import { describe, expect, it } from 'vitest';
import {
  formatMoney,
  multiplyMoneyByQuantity,
  parseMoneyInput,
  percentageOfBudget,
  serializeMoney,
  subtractMoney,
  sumMoney,
} from '@/lib/money';

describe('money helpers', () => {
  it('parses exact positive decimal strings and allows null', () => {
    expect(parseMoneyInput('100000')).toBe('100000.00');
    expect(parseMoneyInput('100000.50')).toBe('100000.50');
    expect(parseMoneyInput(null)).toBeNull();
    expect(serializeMoney('000100.5')).toBe('100.50');
  });

  it('rejects ambiguous, non-positive and over-precise values', () => {
    for (const value of [
      '0',
      '-100',
      'NaN',
      'Infinity',
      '100.000',
      '100,50',
      '100.123',
    ]) {
      expect(() => parseMoneyInput(value)).toThrow();
    }
  });

  it('formats only at the presentation boundary', () => {
    expect(formatMoney('100000.50')).toContain('100.000,50');
    expect(formatMoney(null)).toBe('Sin presupuesto');
  });

  it('derives subtotals and summaries with scaled integers', () => {
    expect(multiplyMoneyByQuantity('2000.00', '1.5')).toBe('3000.00');
    expect(multiplyMoneyByQuantity('0.01', '0.500')).toBe('0.01');
    expect(sumMoney(['3000.00', null, '5499.00'])).toBe('8499.00');
    expect(subtractMoney('100000.00', '105500.00')).toBe('-5500.00');
    expect(percentageOfBudget('105500.00', '100000.00')).toBe('105.50');
    expect(percentageOfBudget('3000.00', null)).toBeNull();
  });
});
