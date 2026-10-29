import React, { useState } from 'react';
import { X, Download, Copy, Check, FileCode, Terminal } from 'lucide-react';
import { ANDROID_PROJECT_FILES } from '../data/androidProjectManifest';

interface AndroidProjectDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidProjectDrawer: React.FC<AndroidProjectDrawerProps> = ({ isOpen, onClose }) => {
  const [selectedPath, setSelectedPath] = useState<string>(
    ANDROID_PROJECT_FILES.find((f) => f.path.endsWith('MainActivity.kt'))?.path ??
      ANDROID_PROJECT_FILES[0]?.path ??
      ''
  );
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  if (!isOpen) return null;

  const activeFile =
    ANDROID_PROJECT_FILES.find((f) => f.path === selectedPath) ?? ANDROID_PROJECT_FILES[0];

  const handleCopyFileContent = async () => {
    if (!activeFile) return;
    try {
      await navigator.clipboard.writeText(activeFile.content);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      setCopiedCode(true);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="android-studio-drawer-title"
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-6"
    >
      <div className="bg-[#17171C] border border-[#34343D] rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Top Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#34343D] flex flex-wrap items-center justify-between gap-4 bg-[#0A0A0A]">
          <div>
            <h2 id="android-studio-drawer-title" className="text-lg font-bold text-white">
              ZView Native Android Studio Project ({ANDROID_PROJECT_FILES.length} Files)
            </h2>
            <p className="text-xs font-mono text-[#B8B8C2]">
              Kotlin · Jetpack Compose · Material 3 · CameraX · ML Kit · Room · PdfDocument
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <a
              href="/zview-android-project.zip"
              download="zview-android-project.zip"
              className="min-h-[42px] px-4 py-2 rounded-xl bg-[#007BA7] hover:bg-[#008ec0] text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Download Android Studio Project (.ZIP)</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Android Studio Project Explorer"
              className="min-h-[42px] min-w-[42px] rounded-xl bg-[#22222A] hover:bg-[#2c2c38] border border-[#34343D] text-white inline-flex items-center justify-center cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Debug APK Build Instructions Banner */}
        <div className="px-5 py-3 bg-[#22222A] border-b border-[#34343D] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#B8B8C2] font-mono">
            <Terminal className="w-4 h-4 text-[#FF2D95] shrink-0" />
            <span>
              Build Debug APK: <code className="text-white">cd android &amp;&amp; ./gradlew assembleDebug</code>{' '}
              → <code className="text-[#4CAF50]">app/build/outputs/apk/debug/app-debug.apk</code>
            </span>
          </div>
          <span className="text-[11px] font-mono text-[#B8B8C2]">
            Install: <code className="text-white">adb install -r app/build/outputs/apk/debug/app-debug.apk</code>
          </span>
        </div>

        {/* File Tree & Code Viewer */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 min-h-0 overflow-hidden">
          <div className="md:col-span-4 border-r border-[#34343D] overflow-y-auto p-3 space-y-1 bg-[#0A0A0A]">
            {ANDROID_PROJECT_FILES.map((file) => {
              const active = file.path === activeFile?.path;
              return (
                <button
                  key={file.path}
                  type="button"
                  onClick={() => setSelectedPath(file.path)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono flex items-center gap-2 transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#007BA7] text-white font-semibold'
                      : 'text-[#B8B8C2] hover:bg-[#17171C] hover:text-white'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{file.path}</span>
                </button>
              );
            })}
          </div>

          <div className="md:col-span-8 flex flex-col min-h-0 bg-[#17171C]">
            <div className="px-4 py-2.5 border-b border-[#34343D] flex items-center justify-between">
              <span className="text-xs font-mono text-white truncate">
                android/{activeFile?.path}
              </span>
              <button
                type="button"
                onClick={() => void handleCopyFileContent()}
                className="px-3 py-1 rounded-lg bg-[#22222A] hover:bg-[#2c2c38] border border-[#34343D] text-xs text-white inline-flex items-center gap-1.5 cursor-pointer"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#4CAF50]" />
                    <span className="text-[#4CAF50]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Source</span>
                  </>
                )}
              </button>
            </div>
            <pre className="flex-1 overflow-auto p-4 text-xs font-mono text-[#E4E4EC] leading-relaxed">
              <code>{activeFile?.content}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
