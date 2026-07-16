import "client-only";

import {
  deleteCloudStorageItem,
  getCloudStorageItem,
  getCloudStorageKeys,
  isCloudStorageSupported,
  setCloudStorageItem,
} from "@telegram-apps/sdk-react";

/**
 * Thin, typed wrapper around Telegram's Cloud Storage bridge methods.
 * Not consumed anywhere yet in Phase 1 — this is the prepared surface a
 * later feature (e.g. caching the active event, remembering draft form
 * state) will call into, so it isn't reinvented ad hoc per feature.
 */
export const telegramCloudStorage = {
  isSupported(): boolean {
    return isCloudStorageSupported();
  },

  async get(key: string): Promise<string | undefined> {
    if (!getCloudStorageItem.isAvailable()) return undefined;
    const value = await getCloudStorageItem(key);
    return value === "" ? undefined : value;
  },

  async set(key: string, value: string): Promise<void> {
    if (!setCloudStorageItem.isAvailable()) return;
    await setCloudStorageItem(key, value);
  },

  async remove(keyOrKeys: string | string[]): Promise<void> {
    if (!deleteCloudStorageItem.isAvailable()) return;
    await deleteCloudStorageItem(keyOrKeys);
  },

  async keys(): Promise<string[]> {
    if (!getCloudStorageKeys.isAvailable()) return [];
    return getCloudStorageKeys();
  },
};
