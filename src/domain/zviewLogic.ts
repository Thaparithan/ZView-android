export const ZVIEW_FEEDBACK_URL = 'https://zynor-view.web.app/';

export const ZVIEW_COLORS = {
  jetBlack: '#0A0A0A',
  ceruleanBlue: '#007BA7',
  neonRose: '#FF2D95',
  white: '#FFFFFF',
  secondaryText: '#B8B8C2',
  darkSurface: '#17171C',
  elevatedSurface: '#22222A',
  divider: '#34343D',
  error: '#FF5252',
  success: '#4CAF50',
} as const;

export enum EnhancementMode {
  ORIGINAL = 'ORIGINAL',
  GRAYSCALE = 'GRAYSCALE',
  BLACK_AND_WHITE = 'BLACK_AND_WHITE',
  DOCUMENT_ENHANCE = 'DOCUMENT_ENHANCE',
}

export const ENHANCEMENT_LABELS: Record<EnhancementMode, string> = {
  [EnhancementMode.ORIGINAL]: 'Original Color',
  [EnhancementMode.GRAYSCALE]: 'Grayscale',
  [EnhancementMode.BLACK_AND_WHITE]: 'Black and White',
  [EnhancementMode.DOCUMENT_ENHANCE]: 'Document Enhancement',
};

export enum PdfPageSize {
  A4 = 'A4',
  LETTER = 'LETTER',
  LEGAL = 'LEGAL',
  FIT_IMAGE = 'FIT_IMAGE',
}

export const PDF_PAGE_SIZE_LABELS: Record<PdfPageSize, string> = {
  [PdfPageSize.A4]: 'A4 (210 × 297 mm)',
  [PdfPageSize.LETTER]: 'US Letter (8.5 × 11 in)',
  [PdfPageSize.LEGAL]: 'US Legal (8.5 × 14 in)',
  [PdfPageSize.FIT_IMAGE]: 'Fit to Page Aspect',
};

export enum SortOption {
  MODIFIED_DESC = 'MODIFIED_DESC',
  CREATED_DESC = 'CREATED_DESC',
  NAME_ASC = 'NAME_ASC',
}

export interface CornerPoint {
  x: number; // normalized 0..1
  y: number; // normalized 0..1
}

export interface CropBounds {
  topLeft: CornerPoint;
  topRight: CornerPoint;
  bottomRight: CornerPoint;
  bottomLeft: CornerPoint;
}

export interface ScannedPage {
  id: string;
  originalDataUrl: string;
  processedDataUrl: string;
  enhancementMode: EnhancementMode;
  rotationDegrees: number; // 0, 90, 180, 270
  brightness: number; // -50 to +50
  contrast: number; // 0.5 to 2.0
  cropBounds: CropBounds;
  width: number;
  height: number;
}

export interface ZViewDocumentMeta {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  pageCount: number;
  fileSizeBytes: number;
  pageSize: PdfPageSize;
  thumbnailDataUrl: string;
  isFileMissing?: boolean;
  cloudSyncedAt?: number | null;
}

export interface ZViewDocumentContent {
  documentId: string;
  pages: ScannedPage[];
  pdfDataUrl?: string;
}

export interface ZViewSettings {
  defaultPageSize: PdfPageSize;
  defaultEnhancement: EnhancementMode;
  cloudSyncEnabled: boolean;
  lastCloudBackupAt: number | null;
  highContrastBorders: boolean;
}

export const DEFAULT_CROP_BOUNDS: CropBounds = {
  topLeft: { x: 0.04, y: 0.04 },
  topRight: { x: 0.96, y: 0.04 },
  bottomRight: { x: 0.96, y: 0.96 },
  bottomLeft: { x: 0.04, y: 0.96 },
};

export interface FilenameValidationResult {
  isValid: boolean;
  sanitizedName: string;
  requiresOverwriteConfirm: boolean;
  errorMessage: string | null;
}

const INVALID_FILENAME_CHARS = /[\\/:*?"<>|\x00-\x1F]/g;
const RESERVED_DOS_NAMES = new Set([
  'CON',
  'PRN',
  'AUX',
  'NUL',
  'COM1',
  'COM2',
  'COM3',
  'LPT1',
  'LPT2',
]);

export function validateFilename(
  rawInput: string,
  existingDocumentNames: string[] = [],
  allowOverwrite = false
): FilenameValidationResult {
  const trimmed = rawInput
    .trim()
    .replace(/\.pdf$/i, '')
    .trim();

  if (!trimmed) {
    return {
      isValid: false,
      sanitizedName: '',
      requiresOverwriteConfirm: false,
      errorMessage: 'Document filename cannot be empty.',
    };
  }

  if (trimmed.length > 80) {
    return {
      isValid: false,
      sanitizedName: trimmed.slice(0, 80),
      requiresOverwriteConfirm: false,
      errorMessage: 'Filename must be 80 characters or fewer.',
    };
  }

  if (INVALID_FILENAME_CHARS.test(trimmed)) {
    INVALID_FILENAME_CHARS.lastIndex = 0;
    return {
      isValid: false,
      sanitizedName: trimmed.replace(INVALID_FILENAME_CHARS, '_'),
      requiresOverwriteConfirm: false,
      errorMessage: 'Filename cannot contain / \\ : * ? " < > | characters.',
    };
  }

  if (trimmed === '.' || trimmed === '..') {
    return {
      isValid: false,
      sanitizedName: 'ZView_Scan',
      requiresOverwriteConfirm: false,
      errorMessage: 'Filename cannot consist only of dots.',
    };
  }

  if (RESERVED_DOS_NAMES.has(trimmed.toUpperCase())) {
    return {
      isValid: false,
      sanitizedName: `${trimmed}_Scan`,
      requiresOverwriteConfirm: false,
      errorMessage: 'Filename uses a reserved system identifier.',
    };
  }

  const normalizedExisting = new Set(
    existingDocumentNames.map((n) => n.trim().replace(/\.pdf$/i, '').toLowerCase())
  );
  const existsAlready = normalizedExisting.has(trimmed.toLowerCase());

  if (existsAlready && !allowOverwrite) {
    return {
      isValid: false,
      sanitizedName: trimmed,
      requiresOverwriteConfirm: true,
      errorMessage: `A document named "${trimmed}.pdf" already exists. Confirm overwrite or choose a unique name.`,
    };
  }

  return {
    isValid: true,
    sanitizedName: trimmed,
    requiresOverwriteConfirm: existsAlready,
    errorMessage: null,
  };
}

export function filterAndSortDocuments(
  documents: ZViewDocumentMeta[],
  searchQuery: string,
  sortOption: SortOption
): ZViewDocumentMeta[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filtered = normalizedQuery
    ? documents.filter((doc) => doc.name.toLowerCase().includes(normalizedQuery))
    : [...documents];

  return filtered.sort((a, b) => {
    switch (sortOption) {
      case SortOption.MODIFIED_DESC:
        return b.updatedAt - a.updatedAt;
      case SortOption.CREATED_DESC:
        return b.createdAt - a.createdAt;
      case SortOption.NAME_ASC:
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      default:
        return b.updatedAt - a.updatedAt;
    }
  });
}

export function reorderPages<T>(pages: T[], fromIndex: number, toIndex: number): T[] {
  if (
    fromIndex < 0 ||
    fromIndex >= pages.length ||
    toIndex < 0 ||
    toIndex >= pages.length ||
    fromIndex === toIndex
  ) {
    return [...pages];
  }
  const result = [...pages];
  const [moved] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, moved);
  return result;
}

export function removePageAtIndex<T>(
  pages: T[],
  removeIndex: number,
  currentSelectedIndex: number
): { pages: T[]; nextSelectedIndex: number } {
  if (removeIndex < 0 || removeIndex >= pages.length) {
    return { pages: [...pages], nextSelectedIndex: currentSelectedIndex };
  }
  const nextPages = pages.filter((_, idx) => idx !== removeIndex);
  if (nextPages.length === 0) {
    return { pages: [], nextSelectedIndex: 0 };
  }
  const clampedIndex = Math.min(
    Math.max(0, currentSelectedIndex >= removeIndex ? currentSelectedIndex - 1 : currentSelectedIndex),
    nextPages.length - 1
  );
  return {
    pages: nextPages,
    nextSelectedIndex: clampedIndex,
  };
}

export function applyPixelEnhancement(
  sourceRgba: Uint8ClampedArray,
  mode: EnhancementMode,
  brightness = 0, // -50 .. +50
  contrast = 1 // 0.5 .. 2.0
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(sourceRgba.length);
  const clampedBrightness = Math.max(-100, Math.min(100, brightness)) * 2.2;
  const clampedContrast = Math.max(0.3, Math.min(3.0, contrast));

  for (let i = 0; i < sourceRgba.length; i += 4) {
    let r = sourceRgba[i];
    let g = sourceRgba[i + 1];
    let b = sourceRgba[i + 2];
    const a = sourceRgba[i + 3];

    if (mode === EnhancementMode.GRAYSCALE) {
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      r = lum;
      g = lum;
      b = lum;
    } else if (mode === EnhancementMode.BLACK_AND_WHITE) {
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const adjustedLum = (lum - 128) * clampedContrast + 128 + clampedBrightness;
      const bw = adjustedLum > 142 ? 255 : adjustedLum < 95 ? 12 : Math.round(((adjustedLum - 95) / 47) * 243 + 12);
      output[i] = bw;
      output[i + 1] = bw;
      output[i + 2] = bw;
      output[i + 3] = a;
      continue;
    } else if (mode === EnhancementMode.DOCUMENT_ENHANCE) {
      // Boost paper whiteness in highlights and deepen ink contrast in shadows
      const boostChannel = (c: number) => {
        const normalized = c / 255;
        const sCurve = normalized > 0.62
          ? Math.min(1, 0.62 + (normalized - 0.62) * 1.35)
          : Math.max(0, normalized * 0.88);
        return sCurve * 255;
      };
      r = boostChannel(r);
      g = boostChannel(g);
      b = boostChannel(b);
    }

    const transformChannel = (val: number) => {
      const contrasted = (val - 128) * clampedContrast + 128 + clampedBrightness;
      return Math.max(0, Math.min(255, Math.round(contrasted)));
    };

    output[i] = transformChannel(r);
    output[i + 1] = transformChannel(g);
    output[i + 2] = transformChannel(b);
    output[i + 3] = a;
  }

  return output;
}

export interface PdfGeometry {
  pageWidthPt: number;
  pageHeightPt: number;
  orientation: 'p' | 'l';
  drawX: number;
  drawY: number;
  drawWidth: number;
  drawHeight: number;
}

export function computePdfPageGeometry(
  imgWidth: number,
  imgHeight: number,
  pageSize: PdfPageSize
): PdfGeometry {
  const safeImgW = Math.max(1, imgWidth);
  const safeImgH = Math.max(1, imgHeight);
  const isLandscape = safeImgW > safeImgH;

  let baseW = 595.28; // A4 width in pt
  let baseH = 841.89; // A4 height in pt

  if (pageSize === PdfPageSize.LETTER) {
    baseW = 612;
    baseH = 792;
  } else if (pageSize === PdfPageSize.LEGAL) {
    baseW = 612;
    baseH = 1008;
  } else if (pageSize === PdfPageSize.FIT_IMAGE) {
    const scaleToPt = 595.28 / Math.min(safeImgW, safeImgH);
    const wPt = Math.round(safeImgW * scaleToPt);
    const hPt = Math.round(safeImgH * scaleToPt);
    return {
      pageWidthPt: wPt,
      pageHeightPt: hPt,
      orientation: isLandscape ? 'l' : 'p',
      drawX: 0,
      drawY: 0,
      drawWidth: wPt,
      drawHeight: hPt,
    };
  }

  const pageWidthPt = isLandscape ? baseH : baseW;
  const pageHeightPt = isLandscape ? baseW : baseH;
  const margin = 20;
  const availW = pageWidthPt - margin * 2;
  const availH = pageHeightPt - margin * 2;
  const scale = Math.min(availW / safeImgW, availH / safeImgH);
  const drawWidth = Math.round(safeImgW * scale * 100) / 100;
  const drawHeight = Math.round(safeImgH * scale * 100) / 100;
  const drawX = Math.round(((pageWidthPt - drawWidth) / 2) * 100) / 100;
  const drawY = Math.round(((pageHeightPt - drawHeight) / 2) * 100) / 100;

  return {
    pageWidthPt,
    pageHeightPt,
    orientation: isLandscape ? 'l' : 'p',
    drawX,
    drawY,
    drawWidth,
    drawHeight,
  };
}

export function reconcileDocumentIntegrity(
  metadataList: ZViewDocumentMeta[],
  availableContentIds: Set<string>
): ZViewDocumentMeta[] {
  return metadataList.map((meta) => ({
    ...meta,
    isFileMissing: !availableContentIds.has(meta.id),
  }));
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}
