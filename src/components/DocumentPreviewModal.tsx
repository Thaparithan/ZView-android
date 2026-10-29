import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  Share2,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  FileText,
  Layers,
  Maximize2,
  RefreshCw,
} from 'lucide-react';
import {
  OFFICIAL_APP_NAME,
  formatBytes,
  validateFilename,
  type ZViewDocumentContent,
  type ZViewDocumentMeta,
} from '../domain/zviewLogic';
import { generateMultiPagePdf } from '../utils/pdfBuilder';

interface DocumentPreviewModalProps {
  meta: ZViewDocumentMeta;
  content: ZViewDocumentContent | null;
  isLoadingContent?: boolean;
  existingNames: string[];
  onClose: () => void;
  onShareOrDownload: (docId: string) => Promise<void>;
  onRename: (docId: string, newName: string) => Promise<void>;
  onDelete: (docId: string) => Promise<void>;
}

type ViewerDisplayMode = 'vertical-scroll' | 'single-page' | 'native-pdf';

function dataUrlToPdfBlob(dataUrl: string): Blob | null {
  try {
    const commaIdx = dataUrl.indexOf(',');
    if (commaIdx === -1) return null;
    const base64 = dataUrl.slice(commaIdx + 1);
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: 'application/pdf' });
  } catch {
    return null;
  }
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  meta,
  content,
  isLoadingContent = false,
  existingNames,
  onClose,
  onShareOrDownload,
  onRename,
  onDelete,
}) => {
  const [viewerMode, setViewerMode] = useState<ViewerDisplayMode>('vertical-scroll');
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [zoomPercent, setZoomPercent] = useState<number>(100);
  const [isRenaming, setIsRenaming] = useState<boolean>(false);
  const [renameText, setRenameText] = useState<string>(meta.name);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState<boolean>(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfRenderError, setPdfRenderError] = useState<string | null>(null);
  const [isRebuildingPdf, setIsRebuildingPdf] = useState<boolean>(false);

  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const pages = content?.pages ?? [];
  const currentPage = pages[activePageIndex] ?? null;

  // Manage PDF Blob URL creation and deterministic memory cleanup when viewer closes
  useEffect(() => {
    let createdObjectUrl: string | null = null;
    let cancelled = false;

    async function preparePdfStream() {
      if (!content) {
        setPdfBlobUrl(null);
        return;
      }

      setPdfRenderError(null);
      let sourceDataUrl = content.pdfDataUrl;

      if (!sourceDataUrl && content.pages.length > 0) {
        try {
          setIsRebuildingPdf(true);
          const rebuilt = await generateMultiPagePdf(meta.name, content.pages, meta.pageSize);
          sourceDataUrl = rebuilt.dataUrl;
        } catch (err) {
          if (!cancelled) {
            setPdfRenderError(
              err instanceof Error ? err.message : 'Unable to render PDF binary stream.'
            );
          }
        } finally {
          if (!cancelled) setIsRebuildingPdf(false);
        }
      }

      if (cancelled || !sourceDataUrl) return;
      const blob = dataUrlToPdfBlob(sourceDataUrl);
      if (!blob) {
        setPdfRenderError('The stored PDF stream is malformed or inaccessible.');
        return;
      }
      createdObjectUrl = URL.createObjectURL(blob);
      setPdfBlobUrl(createdObjectUrl);
    }

    void preparePdfStream();

    return () => {
      cancelled = true;
      if (createdObjectUrl) {
        URL.revokeObjectURL(createdObjectUrl);
      }
    };
  }, [content, meta.name, meta.pageSize]);

  const handleSaveRename = async () => {
    const others = existingNames.filter((n) => n.toLowerCase() !== meta.name.toLowerCase());
    const res = validateFilename(renameText, others, false);
    if (!res.isValid) {
      setRenameError(res.errorMessage ?? 'Invalid filename.');
      return;
    }
    await onRename(meta.id, res.sanitizedName);
    setIsRenaming(false);
  };

  const handleJumpToPage = (index: number) => {
    setActivePageIndex(index);
    if (viewerMode === 'vertical-scroll') {
      const target = pageRefs.current[index];
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Preview Action Bar */}
      <div className="bg-[var(--z-surface)] border border-[var(--z-border)] rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onClose}
            aria-label="Back to Documents"
            className="min-h-[44px] px-3.5 rounded-xl bg-[var(--z-elevated)] border border-[var(--z-border)] text-[var(--z-text-primary)] hover:border-[#007BA7] inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-xs font-semibold hidden sm:inline">Back to Documents</span>
          </button>
          <div className="min-w-0">
            <div className="text-[11px] font-mono text-[#007BA7] uppercase tracking-wider">
              {OFFICIAL_APP_NAME} · In-App PDF Viewer
            </div>
            <h1 className="text-lg font-bold text-[var(--z-text-primary)] truncate">
              {meta.name}.pdf
            </h1>
            <div className="text-xs font-mono text-[var(--z-text-secondary)] tabular-nums">
              <span>
                {meta.pageCount} {meta.pageCount === 1 ? 'page' : 'pages'}
              </span>
              <span aria-hidden="true"> · </span>
              <span>{formatBytes(meta.fileSizeBytes)}</span>
              <span aria-hidden="true"> · </span>
              <span>{meta.pageSize}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Viewer Mode Switcher */}
          <div
            role="group"
            aria-label="PDF Viewer Mode"
            className="flex items-center bg-[var(--z-bg)] border border-[var(--z-border)] rounded-xl p-1"
          >
            <button
              type="button"
              onClick={() => setViewerMode('vertical-scroll')}
              className={`min-h-[36px] px-2.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewerMode === 'vertical-scroll'
                  ? 'bg-[#007BA7] text-white'
                  : 'text-[var(--z-text-secondary)] hover:text-[var(--z-text-primary)]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Vertical Scroll</span>
            </button>
            <button
              type="button"
              onClick={() => setViewerMode('single-page')}
              className={`min-h-[36px] px-2.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewerMode === 'single-page'
                  ? 'bg-[#007BA7] text-white'
                  : 'text-[var(--z-text-secondary)] hover:text-[var(--z-text-primary)]'
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Single Page</span>
            </button>
            <button
              type="button"
              onClick={() => setViewerMode('native-pdf')}
              className={`min-h-[36px] px-2.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewerMode === 'native-pdf'
                  ? 'bg-[#007BA7] text-white'
                  : 'text-[var(--z-text-secondary)] hover:text-[var(--z-text-primary)]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF Stream</span>
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center bg-[var(--z-bg)] border border-[var(--z-border)] rounded-xl p-1">
            <button
              type="button"
              onClick={() => setZoomPercent((z) => Math.max(60, z - 20))}
              aria-label="Zoom Out"
              className="min-h-[36px] min-w-[36px] rounded-lg text-[var(--z-text-secondary)] hover:text-[var(--z-text-primary)] inline-flex items-center justify-center cursor-pointer"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setZoomPercent(100)}
              aria-label="Reset Zoom"
              className="px-2.5 text-xs font-mono text-[var(--z-text-primary)] tabular-nums cursor-pointer"
            >
              {zoomPercent}%
            </button>
            <button
              type="button"
              onClick={() => setZoomPercent((z) => Math.min(240, z + 20))}
              aria-label="Zoom In"
              className="min-h-[36px] min-w-[36px] rounded-lg text-[var(--z-text-secondary)] hover:text-[var(--z-text-primary)] inline-flex items-center justify-center cursor-pointer"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setRenameText(meta.name);
              setRenameError(null);
              setIsRenaming(true);
            }}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[var(--z-elevated)] hover:border-[#007BA7] border border-[var(--z-border)] text-[var(--z-text-primary)] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Pencil className="w-4 h-4 text-[#007BA7]" />
            <span>Rename</span>
          </button>

          <button
            type="button"
            onClick={() => void onShareOrDownload(meta.id)}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-[#007BA7] hover:bg-[#008ec0] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>Share / Export PDF</span>
          </button>

          <button
            type="button"
            onClick={() => setIsConfirmingDelete(true)}
            aria-label="Delete Document"
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[var(--z-elevated)] hover:bg-[#FF5252]/20 border border-[var(--z-border)] text-[#FF5252] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Inline Rename Drawer */}
      {isRenaming && (
        <div className="bg-[var(--z-surface)] border border-[#007BA7] rounded-2xl p-4 flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={renameText}
            onChange={(e) => {
              setRenameText(e.target.value);
              setRenameError(null);
            }}
            aria-label="New Document Filename"
            className="flex-1 min-w-[200px] min-h-[42px] px-3.5 py-2 rounded-xl bg-[var(--z-bg)] border border-[var(--z-border)] text-sm text-[var(--z-text-primary)]"
          />
          <button
            type="button"
            onClick={() => void handleSaveRename()}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-[#007BA7] text-white text-xs font-semibold cursor-pointer"
          >
            Save Rename
          </button>
          <button
            type="button"
            onClick={() => setIsRenaming(false)}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-[var(--z-elevated)] text-[var(--z-text-secondary)] text-xs cursor-pointer"
          >
            Cancel
          </button>
          {renameError && <p className="w-full text-xs text-[#FF5252]">{renameError}</p>}
        </div>
      )}

      {/* Inline Delete Confirmation */}
      {isConfirmingDelete && (
        <div className="bg-[var(--z-surface)] border border-[#FF5252] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-[var(--z-text-primary)]">
            Permanently delete <strong>{meta.name}.pdf</strong> from local storage?
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void onDelete(meta.id)}
              className="min-h-[40px] px-4 py-1.5 rounded-xl bg-[#FF5252] text-white text-xs font-semibold cursor-pointer"
            >
              Confirm Delete
            </button>
            <button
              type="button"
              onClick={() => setIsConfirmingDelete(false)}
              className="min-h-[40px] px-4 py-1.5 rounded-xl bg-[var(--z-elevated)] text-[var(--z-text-secondary)] text-xs cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Loading / Missing / Multi-Page PDF Viewer Content */}
      {isLoadingContent || isRebuildingPdf ? (
        <div className="bg-[var(--z-surface)] border border-[var(--z-border)] rounded-2xl p-12 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-[#007BA7] mx-auto animate-spin" />
          <h2 className="text-base font-semibold text-[var(--z-text-primary)]">
            Opening PDF Document...
          </h2>
          <p className="text-xs font-mono text-[var(--z-text-secondary)]">
            Rendering {meta.pageCount} {meta.pageCount === 1 ? 'page' : 'pages'} in{' '}
            {OFFICIAL_APP_NAME}
          </p>
        </div>
      ) : !content || pages.length === 0 ? (
        <div className="bg-[var(--z-surface)] border border-[#FF5252] rounded-2xl p-10 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-[#FF5252] mx-auto" />
          <h2 className="text-base font-semibold text-[var(--z-text-primary)]">
            PDF File Missing or Inaccessible
          </h2>
          <p className="text-sm text-[var(--z-text-secondary)] max-w-md mx-auto">
            The underlying PDF or page image files for <strong>{meta.name}.pdf</strong> were
            deleted, moved, or corrupted externally. You can return to the document list or remove
            this stale entry.
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-[var(--z-elevated)] border border-[var(--z-border)] text-xs font-semibold text-[var(--z-text-primary)] cursor-pointer"
            >
              Return to Document List
            </button>
            <button
              type="button"
              onClick={() => void onDelete(meta.id)}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-[#FF5252] text-xs font-semibold text-white cursor-pointer"
            >
              Remove Missing Entry
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Primary PDF Page Canvas / Scroll Viewport */}
          <div className="lg:col-span-9 bg-[var(--z-surface)] border border-[var(--z-border)] rounded-2xl p-4 sm:p-5 space-y-4">
            {/* Page Navigation Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--z-border)]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={activePageIndex === 0}
                  onClick={() => handleJumpToPage(Math.max(0, activePageIndex - 1))}
                  className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[var(--z-elevated)] disabled:opacity-40 border border-[var(--z-border)] text-[var(--z-text-primary)] text-xs inline-flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous Page</span>
                </button>

                <button
                  type="button"
                  disabled={activePageIndex >= pages.length - 1}
                  onClick={() => handleJumpToPage(Math.min(pages.length - 1, activePageIndex + 1))}
                  className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[var(--z-elevated)] disabled:opacity-40 border border-[var(--z-border)] text-[var(--z-text-primary)] text-xs inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Next Page</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <span
                data-testid="pdf-viewer-page-indicator"
                className="text-xs font-mono text-[var(--z-text-primary)] tabular-nums px-3 py-1 rounded-lg bg-[var(--z-bg)] border border-[var(--z-border)]"
              >
                Page {activePageIndex + 1} of {pages.length}
              </span>
            </div>

            {pdfRenderError && (
              <div className="rounded-xl bg-[#FF5252]/10 border border-[#FF5252] p-3 text-xs text-[#FF5252]">
                {pdfRenderError}
              </div>
            )}

            {/* Mode 1: Continuous Vertical Multi-Page PDF Scroll (Default) */}
            {viewerMode === 'vertical-scroll' && (
              <div
                data-testid="pdf-vertical-scroll-container"
                className="w-full max-h-[720px] overflow-y-auto bg-[var(--z-bg)] border border-[var(--z-border)] rounded-xl p-4 sm:p-6 space-y-6"
              >
                {pages.map((page, idx) => {
                  const isCurrent = idx === activePageIndex;
                  return (
                    <div
                      key={page.id}
                      ref={(el) => {
                        pageRefs.current[idx] = el;
                      }}
                      onClick={() => setActivePageIndex(idx)}
                      data-testid={`rendered-pdf-page-${idx + 1}`}
                      className={`mx-auto rounded-xl border-2 transition-colors p-3 sm:p-4 bg-[var(--z-surface)] ${
                        isCurrent ? 'border-[#FF2D95]' : 'border-[var(--z-border)]'
                      }`}
                      style={{
                        maxWidth: `${Math.round((680 * zoomPercent) / 100)}px`,
                      }}
                    >
                      <div className="flex items-center justify-between mb-2.5 text-xs font-mono">
                        <span className="text-[var(--z-text-primary)] font-semibold">
                          Page {idx + 1} of {pages.length}
                        </span>
                        <span className="text-[var(--z-text-secondary)]">
                          {meta.pageSize} · {page.width}×{page.height}px
                        </span>
                      </div>
                      <div className="bg-white rounded-lg p-2 shadow-md flex items-center justify-center overflow-hidden">
                        <img
                          src={page.processedDataUrl}
                          alt={`${meta.name} — PDF Page ${idx + 1}`}
                          className="w-full h-auto object-contain rounded"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Mode 2: Focused Single-Page PDF Inspection */}
            {viewerMode === 'single-page' && currentPage && (
              <div
                data-testid="pdf-single-page-container"
                className="w-full min-h-[480px] max-h-[700px] overflow-auto bg-[var(--z-bg)] border border-[var(--z-border)] rounded-xl flex items-center justify-center p-6"
              >
                <div
                  className="bg-white p-3 rounded-lg shadow-xl transition-all duration-150"
                  style={{
                    width: `${Math.round((560 * zoomPercent) / 100)}px`,
                    maxWidth: '100%',
                  }}
                >
                  <img
                    src={currentPage.processedDataUrl}
                    alt={`${meta.name} — Page ${activePageIndex + 1}`}
                    className="w-full h-auto object-contain rounded"
                  />
                </div>
              </div>
            )}

            {/* Mode 3: Embedded Native PDF Stream */}
            {viewerMode === 'native-pdf' && (
              <div
                data-testid="pdf-native-stream-container"
                className="w-full bg-[var(--z-bg)] border border-[var(--z-border)] rounded-xl overflow-hidden"
              >
                {pdfBlobUrl ? (
                  <object
                    data={pdfBlobUrl}
                    type="application/pdf"
                    aria-label={`${meta.name}.pdf Embedded Document`}
                    className="w-full h-[640px]"
                  >
                    <div className="p-8 text-center space-y-3">
                      <p className="text-sm text-[var(--z-text-secondary)]">
                        Embedded PDF stream preview is ready. Switch to Vertical Scroll mode or
                        export the PDF directly.
                      </p>
                      <button
                        type="button"
                        onClick={() => setViewerMode('vertical-scroll')}
                        className="px-4 py-2 rounded-xl bg-[#007BA7] text-white text-xs font-semibold cursor-pointer"
                      >
                        Switch to Vertical Scroll Viewer
                      </button>
                    </div>
                  </object>
                ) : (
                  <div className="p-8 text-center text-xs font-mono text-[var(--z-text-secondary)]">
                    Preparing PDF binary stream...
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Multi-Page Thumbnail Strip */}
          <div className="lg:col-span-3 bg-[var(--z-surface)] border border-[var(--z-border)] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--z-text-primary)]">
                PDF Pages ({pages.length})
              </h2>
              <span className="text-[11px] font-mono text-[var(--z-text-secondary)]">
                Tap to jump
              </span>
            </div>
            <div className="grid grid-cols-3 lg:grid-cols-2 gap-2.5 max-h-[600px] overflow-y-auto pr-1">
              {pages.map((page, idx) => {
                const isSelected = idx === activePageIndex;
                return (
                  <button
                    key={page.id}
                    type="button"
                    onClick={() => handleJumpToPage(idx)}
                    aria-label={`View Page ${idx + 1}`}
                    className={`rounded-xl overflow-hidden border-2 p-1.5 bg-[var(--z-bg)] text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-[#FF2D95]'
                        : 'border-[var(--z-border)] opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div className="bg-white rounded overflow-hidden">
                      <img
                        src={page.processedDataUrl}
                        alt={`Thumbnail page ${idx + 1}`}
                        className="w-full h-24 object-contain"
                      />
                    </div>
                    <div className="text-[11px] font-mono text-center text-[var(--z-text-primary)] pt-1.5 tabular-nums">
                      Page {idx + 1}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
