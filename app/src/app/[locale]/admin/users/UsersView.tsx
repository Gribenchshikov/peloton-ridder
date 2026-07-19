"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useState, useTransition } from "react";
import type { getUsersForAdmin } from "@/lib/queries";
import { toggleAdminAction } from "./actions";

type User = Awaited<ReturnType<typeof getUsersForAdmin>>[number];

function ToggleAdminButton({ user, isSelf }: { user: User; isSelf: boolean }) {
  const t = useTranslations("Admin");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handle() {
    setError(null);
    startTransition(async () => {
      const res = await toggleAdminAction(user.id, !user.isAdmin);
      if (res.error === "cannot_demote_self") setError(t("errorCannotDemoteSelf"));
    });
  }

  if (isSelf) {
    return <span className="text-xs text-ink-faint">{t("usersYou")}</span>;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handle}
        disabled={pending}
        className={[
          "rounded-[var(--radius-s)] px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50",
          user.isAdmin
            ? "border border-border text-ink-soft hover:bg-surface-2"
            : "bg-ember text-white hover:bg-ember-strong",
        ].join(" ")}
      >
        {pending ? "…" : user.isAdmin ? t("usersRevokeAdmin") : t("usersMakeAdmin")}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}

export function UsersView({
  users,
  currentUserId,
}: {
  users: User[];
  currentUserId?: string;
}) {
  const t = useTranslations("Admin");
  const format = useTranslations("Admin");

  const admins = users.filter((u) => u.isAdmin);
  const regular = users.filter((u) => !u.isAdmin);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/admin"
            className="text-sm font-semibold text-ink-faint transition-colors hover:text-ink"
          >
            ← {t("title")}
          </Link>
          <h1 className="mt-2 font-display text-2xl font-bold text-ink">{t("usersTitle")}</h1>
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-3">
        <div className="rounded-[var(--radius-m)] border border-border bg-surface-2 px-5 py-4">
          <div className="text-2xl font-bold text-ink">{users.length}</div>
          <div className="mt-0.5 text-xs text-ink-soft">{t("usersTotal")}</div>
        </div>
        <div className="rounded-[var(--radius-m)] border border-border bg-surface-2 px-5 py-4">
          <div className="text-2xl font-bold text-ink">{admins.length}</div>
          <div className="mt-0.5 text-xs text-ink-soft">{t("usersAdminCount")}</div>
        </div>
        <div className="rounded-[var(--radius-m)] border border-border bg-surface-2 px-5 py-4">
          <div className="text-2xl font-bold text-ink">
            {users.filter((u) => u.emailVerified).length}
          </div>
          <div className="mt-0.5 text-xs text-ink-soft">{t("usersVerified")}</div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-[var(--radius-m)] border border-border">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2">
              <th className="px-4 py-2.5 text-left font-semibold text-ink-soft">{t("regColName")}</th>
              <th className="px-4 py-2.5 text-left font-semibold text-ink-soft">{t("regColEmail")}</th>
              <th className="px-4 py-2.5 text-center font-semibold text-ink-soft">{t("usersColRole")}</th>
              <th className="px-4 py-2.5 text-center font-semibold text-ink-soft">{t("usersColVerified")}</th>
              <th className="px-4 py-2.5 text-center font-semibold text-ink-soft">{t("usersColRegs")}</th>
              <th className="px-4 py-2.5 text-right font-semibold text-ink-soft">{t("regColDate")}</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-border last:border-0 hover:bg-surface-2">
                <td className="px-4 py-2.5 font-medium text-ink">
                  {user.firstName} {user.lastName}
                </td>
                <td className="px-4 py-2.5 text-ink-soft">{user.email}</td>
                <td className="px-4 py-2.5 text-center">
                  {user.isAdmin ? (
                    <span className="inline-flex items-center rounded-full bg-ember/10 px-2 py-0.5 text-xs font-bold text-ember">
                      Admin
                    </span>
                  ) : (
                    <span className="text-xs text-ink-faint">{t("usersRoleUser")}</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-center">
                  {user.emailVerified ? (
                    <span className="text-emerald-600 dark:text-emerald-400">✓</span>
                  ) : (
                    <span className="text-ink-faint">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-center tabular-nums text-ink-soft">
                  {user._count.registrations}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-ink-faint">
                  {new Date(user.createdAt).toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <ToggleAdminButton
                    user={user}
                    isSelf={user.id === currentUserId}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
