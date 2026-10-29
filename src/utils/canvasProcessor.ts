import {
  EnhancementMode,
  applyPixelEnhancement,
  DEFAULT_CROP_BOUNDS,
  type CropBounds,
} from '../domain/zviewLogic';

export type SampleTemplateType = 'invoice' | 'contract' | 'notes';

/**
 * Generates a realistic, high-contrast physical document image on a dark desk surface
 * so the scanner can demonstrate boundary detection, corner cropping, and filter enhancement
 * even when running in headless Chromium or on a device without a physical rear camera.
 */
export function renderSampleDocumentSheet(template: SampleTemplateType = 'invoice'): string {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 1200;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Dark textured desk background around the paper sheet
  ctx.fillStyle = '#141419';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle paper drop shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(46, 54, 816, 1104);

  // Warm off-white physical paper stock (shows clear difference when Document Enhancement whitens it)
  ctx.fillStyle = '#F2EFE9';
  ctx.fillRect(36, 42, 828, 1116);

  // Subtle paper border
  ctx.strokeStyle = '#D8D3C8';
  ctx.lineWidth = 2;
  ctx.strokeRect(36, 42, 828, 1116);

  // Header Accent Bar
  ctx.fillStyle = '#007BA7';
  ctx.fillRect(84, 96, 732, 8);

  ctx.fillStyle = '#16181D';
  ctx.font = 'bold 34px sans-serif';

  if (template === 'invoice') {
    ctx.fillText('ZYNOR LOGISTICS — TAX INVOICE', 84, 156);
    ctx.font = '500 18px monospace';
    ctx.fillStyle = '#4A4E58';
    ctx.fillText('INVOICE NO: INV-2026-0842      DATE: OCT 24, 2026', 84, 196);
    ctx.fillText('BILL TO: Horizon Field Operations Ltd.', 84, 228);

    // Table header
    ctx.fillStyle = '#E2DDD2';
    ctx.fillRect(84, 272, 732, 44);
    ctx.fillStyle = '#16181D';
    ctx.font = 'bold 17px sans-serif';
    ctx.fillText('DESCRIPTION', 102, 300);
    ctx.fillText('QTY', 520, 300);
    ctx.fillText('AMOUNT', 680, 300);

    const rows = [
      ['Optical Field Calibration Kit (Model Z-9)', '2', '$1,280.00'],
      ['Encrypted Offline Storage Module (256 GB)', '4', '$960.00'],
      ['Annual On-Site Maintenance & Inspection', '1', '$650.00'],
      ['Express Courier Freight & Customs Handling', '1', '$145.00'],
    ];

    ctx.font = '18px sans-serif';
    rows.forEach((r, i) => {
      const y = 362 + i * 64;
      ctx.fillStyle = '#22252C';
      ctx.fillText(r[0], 102, y);
      ctx.fillText(r[1], 530, y);
      ctx.fillText(r[2], 680, y);
      ctx.strokeStyle = '#DCD7CC';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(84, y + 22);
      ctx.lineTo(816, y + 22);
      ctx.stroke();
    });

    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = '#0A0A0A';
    ctx.fillText('TOTAL PAID: $3,035.00 USD', 465, 690);

    // Paid Stamp in Cerulean
    ctx.save();
    ctx.translate(220, 740);
    ctx.rotate(-0.14);
    ctx.strokeStyle = '#007BA7';
    ctx.lineWidth = 4;
    ctx.strokeRect(-90, -34, 220, 68);
    ctx.font = 'bold 26px monospace';
    ctx.fillStyle = '#007BA7';
    ctx.fillText('VERIFIED PAID', -74, 10);
    ctx.restore();
  } else if (template === 'contract') {
    ctx.fillText('MUTUAL NON-DISCLOSURE AGREEMENT', 84, 156);
    ctx.font = '18px monospace';
    ctx.fillStyle = '#4A4E58';
    ctx.fillText('DOCUMENT REF: NDA-ZVIEW-9910 · PAGE 1 OF 1', 84, 198);

    const paragraphs = [
      '1. PURPOSE. The parties wish to explore a technical partnership',
      'regarding offline-first document imaging and local cryptographic',
      'storage without transmitting confidential records to external servers.',
      '',
      '2. CONFIDENTIALITY OBLIGATIONS. Receiving Party agrees to hold all',
      'proprietary specifications, hardware schematics, and source code in',
      'strict confidence using at least the same degree of care used for',
      'its own sensitive materials.',
      '',
      '3. LOCAL DATA SOVEREIGNTY. All scanned artifacts generated during',
      'evaluation remain strictly on-device under user control.',
    ];

    ctx.font = '20px serif';
    ctx.fillStyle = '#1E2026';
    paragraphs.forEach((line, idx) => {
      ctx.fillText(line, 84, 270 + idx * 42);
    });

    ctx.strokeStyle = '#22252C';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(84, 860);
    ctx.lineTo(380, 860);
    ctx.moveTo(480, 860);
    ctx.lineTo(780, 860);
    ctx.stroke();

    ctx.font = '16px sans-serif';
    ctx.fillText('Authorized Signature (Disclosing Party)', 84, 892);
    ctx.fillText('Authorized Signature (Receiving Party)', 480, 892);
  } else {
    ctx.fillText('ENGINEERING LAB INSPECTION LOG', 84, 156);
    ctx.font = '18px monospace';
    ctx.fillStyle = '#4A4E58';
    ctx.fillText('BATCH #409-B · OPTICAL RESOLUTION BENCHMARK', 84, 198);

    for (let y = 260; y <= 920; y += 44) {
      ctx.strokeStyle = '#D5D0C5';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(84, y);
      ctx.lineTo(816, y);
      ctx.stroke();
    }

    ctx.font = '20px monospace';
    ctx.fillStyle = '#181A20';
    ctx.fillText('[x] Sensor Focus Lock: 12.4 ms (PASS)', 100, 294);
    ctx.fillText('[x] Corner Boundary Detection: 99.4% IoU (PASS)', 100, 382);
    ctx.fillText('[x] B&W Adaptive Threshold Contrast: +38% (PASS)', 100, 470);
    ctx.fillText('[x] Multi-Page PDF Stream Sync: Verified (PASS)', 100, 558);
    ctx.fillText('[x] Zero Network Telemetry Audit: 0 Packets (PASS)', 100, 646);
  }

  // Footer metadata on physical sheet
  ctx.font = '15px monospace';
  ctx.fillStyle = '#686D78';
  ctx.fillText('Scanned locally with Z Scan: PDF Maker · 300 DPI Optical Capture', 84, 1095);

  return canvas.toDataURL('image/jpeg', 0.92);
}

/**
 * Non-destructively processes a source image DataURL on an offscreen HTML5 Canvas,
 * applying 4-corner bounding-box crop, 90-degree rotation increments, and pixel-level
 * enhancement (Original Color, Grayscale, Black and White, Document Enhancement, brightness, contrast).
 */
export async function processDocumentPageImage(
  sourceDataUrl: string,
  options: {
    enhancementMode: EnhancementMode;
    rotationDegrees: number;
    brightness: number;
    contrast: number;
    cropBounds?: CropBounds;
  }
): Promise<{ processedDataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const bounds = options.cropBounds ?? DEFAULT_CROP_BOUNDS;
        const minX = Math.max(0, Math.min(bounds.topLeft.x, bounds.bottomLeft.x));
        const maxX = Math.min(1, Math.max(bounds.topRight.x, bounds.bottomRight.x));
        const minY = Math.max(0, Math.min(bounds.topLeft.y, bounds.topRight.y));
        const maxY = Math.min(1, Math.max(bounds.bottomLeft.y, bounds.bottomRight.y));

        const srcX = Math.round(minX * img.width);
        const srcY = Math.round(minY * img.height);
        const srcW = Math.max(32, Math.round((maxX - minX) * img.width));
        const srcH = Math.max(32, Math.round((maxY - minY) * img.height));

        const rot = ((options.rotationDegrees % 360) + 360) % 360;
        const swapDims = rot === 90 || rot === 270;

        // Downscale oversized images slightly to prevent UI freezing while keeping crisp text
        const maxDim = 1400;
        const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
        const targetW = Math.max(1, Math.round((swapDims ? srcH : srcW) * scale));
        const targetH = Math.max(1, Math.round((swapDims ? srcW : srcH) * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Unable to initialize 2D image processing context.'));
          return;
        }

        ctx.save();
        ctx.translate(targetW / 2, targetH / 2);
        ctx.rotate((rot * Math.PI) / 180);
        const drawW = swapDims ? targetH : targetW;
        const drawH = swapDims ? targetW : targetH;
        ctx.drawImage(img, srcX, srcY, srcW, srcH, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();

        // Apply pixel enhancement when needed
        if (
          options.enhancementMode !== EnhancementMode.ORIGINAL ||
          options.brightness !== 0 ||
          options.contrast !== 1
        ) {
          const imageData = ctx.getImageData(0, 0, targetW, targetH);
          const enhancedPixels = applyPixelEnhancement(
            imageData.data,
            options.enhancementMode,
            options.brightness,
            options.contrast
          );
          const outImageData = new ImageData(
            new Uint8ClampedArray(enhancedPixels),
            targetW,
            targetH
          );
          ctx.putImageData(outImageData, 0, 0);
        }

        const processedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        resolve({ processedDataUrl, width: targetW, height: targetH });
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Failed to process document image.'));
      }
    };
    img.onerror = () => reject(new Error('Corrupt or unsupported image format.'));
    img.src = sourceDataUrl;
  });
}
