"use client";

import { useState, useEffect, useCallback } from "react";

interface OnlineStatus {
  isOnline: boolean;
  isSyncing: boolean;
  wasOffline: boolean;
}

/**
 * Custom hook to track online/offline status.
 * Uses navigator.onLine + online/offline events for reliable detection.
 */
export function useOnlineStatus(): OnlineStatus {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    // Brief sync indicator when coming back online
    if (wasOffline) {
      setIsSyncing(true);
      setTimeout(() => setIsSyncing(false), 3000);
    }
  }, [wasOffline]);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setWasOffline(true);
    setIsSyncing(false);
  }, []);

  useEffect(() => {
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return { isOnline, isSyncing, wasOffline };
}
