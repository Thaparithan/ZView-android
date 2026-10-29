import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ZVIEW_COLORS,
  ZVIEW_FEEDBACK_URL,
  EnhancementMode,
  PdfPageSize,
  SortOption,
  validateFilename,
  filterAndSortDocuments,
  reorderPages,
  removePageAtIndex,
  applyPixelEnhancement,
  computePdfPageGeometry,
  reconcileDocumentIntegrity,
  formatBytes,
  type ZViewDocumentMeta,
} from './zviewLogic';

test('ZView brand palette and feedback URL match exact master prompt specifications', () => {
  assert.equal(ZVIEW_FEEDBACK_URL, 'https://zynor-view.web.app/');
  assert.equal(ZVIEW_COLORS.jetBlack, '#0A0A0A');
  assert.equal(ZVIEW_COLORS.ceruleanBlue, '#007BA7');
  assert.equal(ZVIEW_COLORS.neonRose, '#FF2D95');
  assert.equal(ZVIEW_COLORS.white, '#FFFFFF');
  assert.equal(ZVIEW_COLORS.secondaryText, '#B8B8C2');
  assert.equal(ZVIEW_COLORS.darkSurface, '#17171C');
  assert.equal(ZVIEW_COLORS.elevatedSurface, '#22222A');
  assert.equal(ZVIEW_COLORS.divider, '#34343D');
  assert.equal(ZVIEW_COLORS.error, '#FF5252');
  assert.equal(ZVIEW_COLORS.success, '#4CAF50');
});

test('validateFilename accepts valid names, strips .pdf extension, and rejects illegal characters', () => {
  const valid = validateFilename('  Contract_Signed_2026.pdf  ');
  assert.equal(valid.isValid, true);
  assert.equal(valid.sanitizedName, 'Contract_Signed_2026');
  assert.equal(valid.errorMessage, null);

  const empty = validateFilename('   ');
  assert.equal(empty.isValid, false);

  const invalidChars = validateFilename('Receipt:2026/10*?.pdf');
  assert.equal(invalidChars.isValid, false);
  assert.equal(invalidChars.sanitizedName, 'Receipt_2026_10__');

  const duplicateBlocked = validateFilename('Invoice_01', ['invoice_01'], false);
  assert.equal(duplicateBlocked.isValid, false);
  assert.equal(duplicateBlocked.requiresOverwriteConfirm, true);

  const duplicateAllowed = validateFilename('Invoice_01', ['invoice_01'], true);
  assert.equal(duplicateAllowed.isValid, true);
});

test('multi-page reordering and removal preserve order and clamp selected index safely', () => {
  const pages = ['Page1', 'Page2', 'Page3', 'Page4'];
  const reordered = reorderPages(pages, 0, 2);
  assert.deepEqual(reordered, ['Page2', 'Page3', 'Page1', 'Page4']);

  const afterRemove = removePageAtIndex(reordered, 3, 3);
  assert.deepEqual(afterRemove.pages, ['Page2', 'Page3', 'Page1']);
  assert.equal(afterRemove.nextSelectedIndex, 2);
});

test('applyPixelEnhancement transforms RGBA pixels for Grayscale, B&W, and Document Enhancement without mutating input', () => {
  const src = new Uint8ClampedArray([220, 210, 200, 255, 30, 40, 50, 255]);
  const copyBefore = new Uint8ClampedArray(src);

  const gray = applyPixelEnhancement(src, EnhancementMode.GRAYSCALE, 0, 1);
  assert.deepEqual(src, copyBefore); // Non-destructive
  assert.equal(gray[0], gray[1]);
  assert.equal(gray[1], gray[2]);

  const bw = applyPixelEnhancement(src, EnhancementMode.BLACK_AND_WHITE, 0, 1.2);
  assert.equal(bw[0], 255); // Light paper becomes pure white
  assert.equal(bw[4], 12); // Dark ink becomes crisp black

  const docEnhance = applyPixelEnhancement(src, EnhancementMode.DOCUMENT_ENHANCE, 0, 1);
  assert.ok(docEnhance[0] > src[0]); // Paper highlight whitened
  assert.ok(docEnhance[4] < src[4]); // Ink shadow darkened
});

test('computePdfPageGeometry preserves portrait and landscape orientation and scales within margins', () => {
  const portraitA4 = computePdfPageGeometry(1200, 1600, PdfPageSize.A4);
  assert.equal(portraitA4.orientation, 'p');
  assert.ok(portraitA4.drawWidth <= portraitA4.pageWidthPt - 40);
  assert.ok(portraitA4.drawHeight <= portraitA4.pageHeightPt - 40);

  const landscapeLetter = computePdfPageGeometry(1600, 1000, PdfPageSize.LETTER);
  assert.equal(landscapeLetter.orientation, 'l');
  assert.equal(landscapeLetter.pageWidthPt, 792);
  assert.equal(landscapeLetter.pageHeightPt, 612);
});

test('filterAndSortDocuments and reconcileDocumentIntegrity handle search, sorting, and missing files', () => {
  const sampleDocs: ZViewDocumentMeta[] = [
    {
      id: 'doc-1',
      name: 'Beta Tax Receipt',
      createdAt: 1000,
      updatedAt: 3000,
      pageCount: 2,
      fileSizeBytes: 120400,
      pageSize: PdfPageSize.A4,
      thumbnailDataUrl: 'data:image/png;base64,AAA',
    },
    {
      id: 'doc-2',
      name: 'Alpha Medical Form',
      createdAt: 2000,
      updatedAt: 1500,
      pageCount: 4,
      fileSizeBytes: 540000,
      pageSize: PdfPageSize.LETTER,
      thumbnailDataUrl: 'data:image/png;base64,BBB',
    },
  ];

  const byName = filterAndSortDocuments(sampleDocs, '', SortOption.NAME_ASC);
  assert.equal(byName[0].id, 'doc-2');

  const searched = filterAndSortDocuments(sampleDocs, 'tax', SortOption.MODIFIED_DESC);
  assert.equal(searched.length, 1);
  assert.equal(searched[0].id, 'doc-1');

  const reconciled = reconcileDocumentIntegrity(sampleDocs, new Set(['doc-1']));
  assert.equal(reconciled.find((d) => d.id === 'doc-1')?.isFileMissing, false);
  assert.equal(reconciled.find((d) => d.id === 'doc-2')?.isFileMissing, true);
  assert.equal(formatBytes(1536), '1.5 KB');
});
