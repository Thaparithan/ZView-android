import { jsPDF } from 'jspdf';
import {
  PdfPageSize,
  computePdfPageGeometry,
  validateFilename,
  type ScannedPage,
} from '../domain/zviewLogic';

export interface GeneratedPdfOutput {
  blob: Blob;
  dataUrl: string;
  sizeBytes: number;
  sanitizedFilename: string;
}

/**
 * Combines multiple scanned pages into a real, standards-compliant PDF document
 * offline using jsPDF, preserving page orientation and readable resolution.
 */
export async function generateMultiPagePdf(
  rawDocumentName: string,
  pages: ScannedPage[],
  pageSize: PdfPageSize
): Promise<GeneratedPdfOutput> {
  if (!pages || pages.length === 0) {
    throw new Error('Cannot generate a PDF with zero pages.');
  }

  const validation = validateFilename(rawDocumentName, [], true);
  if (!validation.isValid) {
    throw new Error(validation.errorMessage ?? 'Invalid PDF filename.');
  }

  const firstPage = pages[0];
  const firstGeom = computePdfPageGeometry(
    firstPage.width || 900,
    firstPage.height || 1200,
    pageSize
  );

  const pdf = new jsPDF({
    orientation: firstGeom.orientation,
    unit: 'pt',
    format: [firstGeom.pageWidthPt, firstGeom.pageHeightPt],
    compress: true,
  });

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const geom = computePdfPageGeometry(page.width || 900, page.height || 1200, pageSize);

    if (i > 0) {
      pdf.addPage([geom.pageWidthPt, geom.pageHeightPt], geom.orientation);
    }

    // Crisp white page background
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, geom.pageWidthPt, geom.pageHeightPt, 'F');

    const imgData = page.processedDataUrl || page.originalDataUrl;
    if (!imgData || !imgData.startsWith('data:image/')) {
      throw new Error(`Page ${i + 1} image data is missing or corrupt.`);
    }

    const format = imgData.startsWith('data:image/png') ? 'PNG' : 'JPEG';
    pdf.addImage(
      imgData,
      format,
      geom.drawX,
      geom.drawY,
      geom.drawWidth,
      geom.drawHeight,
      `page_${i + 1}`,
      'FAST'
    );
  }

  const arrayBuffer = pdf.output('arraybuffer');
  const blob = new Blob([arrayBuffer], { type: 'application/pdf' });

  if (blob.size <= 0) {
    throw new Error('PDF verification failed: generated PDF stream is empty.');
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string' && reader.result.length > 0) {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to encode PDF output stream.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read generated PDF blob.'));
    reader.readAsDataURL(blob);
  });

  return {
    blob,
    dataUrl,
    sizeBytes: blob.size,
    sanitizedFilename: `${validation.sanitizedName}.pdf`,
  };
}

export function triggerPdfDownload(dataUrl: string, filename: string): void {
  const safeName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  const anchor = document.createElement('a');
  anchor.href = dataUrl;
  anchor.download = safeName;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

export async function shareOrDownloadPdf(dataUrl: string, documentName: string): Promise<'shared' | 'downloaded'> {
  const safeName = documentName.endsWith('.pdf') ? documentName : `${documentName}.pdf`;
  try {
    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], safeName, { type: 'application/pdf' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: safeName,
          text: `Shared from ZView Document Scanner: ${safeName}`,
          files: [file],
        });
        return 'shared';
      }
    }
  } catch {
    // Fall back to direct file download if Web Share is cancelled or unsupported
  }
  triggerPdfDownload(dataUrl, safeName);
  return 'downloaded';
}
