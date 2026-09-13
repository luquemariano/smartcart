export const BARCODE_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'] as const;

export type BarcodeDetection = { rawValue?: string };
export type BarcodeDetectorLike = {
  detect(source: unknown): Promise<BarcodeDetection[]>;
};
type BarcodeDetectorConstructor = new (options?: {
  formats?: readonly string[];
}) => BarcodeDetectorLike;

function nativeConstructor(): BarcodeDetectorConstructor | null {
  const value = (
    globalThis as typeof globalThis & {
      BarcodeDetector?: BarcodeDetectorConstructor;
    }
  ).BarcodeDetector;
  return value ?? null;
}

export function createBarcodeDetector(): BarcodeDetectorLike | null {
  const Detector = nativeConstructor();
  if (!Detector) return null;
  try {
    return new Detector({ formats: BARCODE_FORMATS });
  } catch {
    try {
      return new Detector();
    } catch {
      return null;
    }
  }
}

export function normalizeDetectedBarcode(
  value: string | undefined,
): string | null {
  if (!value) return null;
  const barcode = value.trim();
  return /^\d{8,14}$/.test(barcode) ? barcode : null;
}

export function selectDetectedBarcode(
  detections: BarcodeDetection[],
): string | null {
  for (const detection of detections) {
    const barcode = normalizeDetectedBarcode(detection.rawValue);
    if (barcode) return barcode;
  }
  return null;
}

export async function scanBarcodeFrame(
  detector: BarcodeDetectorLike,
  source: unknown,
): Promise<string | null> {
  return selectDetectedBarcode(await detector.detect(source));
}
