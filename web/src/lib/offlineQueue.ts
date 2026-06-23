import { openDB, DBSchema, IDBPDatabase } from "idb";

/**
 * Represents a queued mutation waiting to be synced when back online.
 */
export interface QueuedMutation {
  id: string;
  endpoint: string; // e.g. "/api/grades"
  method: "POST" | "PUT" | "DELETE";
  body?: any;
  timestamp: number;
  retryCount: number;
}

interface OfflineQueueDB extends DBSchema {
  mutations: {
    key: string;
    value: QueuedMutation;
    indexes: { "by-timestamp": number };
  };
}

const DB_NAME = "siakad-offline-queue";
const DB_VERSION = 1;
const MAX_RETRIES = 3;

let dbPromise: Promise<IDBPDatabase<OfflineQueueDB>> | null = null;

function getDB(): Promise<IDBPDatabase<OfflineQueueDB>> {
  if (!dbPromise) {
    dbPromise = openDB<OfflineQueueDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore("mutations", { keyPath: "id" });
        store.createIndex("by-timestamp", "timestamp");
      },
    });
  }
  return dbPromise;
}

/**
 * Generate a unique ID for a queued mutation.
 */
function generateId(): string {
  return `mut_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Add a mutation to the offline queue.
 * Called when a mutation fails while offline.
 */
export async function enqueueMutation(
  endpoint: string,
  method: "POST" | "PUT" | "DELETE",
  body?: any
): Promise<QueuedMutation> {
  const db = await getDB();
  const mutation: QueuedMutation = {
    id: generateId(),
    endpoint,
    method,
    body,
    timestamp: Date.now(),
    retryCount: 0,
  };
  await db.put("mutations", mutation);
  console.log(`[OfflineQueue] Enqueued: ${method} ${endpoint}`, mutation.id);
  return mutation;
}

/**
 * Get all pending mutations ordered by timestamp.
 */
export async function getPendingMutations(): Promise<QueuedMutation[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("mutations", "by-timestamp");
  return all;
}

/**
 * Get the count of pending mutations.
 */
export async function getPendingCount(): Promise<number> {
  const db = await getDB();
  return db.count("mutations");
}

/**
 * Remove a mutation from the queue (after successful sync).
 */
export async function removeMutation(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("mutations", id);
}

/**
 * Increment retry count for a failed mutation.
 * Removes it if max retries exceeded.
 */
export async function incrementRetry(id: string): Promise<boolean> {
  const db = await getDB();
  const mutation = await db.get("mutations", id);
  if (!mutation) return false;

  mutation.retryCount += 1;
  if (mutation.retryCount >= MAX_RETRIES) {
    console.warn(`[OfflineQueue] Max retries exceeded for ${id}, removing`);
    await db.delete("mutations", id);
    return false;
  }

  await db.put("mutations", mutation);
  return true;
}

/**
 * Clear all mutations from the queue (e.g. on user logout).
 */
export async function clearQueue(): Promise<void> {
  const db = await getDB();
  await db.clear("mutations");
}
