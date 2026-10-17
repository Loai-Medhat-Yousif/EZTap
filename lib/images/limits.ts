/**
 * Client-safe upload limits. Kept out of `lib/storage/profile-images.ts`
 * (which is `server-only`) so the browser-side compressor can import the
 * same constant. The bucket enforces this server-side too; the value
 * only has to agree with the `file_size_limit` set in the storage
 * migration.
 */
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
