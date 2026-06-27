"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState, useEffect } from "react";
import { useSyncQueue } from "@/lib/useSyncQueue";
import { usePrefetch } from "@/lib/prefetch";

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Runs the offline sync queue once at the app level.
 * Processes queued mutations when connection is restored.
 * MOVED OUTSIDE Providers to prevent recreation on every render.
 */
function SyncQueueRunner() {
  useSyncQueue();
  return null;
}

/**
 * Reads the user role from localStorage and prefetches critical data.
 * MOVED OUTSIDE Providers to prevent recreation on every render.
 */
function PrefetchRunner() {
  const [role, setRole] = useState<string | null>(null);
  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        setRole(parsed.role || null);
      }
    } catch {}
  }, []);
  usePrefetch(role);
  return null;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Aggressive caching for poor networks
            staleTime: 5 * 60 * 1000, // 5 minutes (data considered fresh)
            gcTime: 30 * 60 * 1000, // 30 minutes (garbage collection)
            retry: 3, // retry up to 3 times on failure
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 8000), // 1s, 2s, 4s, 8s
            refetchOnReconnect: true, // auto-refetch when connection restored
            refetchOnWindowFocus: false, // don't refetch on tab switch (saves bandwidth)
            networkMode: "offlineFirst", // serve from cache when offline
          },
          mutations: {
            retry: 1, // minimal retry for mutations
            networkMode: "online", // only send mutations when online
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SyncQueueRunner />
      <PrefetchRunner />
      {children}
    </QueryClientProvider>
  );
}
