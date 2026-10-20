"use client";

import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Toaster } from "sonner";
import { ApiError } from "@/lib/api";
import { AuthProvider } from "@/lib/auth";
import { UnsavedProvider } from "@/lib/unsaved";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            // Client errors (bad request, not found, forbidden) will not fix themselves, so do not retry them.
            retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2,
          },
        },
        queryCache: new QueryCache(),
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <UnsavedProvider>
          {children}
          <Toaster position="bottom-right" richColors closeButton toastOptions={{ classNames: { toast: "font-sans" } }} />
        </UnsavedProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
