import {
  EnhancementMode,
  PdfPageSize,
  reconcileDocumentIntegrity,
  type ZViewDocumentContent,
  type ZViewDocumentMeta,
  type ZViewSettings,
} from '../domain/zviewLogic';

const META_STORAGE_KEY = 'zview_documents_meta_v1';
const CONTENT_PREFIX = 'zview_doc_content_v1_';
const SETTINGS_STORAGE_KEY = 'zview_settings_v1';
const IDB_NAME = 'zview_local_storage_db';
const IDB_STORE = 'document_contents';

const DEFAULT_SETTINGS: ZViewSettings = {
  defaultPageSize: PdfPageSize.A4,
  defaultEnhancement: EnhancementMode.DOCUMENT_ENHANCE,
  cloudSyncEnabled: false,
  lastCloudBackupAt: null,
  highContrastBorders: false,
};

function openContentIdb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: 'documentId' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function saveDocumentContentLocal(content: ZViewDocumentContent): Promise<void> {
  const db = await openContentIdb();
  if (db) {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(content);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error('Insufficient storage or IndexedDB write error.'));
    });
  }
  try {
    localStorage.setItem(`${CONTENT_PREFIX}${content.documentId}`, JSON.stringify(content));
  } catch {
    // If localStorage quota is exceeded for large PDFs, IndexedDB still holds the content
  }
}

export async function loadDocumentContentLocal(
  documentId: string
): Promise<ZViewDocumentContent | null> {
  const rawFallback = localStorage.getItem(`${CONTENT_PREFIX}${documentId}`);
  if (rawFallback) {
    try {
      return JSON.parse(rawFallback) as ZViewDocumentContent;
    } catch {
      // Continue to IndexedDB
    }
  }

  const db = await openContentIdb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(documentId);
      req.onsuccess = () => resolve((req.result as ZViewDocumentContent) ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function deleteDocumentContentLocal(documentId: string): Promise<void> {
  localStorage.removeItem(`${CONTENT_PREFIX}${documentId}`);
  const db = await openContentIdb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(documentId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function listAvailableContentIds(docIds: string[]): Promise<Set<string>> {
  const available = new Set<string>();
  for (const id of docIds) {
    const content = await loadDocumentContentLocal(id);
    if (content && Array.isArray(content.pages) && content.pages.length > 0) {
      available.add(id);
    }
  }
  return available;
}

export function loadMetadataListSync(): ZViewDocumentMeta[] {
  try {
    const raw = localStorage.getItem(META_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveMetadataListSync(list: ZViewDocumentMeta[]): void {
  localStorage.setItem(META_STORAGE_KEY, JSON.stringify(list));
}

export async function loadAndReconcileDocuments(): Promise<ZViewDocumentMeta[]> {
  const metas = loadMetadataListSync();
  if (metas.length === 0) return [];
  const availableIds = await listAvailableContentIds(metas.map((m) => m.id));
  return reconcileDocumentIntegrity(metas, availableIds);
}

export function loadSettingsSync(): ZViewSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettingsSync(settings: ZViewSettings): void {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}
