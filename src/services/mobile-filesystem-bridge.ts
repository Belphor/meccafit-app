/**
 * FENYXIA · Mobile FileSystem Bridge
 * Capacitor Filesystem → Tauri FS → OPFS (browser dev fallback)
 * Binários ficam no disco; IndexedDB guarda apenas native_path.
 */

const OPFS_SCHEME = "opfs://";
const APP_ROOT = "fenyxia";

export type AppFileWriteResult = {
  /** Caminho persistido no IndexedDB (URI nativa ou opfs://…) */
  native_path: string;
};

type CapacitorFilesystemModule = {
  Filesystem: {
    writeFile(options: {
      path: string;
      data: string;
      directory: unknown;
    }): Promise<void>;
    getUri(options: { path: string; directory: unknown }): Promise<{ uri: string }>;
    deleteFile(options: { path: string; directory: unknown }): Promise<void>;
    mkdir(options: { path: string; directory: unknown; recursive?: boolean }): Promise<void>;
  };
  Directory: { Data: unknown };
  Encoding: { UTF8: unknown };
};

type CapacitorCoreModule = {
  Capacitor: {
    isNativePlatform(): boolean;
    convertFileSrc(filePath: string): string;
  };
};

type TauriFsModule = {
  writeFile(path: string, data: Uint8Array): Promise<void>;
  remove(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
};

type TauriPathModule = {
  appDataDir(): Promise<string>;
  join(...paths: string[]): Promise<string>;
};

type StorageBackend = "capacitor" | "tauri" | "opfs" | "none";

let resolvedBackend: StorageBackend | null = null;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/** Import opcional — evita resolução estática pelo bundler web. */
async function importOptional<T>(moduleId: string): Promise<T | null> {
  if (!isBrowser()) return null;
  try {
    const loader = new Function("moduleId", "return import(moduleId)") as (
      moduleId: string,
    ) => Promise<T>;
    return await loader(moduleId);
  } catch {
    return null;
  }
}

async function loadCapacitor(): Promise<{
  core: CapacitorCoreModule;
  fs: CapacitorFilesystemModule;
} | null> {
  try {
    const [core, fs] = await Promise.all([
      importOptional<CapacitorCoreModule>("@capacitor/core"),
      importOptional<CapacitorFilesystemModule>("@capacitor/filesystem"),
    ]);
    if (!core || !fs) return null;
    if (!core.Capacitor.isNativePlatform()) return null;
    return { core, fs };
  } catch {
    return null;
  }
}

async function loadTauri(): Promise<{ fs: TauriFsModule; path: TauriPathModule } | null> {
  try {
    const [fs, path] = await Promise.all([
      importOptional<TauriFsModule>("@tauri-apps/plugin-fs"),
      importOptional<TauriPathModule>("@tauri-apps/api/path"),
    ]);
    if (!fs || !path) return null;
    return { fs, path };
  } catch {
    return null;
  }
}

function supportsOpfs(): boolean {
  return (
    isBrowser() &&
    typeof navigator !== "undefined" &&
    typeof navigator.storage?.getDirectory === "function"
  );
}

async function resolveBackend(): Promise<StorageBackend> {
  if (resolvedBackend) return resolvedBackend;

  const capacitor = await loadCapacitor();
  if (capacitor) {
    resolvedBackend = "capacitor";
    return resolvedBackend;
  }

  const tauri = await loadTauri();
  if (tauri) {
    resolvedBackend = "tauri";
    return resolvedBackend;
  }

  if (supportsOpfs()) {
    resolvedBackend = "opfs";
    return resolvedBackend;
  }

  resolvedBackend = "none";
  return resolvedBackend;
}

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function fileToUint8Array(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

function inferExtension(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && ["webp", "jpg", "jpeg", "png"].includes(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/png") return "png";
  return "jpg";
}

function toRelativePath(segments: string[]): string {
  return `${APP_ROOT}/${segments.filter(Boolean).join("/")}`;
}

async function getOpfsDirectory(relativeDir: string, create: boolean): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory();
  const parts = relativeDir.split("/").filter(Boolean);
  let current = root;
  for (const part of parts) {
    current = await current.getDirectoryHandle(part, { create });
  }
  return current;
}

async function getOpfsFileHandle(
  relativePath: string,
  create: boolean,
): Promise<FileSystemFileHandle | null> {
  const parts = relativePath.split("/").filter(Boolean);
  const fileName = parts.pop();
  if (!fileName) return null;

  const dir = await getOpfsDirectory(parts.join("/"), create);
  return dir.getFileHandle(fileName, { create });
}

async function writeViaCapacitor(relativePath: string, file: File): Promise<AppFileWriteResult | null> {
  const capacitor = await loadCapacitor();
  if (!capacitor) return null;

  const { fs } = capacitor;
  const dirPath = relativePath.split("/").slice(0, -1).join("/");

  try {
    if (dirPath) {
      await fs.Filesystem.mkdir({
        path: dirPath,
        directory: fs.Directory.Data,
        recursive: true,
      });
    }

    await fs.Filesystem.writeFile({
      path: relativePath,
      data: await fileToBase64(file),
      directory: fs.Directory.Data,
    });

    return { native_path: relativePath };
  } catch {
    return null;
  }
}

async function resolveViaCapacitor(relativePath: string): Promise<string | null> {
  const capacitor = await loadCapacitor();
  if (!capacitor) return null;

  try {
    const { uri } = await capacitor.fs.Filesystem.getUri({
      path: relativePath,
      directory: capacitor.fs.Directory.Data,
    });
    return capacitor.core.Capacitor.convertFileSrc(uri);
  } catch {
    return null;
  }
}

async function deleteViaCapacitor(relativePath: string): Promise<void> {
  const capacitor = await loadCapacitor();
  if (!capacitor) return;

  try {
    await capacitor.fs.Filesystem.deleteFile({
      path: relativePath,
      directory: capacitor.fs.Directory.Data,
    });
  } catch {
    /* arquivo já removido ou inexistente */
  }
}

async function writeViaTauri(relativePath: string, file: File): Promise<AppFileWriteResult | null> {
  const tauri = await loadTauri();
  if (!tauri) return null;

  try {
    const baseDir = await tauri.path.appDataDir();
    const absolutePath = await tauri.path.join(baseDir, relativePath);
    await tauri.fs.writeFile(absolutePath, await fileToUint8Array(file));
    return { native_path: relativePath };
  } catch {
    return null;
  }
}

async function resolveViaTauri(relativePath: string): Promise<string | null> {
  const tauri = await loadTauri();
  if (!tauri) return null;

  try {
    const baseDir = await tauri.path.appDataDir();
    const absolutePath = await tauri.path.join(baseDir, relativePath);
    return absolutePath.startsWith("file://") ? absolutePath : `file://${absolutePath}`;
  } catch {
    return null;
  }
}

async function deleteViaTauri(relativePath: string): Promise<void> {
  const tauri = await loadTauri();
  if (!tauri) return;

  try {
    const baseDir = await tauri.path.appDataDir();
    const absolutePath = await tauri.path.join(baseDir, relativePath);
    if (await tauri.fs.exists(absolutePath)) {
      await tauri.fs.remove(absolutePath);
    }
  } catch {
    /* silencioso */
  }
}

async function writeViaOpfs(relativePath: string, file: File): Promise<AppFileWriteResult | null> {
  if (!supportsOpfs()) return null;

  try {
    const handle = await getOpfsFileHandle(relativePath, true);
    if (!handle) return null;

    const writable = await handle.createWritable();
    await writable.write(file);
    await writable.close();

    return { native_path: `${OPFS_SCHEME}${relativePath}` };
  } catch {
    return null;
  }
}

async function resolveViaOpfs(nativePath: string): Promise<string | null> {
  if (!nativePath.startsWith(OPFS_SCHEME) || !supportsOpfs()) return null;

  try {
    const relativePath = nativePath.slice(OPFS_SCHEME.length);
    const handle = await getOpfsFileHandle(relativePath, false);
    if (!handle) return null;
    const file = await handle.getFile();
    return URL.createObjectURL(file);
  } catch {
    return null;
  }
}

async function deleteViaOpfs(nativePath: string): Promise<void> {
  if (!nativePath.startsWith(OPFS_SCHEME) || !supportsOpfs()) return;

  try {
    const relativePath = nativePath.slice(OPFS_SCHEME.length);
    const parts = relativePath.split("/").filter(Boolean);
    const fileName = parts.pop();
    if (!fileName) return;

    const dir = await getOpfsDirectory(parts.join("/"), false);
    await dir.removeEntry(fileName);
  } catch {
    /* silencioso */
  }
}

/** Indica se há backend de disco disponível (nativo ou OPFS). */
export async function isNativeFilesystemAvailable(): Promise<boolean> {
  const backend = await resolveBackend();
  return backend !== "none";
}

/** Grava arquivo binário no diretório privado do app. */
export async function writeAppFile(relativePath: string, file: File): Promise<AppFileWriteResult | null> {
  if (!isBrowser()) return null;

  const backend = await resolveBackend();

  switch (backend) {
    case "capacitor":
      return writeViaCapacitor(relativePath, file);
    case "tauri":
      return writeViaTauri(relativePath, file);
    case "opfs":
      return writeViaOpfs(relativePath, file);
    default:
      return null;
  }
}

/** Resolve native_path gravado no IndexedDB para URL utilizável em `<img src>`. */
export async function resolveAppFileSrc(nativePath: string): Promise<string | null> {
  if (!isBrowser() || !nativePath.trim()) return null;

  if (nativePath.startsWith(OPFS_SCHEME)) {
    return resolveViaOpfs(nativePath);
  }

  if (nativePath.startsWith("file://") || nativePath.includes("_capacitor_file_")) {
    return nativePath;
  }

  const backend = await resolveBackend();

  switch (backend) {
    case "capacitor":
      return resolveViaCapacitor(nativePath);
    case "tauri":
      return resolveViaTauri(nativePath);
    case "opfs":
      return resolveViaOpfs(`${OPFS_SCHEME}${nativePath}`);
    default:
      return null;
  }
}

/** Remove arquivo físico associado ao native_path. */
export async function deleteAppFile(nativePath: string): Promise<void> {
  if (!nativePath.trim()) return;

  if (nativePath.startsWith(OPFS_SCHEME)) {
    await deleteViaOpfs(nativePath);
    return;
  }

  if (nativePath.startsWith("file://")) {
    const relativePath = nativePath.includes(APP_ROOT)
      ? nativePath.slice(nativePath.indexOf(APP_ROOT))
      : "";
    if (relativePath) {
      await deleteViaCapacitor(relativePath);
      await deleteViaTauri(relativePath);
    }
    return;
  }

  await deleteViaCapacitor(nativePath);
  await deleteViaTauri(nativePath);
  await deleteViaOpfs(`${OPFS_SCHEME}${nativePath}`);
}

/** Caminho relativo padronizado para avatar premium (isolado por conta). */
export function buildAvatarRelativePath(userId: string, file: File): string {
  const safeUserId = userId.trim().replace(/[^\w-]/g, "_") || "anonymous";
  return toRelativePath(["premium_avatar", `${safeUserId}.${inferExtension(file)}`]);
}

/** Caminho relativo padronizado para selfie de ciclo. */
export function buildSelfieRelativePath(id: string, file: File): string {
  const safeId = id.trim().replace(/[^\w.-]/g, "_");
  return toRelativePath(["selfies_ciclo", `${safeId}.${inferExtension(file)}`]);
}

/** Revoga blob URLs criadas pelo fallback OPFS (não afeta URIs Capacitor/file). */
export function revokeDisplaySrcIfEphemeral(src: string | null | undefined): void {
  if (src?.startsWith("blob:")) {
    URL.revokeObjectURL(src);
  }
}
