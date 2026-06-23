"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import api from "./axios";

/**
 * Query keys used for prefetching.
 * Keep these consistent with the actual query keys used in pages.
 */
export const queryKeys = {
  students: ["/students"] as const,
  classes: ["/classes"] as const,
  subjects: ["/subjects"] as const,
  teachers: ["/teachers"] as const,
  attendances: ["/attendances"] as const,
  grades: ["/grades"] as const,
  schedules: ["/schedules"] as const,
  announcements: ["/announcements"] as const,
} as const;

/**
 * Lightweight fetcher for prefetch — uses fields param where supported
 * to minimize payload size.
 */
async function prefetchFetcher(endpoint: string, params?: Record<string, any>) {
  const res = await api.get(endpoint, {
    params: { limit: 100, ...params },
  });
  return res.data;
}

/**
 * Prefetch data that the user will likely navigate to next.
 * Call this after login or when arriving at a dashboard.
 *
 * @param role - The user's role to determine what to prefetch
 */
export function usePrefetch(role: string | null) {
  const queryClient = useQueryClient();
  const hasPrefetched = useRef(false);

  useEffect(() => {
    if (!role || hasPrefetched.current) return;
    hasPrefetched.current = true;

    // Use requestIdleCallback or setTimeout for low-priority prefetch
    const schedulePrefetch =
      typeof window !== "undefined" && "requestIdleCallback" in window
        ? (fn: () => void) => (window as any).requestIdleCallback(fn, { timeout: 5000 })
        : (fn: () => void) => setTimeout(fn, 2000);

    schedulePrefetch(() => {
      if (role === "admin" || role === "kepala_sekolah") {
        // Admin dashboard: prefetch common data lists
        queryClient.prefetchQuery({
          queryKey: queryKeys.students,
          queryFn: () => prefetchFetcher("/students", { fields: "id,name,nis,className,status" }),
          staleTime: 5 * 60 * 1000,
        });
        queryClient.prefetchQuery({
          queryKey: queryKeys.classes,
          queryFn: () => prefetchFetcher("/classes"),
          staleTime: 5 * 60 * 1000,
        });
        queryClient.prefetchQuery({
          queryKey: queryKeys.teachers,
          queryFn: () => prefetchFetcher("/teachers", { fields: "id,name,nipNis" }),
          staleTime: 5 * 60 * 1000,
        });
        queryClient.prefetchQuery({
          queryKey: queryKeys.subjects,
          queryFn: () => prefetchFetcher("/subjects"),
          staleTime: 5 * 60 * 1000,
        });
      } else if (role === "teacher") {
        // Teacher hub: prefetch classes and attendance
        queryClient.prefetchQuery({
          queryKey: queryKeys.classes,
          queryFn: () => prefetchFetcher("/classes"),
          staleTime: 5 * 60 * 1000,
        });
        queryClient.prefetchQuery({
          queryKey: queryKeys.schedules,
          queryFn: () => prefetchFetcher("/schedules"),
          staleTime: 5 * 60 * 1000,
        });
      } else if (role === "student") {
        // Student hub: prefetch grades and attendance
        queryClient.prefetchQuery({
          queryKey: queryKeys.grades,
          queryFn: () => prefetchFetcher("/grades"),
          staleTime: 5 * 60 * 1000,
        });
        queryClient.prefetchQuery({
          queryKey: queryKeys.attendances,
          queryFn: () => prefetchFetcher("/attendances"),
          staleTime: 5 * 60 * 1000,
        });
      } else if (role === "guardian") {
        // Guardian: prefetch child's grades and attendance
        queryClient.prefetchQuery({
          queryKey: queryKeys.grades,
          queryFn: () => prefetchFetcher("/grades"),
          staleTime: 5 * 60 * 1000,
        });
      }
    });
  }, [role, queryClient]);
}
