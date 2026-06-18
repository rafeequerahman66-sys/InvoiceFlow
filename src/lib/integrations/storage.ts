/**
 * File storage — stubbed behind an interface so S3 / Cloudinary drop in later.
 * Default returns data URLs / passthrough paths so logo upload works without
 * any cloud bucket configured.
 */

export interface UploadArgs {
  key: string;
  contentType: string;
  bytes: ArrayBuffer | Uint8Array;
}

export interface FileStorage {
  readonly driver: string;
  upload(args: UploadArgs): Promise<{ url: string }>;
  getUrl(key: string): string;
}

class LocalNoopStorage implements FileStorage {
  readonly driver = "noop";
  async upload({ key }: UploadArgs): Promise<{ url: string }> {
    // A real driver would persist bytes and return a CDN URL.
    return { url: this.getUrl(key) };
  }
  getUrl(key: string): string {
    return `/uploads/${key}`;
  }
}

// Future: class S3Storage / CloudinaryStorage implements FileStorage.
export function getStorage(): FileStorage {
  switch (process.env.STORAGE_DRIVER) {
    // case "s3": return new S3Storage(...);
    default:
      return new LocalNoopStorage();
  }
}
