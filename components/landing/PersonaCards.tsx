import Image from "next/image";

/**
 * Four companies, four situations, as profile cards. Same anatomy as the
 * Nexa persona cards: picture fills the card, Nexa's answer sits on top.
 */

export interface PersonaCard {
  id: string;
  name: string;
  tag: string;
  situation: string;
  answer: string;
  chips: string[];
  score: { value: string; label: string };
  /** A photo or banner. Without one, the card draws flags on a colour. */
  photo?: string;
  flags?: string;
  color: string;
}

export function PersonaCards({ cards }: { cards: PersonaCard[] }) {
  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, i) => (
        <ProfileCard key={card.id} card={card} index={i} />
      ))}
    </div>
  );
}

function ProfileCard({ card, index }: { card: PersonaCard; index: number }) {
  const code = `NX-${card.id.slice(0, 3).toUpperCase()}·${String(index + 1).padStart(2, "0")}`;
  return (
    <article
      className="nx-rise relative h-[310px] overflow-hidden border border-line-strong/60 text-white shadow-[0_16px_36px_-22px_rgb(0_0_0/55%)] transition-transform duration-300 hover:-translate-y-1"
      style={{ ["--i" as string]: index, background: card.color }}
    >
      {card.photo ? (
        <Image src={card.photo} alt="" fill sizes="(max-width: 1024px) 50vw, 280px" className="object-cover" style={{ transform: "scale(1.32)", transformOrigin: "50% 92%" }} />
      ) : (
        <div aria-hidden className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(rgb(255_255_255/55%)_1px,transparent_1px)] [background-size:16px_16px]" />
          <p className={`absolute top-[21%] right-0 left-0 px-6 text-center leading-[1.15] tracking-[0.04em] whitespace-pre-line drop-shadow-[0_10px_18px_rgb(0_0_0/35%)] ${(card.flags?.length ?? 0) > 4 ? "text-[38px]" : "text-[78px]"}`}>{card.flags}</p>
        </div>
      )}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(180deg, rgb(0 0 0 / 55%) 0%, rgb(0 0 0 / 0%) 30%, rgb(0 0 0 / 15%) 52%, rgb(0 0 0 / 88%) 100%)" }}
      />

      <div className="relative flex h-full flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="font-mono text-[10px] leading-snug tracking-[0.14em] uppercase opacity-85">
            Nexa
            <br />
            {"// "}
            {card.tag}
          </p>
          <div className="text-right">
            <p className="font-mono text-[28px] leading-none font-semibold">{card.score.value}</p>
            <p className="mt-1 font-mono text-[9.5px] tracking-[0.14em] uppercase opacity-75">{card.score.label}</p>
          </div>
        </div>

        <div className="mt-auto">
          <p className="text-[21px] leading-none font-semibold tracking-[-0.02em]">{card.name}</p>
          <p className="mt-2 line-clamp-2 font-mono text-[11.5px] tracking-[0.1em] uppercase" style={{ color: "#FFE58A" }}>
            {card.answer}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {card.chips.map((chip) => (
              <span key={chip} className="rounded-full border border-white/35 bg-white/10 px-2.5 py-0.5 font-mono text-[10px] tracking-wider uppercase backdrop-blur-sm">
                {chip}
              </span>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/25 pt-2 font-mono text-[9.5px] tracking-[0.14em] uppercase opacity-70">
            <span className="truncate">{card.situation}</span>
            <span className="shrink-0">{code}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
