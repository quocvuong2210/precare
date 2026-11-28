/**
 * Shared helpers for rendering extraction source (PDF Fast Path vs PaddleOCR Slow Path)
 * and confidence warning thresholds (< 85% amber, < 70% rose).
 */

export type ExtractionDisplayMode = 'fast_path' | 'slow_path' | 'failed';
export type ConfidenceTone = 'high' | 'warning' | 'low';

export const OCR_CONFIDENCE_WARNING_THRESHOLD = 85;
export const OCR_CONFIDENCE_LOW_THRESHOLD = 70;

export function isFastPathExtraction(extractionMethod?: string | null): boolean {
  return extractionMethod === 'pdf_text_layer_fast_path';
}

export function getConfidenceTone(confidencePercent: number): ConfidenceTone {
  if (confidencePercent < OCR_CONFIDENCE_LOW_THRESHOLD) {
    return 'low';
  }
  if (confidencePercent < OCR_CONFIDENCE_WARNING_THRESHOLD) {
    return 'warning';
  }
  return 'high';
}

export interface ExtractionBadgeInfo {
  mode: ExtractionDisplayMode;
  label: string;
  shortLabel: string;
  tone: ConfidenceTone;
}

export function getExtractionBadgeInfo(
  extractionMethod?: string | null,
  ocrConfidence?: number | null,
  status?: string
): ExtractionBadgeInfo {
  if (status === 'failed') {
    return {
      mode: 'failed',
      label: 'Trích xuất thất bại',
      shortLabel: 'Thất bại',
      tone: 'low',
    };
  }

  if (isFastPathExtraction(extractionMethod)) {
    return {
      mode: 'fast_path',
      label: 'PDF Gốc • Trích xuất trực tiếp',
      shortLabel: 'PDF Gốc',
      tone: 'high',
    };
  }

  const conf = typeof ocrConfidence === 'number' ? Math.round(ocrConfidence * 10) / 10 : 0;
  return {
    mode: 'slow_path',
    label: `OCR • ${conf}%`,
    shortLabel: `OCR • ${conf}%`,
    tone: getConfidenceTone(conf),
  };
}
