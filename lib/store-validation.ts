import { z } from 'zod';

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => value || null);

export const storeInputSchema = z
  .object({
    name: z.string().trim().min(1, 'El nombre es obligatorio.').max(120),
    branchName: optionalText(120),
    address: optionalText(240),
    latitude: z.number().min(-90).max(90).optional().nullable(),
    longitude: z.number().min(-180).max(180).optional().nullable(),
  })
  .strict();

export type StoreInput = z.input<typeof storeInputSchema>;

export function normalizeStorePart(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es-AR') || null;
}

export function storeDuplicateKey(
  name: string,
  branchName: string | null | undefined,
): string {
  return `${normalizeStorePart(name)}\u0000${normalizeStorePart(branchName) ?? ''}`;
}
