"use client";

import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorState, PageHeader, Pagination, TableSkeleton } from "@/components/ui/primitives";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

export default function AuditLogsPage() {
  const { isSuperAdmin } = useAuth();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const list = useQuery({ queryKey: ["audit", q, page], queryFn: () => api.auditLogs({ q: q || undefined, page, pageSize: 30, order: "desc" }), enabled: isSuperAdmin });

  if (!isSuperAdmin)
    return (
      <>
        <PageHeader title="Audit log" />
        <div className="card">
          <EmptyState title="Only super administrators can read the audit log" />
        </div>
      </>
    );

  return (
    <>
      <PageHeader title="Audit log" description="Who changed what and when. Entries never contain passwords, tokens or message text." />
      <div className="card overflow-hidden">
        <div className="border-b border-line p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-mute" aria-hidden="true" />
            <Input aria-label="Search the audit log" placeholder="Search by action, item or person" className="pl-9" value={q} onChange={(e) => (setQ(e.target.value), setPage(1))} />
          </div>
        </div>
        {list.isError ? (
          <ErrorState message={errorMessage(list.error)} onRetry={() => list.refetch()} />
        ) : list.isLoading ? (
          <TableSkeleton />
        ) : list.data && list.data.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-soft/50 text-xs uppercase tracking-wide text-mute">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">When</th>
                  <th scope="col" className="px-4 py-3 font-medium">Action</th>
                  <th scope="col" className="hidden px-4 py-3 font-medium md:table-cell">Item</th>
                  <th scope="col" className="px-4 py-3 font-medium">Who</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {list.data.items.map((a) => (
                  <tr key={a.id} className="align-top hover:bg-soft/50">
                    <td className="whitespace-nowrap px-4 py-3 text-mute">{formatDate(a.createdAt, true)}</td>
                    <td className="px-4 py-3">
                      <code className="rounded bg-soft px-1.5 py-0.5 text-xs">{a.action}</code>
                      {a.metadata?.fields && <span className="mt-1 block text-xs text-mute">fields: {(a.metadata.fields as string[]).join(", ")}</span>}
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      {a.entityType}
                      {a.entityId && <span className="text-mute"> #{a.entityId}</span>}
                    </td>
                    <td className="px-4 py-3">{a.actorEmail ?? "System"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={list.data.meta.page} totalPages={list.data.meta.totalPages} total={list.data.meta.total} onPage={setPage} />
          </div>
        ) : (
          <EmptyState title="No entries" description="Changes will be recorded here." />
        )}
      </div>
    </>
  );
}
