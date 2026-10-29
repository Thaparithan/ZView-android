import React, { useRef } from 'react';
import {
  Camera,
  ImagePlus,
  FileText,
  Settings,
  ArrowRight,
  FolderOpen,
  Code2,
  AlertTriangle,
} from 'lucide-react';
import { ZViewBrandIcon } from './ZViewBrandIcon';
import { formatBytes, type ZViewDocumentMeta } from '../domain/zviewLogic';

interface HomeViewProps {
  recentDocuments: ZViewDocumentMeta[];
  isLoading: boolean;
  errorMessage: string | null;
  onStartScan: () => void;
  onImportFiles: (files: FileList) => void;
  onViewAllDocuments: () => void;
  onOpenSettings: () => void;
  onOpenDocumentPreview: (docId: string) => void;
  onOpenAndroidStudioModal: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  recentDocuments,
  isLoading,
  errorMessage,
  onStartScan,
  onImportFiles,
  onViewAllDocuments,
  onOpenSettings,
  onOpenDocumentPreview,
  onOpenAndroidStudioModal,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImportFiles(e.target.files);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-8">
      {/* Hidden multi-image picker input matching Android Photo Picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleFileChange}
        className="sr-only"
        aria-label="Import document images from device"
      />

      {/* Primary Hero & Scanner Action Split */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 bg-[#17171C] border border-[#34343D] rounded-2xl p-6 sm:p-8 flex flex-col justify-between">
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <ZViewBrandIcon size={48} />
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                    ZView
                  </h1>
                  <p className="text-sm text-[#B8B8C2]">
                    Document Scanner &amp; Offline PDF Creator
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenSettings}
                aria-label="Open Settings"
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl bg-[#22222A] border border-[#34343D] text-[#B8B8C2] hover:text-white hover:border-[#007BA7] transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-w-xl">
              <h2
                className="text-xl sm:text-2xl font-semibold text-white"
                style={{ textWrap: 'balance' }}
              >
                Scan, enhance, and export multi-page PDFs strictly on your device.
              </h2>
              <p className="text-sm sm:text-base text-[#B8B8C2] leading-relaxed">
                Zero forced accounts, zero ad trackers, and zero cloud uploads. Capture physical
                pages with boundary detection or import existing photos to build crisp, archival
                PDF documents offline.
              </p>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-[#34343D] grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <button
              type="button"
              onClick={onStartScan}
              className="min-h-[52px] px-5 py-3 rounded-xl bg-[#007BA7] hover:bg-[#008ec0] text-white font-semibold text-sm flex items-center justify-center gap-2.5 shadow-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Camera className="w-5 h-5 shrink-0" />
              <span>Scan Document</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="min-h-[52px] px-5 py-3 rounded-xl bg-[#22222A] hover:bg-[#2b2b36] border border-[#007BA7] text-white font-semibold text-sm flex items-center justify-center gap-2.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ImagePlus className="w-5 h-5 text-[#007BA7] shrink-0" />
              <span>Import Images</span>
            </button>
          </div>
        </div>

        {/* Native Android Studio Architecture & Privacy Summary Card */}
        <div className="lg:col-span-5 bg-[#17171C] border border-[#34343D] rounded-2xl p-6 sm:p-8 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="text-xs font-mono text-[#B8B8C2]">
              Native Android Architecture · Kotlin + Jetpack Compose
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-white">
              On-Device Processing &amp; Android Studio Deliverable
            </h2>
            <p className="text-sm text-[#B8B8C2] leading-relaxed">
              Built with Kotlin, Jetpack Compose, Material 3, CameraX, ML Kit Document Scanner,
              Room SQLite metadata persistence, Storage Access Framework, and Android{' '}
              <code className="text-white font-mono text-xs">PdfDocument</code>.
            </p>
            <div className="pt-2 space-y-2.5 text-xs text-[#B8B8C2] font-mono">
              <div className="flex items-center justify-between py-1.5 border-b border-[#34343D]/60">
                <span>Camera Permission</span>
                <span className="text-white">On-Demand Only (When Scanning)</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#34343D]/60">
                <span>Image Enhancement</span>
                <span className="text-white">Color · Grayscale · B&amp;W · Enhance</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#34343D]/60">
                <span>Storage &amp; Export</span>
                <span className="text-white">Room + SAF + FileProvider</span>
              </div>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-[#34343D] flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={onOpenAndroidStudioModal}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#22222A] hover:bg-[#2c2c36] border border-[#34343D] text-white text-xs font-medium inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Code2 className="w-4 h-4 text-[#FF2D95]" />
              <span>Inspect Kotlin Source &amp; Download ZIP</span>
            </button>

            <a
              href="/zview-android-project.zip"
              download="zview-android-project.zip"
              className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-medium text-[#007BA7] hover:text-white inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <span>Direct Project .ZIP</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </section>

      {errorMessage && (
        <div
          role="alert"
          className="bg-[#17171C] border border-[#FF5252] rounded-xl p-4 flex items-center gap-3 text-sm text-[#FF5252]"
        >
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Recent Documents Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-white">Recent Documents</h2>
            <p className="text-xs text-[#B8B8C2]">
              Locally stored document metadata and offline PDF exports
            </p>
          </div>
          <button
            type="button"
            onClick={onViewAllDocuments}
            className="min-h-[44px] px-3.5 py-2 rounded-xl text-sm font-medium text-[#007BA7] hover:text-white hover:bg-[#17171C] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>View All Documents</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="bg-[#17171C] border border-[#34343D] rounded-2xl p-8 text-center text-sm text-[#B8B8C2]">
            Loading local document library...
          </div>
        ) : recentDocuments.length === 0 ? (
          <div className="bg-[#17171C] border border-[#34343D] rounded-2xl p-8 sm:p-10 text-center max-w-2xl mx-auto space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#22222A] border border-[#34343D] mx-auto flex items-center justify-center text-[#007BA7]">
              <FolderOpen className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base sm:text-lg font-semibold text-white">
                No Scanned Documents Yet
              </h3>
              <p className="text-sm text-[#B8B8C2] max-w-md mx-auto">
                Your local library is empty. Start by scanning a physical document with the camera
                or importing existing images from your device.
              </p>
            </div>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onStartScan}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#007BA7] hover:bg-[#008ec0] text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Scan First Document</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#22222A] hover:bg-[#2c2c36] border border-[#34343D] text-white text-xs font-medium inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ImagePlus className="w-4 h-4 text-[#007BA7]" />
                <span>Import Images</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentDocuments.slice(0, 6).map((doc) => {
              const formattedDate = new Date(doc.updatedAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });
              return (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => onOpenDocumentPreview(doc.id)}
                  aria-label={`Open document ${doc.name}`}
                  className="text-left bg-[#22222A] hover:bg-[#282833] border border-[#34343D] hover:border-[#FF2D95] rounded-2xl p-4 flex items-center gap-4 transition-colors group cursor-pointer"
                >
                  <div className="w-16 h-20 rounded-xl bg-[#17171C] border border-[#34343D] overflow-hidden shrink-0 flex items-center justify-center">
                    {doc.thumbnailDataUrl ? (
                      <img
                        src={doc.thumbnailDataUrl}
                        alt={`${doc.name} thumbnail`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FileText className="w-6 h-6 text-[#007BA7]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="text-base font-semibold text-white truncate group-hover:text-[#007BA7] transition-colors">
                      {doc.name}
                    </div>
                    <div className="text-xs font-mono text-[#B8B8C2] tabular-nums">
                      <span>
                        {doc.pageCount} {doc.pageCount === 1 ? 'page' : 'pages'}
                      </span>
                      <span aria-hidden="true"> · </span>
                      <span>{formatBytes(doc.fileSizeBytes)}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{formattedDate}</span>
                    </div>
                    {doc.isFileMissing && (
                      <div className="text-xs text-[#FF5252] font-medium">
                        Missing local file content
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
