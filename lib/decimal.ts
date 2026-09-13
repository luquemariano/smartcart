export function addDecimalStrings(
  left: string,
  right: string,
  scale: number,
  maxScaled: bigint,
): string {
  const toScaled = (value: string) => {
    const [whole, fraction = ''] = value.split('.');
    return (
      BigInt(whole) * BigInt(10) ** BigInt(scale) +
      BigInt(fraction.padEnd(scale, '0') || '0')
    );
  };
  const scaled = toScaled(left) + toScaled(right);
  if (scaled > maxScaled) throw new Error('DECIMAL_OVERFLOW');
  const unit = BigInt(10) ** BigInt(scale);
  const whole = scaled / unit;
  const fraction = (scaled % unit)
    .toString()
    .padStart(scale, '0')
    .replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}
