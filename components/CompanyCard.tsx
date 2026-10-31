"use client";

import Image from "next/image";

import { Icon } from "@/components/Icon";
import { useI18n } from "@/lib/i18n";
import { COUNTRIES, NEED_LABEL, SECTOR_LABEL, STAGE_LABEL, type Profile, type Request } from "@/lib/types";
import { cn, initials } from "@/lib/utils";

/**
 * The company at a glance, same anatomy as the Nexa person card: picture on
 * top with the name over it, three facts, then what they're looking for.
 */
export function CompanyCard({ profile, request, onEdit, className }: { profile: Profile; request?: Request | null; onEdit?: () => void; className?: string }) {
  const { t } = useI18n();
  const accent = profile.accent ?? "#0033a0";
  const top = profile.highlights?.[0];
  const isData = (src?: string) => !!src && src.startsWith("data:");

  return (
    <div className={cn("nx-rise overflow-hidden border border-line-strong/60 bg-card shadow-[0_16px_36px_-24px_rgb(0_0_0/45%)]", className)}>
      <div className="relative h-[220px] overflow-hidden text-white" style={{ background: profile.banner ? "#050a05" : `linear-gradient(150deg, ${accent}, #001a55 70%, #d0103a)` }}>
        {profile.banner ? (
          <Image src={profile.banner} alt="" fill sizes="340px" className="object-cover" style={{ transform: "scale(1.4)", transformOrigin: "50% 80%" }} priority />
        ) : profile.logo ? (
          <div className="absolute inset-0 grid place-items-center">
            <span className="relative grid size-[104px] place-items-center overflow-hidden rounded-2xl bg-white p-3 shadow-[0_12px_30px_-10px_rgb(0_0_0/55%)]">
              {isData(profile.logo) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.logo} alt="" className="max-h-full max-w-full object-contain" />
              ) : (
                <Image src={profile.logo} alt="" width={80} height={80} className="object-contain" />
              )}
            </span>
          </div>
        ) : (
          <div className="absolute inset-0 grid place-items-center">
            <span className="font-mono text-[60px] font-semibold opacity-95">{initials(profile.name) || "?"}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(0_0_0/55%)_0%,rgb(0_0_0/0%)_32%,rgb(0_0_0/12%)_55%,rgb(0_0_0/85%)_100%)]" />
        <div className="relative flex h-full flex-col p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="font-mono text-[10px] leading-snug tracking-[0.14em] uppercase opacity-85">
              Nexa
              <br />
              {"// "}
              {profile.sectors.map((s) => SECTOR_LABEL[s]).join(" · ")}
            </p>
            <div className="text-right">
              <p className="font-mono text-[26px] leading-none font-semibold">{top ? top.value : profile.teamSize}</p>
              <p className="mt-1 font-mono text-[9.5px] tracking-[0.14em] uppercase opacity-75">{top ? top.label : t("card.team")}</p>
            </div>
          </div>
          <div className="mt-auto flex items-end gap-3">
            {profile.logo && profile.banner ? (
              <span className="relative size-11 shrink-0 overflow-hidden rounded-lg border border-white/30 bg-black">
                <Image src={profile.logo} alt="" fill sizes="44px" className="object-contain p-0.5" />
              </span>
            ) : null}
            <div className="min-w-0">
              <p className="truncate text-[22px] leading-none font-semibold tracking-[-0.02em]">{profile.name}</p>
              <p className="mt-2 font-mono text-[11px] tracking-[0.12em] text-[#FFE58A] uppercase">
                {COUNTRIES[profile.country].flag} {COUNTRIES[profile.country].name} · {STAGE_LABEL[profile.stage]}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 border-b border-line text-center">
        {[
          [STAGE_LABEL[profile.stage], t("card.stage")],
          [String(profile.teamSize), t("card.team")],
          [t(`card.src.${profile.source}`), t("card.source")],
        ].map(([value, label], i) => (
          <div key={label} className={cn("px-2 py-3", i > 0 && "border-l border-line")}>
            <p className="truncate font-mono text-[15px]">{value}</p>
            <p className="nx-micro truncate text-[10px] text-ink-3">{label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-4 p-4">
        {profile.oneLiner ? (
          <div>
            <p className="nx-micro text-[10.5px] text-ink-3">{t("card.about")}</p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">{profile.oneLiner}</p>
          </div>
        ) : null}

        {profile.highlights && profile.highlights.length > 1 ? (
          <div className="grid grid-cols-2 gap-2">
            {profile.highlights.slice(0, 4).map((h, i) => (
              <div key={h.label} className="rounded-lg border border-line bg-paper px-3 py-2">
                <p className="font-mono text-[17px] leading-none" style={{ color: ["#0033a0", "#d0103a", "#0e7a4b", "#b07400"][i] }}>
                  {h.value}
                </p>
                <p className="mt-1 text-[11.5px] text-ink-3">{h.label}</p>
              </div>
            ))}
          </div>
        ) : null}

        {request ? (
          <>
            <div>
              <p className="nx-micro text-[10.5px] text-ink-3">{t("card.lookingFor")}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {request.needs.map((n) => (
                  <span key={n} className="inline-flex h-7 items-center gap-1.5 rounded-full border border-asean/30 bg-asean-soft px-2.5 text-[12px] font-medium text-asean">
                    <span className="size-1.5 rounded-full bg-saffron" />
                    {NEED_LABEL[n]}
                  </span>
                ))}
              </div>
            </div>
            {request.targetMarkets.length ? (
              <div>
                <p className="nx-micro text-[10.5px] text-ink-3">{t("card.markets")}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {request.targetMarkets.map((c) => (
                    <span key={c} className="inline-flex h-7 items-center gap-1.5 rounded-full border border-line bg-card px-2.5 text-[12px]">
                      {COUNTRIES[c].flag} {COUNTRIES[c].name}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        {onEdit || profile.website ? (
          <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
            {profile.website ? (
              <a href={profile.website} target="_blank" rel="noreferrer" className="inline-flex min-w-0 items-center gap-1.5 truncate text-[12.5px] text-ink-2 hover:text-ink">
                <Icon name="external" size={13} />
                {profile.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </a>
            ) : (
              <span />
            )}
            {onEdit ? (
              <button onClick={onEdit} className="nx-micro nx-focus inline-flex h-8 shrink-0 items-center rounded-md border border-line px-3 text-[11px] hover:border-ink">
                {t("card.edit")}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
