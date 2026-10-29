/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Home, FileText, Settings as SettingsIcon, Camera } from 'lucide-react';
import {
  OFFICIAL_APP_NAME,
  DEFAULT_CROP_BOUNDS,
  ThemeMode,
  resolveEffectiveTheme,
  type ScannedPage,
  type ZViewDocumentContent,
  type ZViewDocumentMeta,
  type ZViewSettings,
  type PdfPageSize,
} from './domain/zviewLogic';
import {
  loadAndReconcileDocuments,
  saveMetadataListSync,
  saveDocumentContentLocal,
  loadDocumentContentLocal,
  deleteDocumentContentLocal,
  loadSettingsSync,
  saveSettingsSync,
} from './utils/localRepository';
import { processDocumentPageImage } from './utils/canvasProcessor';
import {
  generateMultiPagePdf,
  shareOrDownloadPdf,
  triggerPdfDownload,
} from './utils/pdfBuilder';
import { HomeView } from './components/HomeView';
import { ScannerEditorView } from './components/ScannerEditorView';
import { DocumentsLibraryView } from './components/DocumentsLibraryView';
import { DocumentPreviewModal } from './components/DocumentPreviewModal';
import { SettingsView } from './components/SettingsView';
import { AndroidProjectDrawer } from './components/AndroidProjectDrawer';

type ActiveTab = 'home' | 'scanner' | 'documents' | 'preview' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [documents, setDocuments] = useState<ZViewDocumentMeta[]>([]);
  const [settings, setSettings] = useState<ZViewSettings>(() => loadSettingsSync());
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : true
  );
  const [isLoadingDocs, setIsLoadingDocs] = useState<boolean>(true);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  // Scanner initial pages (when importing directly from Home)
  const [scannerInitialPages, setScannerInitialPages] = useState<ScannedPage[]>([]);

  // Active preview document
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<ZViewDocumentContent | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);

  // Android Studio Project Explorer Drawer
  const [androidDrawerOpen, setAndroidDrawerOpen] = useState<boolean>(false);

  // Listen to OS dark/light mode changes for ThemeMode.SYSTEM
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // Apply resolved theme ('light' or 'dark') to document.documentElement
  const effectiveTheme = resolveEffectiveTheme(
    settings.themeMode ?? ThemeMode.SYSTEM,
    systemPrefersDark
  );

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(effectiveTheme);
    root.setAttribute('data-theme', effectiveTheme);
  }, [effectiveTheme]);

  const refreshDocuments = useCallback(async () => {
    setIsLoadingDocs(true);
    try {
      const reconciled = await loadAndReconcileDocuments();
      setDocuments(reconciled);
    } catch {
      setGlobalError('Failed to read local document storage.');
    } finally {
      setIsLoadingDocs(false);
    }
  }, []);

  useEffect(() => {
    void refreshDocuments();
  }, [refreshDocuments]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeTab, previewDocId]);

  const showToast = (msg: string) => {
    setStatusToast(msg);
    setTimeout(() => {
      setStatusToast((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  const handleStartFreshScan = () => {
    setGlobalError(null);
    setScannerInitialPages([]);
    setActiveTab('scanner');
  };

  const handleImportFromHome = async (files: FileList) => {
    setGlobalError(null);
    try {
      const imported: ScannedPage[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) {
          throw new Error(`Unsupported file "${file.name}". Please choose JPEG, PNG, or WebP.`);
        }
        const rawDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () =>
            typeof reader.result === 'string'
              ? resolve(reader.result)
              : reject(new Error('Could not decode image.'));
          reader.onerror = () => reject(new Error(`Corrupt image: ${file.name}`));
          reader.readAsDataURL(file);
        });

        const processed = await processDocumentPageImage(rawDataUrl, {
          enhancementMode: settings.defaultEnhancement,
          rotationDegrees: 0,
          brightness: 0,
          contrast: 1,
          cropBounds: DEFAULT_CROP_BOUNDS,
        });

        imported.push({
          id: `page_${Date.now()}_${i}`,
          originalDataUrl: rawDataUrl,
          processedDataUrl: processed.processedDataUrl,
          enhancementMode: settings.defaultEnhancement,
          rotationDegrees: 0,
          brightness: 0,
          contrast: 1,
          cropBounds: DEFAULT_CROP_BOUNDS,
          width: processed.width,
          height: processed.height,
        });
      }

      if (imported.length > 0) {
        setScannerInitialPages(imported);
        setActiveTab('scanner');
      }
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Failed to import images.');
    }
  };

  const handleSaveDocumentPdf = async (params: {
    documentName: string;
    pages: ScannedPage[];
    pageSize: PdfPageSize;
    allowOverwrite: boolean;
  }) => {
    // 1. Generate real verified PDF via jsPDF
    const generated = await generateMultiPagePdf(
      params.documentName,
      params.pages,
      params.pageSize
    );

    const now = Date.now();
    const existingMatch = documents.find(
      (d) => d.name.toLowerCase() === params.documentName.toLowerCase()
    );
    const docId = existingMatch
      ? existingMatch.id
      : `doc_${now}_${Math.random().toString(36).slice(2, 7)}`;

    const newMeta: ZViewDocumentMeta = {
      id: docId,
      name: params.documentName,
      createdAt: existingMatch ? existingMatch.createdAt : now,
      updatedAt: now,
      pageCount: params.pages.length,
      fileSizeBytes: generated.sizeBytes,
      pageSize: params.pageSize,
      thumbnailDataUrl: params.pages[0]?.processedDataUrl ?? '',
      isFileMissing: false,
      cloudSyncedAt: settings.cloudSyncEnabled ? now : null,
    };

    const newContent: ZViewDocumentContent = {
      documentId: docId,
      pages: params.pages,
      pdfDataUrl: generated.dataUrl,
    };

    // 2. Save content & metadata locally before reporting success
    await saveDocumentContentLocal(newContent);
    const updatedList = existingMatch
      ? documents.map((d) => (d.id === docId ? newMeta : d))
      : [newMeta, ...documents];
    saveMetadataListSync(updatedList);
    setDocuments(updatedList);

    // 3. Trigger PDF download and open in-app PDF viewer
    triggerPdfDownload(generated.dataUrl, generated.sanitizedFilename);
    setPreviewDocId(docId);
    setPreviewContent(newContent);
    setIsLoadingPreview(false);
    setActiveTab('preview');
    showToast(`Saved "${generated.sanitizedFilename}" (${params.pages.length} pages) locally.`);
  };

  const handleOpenPreview = async (docId: string) => {
    setGlobalError(null);
    setPreviewDocId(docId);
    setIsLoadingPreview(true);
    setActiveTab('preview');
    try {
      const content = await loadDocumentContentLocal(docId);
      setPreviewContent(content);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleRenameDocument = async (docId: string, newSanitizedName: string) => {
    const now = Date.now();
    const updated = documents.map((d) =>
      d.id === docId ? { ...d, name: newSanitizedName, updatedAt: now } : d
    );
    saveMetadataListSync(updated);
    setDocuments(updated);
    showToast(`Renamed document to "${newSanitizedName}.pdf"`);
  };

  const handleDeleteDocument = async (docId: string) => {
    await deleteDocumentContentLocal(docId);
    const updated = documents.filter((d) => d.id !== docId);
    saveMetadataListSync(updated);
    setDocuments(updated);
    if (previewDocId === docId) {
      setPreviewDocId(null);
      setPreviewContent(null);
      setActiveTab('documents');
    }
    showToast('Document removed from local storage.');
  };

  const handleShareOrDownloadPdf = async (docId: string) => {
    const meta = documents.find((d) => d.id === docId);
    if (!meta) return;
    const content = await loadDocumentContentLocal(docId);
    if (!content || (!content.pdfDataUrl && content.pages.length === 0)) {
      setGlobalError(`Cannot export "${meta.name}": underlying local file content is missing.`);
      return;
    }

    let pdfUrl = content.pdfDataUrl;
    if (!pdfUrl) {
      const rebuilt = await generateMultiPagePdf(meta.name, content.pages, meta.pageSize);
      pdfUrl = rebuilt.dataUrl;
    }
    const mode = await shareOrDownloadPdf(pdfUrl, `${meta.name}.pdf`);
    showToast(
      mode === 'shared'
        ? `Shared "${meta.name}.pdf" via system share sheet.`
        : `Exported "${meta.name}.pdf" to downloads.`
    );
  };

  const handleUpdateSettings = (partial: Partial<ZViewSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      saveSettingsSync(next);
      return next;
    });
  };

  const handleExportCloudBackup = async () => {
    const contents: Record<string, ZViewDocumentContent> = {};
    for (const meta of documents) {
      const c = await loadDocumentContentLocal(meta.id);
      if (c) contents[meta.id] = c;
    }
    const payload = {
      app: OFFICIAL_APP_NAME,
      version: '1.0.0',
      exportedAt: Date.now(),
      documents,
      contents,
    };
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zscan_pdf_maker_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    handleUpdateSettings({ lastCloudBackupAt: Date.now(), cloudSyncEnabled: true });
    showToast(`Exported portable ${OFFICIAL_APP_NAME} backup archive.`);
  };

  const handleImportCloudBackup = async (file: File) => {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!parsed || !Array.isArray(parsed.documents)) {
      throw new Error(`Invalid ${OFFICIAL_APP_NAME} backup archive format.`);
    }
    for (const meta of parsed.documents as ZViewDocumentMeta[]) {
      const content = parsed.contents?.[meta.id] as ZViewDocumentContent | undefined;
      if (content) {
        await saveDocumentContentLocal(content);
      }
    }
    saveMetadataListSync(parsed.documents);
    await refreshDocuments();
    handleUpdateSettings({ lastCloudBackupAt: Date.now(), cloudSyncEnabled: true });
  };

  const totalStorageBytes = documents.reduce((acc, d) => acc + (d.fileSizeBytes || 0), 0);
  const activePreviewMeta = documents.find((d) => d.id === previewDocId) ?? null;

  return (
    <div
      className={`min-h-screen bg-[var(--z-bg)] text-[var(--z-text-primary)] flex flex-col pb-20 md:pb-10 transition-colors duration-150 ${
        settings.highContrastBorders ? '[&_*]:border-opacity-100' : ''
      }`}
    >
      {/* Top Bar Contract: 3 Zones separated by gap-8 */}
      <header className="sticky top-0 z-30 bg-[var(--z-bg)]/95 backdrop-blur-md border-b border-[var(--z-border)] px-4 sm:px-8 h-14 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark with official app name */}
        <a
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('home');
          }}
          className="text-lg font-bold tracking-tight text-[var(--z-text-primary)] whitespace-nowrap shrink-0"
        >
          {OFFICIAL_APP_NAME}
        </a>

        {/* Zone 2: 4 concise single-line text navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-[var(--z-text-secondary)]"
        >
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'home'
                ? 'text-[var(--z-text-primary)] underline decoration-[#FF2D95] decoration-2 underline-offset-8'
                : 'hover:text-[var(--z-text-primary)]'
            }`}
          >
            Home
          </button>
          <button
            type="button"
            onClick={handleStartFreshScan}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'scanner'
                ? 'text-[var(--z-text-primary)] underline decoration-[#FF2D95] decoration-2 underline-offset-8'
                : 'hover:text-[var(--z-text-primary)]'
            }`}
          >
            Scanner
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('documents')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'documents' || activeTab === 'preview'
                ? 'text-[var(--z-text-primary)] underline decoration-[#FF2D95] decoration-2 underline-offset-8'
                : 'hover:text-[var(--z-text-primary)]'
            }`}
          >
            Documents
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'settings'
                ? 'text-[var(--z-text-primary)] underline decoration-[#FF2D95] decoration-2 underline-offset-8'
                : 'hover:text-[var(--z-text-primary)]'
            }`}
          >
            Settings
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setAndroidDrawerOpen(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#007BA7] hover:bg-[#008ec0] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Android Studio Project
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 pt-6 pb-8">
        {statusToast && (
          <div
            role="status"
            className="mb-5 bg-[var(--z-surface)] border border-[#4CAF50] rounded-xl px-4 py-3 text-xs font-medium text-[#4CAF50] flex items-center justify-between"
          >
            <span>{statusToast}</span>
            <button
              type="button"
              onClick={() => setStatusToast(null)}
              className="text-[var(--z-text-secondary)] hover:text-[var(--z-text-primary)] text-xs ml-4 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {activeTab === 'home' && (
          <HomeView
            recentDocuments={documents}
            isLoading={isLoadingDocs}
            errorMessage={globalError}
            onStartScan={handleStartFreshScan}
            onImportFiles={(files) => void handleImportFromHome(files)}
            onViewAllDocuments={() => setActiveTab('documents')}
            onOpenSettings={() => setActiveTab('settings')}
            onOpenDocumentPreview={(id) => void handleOpenPreview(id)}
            onOpenAndroidStudioModal={() => setAndroidDrawerOpen(true)}
          />
        )}

        {activeTab === 'scanner' && (
          <ScannerEditorView
            initialPages={scannerInitialPages}
            defaultPageSize={settings.defaultPageSize}
            defaultEnhancement={settings.defaultEnhancement}
            existingDocumentNames={documents.map((d) => d.name)}
            onBack={() => setActiveTab('home')}
            onSaveDocumentPdf={handleSaveDocumentPdf}
          />
        )}

        {activeTab === 'documents' && (
          <DocumentsLibraryView
            documents={documents}
            onStartScan={handleStartFreshScan}
            onOpenPreview={(id) => void handleOpenPreview(id)}
            onRenameDocument={handleRenameDocument}
            onDeleteDocument={handleDeleteDocument}
            onShareOrDownloadPdf={handleShareOrDownloadPdf}
          />
        )}

        {activeTab === 'preview' && activePreviewMeta && (
          <DocumentPreviewModal
            meta={activePreviewMeta}
            content={previewContent}
            isLoadingContent={isLoadingPreview}
            existingNames={documents.map((d) => d.name)}
            onClose={() => setActiveTab('documents')}
            onShareOrDownload={handleShareOrDownloadPdf}
            onRename={handleRenameDocument}
            onDelete={handleDeleteDocument}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            settings={settings}
            documentCount={documents.length}
            totalStorageBytes={totalStorageBytes}
            onUpdateSettings={handleUpdateSettings}
            onExportCloudBackup={handleExportCloudBackup}
            onImportCloudBackup={handleImportCloudBackup}
            onOpenAndroidProject={() => setAndroidDrawerOpen(true)}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (<= 56px height to respect 15% sticky viewport cap) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 h-14 bg-[var(--z-surface)]/95 backdrop-blur-md border-t border-[var(--z-border)] grid grid-cols-4 items-center px-2"
      >
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className={`min-h-[44px] flex flex-col items-center justify-center rounded-lg cursor-pointer ${
            activeTab === 'home' ? 'text-[#FF2D95]' : 'text-[var(--z-text-secondary)]'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-0.5">Home</span>
        </button>

        <button
          type="button"
          onClick={handleStartFreshScan}
          className={`min-h-[44px] flex flex-col items-center justify-center rounded-lg cursor-pointer ${
            activeTab === 'scanner' ? 'text-[#FF2D95]' : 'text-[#007BA7]'
          }`}
        >
          <Camera className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-0.5">Scan</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('documents')}
          className={`min-h-[44px] flex flex-col items-center justify-center rounded-lg cursor-pointer ${
            activeTab === 'documents' || activeTab === 'preview'
              ? 'text-[#FF2D95]'
              : 'text-[var(--z-text-secondary)]'
          }`}
        >
          <FileText className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-0.5">Documents</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`min-h-[44px] flex flex-col items-center justify-center rounded-lg cursor-pointer ${
            activeTab === 'settings' ? 'text-[#FF2D95]' : 'text-[var(--z-text-secondary)]'
          }`}
        >
          <SettingsIcon className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-0.5">Settings</span>
        </button>
      </nav>

      {/* Native Android Studio Project Explorer & ZIP Modal */}
      <AndroidProjectDrawer
        isOpen={androidDrawerOpen}
        onClose={() => setAndroidDrawerOpen(false)}
      />
    </div>
  );
}
