import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AdminFormHeader } from "../events/AdminFormHeader";
import type { TeamMember } from "@/generated/prisma/client";

export function ClubView({ members }: { members: TeamMember[] }) {
  const t = useTranslations("Admin");

  const team = members.filter((m) => m.type === "TEAM");
  const volunteers = members.filter((m) => m.type === "VOLUNTEER");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16">
      <AdminFormHeader title={t("clubTitle")} />
      <div className="flex justify-end">
        <Link
          href="/admin/club/new"
          className="rounded-[var(--radius-s)] bg-ember px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-ember-strong"
        >
          {t("addMemberCta")}
        </Link>
      </div>

      <MemberSection title={t("memberTypeTeam")} members={team} emptyText={t("membersEmpty")} t={t} />
      <MemberSection title={t("memberTypeVolunteer")} members={volunteers} emptyText={t("membersEmpty")} t={t} />
    </main>
  );
}

function MemberSection({
  title,
  members,
  emptyText,
  t,
}: {
  title: string;
  members: TeamMember[];
  emptyText: string;
  t: ReturnType<typeof useTranslations<"Admin">>;
}) {
  return (
    <section>
      <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
      {members.length === 0 ? (
        <p className="mt-3 text-sm text-ink-faint">{emptyText}</p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-[var(--radius-m)] border border-border">
          <table className="w-full min-w-[480px] text-sm">
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-ink">{m.name}</div>
                    <div className="text-xs text-ink-faint">{m.role}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-soft">{m.bio ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-xs text-ink-faint">#{m.order}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/club/${m.id}`}
                      className="font-semibold text-ink hover:text-ember"
                    >
                      {t("editCta")}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
