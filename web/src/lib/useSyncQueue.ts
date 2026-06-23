"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import api from "./axios";
import {
  getPendingMutations,
  removeMutation,
  incrementRetry,
  getPendingCount,
  QueuedMutation,
} from "./offlineQueue";

interface SyncState {
  isSyncing: boolean;
  pendingCount: number;
  syncedCount: number;
}

/**
 * Hook that processes the offline mutation queue when connection is restored.
 * Place this in Providers or layout level so it runs once for the entire app.
 */
export function useSyncQueue() {
  const [syncState, setSyncState] = useState<SyncState>({
    isSyncing: false,
    pendingCount: 0,
    syncedCount: 0,
  });
  const syncInProgress = useRef(false);

  // Update pending count on mount
  useEffect(() => {
    getPendingCount().then((count) => {
      setSyncState((prev) => ({ ...prev, pendingCount: count }));
    });
  }, []);

  const processQueue = useCallback(async () => {
    if (syncInProgress.current) return;
    syncInProgress.current = true;

    const mutations = await getPendingMutations();
    if (mutations.length === 0) {
      syncInProgress.current = false;
      return;
    }

    setSyncState((prev) => ({
      ...prev,
      isSyncing: true,
      pendingCount: mutations.length,
      syncedCount: 0,
    }));

    toast.loading(`Menyinkronkan ${mutations.length} perubahan...`, {
      id: "sync-progress",
    });

    let synced = 0;
    let failed = 0;

    for (const mutation of mutations) {
      try {
        await sendMutation(mutation);
        await removeMutation(mutation.id);
        synced++;
      } catch {
        const stillQueued = await incrementRetry(mutation.id);
        if (!stillQueued) failed++;
      }

      setSyncState((prev) => ({
        ...prev,
        syncedCount: synced,
        pendingCount: mutations.length - synced - failed,
      }));
    }

    setSyncState((prev) => ({
      ...prev,
      isSyncing: false,
    }));

    if (failed > 0) {
      toast.error(`${failed} perubahan gagal disinkronkan`, { id: "sync-progress" });
    } else {
      toast.success(`${synced} perubahan berhasil disinkronkan`, { id: "sync-progress" });
    }

    syncInProgress.current = false;
  }, []);

  // Listen for online event to trigger sync
  useEffect(() => {
    const handleOnline = () => {
      // Small delay to let the connection stabilize
      setTimeout(processQueue, 1000);
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [processQueue]);

  // Also process on mount if there are pending items
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.onLine) {
      getPendingCount().then((count) => {
        if (count > 0) {
          setTimeout(processQueue, 2000);
        }
      });
    }
  }, [processQueue]);

  return syncState;
}

/**
 * Send a queued mutation to the API.
 */
async function sendMutation(mutation: QueuedMutation): Promise<void> {
  const { endpoint, method, body } = mutation;

  switch (method) {
    case "POST":
      await api.post(endpoint, body);
      break;
    case "PUT":
      await api.put(endpoint, body);
      break;
    case "DELETE":
      await api.delete(endpoint);
      break;
    default:
      throw new Error(`Unsupported method: ${method}`);
  }
}
