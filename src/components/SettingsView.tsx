import React, { useState, useRef } from 'react';
import {
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  HardDrive,
  CloudUpload,
  CloudDownload,
  Code2,
} from 'lucide-react';
import {
  ZVIEW_FEEDBACK_URL,
  EnhancementMode,
  ENHANCEMENT_LABELS,
  PdfPageSize,
  PDF_PAGE_SIZE_LABELS,
  formatBytes,
  type ZViewSettings,
} from '../domain/zviewLogic';
import { ZViewBrandIcon } from './ZViewBrandIcon';

interface SettingsViewProps {
  settings: ZViewSettings;
  documentCount: number;
  totalStorageBytes: number;
  onUpdateSettings: (partial: Partial<ZViewSettings>) => void;
  onExportCloudBackup: () => Promise<void>;
  onImportCloudBackup: (file: File) => Promise<void>;
  onOpenAndroidProject: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  documentCount,
  totalStorageBytes,
  onUpdateSettings,
  onExportCloudBackup,
  onImportCloudBackup,
  onOpenAndroidProject,
}) => {
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const backupInputRef = useRef<HTMLInputElement | null>(null);

  const handleCopyFeedbackUrl = async () => {
    try {
      await navigator.clipboard.writeText(ZVIEW_FEEDBACK_URL);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 3000);
    } catch {
      setCopiedUrl(true);
    }
  };

  const handleBackupUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSyncError(null);
    setSyncMessage(null);
    try {
      await onImportCloudBackup(file);
      setSyncMessage('Successfully restored documents from backup archive.');
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Failed to import backup file.');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <input
        ref={backupInputRef}
        type="file"
        accept="application/json"
        onChange={handleBackupUpload}
        className="sr-only"
        aria-label="Import ZView backup JSON file"
      />

      {/* App Identity Header */}
      <div className="bg-[#17171C] border border-[#34343D] rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <ZViewBrandIcon size={48} />
          <div>
            <h1 className="text-xl font-bold text-white">ZView Settings</h1>
            <p className="text-xs font-mono text-[#B8B8C2]">
              Version 1.0.0 · Package com.zynor.zview · Offline-First Build
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenAndroidProject}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-[#22222A] hover:bg-[#2c2c38] border border-[#34343D] text-white text-xs font-medium inline-flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Code2 className="w-4 h-4 text-[#FF2D95]" />
          <span>Android Studio Project &amp; APK Guide</span>
        </button>
      </div>

      {/* Personal Review & Feedback Section (https://zynor-view.web.app/) */}
      <section className="bg-[#17171C] border border-[#FF2D95] rounded-2xl p-6 space-y-4">
        <div className="space-y-1.5">
          <div className="text-xs font-mono text-[#FF2D95]">
            Official Feedback Portal · Custom Tab Integration
          </div>
          <h2 className="text-lg font-bold text-white">Personal Review &amp; Feedback</h2>
          <p className="text-sm text-[#B8B8C2] leading-relaxed">
            Share your personal review, feature suggestions, or bug reports on the deployed ZView
            Feedback website (<code className="text-white font-mono text-xs">{ZVIEW_FEEDBACK_URL}</code>
            ). Opens directly in your browser or Android Custom Tab without requiring an account.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <a
            href={ZVIEW_FEEDBACK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[48px] px-5 py-2.5 rounded-xl bg-[#007BA7] hover:bg-[#008ec0] text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
          >
            <span>Personal Review &amp; Feedback</span>
            <ExternalLink className="w-4 h-4" />
          </a>

          <button
            type="button"
            onClick={() => void handleCopyFeedbackUrl()}
            className="min-h-[48px] px-4 py-2.5 rounded-xl bg-[#22222A] hover:bg-[#2c2c38] border border-[#34343D] text-white text-xs font-medium inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {copiedUrl ? (
              <>
                <Check className="w-4 h-4 text-[#4CAF50]" />
                <span className="text-[#4CAF50]">Copied {ZVIEW_FEEDBACK_URL}</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-[#B8B8C2]" />
                <span>Copy Feedback Website URL</span>
              </>
            )}
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Default PDF & Scanner Preferences */}
        <section className="bg-[#17171C] border border-[#34343D] rounded-2xl p-6 space-y-5">
          <h2 className="text-base font-semibold text-white">
            Default Scanner &amp; PDF Preferences
          </h2>

          <div className="space-y-2">
            <label className="text-xs font-medium text-[#B8B8C2] block">
              Default PDF Page Size
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(PdfPageSize).map((size) => {
                const active = settings.defaultPageSize === size;
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => onUpdateSettings({ defaultPageSize: size })}
                    className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium border text-left transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#007BA7] border-[#FF2D95] text-white'
                        : 'bg-[#22222A] border-[#34343D] text-[#B8B8C2] hover:text-white'
                    }`}
                  >
                    {PDF_PAGE_SIZE_LABELS[size]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-[#B8B8C2] block">
              Default Image Enhancement Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(EnhancementMode).map((mode) => {
                const active = settings.defaultEnhancement === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => onUpdateSettings({ defaultEnhancement: mode })}
                    className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium border text-left transition-colors cursor-pointer ${
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

          <div className="pt-2 border-t border-[#34343D] flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-white">High-Contrast Surface Outlines</div>
              <div className="text-xs text-[#B8B8C2]">
                Enhances card border visibility in bright daylight conditions
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.highContrastBorders}
              onClick={() =>
                onUpdateSettings({ highContrastBorders: !settings.highContrastBorders })
              }
              className={`min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                settings.highContrastBorders
                  ? 'bg-[#007BA7] border-[#FF2D95] text-white'
                  : 'bg-[#22222A] border-[#34343D] text-[#B8B8C2]'
              }`}
            >
              {settings.highContrastBorders ? 'Enabled' : 'Standard'}
            </button>
          </div>
        </section>

        {/* Storage Information & SAF / Cloud Sync Archive */}
        <section className="bg-[#17171C] border border-[#34343D] rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2.5">
            <HardDrive className="w-5 h-5 text-[#007BA7]" />
            <h2 className="text-base font-semibold text-white">
              Local Storage &amp; Cloud Sync Backup
            </h2>
          </div>

          <div className="bg-[#22222A] border border-[#34343D] rounded-xl p-4 space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-[#B8B8C2]">Stored Documents:</span>
              <span className="text-white tabular-nums">{documentCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#B8B8C2]">Local PDF &amp; Scan Footprint:</span>
              <span className="text-white tabular-nums">{formatBytes(totalStorageBytes)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#B8B8C2]">Last SAF / Cloud Backup:</span>
              <span className="text-white">
                {settings.lastCloudBackupAt
                  ? new Date(settings.lastCloudBackupAt).toLocaleString()
                  : 'Never (Local Only)'}
              </span>
            </div>
          </div>

          <p className="text-xs text-[#B8B8C2] leading-relaxed">
            On Android, ZView syncs exported PDFs to any user-selected Google Drive, Nextcloud, or
            local folder via Android Storage Access Framework (SAF) without requiring third-party
            cloud accounts. You can also export or restore a portable library archive below.
          </p>

          {syncMessage && <p className="text-xs text-[#4CAF50]">{syncMessage}</p>}
          {syncError && <p className="text-xs text-[#FF5252]">{syncError}</p>}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void onExportCloudBackup()}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#007BA7] hover:bg-[#008ec0] text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <CloudUpload className="w-4 h-4" />
              <span>Export Cloud Backup Archive</span>
            </button>

            <button
              type="button"
              onClick={() => backupInputRef.current?.click()}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#22222A] hover:bg-[#2c2c38] border border-[#34343D] text-white text-xs font-medium inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <CloudDownload className="w-4 h-4 text-[#007BA7]" />
              <span>Restore from Backup</span>
            </button>
          </div>
        </section>
      </div>

      {/* Privacy & Permissions Guarantee */}
      <section className="bg-[#17171C] border border-[#34343D] rounded-2xl p-6 space-y-3">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-[#4CAF50]" />
          <h2 className="text-base font-semibold text-white">
            Privacy Architecture &amp; Minimal Permissions
          </h2>
        </div>
        <p className="text-sm text-[#B8B8C2] leading-relaxed">
          ZView is free to use, ad-free, and free of forced subscriptions or account logins.
          Documents, thumbnails, and metadata are stored locally on your device by default. ZView
          never requests location, contacts, microphone, phone state, or broad all-files permissions,
          and never uploads your scanned documents to external servers.
        </p>
      </section>
    </div>
  );
};
