import { useTranslations, useFormatter } from "next-intl";
import { ageLabelKey } from "@/lib/distanceLabel";
import { formatKzt } from "@/lib/currency";

export function DistanceInfo({
  name,
  km,
  price,
  minAge,
  maxAge,
  certification,
  certificationPoints,
}: {
  name: string;
  km: number;
  price: number;
  minAge: number | null;
  maxAge: number | null;
  certification?: string | null;
  certificationPoints?: number | null;
}) {
  const t = useTranslations("EventDetail");
  const tCommon = useTranslations("Common");
  const format = useFormatter();
  const ageLabelInfo = ageLabelKey({ minAge, maxAge });
  const ageLabel = ageLabelInfo && t(ageLabelInfo.key, ageLabelInfo.params);

  return (
    <>
      <div className="flex-1">
        <div className="text-sm font-semibold text-ink">
          {name} · {km} {tCommon("km")}
        </div>
        {certification && (
          <div className="mt-0.5 text-xs text-ink-faint">
            Сертифицировано {certification}{certificationPoints != null ? ` · ${certificationPoints} баллов` : ""}
          </div>
        )}
        {ageLabel && <div className="text-xs text-ink-faint">{ageLabel}</div>}
      </div>
      <div className="shrink-0 text-sm font-bold text-ink">{formatKzt(format, price)}</div>
    </>
  );
}
