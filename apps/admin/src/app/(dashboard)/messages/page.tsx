"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { MessageStatus } from "@portfolio/validation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/input";
import { EmptyState, ErrorState, PageHeader, Pagination, StatusBadge, TableSkeleton } from "@/components/ui/primitives";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

type Msg = { id: string; name: string; email: string; subject: string | null; message: string; status: MessageStatus; createdAt: string; readAt: string | null };

export default function MessagesPage() {
  const { canEdit, isSuperAdmin } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<Msg | null>(null);
  const [del, setDel] = useState<Msg | null>(null);

  const list = useQuery({
    queryKey: ["messages", "list", q, status, page],
    queryFn: () => api.messages.list({ q: q || undefined, status: (status || undefined) as MessageStatus | undefined, page, pageSize: 20, order: "desc" }),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["messages"] });

  const setStatusMut = useMutation({
    mutationFn: ({ id, s }: { id: string; s: MessageStatus }) => api.messages.setStatus(id, s),
    onSuccess: (m) => (setOpen((cur) => (cur && cur.id === m.id ? (m as Msg) : cur)), refresh()),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.messages.remove(id),
    onSuccess: () => (toast.success("Message deleted"), setDel(null), setOpen(null), refresh()),
    onError: (e) => (toast.error(errorMessage(e)), setDel(null)),
  });

  function view(m: Msg) {
    setOpen(m);
    if (canEdit && m.status === "NEW") setStatusMut.mutate({ id: m.id, s: "READ" });
  }

  return (
    <>
      <PageHeader title="Messages" description="Messages sent through your contact form. They are stored here only; no email is sent." />
      <div className="card overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-line p-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-mute" aria-hidden="true" />
            <Input aria-label="Search messages" placeholder="Search messages" className="pl-9" value={q} onChange={(e) => (setQ(e.target.value), setPage(1))} />
          </div>
          <Select aria-label="Status" className="sm:w-44" value={status} onChange={(e) => (setStatus(e.target.value), setPage(1))}>
            <option value="">Status: all</option>
            <option value="NEW">New</option>
            <option value="READ">Read</option>
            <option value="ARCHIVED">Archived</option>
          </Select>
        </div>

        {list.isError ? (
          <ErrorState message={errorMessage(list.error)} onRetry={() => list.refetch()} />
        ) : list.isLoading ? (
          <TableSkeleton />
        ) : list.data && list.data.items.length > 0 ? (
          <>
            <ul className="divide-y divide-line">
              {(list.data.items as Msg[]).map((m) => (
                <li key={m.id}>
                  <button type="button" onClick={() => view(m)} className="flex w-full items-center gap-4 px-4 py-3.5 text-left hover:bg-soft/60">
                    <span className={`size-2 shrink-0 rounded-full ${m.status === "NEW" ? "bg-accent" : "bg-transparent"}`} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <span className={`truncate text-sm ${m.status === "NEW" ? "font-semibold" : "font-medium"}`}>{m.name}</span>
                        <span className="hidden truncate text-xs text-mute sm:inline">{m.email}</span>
                      </span>
                      <span className="block truncate text-sm text-mute">{m.subject || m.message}</span>
                    </span>
                    <span className="hidden shrink-0 text-xs text-mute sm:block">{formatDate(m.createdAt, true)}</span>
                    <StatusBadge status={m.status} />
                  </button>
                </li>
              ))}
            </ul>
            <Pagination page={list.data.meta.page} totalPages={list.data.meta.totalPages} total={list.data.meta.total} onPage={setPage} />
          </>
        ) : (
          <EmptyState icon={<Mail className="size-5" />} title={q || status ? "No messages match" : "No messages yet"} description={q || status ? "Try clearing the search or filter." : "Turn on the contact form under Contact and visitors can write to you."} />
        )}
      </div>

      {open && (
        <Dialog open onOpenChange={(o) => !o && setOpen(null)}>
          <DialogContent title={open.subject || `Message from ${open.name}`} description={`${formatDate(open.createdAt, true)}`} size="md">
            <dl className="mb-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-mute">From</dt>
              <dd>{open.name}</dd>
              <dt className="text-mute">Email</dt>
              <dd>
                <a className="underline underline-offset-4" href={`mailto:${open.email}`}>
                  {open.email}
                </a>
              </dd>
              <dt className="text-mute">Status</dt>
              <dd>
                <StatusBadge status={open.status} />
              </dd>
            </dl>
            <p className="whitespace-pre-wrap rounded-xl bg-soft/60 p-4 text-sm leading-relaxed" dir="auto">
              {open.message}
            </p>
            <DialogFooter className="sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {canEdit && open.status !== "ARCHIVED" && (
                  <Button variant="outline" onClick={() => setStatusMut.mutate({ id: open.id, s: "ARCHIVED" })}>
                    Archive
                  </Button>
                )}
                {canEdit && open.status !== "NEW" && (
                  <Button variant="outline" onClick={() => setStatusMut.mutate({ id: open.id, s: "NEW" })}>
                    Mark as new
                  </Button>
                )}
                {canEdit && open.status === "ARCHIVED" && (
                  <Button variant="outline" onClick={() => setStatusMut.mutate({ id: open.id, s: "READ" })}>
                    Restore
                  </Button>
                )}
                {isSuperAdmin && (
                  <Button variant="ghost" className="text-danger hover:bg-danger-bg" onClick={() => setDel(open)}>
                    Delete
                  </Button>
                )}
              </div>
              <Button asChild>
                <a href={`mailto:${open.email}?subject=${encodeURIComponent(`Re: ${open.subject ?? ""}`)}`}>Reply by email</a>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <ConfirmDialog open={!!del} title="Delete this message?" description="It will be removed permanently." confirmLabel="Delete" destructive loading={remove.isPending} onCancel={() => setDel(null)} onConfirm={() => del && remove.mutate(del.id)} />
    </>
  );
}
