"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Fragment, useState, useTransition } from "react";
import type { getUsersForAdmin } from "@/lib/queries";
import { updateUserAction } from "./actions";

type User = Awaited<ReturnType<typeof getUsersForAdmin>>[number];

type UserActionType = "menu" | "toggleAdmin" | "setOperator" | "setFinAdmin" | "ban" | "unban" | "freeze" | "unfreeze" | "forceReset" | "edit";

type ActiveAction = {
  userId: string;
  type: UserActionType;
  makeAdmin?: boolean;
  makeOperator?: boolean;
  makeFinAdmin?: boolean;
};

export function UsersView({
  users,
  currentUserId,
  superAdminUserId,
}: {
  users: User[];
  currentUserId?: string;
  superAdminUserId?: string | null;
}) {
  const t = useTranslations("Admin");
  const [activeTab, setActiveTab] = useState<"admins" | "runners">("admins");
  const [activeAction, setActiveAction] = useState<ActiveAction | null>(null);
  const [twoFaCode, setTwoFaCode] = useState("");
  const [banDays, setBanDays] = useState("7");
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [searchQuery, setSearchQuery] = useState("");

  const admins = users.filter((u) => u.isAdmin || u.isOperator || u.isFinAdmin);
  const regular = users.filter((u) => !u.isAdmin && !u.isOperator && !u.isFinAdmin);
  const baseUsers = activeTab === "admins" ? admins : regular;
  const q = searchQuery.trim().toLowerCase();
  const visibleUsers = q
    ? baseUsers.filter((u) =>
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
      )
    : baseUsers;

  function resetAction() {
    setActiveAction(null);
    setTwoFaCode("");
    setBanDays("7");
    setEditFirstName("");
    setEditLastName("");
    setEditEmail("");
    setFormError(null);
  }

  function openMenu(user: User) {
    setFormError(null);
    setTwoFaCode("");
    setBanDays("7");
    setEditFirstName("");
    setEditLastName("");
    setEditEmail("");
    setActiveAction({ userId: user.id, type: "menu" });
  }

  function openAction(user: User, type: UserActionType) {
    setFormError(null);
    setTwoFaCode("");
    setBanDays("7");
    setActiveAction({
      userId: user.id,
      type,
      makeAdmin: type === "toggleAdmin" ? !user.isAdmin : undefined,
      makeOperator: type === "setOperator" ? !user.isOperator : undefined,
      makeFinAdmin: type === "setFinAdmin" ? !user.isFinAdmin : undefined,
    });
    if (type === "edit") {
      setEditFirstName(user.firstName);
      setEditLastName(user.lastName);
      setEditEmail(user.email);
    }
  }

  async function handleSubmitAction(user: User) {
    if (!activeAction) return;
    setFormError(null);

    startTransition(async () => {
      const payload: Record<string, unknown> = {};
      const action = activeAction.type;
      if (action === "menu") return;

      if (action === "ban") {
        const days = Number(banDays) || 0;
        if (days <= 0) {
          setFormError(t("usersBanDaysError"));
          return;
        }
        payload.banDays = days;
      }

      if (action === "edit") {
        if (!editFirstName.trim() || !editLastName.trim() || !editEmail.trim()) {
          setFormError(t("usersEditFieldsRequired"));
          return;
        }
        payload.firstName = editFirstName.trim();
        payload.lastName = editLastName.trim();
        payload.email = editEmail.trim();
      }

      if (action === "toggleAdmin") payload.makeAdmin = activeAction.makeAdmin ?? false;
      if (action === "setOperator") payload.makeOperator = activeAction.makeOperator ?? false;
      if (action === "setFinAdmin") payload.makeFinAdmin = activeAction.makeFinAdmin ?? false;
      const res = await updateUserAction(user.id, action, payload, twoFaCode);
      if (res.error === "cannot_modify_super_admin") {
        setFormError("Нельзя изменять супер-администратора через UI.");
        return;
      }
      if (res.error === "cannot_demote_self") {
        setFormError(t("errorCannotDemoteSelf"));
        return;
      }
      if (res.error === "invalid_2fa_code") {
        setFormError(t("errorInvalidTwoFaCode"));
        return;
      }
      if (res.error === "email_taken") {
        setFormError(t("usersEmailTaken"));
        return;
      }
      if (res.error) {
        setFormError(t("usersActionFailed"));
        return;
      }
      if (res.ok) {
        resetAction();
        setToast(t("usersActionSuccess"));
        setTimeout(() => setToast(null), 3000);
      }
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-16">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-[var(--radius-s)] bg-ink px-4 py-3 text-sm font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}
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

      <div className="rounded-[var(--radius-m)] border border-border bg-surface p-4">
        <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab("admins");
              setSearchQuery("");
              resetAction();
            }}
            className={
              "rounded-[var(--radius-s)] px-4 py-2 text-sm font-semibold transition-colors " +
              (activeTab === "admins"
                ? "bg-ember text-white"
                : "border border-border bg-transparent text-ink hover:bg-surface-2")
            }
          >
            {t("adminsTab")}
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("runners");
              setSearchQuery("");
              resetAction();
            }}
            className={
              "rounded-[var(--radius-s)] px-4 py-2 text-sm font-semibold transition-colors " +
              (activeTab === "runners"
                ? "bg-ember text-white"
                : "border border-border bg-transparent text-ink hover:bg-surface-2")
            }
          >
            {t("runnersTab")}
          </button>
        </div>
        {activeTab === "runners" && (
          <input
            type="search"
            placeholder="Поиск по имени, фамилии или email…"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); resetAction(); }}
            className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-ember focus:outline-none"
          />
        )}
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
              <th className="px-4 py-2.5 text-left font-semibold text-ink-soft">Экстренный контакт</th>
              <th className="px-4 py-2.5 text-right font-semibold text-ink-soft">{t("regColDate")}</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {visibleUsers.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-ink-soft">
                  {activeTab === "admins" ? t("usersAdminsEmpty") : t("usersRunnersEmpty")}
                </td>
              </tr>
            ) : (
              visibleUsers.map((user) => {
                const isBanned = user.bannedUntil && new Date(user.bannedUntil) > new Date();
                const isFrozen = user.isFrozen;
                const isActiveAction = activeAction?.userId === user.id;
                return (
                  <Fragment key={user.id}>
                    <tr className="border-b border-border last:border-0 hover:bg-surface-2">
                      <td className="px-4 py-2.5 font-medium text-ink">
                        {user.firstName} {user.lastName}
                      </td>
                      <td className="px-4 py-2.5 text-ink-soft">{user.email}</td>
                      <td className="px-4 py-2.5 text-center">
                        <div className="flex flex-wrap justify-center gap-1">
                          {user.id === superAdminUserId && (
                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                              Super
                            </span>
                          )}
                          {user.isAdmin && (
                            <span className="inline-flex items-center rounded-full bg-ember/10 px-2 py-0.5 text-xs font-bold text-ember">
                              Admin
                            </span>
                          )}
                          {user.isOperator && (
                            <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                              Оператор
                            </span>
                          )}
                          {user.isFinAdmin && (
                            <span className="inline-flex items-center rounded-full bg-spruce/10 px-2 py-0.5 text-xs font-bold text-spruce">
                              Фин-Админ
                            </span>
                          )}
                          {!user.isAdmin && !user.isOperator && !user.isFinAdmin && (
                            <span className="text-xs text-ink-faint">{t("usersRoleUser")}</span>
                          )}
                        </div>
                        {isFrozen ? (
                          <div className="mt-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                            ❄ Заморожен
                          </div>
                        ) : isBanned ? (
                          <div className="mt-1 text-[11px] font-semibold text-red-600">
                            {t("usersBannedUntil", {
                              date: new Intl.DateTimeFormat("ru-RU", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }).format(new Date(user.bannedUntil!)),
                            })}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {user.emailVerified ? (
                          <span className="text-emerald-600 dark:text-emerald-400">✓</span>
                        ) : (
                          <span className="text-ink-faint">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center tabular-nums text-ink">
                        {user._count.registrations}
                      </td>
                      {(() => {
                        const ec = user.registrations[0];
                        return (
                          <td className="px-4 py-2.5 text-left text-xs text-ink">
                            {ec?.emergencyContact || ec?.emergencyContactName ? (
                              <div className="flex flex-col gap-0.5">
                                {ec.emergencyContactName && (
                                  <span className="font-semibold">{ec.emergencyContactName}</span>
                                )}
                                {ec.emergencyContact && (
                                  <a href={`tel:${ec.emergencyContact.replace(/\s/g, "")}`} className="text-ember hover:underline">
                                    {ec.emergencyContact}
                                  </a>
                                )}
                              </div>
                            ) : (
                              <span className="text-ink-faint">—</span>
                            )}
                          </td>
                        );
                      })()}
                      <td className="px-4 py-2.5 text-right tabular-nums text-ink">
                        {new Date(user.createdAt).toLocaleDateString("ru-RU", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {user.id === currentUserId ? (
                          <span className="text-xs text-ink-faint">{t("usersYou")}</span>
                        ) : (
                          <div className="flex flex-col items-end gap-2">
                            <button
                              type="button"
                              onClick={() => openMenu(user)}
                              disabled={pending}
                              className="rounded-[var(--radius-s)] bg-ember px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-ember-strong disabled:opacity-50"
                            >
                              {t("usersManage")}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                    {isActiveAction ? (
                      activeAction.type === "menu" ? (
                        <tr className="bg-surface-2" key={`${user.id}-menu`}>
                          <td colSpan={8} className="px-4 py-4">
                            <div className="flex flex-col gap-2 rounded-[var(--radius-m)] border border-border bg-surface p-4 shadow-sm">
                              <div className="grid gap-2 sm:grid-cols-4">
                                <button
                                  type="button"
                                  onClick={() => openAction(user, "toggleAdmin")}
                                  disabled={pending || user.id === superAdminUserId}
                                  className="rounded-[var(--radius-s)] border border-border bg-transparent px-3 py-2 text-xs font-semibold text-ink transition-colors hover:bg-surface-2 disabled:opacity-50"
                                >
                                  {user.isAdmin ? t("usersRevokeAdmin") : t("usersMakeAdmin")}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openAction(user, "setOperator")}
                                  disabled={pending || user.id === superAdminUserId}
                                  className="rounded-[var(--radius-s)] border border-border bg-transparent px-3 py-2 text-xs font-semibold text-ink transition-colors hover:bg-surface-2 disabled:opacity-50"
                                >
                                  {user.isOperator ? "Снять оператора" : "Сделать оператором"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openAction(user, "setFinAdmin")}
                                  disabled={pending || user.id === superAdminUserId}
                                  className="rounded-[var(--radius-s)] border border-border bg-transparent px-3 py-2 text-xs font-semibold text-ink transition-colors hover:bg-surface-2 disabled:opacity-50"
                                >
                                  {user.isFinAdmin ? "Снять фин-админа" : "Сделать фин-админом"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openAction(user, isBanned ? "unban" : "ban")}
                                  disabled={pending}
                                  className="rounded-[var(--radius-s)] border border-border bg-transparent px-3 py-2 text-xs font-semibold text-ink transition-colors hover:bg-surface-2 disabled:opacity-50"
                                >
                                  {isBanned ? t("usersUnban") : t("usersBan")}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openAction(user, isFrozen ? "unfreeze" : "freeze")}
                                  disabled={pending}
                                  className="rounded-[var(--radius-s)] border border-border bg-transparent px-3 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 transition-colors hover:bg-surface-2 disabled:opacity-50"
                                >
                                  {isFrozen ? "Разморозить" : "Заморозить"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openAction(user, "forceReset")}
                                  disabled={pending}
                                  className="rounded-[var(--radius-s)] border border-border bg-transparent px-3 py-2 text-xs font-semibold text-ink transition-colors hover:bg-surface-2 disabled:opacity-50"
                                >
                                  {t("usersForceReset")}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openAction(user, "edit")}
                                  disabled={pending}
                                  className="rounded-[var(--radius-s)] border border-border bg-transparent px-3 py-2 text-xs font-semibold text-ink transition-colors hover:bg-surface-2 disabled:opacity-50"
                                >
                                  {t("usersEditButton")}
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={resetAction}
                                className="self-end rounded-[var(--radius-s)] border border-border bg-transparent px-3 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
                              >
                                {t("usersActionCancel")}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr className="bg-surface-2" key={`${user.id}-action`}>
                          <td colSpan={8} className="px-4 py-4">
                            <div className="rounded-[var(--radius-m)] border border-border bg-surface p-4 shadow-sm">
                              <div className="mb-3 text-sm text-ink-soft">
                                {activeAction.type === "toggleAdmin" &&
                                  t(user.isAdmin ? "usersConfirmDemote" : "usersConfirmPromote")}
                                {activeAction.type === "setOperator" &&
                                  (user.isOperator ? "Снять роль оператора с этого пользователя?" : "Назначить этого пользователя оператором? Он получит доступ к выдаче наборов и трансферу.")}
                                {activeAction.type === "setFinAdmin" &&
                                  (user.isFinAdmin ? "Снять роль фин-админа?" : "Назначить этого пользователя фин-админом? Он получит доступ к финансовым отчётам.")}
                                {activeAction.type === "ban" &&
                                  t("usersConfirmBan", { days: banDays })}
                                {activeAction.type === "unban" && t("usersConfirmUnban")}
                                {activeAction.type === "freeze" && "Аккаунт будет заморожен навсегда. Пользователь не сможет войти."}
                                {activeAction.type === "unfreeze" && "Аккаунт будет разморожен. Пользователь сможет снова войти."}
                                {activeAction.type === "forceReset" && t("usersConfirmForceReset")}
                                {activeAction.type === "edit" && t("usersConfirmEdit")}
                              </div>
                              {activeAction.type === "ban" ? (
                                <div className="mb-3 grid gap-3 sm:grid-cols-2">
                                  <label className="text-sm text-ink">
                                    {t("usersBanDaysLabel")}
                                    <input
                                      type="number"
                                      min={1}
                                      value={banDays}
                                      onChange={(event) => setBanDays(event.target.value)}
                                      className="mt-1 w-full rounded-[var(--radius-s)] border border-border bg-surface px-2 py-2 text-sm text-ink"
                                    />
                                  </label>
                                </div>
                              ) : null}
                              {activeAction.type === "edit" ? (
                                <div className="mb-4 grid gap-3 sm:grid-cols-3">
                                  <label className="text-sm text-ink">
                                    {t("usersFirstNameLabel")}
                                    <input
                                      type="text"
                                      value={editFirstName}
                                      onChange={(event) => setEditFirstName(event.target.value)}
                                      className="mt-1 w-full rounded-[var(--radius-s)] border border-border bg-surface px-2 py-2 text-sm text-ink"
                                    />
                                  </label>
                                  <label className="text-sm text-ink">
                                    {t("usersLastNameLabel")}
                                    <input
                                      type="text"
                                      value={editLastName}
                                      onChange={(event) => setEditLastName(event.target.value)}
                                      className="mt-1 w-full rounded-[var(--radius-s)] border border-border bg-surface px-2 py-2 text-sm text-ink"
                                    />
                                  </label>
                                  <label className="text-sm text-ink">
                                    {t("usersEmailLabel")}
                                    <input
                                      type="email"
                                      value={editEmail}
                                      onChange={(event) => setEditEmail(event.target.value)}
                                      className="mt-1 w-full rounded-[var(--radius-s)] border border-border bg-surface px-2 py-2 text-sm text-ink"
                                    />
                                  </label>
                                </div>
                              ) : null}
                              <div className="mb-4 grid gap-2">
                                <label className="text-sm text-ink">
                                  {t("enterTwoFaCodeLabel")}
                                  <input
                                    type="text"
                                    value={twoFaCode}
                                    onChange={(event) => setTwoFaCode(event.target.value)}
                                    placeholder="123456"
                                    className="mt-1 w-full rounded-[var(--radius-s)] border border-border bg-surface px-2 py-2 text-sm text-ink"
                                  />
                                </label>
                                <p className="text-xs text-ink-faint">{t("twoFaMockHint")}</p>
                              </div>
                              {formError ? (
                                <p className="mb-3 text-sm font-semibold text-red-600">{formError}</p>
                              ) : null}
                              <div className="flex flex-wrap gap-2 justify-end">
                                <button
                                  type="button"
                                  onClick={resetAction}
                                  className="rounded-[var(--radius-s)] border border-border bg-transparent px-3 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
                                >
                                  {t("usersActionCancel")}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSubmitAction(user)}
                                  disabled={pending}
                                  className="rounded-[var(--radius-s)] bg-ember px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-ember-strong disabled:opacity-50"
                                >
                                  {t("usersActionConfirm")}
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
