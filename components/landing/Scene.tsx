"use client";

import { useEffect, useState } from "react";

/**
 * The hero: a founder holding a pitch deck, standing where three roads split,
 * in front of a skyline made of landmarks from all ten ASEAN countries. They
 * keep looking from road to road; a thought bubble asks "do I qualify?" and
 * Nexa's beacon on the Petronas spire answers. Hover a road to look down it.
 * SVG + CSS only, and still for anyone who prefers reduced motion.
 */

type Road = {
  label: string;
  flag: string;
  note: string;
  score: number;
  color: string;
  path: string;
  sign: { x: number; y: number };
  look: -1 | 0 | 1;
};

const ROADS: Road[] = [
  { label: "GRANT", flag: "MY", note: "Cradle grant", score: 91, color: "#d0103a", path: "M592 302 C 520 292, 420 290, 318 288", sign: { x: 318, y: 288 }, look: -1 },
  { label: "ACCELERATOR", flag: "SG", note: "Google for Startups", score: 88, color: "#0e9f9a", path: "M600 300 L 600 236", sign: { x: 600, y: 236 }, look: 0 },
  { label: "PILOT", flag: "VN", note: "Rice co-op pilot", score: 86, color: "#2f5bd3", path: "M608 302 C 680 292, 780 290, 882 288", sign: { x: 882, y: 288 }, look: 1 },
];

const G = 300; // ground line
const INK = "#1b2140";

export function Scene({ className = "" }: { className?: string }) {
  const [auto, setAuto] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const active = hover ?? auto;
  const road = ROADS[active];

  useEffect(() => {
    if (hover !== null) return;
    const t = setInterval(() => setAuto((v) => (v + 1) % ROADS.length), 2800);
    return () => clearInterval(t);
  }, [hover]);

  return (
    <div className={`relative w-full overflow-hidden bg-white ${className}`}>
      <svg
        viewBox="0 0 1200 470"
        className="block h-full w-full"
        preserveAspectRatio="xMidYMax slice"
        role="img"
        aria-label="A founder at a crossroads in front of ASEAN landmarks, choosing between a grant, an accelerator and a pilot"
      >
        <defs>
          <linearGradient id="sc-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="55%" stopColor="#edf5fd" />
            <stop offset="100%" stopColor="#d4e8f9" />
          </linearGradient>
          <radialGradient id="sc-glow">
            <stop offset="0%" stopColor="#e9a41c" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#e9a41c" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="sc-ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#eef2f8" />
            <stop offset="100%" stopColor="#dbe3ee" />
          </linearGradient>
          <linearGradient id="sc-road" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2b3253" />
            <stop offset="100%" stopColor="#141831" />
          </linearGradient>
          <filter id="sc-soft" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <pattern id="sc-win" width="8" height="9" patternUnits="userSpaceOnUse">
            <rect x="1.5" y="1.5" width="4" height="4.5" rx="0.6" fill="#ffffff" opacity="0.55" />
          </pattern>
          <pattern id="sc-win-dim" width="8" height="9" patternUnits="userSpaceOnUse">
            <rect x="1.5" y="1.5" width="4" height="4.5" rx="0.6" fill="#ffffff" opacity="0.3" />
          </pattern>
        </defs>

        {/* sky, sun, clouds, birds */}
        <rect width="1200" height={G} fill="url(#sc-sky)" />
        <circle cx="1040" cy="86" r="150" fill="url(#sc-glow)" />
        <circle cx="1040" cy="86" r="40" fill="#e9a41c" />
        <g className="drift-slow" opacity="0.95">
          <Cloud x={110} y={58} s={0.85} />
          <Cloud x={700} y={40} s={1.05} />
        </g>
        <g className="drift">
          <Cloud x={430} y={96} s={0.6} />
          <Cloud x={1080} y={60} s={0.75} />
        </g>
        <g fill="none" stroke={INK} strokeWidth="1.6" strokeLinecap="round" opacity="0.55">
          <path d="M836 70 q7 -7 14 0 q7 -7 14 0" />
          <path d="M870 92 q6 -6 12 0 q6 -6 12 0" />
        </g>

        {/* far city, pale */}
        <g fill="#dce6f3">
          {[
            [0, 60], [46, 92], [100, 70], [380, 84], [430, 56], [520, 110], [650, 96], [700, 70], [900, 64], [1050, 88], [1110, 110], [1160, 72],
          ].map(([x, h], i) => (
            <rect key={i} x={x} y={G - h} width={48} height={h} />
          ))}
        </g>

        {/* ── Landmarks, left to right ─────────────────── */}
        {/* Shwedagon · Myanmar */}
        <g>
          <rect x="34" y="286" width="72" height="14" fill="#c98a10" />
          <path d="M44 286 C 48 252, 60 236, 70 230 C 80 236, 92 252, 96 286 Z" fill="#e9a41c" />
          <path d="M70 230 C 80 236, 92 252, 96 286 L 70 286 Z" fill="#d79617" />
          <path d="M64 230 L70 150 L76 230 Z" fill="#e9a41c" />
          <circle cx="70" cy="148" r="3" fill="#c98a10" />
        </g>

        {/* Monas · Indonesia */}
        <g>
          <path d="M112 300 L120 282 L184 282 L192 300 Z" fill="#c4cfe0" />
          <path d="M143 282 L147 142 L157 142 L161 282 Z" fill="#e3e9f2" />
          <path d="M152 142 L157 142 L161 282 L152 282 Z" fill="#c4cfe0" />
          <path d="M138 142 L166 142 L160 132 L144 132 Z" fill="#c4cfe0" />
          <path d="M146 132 C 141 120, 150 112, 152 98 C 156 112, 163 120, 158 132 Z" fill="#e9a41c" />
        </g>

        {/* Petronas Towers · Malaysia (with Nexa's beacon) */}
        <g>
          {[222, 286].map((cx) => (
            <g key={cx}>
              <rect x={cx - 17} y="112" width="34" height="188" fill="#6f90d9" />
              <rect x={cx} y="112" width="17" height="188" fill="#5677c6" />
              <rect x={cx - 17} y="112" width="34" height="188" fill="url(#sc-win)" />
              <rect x={cx - 13} y="94" width="26" height="18" fill="#6f90d9" />
              <rect x={cx} y="94" width="13" height="18" fill="#5677c6" />
              <rect x={cx - 9} y="78" width="18" height="16" fill="#6f90d9" />
              <rect x={cx} y="78" width="9" height="16" fill="#5677c6" />
              <path d={`M${cx - 4} 78 L${cx} 60 L${cx + 4} 78 Z`} fill="#5677c6" />
              <line x1={cx} y1="60" x2={cx} y2="30" stroke={INK} strokeWidth="2" />
            </g>
          ))}
          <rect x="239" y="176" width="30" height="7" fill={INK} />
          <path d="M241 183 L254 196 L267 183" fill="none" stroke={INK} strokeWidth="2" />
          <circle cx="286" cy="28" r="5" fill="#d0103a" className="blink" />
        </g>

        {/* Chedi · Thailand */}
        <g>
          <rect x="312" y="282" width="70" height="18" fill="#d0103a" />
          <rect x="318" y="274" width="58" height="8" fill="#b00d31" />
          <path d="M320 274 C 320 246, 334 230, 347 224 C 360 230, 374 246, 374 274 Z" fill="#e9a41c" />
          <path d="M347 224 C 360 230, 374 246, 374 274 L 347 274 Z" fill="#d79617" />
          <path d="M341 224 L347 158 L353 224 Z" fill="#e9a41c" />
        </g>

        {/* Angkor Wat · Cambodia */}
        <g>
          <rect x="398" y="262" width="112" height="38" fill="#7fa9a7" />
          <rect x="398" y="262" width="112" height="38" fill="url(#sc-win-dim)" />
          {[
            [420, 196],
            [454, 166],
            [488, 196],
          ].map(([x, top]) => (
            <g key={x}>
              <path d={`M${x - 13} 262 L${x - 13} ${top + 40} C ${x - 13} ${top + 18}, ${x - 5} ${top + 8}, ${x} ${top} C ${x + 5} ${top + 8}, ${x + 13} ${top + 18}, ${x + 13} ${top + 40} L${x + 13} 262 Z`} fill="#93bab8" />
              <path d={`M${x} ${top} C ${x + 5} ${top + 8}, ${x + 13} ${top + 18}, ${x + 13} ${top + 40} L${x + 13} 262 L${x} 262 Z`} fill="#7fa9a7" />
            </g>
          ))}
        </g>

        {/* One Pillar Pagoda · Vietnam */}
        <g>
          <rect x="702" y="296" width="44" height="4" fill="#9fc3e6" />
          <rect x="718" y="250" width="12" height="46" fill="#9a4a32" />
          <rect x="704" y="226" width="40" height="24" fill="#d0103a" />
          <rect x="710" y="232" width="8" height="12" fill="#fff" opacity="0.5" />
          <rect x="730" y="232" width="8" height="12" fill="#fff" opacity="0.5" />
          <path d="M690 230 Q 698 222, 704 222 L 724 204 L 744 222 Q 750 222, 758 230 Z" fill={INK} />
        </g>

        {/* Marina Bay Sands · Singapore */}
        <g>
          {[792, 830, 868].map((x, i) => (
            <g key={x}>
              <path d={`M${x} 300 L${x + 3} 150 L${x + 25} 150 L${x + 26} 300 Z`} fill={i === 1 ? "#2f5bd3" : "#3d68dc"} />
              <rect x={x + 3} y="152" width="22" height="148" fill="url(#sc-win)" />
            </g>
          ))}
          <path d="M778 150 L778 141 L898 136 L912 145 L898 150 Z" fill={INK} />
        </g>

        {/* Omar Ali Saifuddien Mosque · Brunei */}
        <g>
          <rect x="934" y="262" width="78" height="38" fill="#e3e9f2" />
          <rect x="973" y="262" width="39" height="38" fill="#c4cfe0" />
          <path d="M944 262 C 944 226, 1002 226, 1002 262 Z" fill="#e9a41c" />
          <path d="M973 235 C 990 236, 1002 246, 1002 262 L 973 262 Z" fill="#d79617" />
          <line x1="973" y1="232" x2="973" y2="216" stroke="#c98a10" strokeWidth="2" />
          <rect x="1020" y="186" width="10" height="114" fill="#e3e9f2" />
          <path d="M1018 186 L1025 168 L1032 186 Z" fill="#e9a41c" />
        </g>

        {/* Patuxai · Laos */}
        <g>
          <path d="M1050 300 L1050 214 L1142 214 L1142 300 L1118 300 L1118 262 C 1118 242, 1074 242, 1074 262 L1074 300 Z" fill="#e2865f" />
          <path d="M1096 214 L1142 214 L1142 300 L1118 300 L1118 262 C 1118 252, 1108 246, 1096 245 Z" fill="#cf7550" />
          <rect x="1056" y="198" width="12" height="16" fill="#e2865f" />
          <rect x="1124" y="198" width="12" height="16" fill="#cf7550" />
          <path d="M1088 214 L1088 192 L1096 180 L1104 192 L1104 214 Z" fill="#e2865f" />
        </g>

        {/* Rizal Monument · Philippines */}
        <g>
          <rect x="1158" y="276" width="34" height="24" fill="#93bab8" />
          <path d="M1168 276 L1171 196 L1179 196 L1182 276 Z" fill="#7fa9a7" />
          <path d="M1171 196 L1175 186 L1179 196 Z" fill="#7fa9a7" />
        </g>

        {/* ground + grass ticks */}
        <rect y={G} width="1200" height={470 - G} fill="url(#sc-ground)" />
        <g fill="none" stroke="#9aa6bd" strokeWidth="1.5" strokeLinecap="round">
          {[90, 230, 400, 790, 1010, 1130].map((x, i) => (
            <path key={x} d={`M${x} ${352 + (i % 2) * 22} q4 -8 8 0 q4 -8 8 0`} />
          ))}
        </g>

        {/* Nexa's signal: from the beacon to the road in view */}
        <path
          key={active}
          d={`M286 28 Q ${(286 + road.sign.x) / 2} ${-30}, ${road.sign.x} ${road.sign.y - 46}`}
          fill="none"
          stroke={road.color}
          strokeWidth="2.4"
          strokeDasharray="5 7"
          className="dash"
          opacity="0.8"
        />

        {/* the three roads + signs */}
        {ROADS.map((r, i) => {
          const on = i === active;
          return (
            <g
              key={r.label}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onClick={() => setHover(i)}
              style={{ cursor: "pointer" }}
            >
              {on && <path d={r.path} fill="none" stroke={r.color} strokeWidth="22" strokeLinecap="round" opacity="0.35" filter="url(#sc-soft)" />}
              <path d={r.path} fill="none" stroke={on ? r.color : "#2b3253"} strokeWidth="12" strokeLinecap="round" style={{ transition: "stroke .4s" }} />
              <path d={r.path} fill="none" stroke="#fff" strokeOpacity="0.8" strokeWidth="1.6" strokeDasharray="8 8" />
              <path d={r.path} fill="none" stroke="transparent" strokeWidth="44" />
              <Sign r={r} on={on} />
            </g>
          );
        })}

        {/* main road toward the viewer */}
        <path d="M600 302 L 362 470 L 838 470 Z" fill="url(#sc-road)" />
        <path d="M600 306 L 600 470" stroke="#e9a41c" strokeWidth="3" strokeDasharray="14 14" />

        {/* the founder */}
        <Founder look={road.look} />

        {/* thought bubble */}
        <Bubble key={`b${active}`} road={road} />
      </svg>

      <p className="micro pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 whitespace-nowrap rounded-full border border-line bg-white/85 px-3.5 py-1.5 text-ink-2 backdrop-blur">
        Ten countries. One door. Hover a road.
      </p>
    </div>
  );
}

/** "Cradle grant? Do I qualify?" and, a beat later, Nexa's answer. */
function Bubble({ road }: { road: Road }) {
  const textW = Math.max(110, road.note.length * 8.6 + 6);
  const w = textW + 46 + 70;
  const x = 656;
  return (
    <g className="pop">
      <circle cx="634" cy="350" r="4" fill="#fff" stroke={INK} strokeOpacity="0.15" />
      <circle cx="646" cy="338" r="6" fill="#fff" stroke={INK} strokeOpacity="0.15" />
      <rect x={x} y="296" width={w} height="62" rx="31" fill="#fff" stroke={INK} strokeOpacity="0.15" />
      <circle cx={x + 28} cy="327" r="9" fill={road.color} />
      <text x={x + 46} y="322" fontSize="15" fontWeight="700" fill={INK} fontFamily="var(--font-jakarta)">
        {road.note}?
      </text>
      <text x={x + 46} y="342" fontSize="12.5" fill="#4b5170" fontFamily="var(--font-jakarta)">
        Do I qualify?
      </text>
      <g className="pop" style={{ animationDelay: "0.9s" }}>
        <rect x={x + w - 66} y="310" width="54" height="34" rx="17" fill={road.color} />
        <text x={x + w - 39} y="332" fontSize="13" fontWeight="700" textAnchor="middle" fill="#fff" fontFamily="var(--font-jbmono)">
          {road.score}%
        </text>
      </g>
    </g>
  );
}

function Sign({ r, on }: { r: Road; on: boolean }) {
  const text = `${r.label} · ${r.flag}`;
  const w = text.length * 9 + 34;
  const y = r.sign.y - 58;
  return (
    <g style={{ transition: "transform .4s" }} transform={on ? "translate(0,-4)" : undefined}>
      <line x1={r.sign.x} y1={y + 32} x2={r.sign.x} y2={r.sign.y} stroke={INK} strokeWidth="4" />
      <rect x={r.sign.x - w / 2} y={y} width={w} height="32" rx="4" fill={on ? r.color : INK} style={{ transition: "fill .4s" }} />
      <text x={r.sign.x} y={y + 21} textAnchor="middle" fontSize="13.5" fontWeight="700" letterSpacing="1.4" fill="#fff" fontFamily="var(--font-jakarta)">
        {text}
      </text>
    </g>
  );
}

function Founder({ look }: { look: -1 | 0 | 1 }) {
  return (
    <g transform="translate(600 0)">
    <g className="bob">
      <ellipse cx="0" cy="452" rx="34" ry="7" fill="#000" opacity="0.18" />
      {/* legs */}
      <rect x="-15" y="404" width="12" height="46" rx="4" fill={INK} />
      <rect x="3" y="404" width="12" height="46" rx="4" fill={INK} />
      <rect x="-18" y="446" width="16" height="7" rx="3" fill="#0b0e1f" />
      <rect x="2" y="446" width="16" height="7" rx="3" fill="#0b0e1f" />
      {/* body: ASEAN-blue jacket */}
      <path d="M-26 410 C -28 380, -22 360, 0 356 C 22 360, 28 380, 26 410 Z" fill="#0033a0" />
      <path d="M-6 357 L0 372 L6 357 Z" fill="#fff" />
      {/* pitch deck under the left arm */}
      <g transform="rotate(-8 -34 392)">
        <rect x="-46" y="372" width="24" height="32" rx="2" fill="#fff" stroke={INK} strokeWidth="1.5" />
        <rect x="-42" y="378" width="16" height="4" fill="#d0103a" />
        <rect x="-42" y="386" width="12" height="2.5" fill="#c9d0e0" />
        <rect x="-42" y="391" width="14" height="2.5" fill="#c9d0e0" />
        <rect x="-42" y="396" width="9" height="2.5" fill="#0e9f9a" />
      </g>
      <path d="M-24 372 C -32 384, -32 398, -26 406" fill="none" stroke="#0033a0" strokeWidth="10" strokeLinecap="round" />
      {/* thinking arm: hand to chin */}
      <path d="M22 372 C 30 386, 24 396, 10 392 C 6 386, 6 352, 8 346" fill="none" stroke="#0033a0" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="8" cy="342" r="6" fill="#c68a5f" />
      {/* head */}
      <rect x="-5" y="344" width="10" height="10" fill="#c68a5f" />
      <circle cx="0" cy="330" r="17" fill="#c68a5f" />
      <path d="M-18 328 C -19 308, 18 306, 18 326 C 12 318, -4 316, -18 328 Z" fill="#1a1a2e" />
      <g style={{ transition: "transform .5s cubic-bezier(.22,1,.36,1)" }} transform={`translate(${look * 4} 0)`}>
        <circle cx="-6" cy="331" r="2" fill="#1a1a2e" />
        <circle cx="6" cy="331" r="2" fill="#1a1a2e" />
        <path d="M-4 340 Q 0 342.5, 4 340" fill="none" stroke="#1a1a2e" strokeWidth="1.6" strokeLinecap="round" />
      </g>
    </g>
    </g>
  );
}

function Cloud({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="#fff">
      <ellipse cx="0" cy="18" rx="62" ry="22" />
      <ellipse cx="-22" cy="6" rx="28" ry="22" />
      <ellipse cx="18" cy="0" rx="34" ry="26" />
    </g>
  );
}
