import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import type { TeamMember } from "@/generated/prisma/client";

export default async function AboutPage() {
  const t = await getTranslations("About");

  const members = await prisma.teamMember.findMany({
    orderBy: [{ type: "asc" }, { order: "asc" }],
  });

  const team = members.filter((m) => m.type === "TEAM");
  const volunteers = members.filter((m) => m.type === "VOLUNTEER");

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-16">
      {/* Header */}
      <div className="max-w-2xl">
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ember">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-ember" />
          {t("eyebrow")}
        </span>
        <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-ink sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-ink-soft">{t("intro")}</p>
      </div>

      {/* Stats */}
      <div className="mt-10 flex flex-wrap gap-8">
        <StatCell value="2019" label={t("statFounded")} />
        <StatCell value="4" label={t("statRaces")} />
        <StatCell value="25+" label={t("statVolunteers")} />
      </div>

      {/* Team */}
      <MemberSection title={t("teamTitle")} desc={t("teamDesc")} members={team} emptyText={t("membersEmpty")} />

      {/* Volunteers */}
      <MemberSection title={t("volunteersTitle")} desc={t("volunteersDesc")} members={volunteers} emptyText={t("membersEmpty")} />
    </main>
  );
}

function StatCell({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-display text-3xl font-bold text-ink">{value}</span>
      <span className="text-sm text-ink-faint">{label}</span>
    </div>
  );
}

function MemberSection({
  title,
  desc,
  members,
  emptyText,
}: {
  title: string;
  desc: string;
  members: TeamMember[];
  emptyText: string;
}) {
  return (
    <section className="mt-14">
      <h2 className="font-display text-xl font-bold text-ink">{title}</h2>
      <p className="mt-1 text-sm text-ink-soft">{desc}</p>
      {members.length === 0 ? (
        <p className="mt-6 text-sm text-ink-faint">{emptyText}</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {members.map((m) => (
            <MemberCard key={m.id} member={m} />
          ))}
        </div>
      )}
    </section>
  );
}

function MemberCard({ member }: { member: TeamMember }) {
  const initials = member.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex flex-col items-center rounded-[var(--radius-m)] border border-border bg-surface p-5 text-center">
      {member.photoUrl ? (
        <img
          src={member.photoUrl}
          alt={member.name}
          className="h-16 w-16 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ember text-lg font-bold text-white">
          {initials}
        </div>
      )}
      <h3 className="mt-3 text-sm font-bold text-ink">{member.name}</h3>
      <p className="mt-0.5 text-xs text-ink-faint">{member.role}</p>
      {member.bio && <p className="mt-2 text-xs leading-relaxed text-ink-soft">{member.bio}</p>}
    </div>
  );
}
