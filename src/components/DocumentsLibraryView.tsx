import React, { useState } from 'react';
import {
  Search,
  LayoutGrid,
  List as ListIcon,
  FileText,
  Pencil,
  Trash2,
  Share2,
  Camera,
  AlertTriangle,
} from 'lucide-react';
import {
  SortOption,
  filterAndSortDocuments,
  formatBytes,
  validateFilename,
  type ZViewDocumentMeta,
} from '../domain/zviewLogic';

interface DocumentsLibraryViewProps {
  documents: ZViewDocumentMeta[];
  onStartScan: () => void;
  onOpenPreview: (docId: string) => void;
  onRenameDocument: (docId: string, newName: string) => Promise<void>;
  onDeleteDocument: (docId: string) => Promise<void>;
  onShareOrDownloadPdf: (docId: string) => Promise<void>;
}

export const DocumentsLibraryView: React.FC<DocumentsLibraryViewProps> = ({
  documents,
  onStartScan,
  onOpenPreview,
  onRenameDocument,
  onDeleteDocument,
  onShareOrDownloadPdf,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOption, setSortOption] = useState<SortOption>(SortOption.MODIFIED_DESC);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const [renameTarget, setRenameTarget] = useState<ZViewDocumentMeta | null>(null);
  const [renameInput, setRenameInput] = useState<string>('');
  const [renameError, setRenameError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<ZViewDocumentMeta | null>(null);
  const [actionStatus, setActionStatus] = useState<string | null>(null);

  const filteredDocs = filterAndSortDocuments(documents, searchQuery, sortOption);

  const handleConfirmRename = async () => {
    if (!renameTarget) return;
    const otherNames = documents
      .filter((d) => d.id !== renameTarget.id)
      .map((d) => d.name);
    const validation = validateFilename(renameInput, otherNames, false);
    if (!validation.isValid) {
      setRenameError(validation.errorMessage ?? 'Invalid document name.');
      return;
    }
    await onRenameDocument(renameTarget.id, validation.sanitizedName);
    setActionStatus(`Renamed document to "${validation.sanitizedName}"`);
    setRenameTarget(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const deletedName = deleteTarget.name;
    await onDeleteDocument(deleteTarget.id);
    setDeleteTarget(null);
    setActionStatus(`Deleted "${deletedName}" from local storage.`);
  };

  return (
    <div className="space-y-6">
      {/* Library Header & Controls */}
      <div className="bg-[#17171C] border border-[#34343D] rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Document Library</h1>
            <p className="text-xs text-[#B8B8C2] font-mono tabular-nums">
              {documents.length} total {documents.length === 1 ? 'document' : 'documents'} stored
              locally
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <div
              role="group"
              aria-label="Library view mode"
              className="flex items-center bg-[#0A0A0A] p-1 rounded-xl border border-[#34343D]"
            >
              <button
                type="button"
                onClick={() => setViewMode('list')}
                aria-label="List View"
                className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === 'list' ? 'bg-[#007BA7] text-white' : 'text-[#B8B8C2] hover:text-white'
                }`}
              >
                <ListIcon className="w-4 h-4" />
                <span>List</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                aria-label="Grid View"
                className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-[#007BA7] text-white' : 'text-[#B8B8C2] hover:text-white'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                <span>Grid</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onStartScan}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#007BA7] hover:bg-[#008ec0] text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Scan Document</span>
            </button>
          </div>
        </div>

        {/* Search & Sort Bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
          <div className="md:col-span-7 relative">
            <Search className="w-4 h-4 text-[#B8B8C2] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents by name..."
              aria-label="Search documents by name"
              className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-xl bg-[#0A0A0A] border border-[#34343D] focus:border-[#007BA7] focus:outline-none text-sm text-white placeholder:text-[#B8B8C2]/60"
            />
          </div>

          <div className="md:col-span-5 flex items-center gap-1.5 bg-[#0A0A0A] p-1 rounded-xl border border-[#34343D]">
            {[
              { id: SortOption.MODIFIED_DESC, label: 'Modified' },
              { id: SortOption.CREATED_DESC, label: 'Created' },
              { id: SortOption.NAME_ASC, label: 'Name A–Z' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSortOption(item.id)}
                className={`flex-1 min-h-[36px] px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  sortOption === item.id
                    ? 'bg-[#22222A] text-white border border-[#FF2D95]'
                    : 'text-[#B8B8C2] hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {actionStatus && (
        <div
          role="status"
          className="bg-[#17171C] border border-[#4CAF50] rounded-xl px-4 py-3 text-xs text-[#4CAF50]"
        >
          {actionStatus}
        </div>
      )}

      {/* Document Items */}
      {filteredDocs.length === 0 ? (
        <div className="bg-[#17171C] border border-[#34343D] rounded-2xl p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#22222A] border border-[#34343D] mx-auto flex items-center justify-center text-[#007BA7]">
            <FileText className="w-6 h-6" />
          </div>
          <h2 className="text-base font-semibold text-white">
            {searchQuery.trim()
              ? `No documents matching "${searchQuery}"`
              : 'Your Local Document Library Is Empty'}
          </h2>
          <p className="text-sm text-[#B8B8C2] max-w-md mx-auto">
            {searchQuery.trim()
              ? 'Try clearing the search query or sorting by another field.'
              : 'All scanned documents and exported PDFs will appear here for offline viewing, renaming, and sharing.'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => {
            const modDate = new Date(doc.updatedAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            return (
              <div
                key={doc.id}
                className="bg-[#22222A] border border-[#34343D] hover:border-[#007BA7] rounded-2xl p-4 flex flex-col justify-between gap-4 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => onOpenPreview(doc.id)}
                  aria-label={`Open preview for ${doc.name}`}
                  className="text-left space-y-3 cursor-pointer"
                >
                  <div className="w-full h-44 rounded-xl bg-[#17171C] border border-[#34343D] overflow-hidden flex items-center justify-center">
                    {doc.thumbnailDataUrl ? (
                      <img
                        src={doc.thumbnailDataUrl}
                        alt={`${doc.name} preview`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <FileText className="w-8 h-8 text-[#007BA7]" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white truncate">{doc.name}</h3>
                    <div className="text-xs font-mono text-[#B8B8C2] tabular-nums mt-1">
                      <span>
                        {doc.pageCount} {doc.pageCount === 1 ? 'page' : 'pages'}
                      </span>
                      <span aria-hidden="true"> · </span>
                      <span>{formatBytes(doc.fileSizeBytes)}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{modDate}</span>
                    </div>
                    {doc.isFileMissing && (
                      <div className="mt-1.5 text-xs text-[#FF5252] inline-flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Local PDF/page file missing</span>
                      </div>
                    )}
                  </div>
                </button>

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#34343D]">
                  <button
                    type="button"
                    onClick={() => void onShareOrDownloadPdf(doc.id)}
                    aria-label={`Share or download ${doc.name}`}
                    className="min-h-[40px] px-3 py-1.5 rounded-lg bg-[#17171C] hover:bg-[#007BA7] text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Export PDF</span>
                  </button>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setRenameTarget(doc);
                        setRenameInput(doc.name);
                        setRenameError(null);
                      }}
                      aria-label={`Rename ${doc.name}`}
                      className="min-h-[40px] min-w-[40px] rounded-lg bg-[#17171C] hover:border-[#007BA7] border border-[#34343D] text-[#B8B8C2] hover:text-white inline-flex items-center justify-center cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(doc)}
                      aria-label={`Delete ${doc.name}`}
                      className="min-h-[40px] min-w-[40px] rounded-lg bg-[#17171C] hover:border-[#FF5252] border border-[#34343D] text-[#FF5252] inline-flex items-center justify-center cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDocs.map((doc) => {
            const modDate = new Date(doc.updatedAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            return (
              <div
                key={doc.id}
                className="bg-[#22222A] border border-[#34343D] hover:border-[#007BA7] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => onOpenPreview(doc.id)}
                  aria-label={`Open preview for ${doc.name}`}
                  className="flex items-center gap-4 text-left flex-1 min-w-[220px] cursor-pointer"
                >
                  <div className="w-14 h-18 rounded-xl bg-[#17171C] border border-[#34343D] overflow-hidden shrink-0 flex items-center justify-center">
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
                  <div className="min-w-0 space-y-1">
                    <h3 className="text-base font-semibold text-white truncate">{doc.name}</h3>
                    <div className="text-xs font-mono text-[#B8B8C2] tabular-nums">
                      <span>
                        {doc.pageCount} {doc.pageCount === 1 ? 'page' : 'pages'}
                      </span>
                      <span aria-hidden="true"> · </span>
                      <span>{formatBytes(doc.fileSizeBytes)}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{doc.pageSize}</span>
                      <span aria-hidden="true"> · </span>
                      <span>Modified {modDate}</span>
                    </div>
                    {doc.isFileMissing && (
                      <div className="text-xs text-[#FF5252] inline-flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Local file missing — open to inspect or delete</span>
                      </div>
                    )}
                  </div>
                </button>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => void onShareOrDownloadPdf(doc.id)}
                    aria-label={`Share or download ${doc.name}`}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#17171C] hover:bg-[#007BA7] border border-[#34343D] text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Share / Export</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRenameTarget(doc);
                      setRenameInput(doc.name);
                      setRenameError(null);
                    }}
                    aria-label={`Rename ${doc.name}`}
                    className="min-h-[44px] min-w-[44px] rounded-xl bg-[#17171C] hover:border-[#007BA7] border border-[#34343D] text-[#B8B8C2] hover:text-white inline-flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(doc)}
                    aria-label={`Delete ${doc.name}`}
                    className="min-h-[44px] min-w-[44px] rounded-xl bg-[#17171C] hover:border-[#FF5252] border border-[#34343D] text-[#FF5252] inline-flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rename Modal */}
      {renameTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="rename-dialog-title"
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
        >
          <div className="bg-[#17171C] border border-[#34343D] rounded-2xl max-w-md w-full p-6 space-y-4">
            <h2 id="rename-dialog-title" className="text-lg font-bold text-white">
              Rename Document
            </h2>
            <div className="space-y-1.5">
              <label htmlFor="rename-doc-input" className="text-xs text-[#B8B8C2]">
                New Document Name
              </label>
              <input
                id="rename-doc-input"
                type="text"
                value={renameInput}
                onChange={(e) => {
                  setRenameInput(e.target.value);
                  setRenameError(null);
                }}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0A0A0A] border border-[#34343D] text-sm text-white"
              />
              {renameError && <p className="text-xs text-[#FF5252]">{renameError}</p>}
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setRenameTarget(null)}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#22222A] text-[#B8B8C2] text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmRename()}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#007BA7] text-white text-xs font-semibold cursor-pointer"
              >
                Save Name
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
        >
          <div className="bg-[#17171C] border border-[#FF5252] rounded-2xl max-w-md w-full p-6 space-y-4">
            <h2 id="delete-dialog-title" className="text-lg font-bold text-white">
              Delete &ldquo;{deleteTarget.name}&rdquo;?
            </h2>
            <p className="text-sm text-[#B8B8C2]">
              This permanently removes the local document metadata, scanned pages, and exported PDF
              from your device.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#22222A] text-[#B8B8C2] text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmDelete()}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#FF5252] text-white text-xs font-semibold cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
