// Translates messages/en.json into every other language with Gemma 4.
// Run: node --env-file=.env.local scripts/translate.mjs [lang ...]
// Only keys missing from a language file are translated, so re-runs are cheap.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const MODEL = process.env.GEMMA_TRANSLATE_MODEL || "gemma-4-31b-it";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const LANGS = {
  ms: "Bahasa Melayu (Malaysia)",
  id: "Bahasa Indonesia",
  zh: "Simplified Chinese (as used in Singapore and Malaysia)",
  ta: "Tamil (as used in Singapore and Malaysia)",
  th: "Thai",
  vi: "Vietnamese",
  fil: "Filipino (Tagalog)",
  km: "Khmer",
  lo: "Lao",
  my: "Burmese (Myanmar)",
  tet: "Tetum (Timor-Leste)",
};
const KEEP = "Nexa, Gemma 4, Gemini, KrackedDevs, KD Labs, ASEAN, Startup ASEAN, Hacktoberfest, GitHub, PDF, PowerPoint, Word, .pptx, .docx, .txt, MB, US$, FAQ";

const en = JSON.parse(readFileSync("messages/en.json", "utf8"));
const wanted = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(LANGS);

async function gemma(prompt) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(ENDPOINT, {
      signal: AbortSignal.timeout(90000),
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 16000, thinkingConfig: { thinkingLevel: "minimal" } },
      }),
    }).catch((e) => ({ ok: false, status: 0, text: async () => String(e) }));
    if (res.ok) {
      const json = await res.json();
      const text = (json.candidates?.[0]?.content?.parts ?? []).filter((p) => !p.thought).map((p) => p.text ?? "").join("");
      const s = text.indexOf("{");
      const e = text.lastIndexOf("}");
      try {
        return JSON.parse(text.slice(s, e + 1));
      } catch {
        /* retry */
      }
    } else {
      console.error(`  ${res.status} ${(await res.text()).slice(0, 120)}`);
    }
    await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
  }
  return {};
}

async function translate(code) {
  const file = `messages/${code}.json`;
  const done = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
  const missing = Object.keys(en).filter((k) => !done[k]);
  const chunks = [];
  for (let i = 0; i < missing.length; i += 35) chunks.push(missing.slice(i, i + 35));
  for (const keys of chunks) {
    const source = Object.fromEntries(keys.map((k) => [k, en[k]]));
    const out = await gemma(`Translate the values of this JSON from English into ${LANGS[code]}.
This is the interface of Nexa, a web app that helps startup founders across Southeast Asia find grants, investors and programmes.
Rules:
- Keep every key exactly the same. Translate values only.
- Keep placeholders like {n}, {name}, {list} exactly as they are.
- Keep these names unchanged: ${KEEP}.
- Short, natural interface text, the way founders in that country would write it. Keep the curly quotes “ ” if present.
- Reply with ONE JSON object only.

${JSON.stringify(source, null, 1)}`);
    for (const k of keys) if (typeof out[k] === "string" && out[k].trim()) done[k] = out[k];
    writeFileSync(file, JSON.stringify(done, null, 1) + "\n");
  }
  const left = Object.keys(en).filter((k) => !done[k]).length;
  console.log(`${code}: ${Object.keys(done).length} keys${left ? `, ${left} still missing` : ""}`);
}

const queue = [...wanted];
await Promise.all(
  Array.from({ length: 3 }, async () => {
    while (queue.length) await translate(queue.shift());
  }),
);
