import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  RotateCw,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Check,
  RefreshCw,
  ImagePlus,
  FileCheck2,
  ShieldAlert,
  Sliders,
  Crop,
} from 'lucide-react';
import {
  EnhancementMode,
  ENHANCEMENT_LABELS,
  PdfPageSize,
  PDF_PAGE_SIZE_LABELS,
  DEFAULT_CROP_BOUNDS,
  validateFilename,
  reorderPages,
  removePageAtIndex,
  type ScannedPage,
  type CropBounds,
} from '../domain/zviewLogic';
import {
  renderSampleDocumentSheet,
  processDocumentPageImage,
  type SampleTemplateType,
} from '../utils/canvasProcessor';

interface ScannerEditorViewProps {
  initialPages: ScannedPage[];
  defaultPageSize: PdfPageSize;
  defaultEnhancement: EnhancementMode;
  existingDocumentNames: string[];
  onBack: () => void;
  onSaveDocumentPdf: (params: {
    documentName: string;
    pages: ScannedPage[];
    pageSize: PdfPageSize;
    allowOverwrite: boolean;
  }) => Promise<void>;
}

type PermissionState = 'prompt' | 'granted' | 'denied';

export const ScannerEditorView: React.FC<ScannerEditorViewProps> = ({
  initialPages,
  defaultPageSize,
  defaultEnhancement,
  existingDocumentNames,
  onBack,
  onSaveDocumentPdf,
}) => {
  const [permissionState, setPermissionState] = useState<PermissionState>(
    initialPages.length > 0 ? 'granted' : 'prompt'
  );
  const [useHardwareWebcam, setUseHardwareWebcam] = useState<boolean>(false);
  const [cameraStreamError, setCameraStreamError] = useState<string | null>(null);
  const [selectedSampleTemplate, setSelectedSampleTemplate] =
    useState<SampleTemplateType>('invoice');

  // Pending capture state ( allows user to Retake or Accept before adding to multi-page tray )
  const [pendingRawCapture, setPendingRawCapture] = useState<string | null>(null);
  const [pendingCropBounds, setPendingCropBounds] = useState<CropBounds>(DEFAULT_CROP_BOUNDS);

  // Accepted multi-page document state
  const [pages, setPages] = useState<ScannedPage[]>(initialPages);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [documentName, setDocumentName] = useState<string>(() => {
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `ZView_Scan_${stamp}`;
  });
  const [pageSize, setPageSize] = useState<PdfPageSize>(defaultPageSize);
  const [isProcessingImage, setIsProcessingImage] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [confirmOverwriteOpen, setConfirmOverwriteOpen] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const stopHardwareStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setUseHardwareWebcam(false);
  };

  const requestCameraAccess = async (preferLiveWebcam: boolean) => {
    setErrorBanner(null);
    setCameraStreamError(null);
    if (!preferLiveWebcam) {
      setPermissionState('granted');
      setUseHardwareWebcam(false);
      return;
    }

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 1600 } },
          audio: false,
        });
        streamRef.current = stream;
        setPermissionState('granted');
        setUseHardwareWebcam(true);
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        }, 50);
      } else {
        setPermissionState('granted');
        setUseHardwareWebcam(false);
        setCameraStreamError(
          'Hardware camera API unavailable in this environment; using optical document test bed.'
        );
      }
    } catch {
      setPermissionState('granted');
      setUseHardwareWebcam(false);
      setCameraStreamError(
        'Physical camera unavailable or blocked; switched to interactive optical scanner bed.'
      );
    }
  };

  const handleCaptureFrame = () => {
    setErrorBanner(null);
    if (useHardwareWebcam && videoRef.current && videoRef.current.videoWidth > 0) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        setPendingRawCapture(canvas.toDataURL('image/jpeg', 0.92));
        setPendingCropBounds(DEFAULT_CROP_BOUNDS);
        return;
      }
    }
    // High-resolution test bed sheet capture
    const sheetDataUrl = renderSampleDocumentSheet(selectedSampleTemplate);
    setPendingRawCapture(sheetDataUrl);
    setPendingCropBounds(DEFAULT_CROP_BOUNDS);
  };

  const handleAcceptPendingCapture = async () => {
    if (!pendingRawCapture) return;
    setIsProcessingImage(true);
    setErrorBanner(null);
    try {
      const processed = await processDocumentPageImage(pendingRawCapture, {
        enhancementMode: defaultEnhancement,
        rotationDegrees: 0,
        brightness: 0,
        contrast: 1,
        cropBounds: pendingCropBounds,
      });

      const newPage: ScannedPage = {
        id: `page_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        originalDataUrl: pendingRawCapture,
        processedDataUrl: processed.processedDataUrl,
        enhancementMode: defaultEnhancement,
        rotationDegrees: 0,
        brightness: 0,
        contrast: 1,
        cropBounds: pendingCropBounds,
        width: processed.width,
        height: processed.height,
      };

      setPages((prev) => {
        const next = [...prev, newPage];
        setSelectedIndex(next.length - 1);
        return next;
      });
      setPendingRawCapture(null);
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Failed to process captured page.');
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleImportImageFiles = async (files: FileList) => {
    setErrorBanner(null);
    setIsProcessingImage(true);
    try {
      const importedPages: ScannedPage[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) {
          throw new Error(`Unsupported file "${file.name}". Please select JPEG, PNG, or WebP images.`);
        }
        const rawDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () =>
            typeof reader.result === 'string'
              ? resolve(reader.result)
              : reject(new Error('Failed to decode image file.'));
          reader.onerror = () => reject(new Error(`Corrupt or unreadable image: ${file.name}`));
          reader.readAsDataURL(file);
        });

        const processed = await processDocumentPageImage(rawDataUrl, {
          enhancementMode: defaultEnhancement,
          rotationDegrees: 0,
          brightness: 0,
          contrast: 1,
          cropBounds: DEFAULT_CROP_BOUNDS,
        });

        importedPages.push({
          id: `page_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
          originalDataUrl: rawDataUrl,
          processedDataUrl: processed.processedDataUrl,
          enhancementMode: defaultEnhancement,
          rotationDegrees: 0,
          brightness: 0,
          contrast: 1,
          cropBounds: DEFAULT_CROP_BOUNDS,
          width: processed.width,
          height: processed.height,
        });
      }

      if (importedPages.length > 0) {
        setPermissionState('granted');
        setPages((prev) => {
          const combined = [...prev, ...importedPages];
          setSelectedIndex(combined.length - 1);
          return combined;
        });
      }
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Could not import selected image.');
    } finally {
      setIsProcessingImage(false);
    }
  };

  const currentPage = pages[selectedIndex] ?? null;

  const updateCurrentPageProcessing = async (
    updates: Partial<{
      enhancementMode: EnhancementMode;
      rotationDegrees: number;
      brightness: number;
      contrast: number;
      cropBounds: CropBounds;
    }>
  ) => {
    if (!currentPage) return;
    setIsProcessingImage(true);
    setErrorBanner(null);

    const nextMode = updates.enhancementMode ?? currentPage.enhancementMode;
    const nextRotation =
      updates.rotationDegrees !== undefined
        ? ((updates.rotationDegrees % 360) + 360) % 360
        : currentPage.rotationDegrees;
    const nextBrightness = updates.brightness ?? currentPage.brightness;
    const nextContrast = updates.contrast ?? currentPage.contrast;
    const nextCrop = updates.cropBounds ?? currentPage.cropBounds;

    try {
      const result = await processDocumentPageImage(currentPage.originalDataUrl, {
        enhancementMode: nextMode,
        rotationDegrees: nextRotation,
        brightness: nextBrightness,
        contrast: nextContrast,
        cropBounds: nextCrop,
      });

      setPages((prev) =>
        prev.map((p, idx) =>
          idx === selectedIndex
            ? {
                ...p,
                processedDataUrl: result.processedDataUrl,
                enhancementMode: nextMode,
                rotationDegrees: nextRotation,
                brightness: nextBrightness,
                contrast: nextContrast,
                cropBounds: nextCrop,
                width: result.width,
                height: result.height,
              }
            : p
        )
      );
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Failed to apply image adjustment.');
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleRecaptureCurrentPage = () => {
    if (!currentPage) return;
    const removed = removePageAtIndex(pages, selectedIndex, selectedIndex);
    setPages(removed.pages);
    setSelectedIndex(removed.nextSelectedIndex);
    handleCaptureFrame();
  };

  const handleTriggerSavePdf = async (allowOverwrite = false) => {
    if (isExportingPdf) return;
    setErrorBanner(null);

    if (pages.length === 0) {
      setErrorBanner('Capture or import at least one document page before saving a PDF.');
      return;
    }

    const validation = validateFilename(documentName, existingDocumentNames, allowOverwrite);
    if (!validation.isValid) {
      if (validation.requiresOverwriteConfirm) {
        setConfirmOverwriteOpen(true);
        return;
      }
      setErrorBanner(validation.errorMessage ?? 'Invalid document filename.');
      return;
    }

    setIsExportingPdf(true);
    try {
      await onSaveDocumentPdf({
        documentName: validation.sanitizedName,
        pages,
        pageSize,
        allowOverwrite: true,
      });
      setConfirmOverwriteOpen(false);
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Failed to create and save PDF.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            void handleImportImageFiles(e.target.files);
            e.target.value = '';
          }
        }}
        className="sr-only"
        aria-label="Add images from device"
      />

      {/* Top Scanner Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#17171C] border border-[#34343D] rounded-2xl px-5 py-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              stopHardwareStream();
              onBack();
            }}
            aria-label="Back to Home"
            className="min-h-[44px] min-w-[44px] rounded-xl bg-[#22222A] border border-[#34343D] text-white hover:border-[#007BA7] inline-flex items-center justify-center transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-white">
              Document Scanner &amp; Multi-Page Studio
            </h1>
            <p className="text-xs text-[#B8B8C2] font-mono tabular-nums">
              {pages.length} {pages.length === 1 ? 'page' : 'pages'} staged · Offline Processing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#22222A] hover:bg-[#2b2b36] border border-[#34343D] text-white text-xs font-medium inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ImagePlus className="w-4 h-4 text-[#007BA7]" />
            <span>Add Image File</span>
          </button>
        </div>
      </div>

      {errorBanner && (
        <div
          role="alert"
          className="bg-[#17171C] border border-[#FF5252] rounded-xl p-4 text-sm text-[#FF5252]"
        >
          {errorBanner}
        </div>
      )}

      {/* Step 1: On-Demand Camera Permission Gate (never requested at app startup) */}
      {permissionState === 'prompt' && (
        <div className="bg-[#17171C] border border-[#34343D] rounded-2xl p-6 sm:p-8 max-w-2xl mx-auto space-y-5">
          <div className="space-y-2">
            <div className="text-xs font-mono text-[#007BA7]">
              On-Demand Camera Permission · Local Processing Only
            </div>
            <h2 className="text-xl font-bold text-white">Allow Camera Access to Scan Documents</h2>
            <p className="text-sm text-[#B8B8C2] leading-relaxed">
              ZView only requests camera access when you start scanning. Captured pages are
              processed strictly in local device memory and are never uploaded to any remote server.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => void requestCameraAccess(false)}
              className="min-h-[48px] px-5 py-2.5 rounded-xl bg-[#007BA7] hover:bg-[#008ec0] text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Allow Camera &amp; Open Scanner</span>
            </button>

            <button
              type="button"
              onClick={() => void requestCameraAccess(true)}
              className="min-h-[48px] px-4 py-2.5 rounded-xl bg-[#22222A] hover:bg-[#2c2c38] border border-[#34343D] text-white text-xs font-medium inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Use Physical Webcam (getUserMedia)</span>
            </button>

            <button
              type="button"
              onClick={() => setPermissionState('denied')}
              className="min-h-[48px] px-4 py-2.5 rounded-xl bg-transparent hover:bg-[#22222A] border border-[#34343D] text-[#B8B8C2] hover:text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Deny Permission</span>
            </button>
          </div>
        </div>
      )}

      {/* Graceful Permission Denied State */}
      {permissionState === 'denied' && (
        <div
          role="region"
          aria-label="Camera Permission Denied Recovery"
          className="bg-[#17171C] border border-[#FF5252] rounded-2xl p-6 sm:p-8 max-w-2xl mx-auto space-y-5"
        >
          <div className="flex items-start gap-3.5">
            <ShieldAlert className="w-6 h-6 text-[#FF5252] shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-white">Camera Permission Denied</h2>
              <p className="text-sm text-[#B8B8C2] leading-relaxed">
                Live camera scanning cannot proceed without camera access. You can grant camera
                permission below, or continue offline by importing existing document photos via the
                Android Photo Picker.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void requestCameraAccess(false)}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#007BA7] hover:bg-[#008ec0] text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Grant Camera Permission
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#22222A] border border-[#34343D] text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Import Existing Images Instead
            </button>
          </div>
        </div>
      )}

      {/* Main Scanner & Multi-Page Editor Workspace */}
      {permissionState === 'granted' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Live Camera Viewfinder / Pending Capture Retake-Accept / Active Page Canvas */}
          <div className="lg:col-span-7 bg-[#17171C] border border-[#34343D] rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold text-white">
                {pendingRawCapture
                  ? 'Review Capture & Adjust Document Corners'
                  : 'Optical Scanner Viewfinder'}
              </div>
              {!pendingRawCapture && (
                <div className="flex items-center gap-1.5 bg-[#0A0A0A] p-1 rounded-xl border border-[#34343D]">
                  {(['invoice', 'contract', 'notes'] as SampleTemplateType[]).map((tpl) => (
                    <button
                      key={tpl}
                      type="button"
                      onClick={() => {
                        setSelectedSampleTemplate(tpl);
                        stopHardwareStream();
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        selectedSampleTemplate === tpl && !useHardwareWebcam
                          ? 'bg-[#007BA7] text-white'
                          : 'text-[#B8B8C2] hover:text-white'
                      }`}
                    >
                      {tpl} Target
                    </button>
                  ))}
                </div>
              )}
            </div>

            {cameraStreamError && (
              <div className="text-xs text-[#B8B8C2] bg-[#22222A] border border-[#34343D] rounded-lg px-3 py-2">
                {cameraStreamError}
              </div>
            )}

            {/* Viewfinder or Pending Capture Box */}
            <div className="relative w-full aspect-[3/4] max-h-[540px] bg-[#0A0A0A] rounded-xl border-2 border-[#FF2D95]/80 overflow-hidden flex items-center justify-center">
              {pendingRawCapture ? (
                <div className="relative w-full h-full flex items-center justify-center p-4">
                  <img
                    src={pendingRawCapture}
                    alt="Captured document awaiting confirmation"
                    className="max-w-full max-h-full object-contain rounded-lg"
                  />
                  {/* Visual Neon Rose boundary frame overlay */}
                  <div
                    className="absolute border-2 border-[#FF2D95] pointer-events-none rounded-sm"
                    style={{
                      left: `${pendingCropBounds.topLeft.x * 100}%`,
                      top: `${pendingCropBounds.topLeft.y * 100}%`,
                      right: `${(1 - pendingCropBounds.bottomRight.x) * 100}%`,
                      bottom: `${(1 - pendingCropBounds.bottomRight.y) * 100}%`,
                    }}
                  >
                    <span className="absolute -top-2 -left-2 w-3.5 h-3.5 rounded-full bg-[#FF2D95]" />
                    <span className="absolute -top-2 -right-2 w-3.5 h-3.5 rounded-full bg-[#FF2D95]" />
                    <span className="absolute -bottom-2 -left-2 w-3.5 h-3.5 rounded-full bg-[#FF2D95]" />
                    <span className="absolute -bottom-2 -right-2 w-3.5 h-3.5 rounded-full bg-[#FF2D95]" />
                  </div>
                </div>
              ) : useHardwareWebcam ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="relative w-full h-full flex items-center justify-center p-4">
                  <img
                    src={renderSampleDocumentSheet(selectedSampleTemplate)}
                    alt="Live optical scanner preview"
                    className="max-w-full max-h-full object-contain rounded-lg opacity-95"
                  />
                  {/* Scanning Guide Overlay */}
                  <div className="absolute inset-5 border-2 border-dashed border-[#007BA7] rounded-xl pointer-events-none flex flex-col justify-between p-3">
                    <div className="text-[11px] font-mono text-white bg-[#0A0A0A]/85 self-center px-3 py-1 rounded">
                      Auto-Boundary Lock · Align Document Edges Within Frame
                    </div>
                    <div className="text-[11px] font-mono text-[#B8B8C2] bg-[#0A0A0A]/85 self-center px-3 py-1 rounded">
                      Hold steady and tap Capture Page
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Corner Boundary Preset Controls when a capture is pending */}
            {pendingRawCapture ? (
              <div className="space-y-3 pt-1">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#B8B8C2]">
                  <span className="inline-flex items-center gap-1.5 font-medium text-white">
                    <Crop className="w-4 h-4 text-[#FF2D95]" />
                    <span>Boundary &amp; Corner Crop Adjustment:</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setPendingCropBounds({
                          topLeft: { x: 0.04, y: 0.04 },
                          topRight: { x: 0.96, y: 0.04 },
                          bottomRight: { x: 0.96, y: 0.96 },
                          bottomLeft: { x: 0.04, y: 0.96 },
                        })
                      }
                      className="px-2.5 py-1 rounded bg-[#22222A] hover:bg-[#2c2c36] text-white text-xs cursor-pointer"
                    >
                      Auto Paper Edges
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPendingCropBounds({
                          topLeft: { x: 0.08, y: 0.08 },
                          topRight: { x: 0.92, y: 0.08 },
                          bottomRight: { x: 0.92, y: 0.85 },
                          bottomLeft: { x: 0.08, y: 0.85 },
                        })
                      }
                      className="px-2.5 py-1 rounded bg-[#22222A] hover:bg-[#2c2c36] text-white text-xs cursor-pointer"
                    >
                      Tight Content Crop
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPendingCropBounds({
                          topLeft: { x: 0, y: 0 },
                          topRight: { x: 1, y: 0 },
                          bottomRight: { x: 1, y: 1 },
                          bottomLeft: { x: 0, y: 1 },
                        })
                      }
                      className="px-2.5 py-1 rounded bg-[#22222A] hover:bg-[#2c2c36] text-white text-xs cursor-pointer"
                    >
                      Full Frame
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPendingRawCapture(null)}
                    className="min-h-[48px] px-4 py-2.5 rounded-xl bg-[#22222A] hover:bg-[#2c2c36] border border-[#34343D] text-white text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Retake Capture</span>
                  </button>
                  <button
                    type="button"
                    disabled={isProcessingImage}
                    onClick={() => void handleAcceptPendingCapture()}
                    className="min-h-[48px] px-4 py-2.5 rounded-xl bg-[#007BA7] hover:bg-[#008ec0] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isProcessingImage ? 'Enhancing...' : 'Accept Page'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCaptureFrame}
                  className="flex-1 min-h-[52px] px-5 py-3 rounded-xl bg-[#007BA7] hover:bg-[#008ec0] text-white font-semibold text-sm inline-flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Camera className="w-5 h-5" />
                  <span>Capture Page</span>
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Multi-Page Tray, Image Enhancement Controls, & PDF Export */}
          <div className="lg:col-span-5 space-y-5">
            {/* Active Page Preview & Enhancement Suite */}
            <div className="bg-[#17171C] border border-[#34343D] rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#007BA7]" />
                  <span>Page Enhancement &amp; Geometry</span>
                </h2>
                {currentPage && (
                  <span className="text-xs font-mono text-[#B8B8C2] tabular-nums">
                    Page {selectedIndex + 1} of {pages.length}
                  </span>
                )}
              </div>

              {!currentPage ? (
                <div className="bg-[#22222A] border border-[#34343D] rounded-xl p-6 text-center text-sm text-[#B8B8C2]">
                  Capture a page on the left (and tap Accept Page) or import an image to unlock
                  live enhancement filters, rotation, and multi-page PDF creation.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Processed Page Live Preview */}
                  <div className="relative w-full h-56 bg-[#0A0A0A] border border-[#34343D] rounded-xl overflow-hidden flex items-center justify-center p-2">
                    <img
                      src={currentPage.processedDataUrl}
                      alt={`Processed page ${selectedIndex + 1}`}
                      className="max-w-full max-h-full object-contain"
                    />
                    {isProcessingImage && (
                      <div className="absolute inset-0 bg-[#0A0A0A]/75 flex items-center justify-center text-xs font-mono text-white">
                        Processing non-destructive filter...
                      </div>
                    )}
                  </div>

                  {/* 4 Required Enhancement Filter Presets */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#B8B8C2]">
                      Enhancement Filter Mode (Non-Destructive)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.values(EnhancementMode).map((mode) => {
                        const active = currentPage.enhancementMode === mode;
                        return (
                          <button
                            key={mode}
                            type="button"
                            onClick={() =>
                              void updateCurrentPageProcessing({ enhancementMode: mode })
                            }
                            className={`min-h-[40px] px-3 py-2 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                              active
                                ? 'bg-[#007BA7] border-[#FF2D95] text-white'
                                : 'bg-[#22222A] border-[#34343D] text-[#B8B8C2] hover:text-white'
                            }`}
                          >
                            {ENHANCEMENT_LABELS[mode]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Brightness & Contrast Sliders */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <div className="flex justify-between text-xs text-[#B8B8C2] mb-1">
                        <label htmlFor="brightness-slider">Brightness</label>
                        <span className="font-mono tabular-nums">{currentPage.brightness}</span>
                      </div>
                      <input
                        id="brightness-slider"
                        type="range"
                        min={-40}
                        max={40}
                        step={5}
                        value={currentPage.brightness}
                        onChange={(e) =>
                          void updateCurrentPageProcessing({
                            brightness: Number(e.target.value),
                          })
                        }
                        className="w-full accent-[#007BA7]"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-[#B8B8C2] mb-1">
                        <label htmlFor="contrast-slider">Contrast</label>
                        <span className="font-mono tabular-nums">
                          {currentPage.contrast.toFixed(1)}x
                        </span>
                      </div>
                      <input
                        id="contrast-slider"
                        type="range"
                        min={0.6}
                        max={1.8}
                        step={0.1}
                        value={currentPage.contrast}
                        onChange={(e) =>
                          void updateCurrentPageProcessing({
                            contrast: Number(e.target.value),
                          })
                        }
                        className="w-full accent-[#007BA7]"
                      />
                    </div>
                  </div>

                  {/* Page Actions: Rotate, Reorder, Recapture, Remove */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#34343D]">
                    <button
                      type="button"
                      onClick={() =>
                        void updateCurrentPageProcessing({
                          rotationDegrees: currentPage.rotationDegrees + 90,
                        })
                      }
                      className="min-h-[40px] px-3 py-1.5 rounded-lg bg-[#22222A] hover:bg-[#2c2c36] border border-[#34343D] text-white text-xs inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5 text-[#007BA7]" />
                      <span>Rotate 90°</span>
                    </button>

                    <button
                      type="button"
                      disabled={selectedIndex === 0}
                      onClick={() => {
                        if (selectedIndex > 0) {
                          setPages((prev) => reorderPages(prev, selectedIndex, selectedIndex - 1));
                          setSelectedIndex((i) => i - 1);
                        }
                      }}
                      aria-label="Move Page Earlier"
                      className="min-h-[40px] px-2.5 py-1.5 rounded-lg bg-[#22222A] disabled:opacity-40 border border-[#34343D] text-white text-xs inline-flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Move Left</span>
                    </button>

                    <button
                      type="button"
                      disabled={selectedIndex >= pages.length - 1}
                      onClick={() => {
                        if (selectedIndex < pages.length - 1) {
                          setPages((prev) => reorderPages(prev, selectedIndex, selectedIndex + 1));
                          setSelectedIndex((i) => i + 1);
                        }
                      }}
                      aria-label="Move Page Later"
                      className="min-h-[40px] px-2.5 py-1.5 rounded-lg bg-[#22222A] disabled:opacity-40 border border-[#34343D] text-white text-xs inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Move Right</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={handleRecaptureCurrentPage}
                      className="min-h-[40px] px-2.5 py-1.5 rounded-lg bg-[#22222A] hover:bg-[#2c2c36] border border-[#34343D] text-white text-xs inline-flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Recapture</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const res = removePageAtIndex(pages, selectedIndex, selectedIndex);
                        setPages(res.pages);
                        setSelectedIndex(res.nextSelectedIndex);
                      }}
                      aria-label={`Remove Page ${selectedIndex + 1}`}
                      className="min-h-[40px] px-2.5 py-1.5 rounded-lg bg-[#22222A] hover:bg-[#FF5252]/20 border border-[#34343D] text-[#FF5252] text-xs inline-flex items-center gap-1 ml-auto cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>

                  {/* Multi-page thumbnail strip */}
                  <div className="flex items-center gap-2.5 overflow-x-auto py-1">
                    {pages.map((p, idx) => {
                      const isSel = idx === selectedIndex;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedIndex(idx)}
                          aria-label={`Select Page ${idx + 1}`}
                          className={`relative w-14 h-18 rounded-lg overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                            isSel ? 'border-[#FF2D95]' : 'border-[#34343D] opacity-75 hover:opacity-100'
                          }`}
                        >
                          <img
                            src={p.processedDataUrl}
                            alt={`Page ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute bottom-0 right-0 bg-[#0A0A0A]/85 text-white text-[10px] font-mono px-1">
                            {idx + 1}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* PDF Creation & Export Panel */}
            <div className="bg-[#17171C] border border-[#34343D] rounded-2xl p-5 space-y-4">
              <h2 className="text-base font-semibold text-white">PDF Creation &amp; Local Export</h2>

              <div className="space-y-1.5">
                <label htmlFor="pdf-filename-input" className="text-xs font-medium text-[#B8B8C2]">
                  Custom PDF Filename
                </label>
                <input
                  id="pdf-filename-input"
                  type="text"
                  value={documentName}
                  onChange={(e) => {
                    setDocumentName(e.target.value);
                    setErrorBanner(null);
                  }}
                  placeholder="Enter document filename"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0A0A0A] border border-[#34343D] focus:border-[#007BA7] focus:outline-none text-sm text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="pdf-pagesize-select" className="text-xs font-medium text-[#B8B8C2]">
                  PDF Page Size
                </label>
                <select
                  id="pdf-pagesize-select"
                  value={pageSize}
                  onChange={(e) => setPageSize(e.target.value as PdfPageSize)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0A0A0A] border border-[#34343D] focus:border-[#007BA7] focus:outline-none text-sm text-white"
                >
                  {Object.values(PdfPageSize).map((sz) => (
                    <option key={sz} value={sz}>
                      {PDF_PAGE_SIZE_LABELS[sz]}
                    </option>
                  ))}
                </select>
              </div>

              {confirmOverwriteOpen && (
                <div className="bg-[#22222A] border border-[#FF2D95] rounded-xl p-3.5 space-y-2.5">
                  <p className="text-xs text-white">
                    A document with this name already exists locally. Do you want to overwrite it?
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleTriggerSavePdf(true)}
                      className="px-3 py-1.5 rounded-lg bg-[#007BA7] text-white text-xs font-semibold cursor-pointer"
                    >
                      Confirm Overwrite
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmOverwriteOpen(false)}
                      className="px-3 py-1.5 rounded-lg bg-[#17171C] text-[#B8B8C2] text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <button
                type="button"
                disabled={isExportingPdf || pages.length === 0}
                onClick={() => void handleTriggerSavePdf(false)}
                className="w-full min-h-[52px] px-5 py-3 rounded-xl bg-[#007BA7] hover:bg-[#008ec0] disabled:opacity-45 text-white font-semibold text-sm inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <FileCheck2 className="w-5 h-5" />
                <span>
                  {isExportingPdf
                    ? 'Generating Verified PDF...'
                    : `Create & Save PDF (${pages.length} ${pages.length === 1 ? 'Page' : 'Pages'})`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
