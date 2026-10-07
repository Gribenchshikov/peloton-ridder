"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { linkPartnerAction, unlinkPartnerAction } from "../../partners/actions";
import { publicAssetUrl } from "@/lib/publicAssetUrl";

type Partner = { id: string; name: string; logoUrl: string; websiteUrl: string | null };
type LinkedPartner = { partner: Partner };

type Props = {
  eventId: string;
  linked: LinkedPartner[];
  all: Partner[];
};

export function PartnersSection({ eventId, linked, all }: Props) {
  const t = useTranslations("Admin");
  const [isPending, startTransition] = useTransition();
  const linkedIds = new Set(linked.map((l) => l.partner.id));
  const available = all.filter((p) => !linkedIds.has(p.id));

  function link(partnerId: string) {
    startTransition(async () => {
      await linkPartnerAction(eventId, partnerId);
    });
  }

  function unlink(partnerId: string) {
    startTransition(async () => {
      await unlinkPartnerAction(eventId, partnerId);
    });
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-lg font-bold text-ink">{t("eventPartnersTitle")}</h2>

      {linked.length === 0 ? (
        <p className="text-sm text-ink-faint">{t("eventPartnersEmpty")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {linked.map(({ partner }) => (
            <div key={partner.id} className="flex items-center gap-3 rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={publicAssetUrl(partner.logoUrl) ?? partner.logoUrl} alt={partner.name} className="h-7 w-14 object-contain" />
              <span className="flex-1 text-sm font-semibold text-ink">{partner.name}</span>
              <button
                type="button"
                onClick={() => unlink(partner.id)}
                disabled={isPending}
                className="text-sm font-semibold text-ink-faint transition-colors hover:text-red-500 disabled:opacity-40"
              >
                {t("deleteCta")}
              </button>
            </div>
          ))}
        </div>
      )}

      {available.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {available.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => link(p.id)}
              disabled={isPending}
              className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-ink transition-colors hover:border-ember hover:text-ember disabled:opacity-40"
            >
              + {p.name}
            </button>
          ))}
        </div>
      )}

      {all.length === 0 && (
        <p className="text-xs text-ink-faint">{t("eventPartnersNoGlobal")}</p>
      )}
    </section>
  );
}
