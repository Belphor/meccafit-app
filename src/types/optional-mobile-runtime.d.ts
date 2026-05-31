/** Tipos stub para runtimes nativos opcionais (Capacitor/Tauri instalados no build mobile). */

declare module "@capacitor/core" {
  export const Capacitor: {
    isNativePlatform(): boolean;
    convertFileSrc(filePath: string): string;
  };
}

declare module "@capacitor/filesystem" {
  export const Directory: {
    Data: string;
    Documents: string;
    Cache: string;
  };
  export const Encoding: {
    UTF8: string;
  };
  export const Filesystem: {
    writeFile(options: {
      path: string;
      data: string;
      directory: string;
      encoding?: string;
    }): Promise<void>;
    getUri(options: { path: string; directory: string }): Promise<{ uri: string }>;
    deleteFile(options: { path: string; directory: string }): Promise<void>;
    mkdir(options: {
      path: string;
      directory: string;
      recursive?: boolean;
    }): Promise<void>;
  };
}

declare module "@tauri-apps/plugin-fs" {
  export function writeFile(path: string, data: Uint8Array): Promise<void>;
  export function remove(path: string): Promise<void>;
  export function exists(path: string): Promise<boolean>;
}

declare module "@tauri-apps/api/path" {
  export function appDataDir(): Promise<string>;
  export function join(...paths: string[]): Promise<string>;
}
