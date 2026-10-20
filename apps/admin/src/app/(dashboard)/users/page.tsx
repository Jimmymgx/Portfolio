"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { AdminUserDto } from "@portfolio/types";
import { ADMIN_ROLES, userCreateBody, userResetPasswordBody, userUpdateBody } from "@portfolio/validation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/input";
import { EmptyState, ErrorState, Field, PageHeader, Pagination, RowActions, StatusBadge, TableSkeleton } from "@/components/ui/primitives";
import { api, ApiError, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, titleCase } from "@/lib/utils";

type Dialogs = { kind: "create" } | { kind: "edit"; user: AdminUserDto } | { kind: "password"; user: AdminUserDto } | null;

export default function UsersPage() {
  const { user: me, isSuperAdmin } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<Dialogs>(null);
  const [del, setDel] = useState<AdminUserDto | null>(null);

  const list = useQuery({ queryKey: ["users", q, page], queryFn: () => api.users.list({ q: q || undefined, page, pageSize: 20 }), enabled: isSuperAdmin });
  const refresh = () => qc.invalidateQueries({ queryKey: ["users"] });
  const remove = useMutation({
    mutationFn: (id: string) => api.users.remove(id),
    onSuccess: () => (toast.success("User deleted"), setDel(null), refresh()),
    onError: (e) => (toast.error(errorMessage(e)), setDel(null)),
  });

  if (!isSuperAdmin) {
    return (
      <>
        <PageHeader title="Users" />
        <div className="card">
          <EmptyState title="Only super administrators can manage users" description="Ask a super administrator if you need an account changed." />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Users"
        description="Who can sign in to this CMS. Super administrators manage everything, editors manage content, viewers can only read."
        actions={
          <Button onClick={() => setDialog({ kind: "create" })}>
            <Plus className="size-4" aria-hidden="true" />
            New user
          </Button>
        }
      />
      <div className="card overflow-hidden">
        <div className="border-b border-line p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-mute" aria-hidden="true" />
            <Input aria-label="Search users" placeholder="Search by name or email" className="pl-9" value={q} onChange={(e) => (setQ(e.target.value), setPage(1))} />
          </div>
        </div>
        {list.isError ? (
          <ErrorState message={errorMessage(list.error)} onRetry={() => list.refetch()} />
        ) : list.isLoading ? (
          <TableSkeleton />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-soft/50 text-xs uppercase tracking-wide text-mute">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">User</th>
                  <th scope="col" className="px-4 py-3 font-medium">Role</th>
                  <th scope="col" className="hidden px-4 py-3 font-medium md:table-cell">Last sign-in</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="w-14 px-2"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {list.data?.items.map((u) => (
                  <tr key={u.id} className="hover:bg-soft/50">
                    <td className="px-4 py-3">
                      <span className="block font-medium">{u.name} {u.id === me?.id && <span className="text-xs font-normal text-mute">(you)</span>}</span>
                      <span className="block text-xs text-mute">{u.email}</span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={u.role} /></td>
                    <td className="hidden px-4 py-3 md:table-cell">{formatDate(u.lastLoginAt, true)}</td>
                    <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                    <td className="px-2 py-3 text-right">
                      <RowActions
                        label={`Actions for ${u.name}`}
                        actions={[
                          { label: "Edit", onSelect: () => setDialog({ kind: "edit", user: u }) },
                          { label: "Set new password", onSelect: () => setDialog({ kind: "password", user: u }) },
                          { label: "Delete", destructive: true, onSelect: () => setDel(u), disabled: u.id === me?.id },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {list.data && <Pagination page={list.data.meta.page} totalPages={list.data.meta.totalPages} total={list.data.meta.total} onPage={setPage} />}
          </div>
        )}
      </div>

      {dialog?.kind === "create" && <CreateUser onClose={() => setDialog(null)} onDone={() => (setDialog(null), refresh())} />}
      {dialog?.kind === "edit" && <EditUser user={dialog.user} isSelf={dialog.user.id === me?.id} onClose={() => setDialog(null)} onDone={() => (setDialog(null), refresh())} />}
      {dialog?.kind === "password" && <ResetPassword user={dialog.user} onClose={() => setDialog(null)} />}

      <ConfirmDialog open={!!del} title="Delete this user?" description={del ? `${del.name} (${del.email}) will lose access immediately.` : ""} confirmLabel="Delete user" destructive loading={remove.isPending} onCancel={() => setDel(null)} onConfirm={() => del && remove.mutate(del.id)} />
    </>
  );
}

function useServerErrors(setError: (name: never, e: { message: string }) => void) {
  const [formError, setFormError] = useState<string | null>(null);
  const handle = (e: unknown) => {
    if (e instanceof ApiError && e.code === "VALIDATION_ERROR" && Object.keys(e.fieldErrors).length) {
      Object.entries(e.fieldErrors).forEach(([p, message]) => setError(p as never, { message }));
      setFormError("Please fix the highlighted fields.");
    } else setFormError(errorMessage(e));
  };
  return { formError, setFormError, handle };
}

const createSchema = userCreateBody;
function CreateUser({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const f = useForm<z.infer<typeof createSchema>>({ resolver: zodResolver(createSchema), defaultValues: { name: "", email: "", password: "", role: "EDITOR" } });
  const { formError, setFormError, handle } = useServerErrors(f.setError as never);
  const m = useMutation({ mutationFn: (v: z.infer<typeof createSchema>) => api.users.create(v), onSuccess: () => (toast.success("User created"), onDone()), onError: handle });
  const e = f.formState.errors;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="New user" description="They can sign in with this email and password straight away." size="sm">
        <form onSubmit={f.handleSubmit((v) => (setFormError(null), m.mutate(v)))} noValidate className="space-y-4">
          {formError && <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">{formError}</p>}
          <Field label="Name" htmlFor="u-name" error={e.name?.message} required><Input id="u-name" aria-invalid={!!e.name} {...f.register("name")} /></Field>
          <Field label="Email" htmlFor="u-email" error={e.email?.message} required><Input id="u-email" type="email" autoComplete="off" aria-invalid={!!e.email} {...f.register("email")} /></Field>
          <Field label="Temporary password" htmlFor="u-password" error={e.password?.message} description="At least 12 characters with upper case, lower case and a number. Share it securely." required>
            <Input id="u-password" type="password" autoComplete="new-password" aria-invalid={!!e.password} {...f.register("password")} />
          </Field>
          <Field label="Role" htmlFor="u-role" error={e.role?.message} required>
            <Select id="u-role" {...f.register("role")}>{ADMIN_ROLES.map((r) => <option key={r} value={r}>{titleCase(r)}</option>)}</Select>
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={m.isPending}>Create user</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditUser({ user, isSelf, onClose, onDone }: { user: AdminUserDto; isSelf: boolean; onClose: () => void; onDone: () => void }) {
  const f = useForm<z.infer<typeof userUpdateBody>>({ resolver: zodResolver(userUpdateBody), defaultValues: { name: user.name, role: user.role, status: user.status } });
  const { formError, setFormError, handle } = useServerErrors(f.setError as never);
  const m = useMutation({
    mutationFn: (v: z.infer<typeof userUpdateBody>) => api.users.update(user.id, isSelf ? { name: v.name } : v),
    onSuccess: () => (toast.success("User updated"), onDone()),
    onError: handle,
  });
  const e = f.formState.errors;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={`Edit ${user.name}`} description={user.email} size="sm">
        <form onSubmit={f.handleSubmit((v) => (setFormError(null), m.mutate(v)))} noValidate className="space-y-4">
          {formError && <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">{formError}</p>}
          <Field label="Name" htmlFor="e-name" error={e.name?.message}><Input id="e-name" {...f.register("name")} /></Field>
          <Field label="Role" htmlFor="e-role" description={isSelf ? "You cannot change your own role." : "Changing the role signs the user out."}>
            <Select id="e-role" disabled={isSelf} {...f.register("role")}>{ADMIN_ROLES.map((r) => <option key={r} value={r}>{titleCase(r)}</option>)}</Select>
          </Field>
          <Field label="Status" htmlFor="e-status" description={isSelf ? "You cannot disable your own account." : "A disabled user cannot sign in."}>
            <Select id="e-status" disabled={isSelf} {...f.register("status")}><option value="ACTIVE">Active</option><option value="DISABLED">Disabled</option></Select>
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={m.isPending}>Save changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetPassword({ user, onClose }: { user: AdminUserDto; onClose: () => void }) {
  const f = useForm<z.infer<typeof userResetPasswordBody>>({ resolver: zodResolver(userResetPasswordBody), defaultValues: { newPassword: "" } });
  const { formError, setFormError, handle } = useServerErrors(f.setError as never);
  const m = useMutation({ mutationFn: (v: { newPassword: string }) => api.users.resetPassword(user.id, v.newPassword), onSuccess: () => (toast.success("Password changed. The user was signed out everywhere"), onClose()), onError: handle });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Set a new password" description={`${user.name} will be signed out everywhere.`} size="sm">
        <form onSubmit={f.handleSubmit((v) => (setFormError(null), m.mutate(v)))} noValidate className="space-y-4">
          {formError && <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">{formError}</p>}
          <Field label="New password" htmlFor="r-pass" error={f.formState.errors.newPassword?.message} description="At least 12 characters with upper case, lower case and a number." required>
            <Input id="r-pass" type="password" autoComplete="new-password" {...f.register("newPassword")} />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={m.isPending}>Set password</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

