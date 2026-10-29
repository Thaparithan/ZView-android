import React, { useState } from 'react';
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
} from 'lucide-react';
import {
  formatBytes,
  validateFilename,
  type ZViewDocumentContent,
  type ZViewDocumentMeta,
} from '../domain/zviewLogic';

interface DocumentPreviewModalProps {
  meta: ZViewDocumentMeta;
  content: ZViewDocumentContent | null;
  existingNames: string[];
  onClose: () => void;
  onShareOrDownload: (docId: string) => Promise<void>;
  onRename: (docId: string, newName: string) => Promise<void>;
  onDelete: (docId: string) => Promise<void>;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  meta,
  content,
  existingNames,
  onClose,
  onShareOrDownload,
  onRename,
  onDelete,
}) => {
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [zoomPercent, setZoomPercent] = useState<number>(100);
  const [isRenaming, setIsRenaming] = useState<boolean>(false);
  const [renameText, setRenameText] = useState<string>(meta.name);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState<boolean>(false);

  const pages = content?.pages ?? [];
  const currentPage = pages[activePageIndex] ?? null;

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

  return (
    <div className="space-y-6">
      {/* Top Preview Action Bar */}
      <div className="bg-[#17171C] border border-[#34343D] rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onClose}
            aria-label="Back to Documents"
            className="min-h-[44px] min-w-[44px] rounded-xl bg-[#22222A] border border-[#34343D] text-white hover:border-[#007BA7] inline-flex items-center justify-center transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-white truncate">{meta.name}.pdf</h1>
            <div className="text-xs font-mono text-[#B8B8C2] tabular-nums">
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
          {/* Zoom Controls */}
          <div className="flex items-center bg-[#0A0A0A] border border-[#34343D] rounded-xl p-1">
            <button
              type="button"
              onClick={() => setZoomPercent((z) => Math.max(60, z - 20))}
              aria-label="Zoom Out"
              className="min-h-[36px] min-w-[36px] rounded-lg text-[#B8B8C2] hover:text-white inline-flex items-center justify-center cursor-pointer"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setZoomPercent(100)}
              aria-label="Reset Zoom"
              className="px-2.5 text-xs font-mono text-white tabular-nums cursor-pointer"
            >
              {zoomPercent}%
            </button>
            <button
              type="button"
              onClick={() => setZoomPercent((z) => Math.min(240, z + 20))}
              aria-label="Zoom In"
              className="min-h-[36px] min-w-[36px] rounded-lg text-[#B8B8C2] hover:text-white inline-flex items-center justify-center cursor-pointer"
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
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#22222A] hover:bg-[#2c2c38] border border-[#34343D] text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
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
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#22222A] hover:bg-[#FF5252]/20 border border-[#34343D] text-[#FF5252] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Inline Rename Drawer */}
      {isRenaming && (
        <div className="bg-[#17171C] border border-[#007BA7] rounded-2xl p-4 flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={renameText}
            onChange={(e) => {
              setRenameText(e.target.value);
              setRenameError(null);
            }}
            aria-label="New Document Filename"
            className="flex-1 min-w-[200px] min-h-[42px] px-3.5 py-2 rounded-xl bg-[#0A0A0A] border border-[#34343D] text-sm text-white"
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
            className="min-h-[42px] px-4 py-2 rounded-xl bg-[#22222A] text-[#B8B8C2] text-xs cursor-pointer"
          >
            Cancel
          </button>
          {renameError && <p className="w-full text-xs text-[#FF5252]">{renameError}</p>}
        </div>
      )}

      {/* Inline Delete Confirmation */}
      {isConfirmingDelete && (
        <div className="bg-[#17171C] border border-[#FF5252] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-white">
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
              className="min-h-[40px] px-4 py-1.5 rounded-xl bg-[#22222A] text-[#B8B8C2] text-xs cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Main Document Page Viewer (renders only active page in memory at a time) */}
      {!content || pages.length === 0 ? (
        <div className="bg-[#17171C] border border-[#FF5252] rounded-2xl p-10 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-[#FF5252] mx-auto" />
          <h2 className="text-base font-semibold text-white">Document Content Missing</h2>
          <p className="text-sm text-[#B8B8C2] max-w-md mx-auto">
            The underlying PDF or page image files for this record were deleted externally. You can
            remove this metadata entry using the Delete button above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Active Page Viewport */}
          <div className="lg:col-span-9 bg-[#17171C] border border-[#34343D] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                disabled={activePageIndex === 0}
                onClick={() => setActivePageIndex((i) => Math.max(0, i - 1))}
                className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#22222A] disabled:opacity-40 border border-[#34343D] text-white text-xs inline-flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous Page</span>
              </button>

              <span className="text-xs font-mono text-white tabular-nums">
                Page {activePageIndex + 1} of {pages.length}
              </span>

              <button
                type="button"
                disabled={activePageIndex >= pages.length - 1}
                onClick={() => setActivePageIndex((i) => Math.min(pages.length - 1, i + 1))}
                className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#22222A] disabled:opacity-40 border border-[#34343D] text-white text-xs inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Next Page</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="w-full min-h-[460px] max-h-[680px] overflow-auto bg-[#0A0A0A] border border-[#34343D] rounded-xl flex items-center justify-center p-6">
              {currentPage && (
                <img
                  src={currentPage.processedDataUrl}
                  alt={`${meta.name} — Page ${activePageIndex + 1}`}
                  style={{
                    transform: `scale(${zoomPercent / 100})`,
                    transformOrigin: 'center top',
                  }}
                  className="max-w-full max-h-[560px] object-contain rounded shadow-lg transition-transform duration-150"
                />
              )}
            </div>
          </div>

          {/* Multi-Page Thumbnail Strip */}
          <div className="lg:col-span-3 bg-[#17171C] border border-[#34343D] rounded-2xl p-4 space-y-3">
            <h2 className="text-sm font-semibold text-white">Page Thumbnails</h2>
            <div className="grid grid-cols-3 lg:grid-cols-2 gap-2.5 max-h-[540px] overflow-y-auto pr-1">
              {pages.map((page, idx) => {
                const isSelected = idx === activePageIndex;
                return (
                  <button
                    key={page.id}
                    type="button"
                    onClick={() => setActivePageIndex(idx)}
                    aria-label={`View Page ${idx + 1}`}
                    className={`rounded-xl overflow-hidden border-2 p-1 bg-[#0A0A0A] text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-[#FF2D95]'
                        : 'border-[#34343D] opacity-75 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={page.processedDataUrl}
                      alt={`Thumbnail page ${idx + 1}`}
                      className="w-full h-24 object-cover rounded"
                    />
                    <div className="text-[11px] font-mono text-center text-white pt-1 tabular-nums">
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
