import "server-only";

import { strFromU8, unzipSync } from "fflate";

import type { FilePart } from "./gemma";

export type Upload = { name: string; mime: string; data: string };

const PPTX = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const decode = (s: string) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

/** Pulls the visible text out of a .pptx (slide by slide) or .docx. Read in memory, never saved. */
function officeText(bytes: Uint8Array, kind: "pptx" | "docx"): string {
  const files = unzipSync(bytes, {
    filter: (f) => (kind === "pptx" ? /^ppt\/slides\/slide\d+\.xml$/.test(f.name) : f.name === "word/document.xml"),
  });
  const names = Object.keys(files).sort((a, b) => Number(a.match(/\d+/)?.[0] ?? 0) - Number(b.match(/\d+/)?.[0] ?? 0));
  return names
    .map((name, i) => {
      const xml = strFromU8(files[name]!);
      const tag = kind === "pptx" ? "a:t" : "w:t";
      const para = kind === "pptx" ? "</a:p>" : "</w:p>";
      const text = decode(
        xml
          .split(para)
          .map((p) => [...p.matchAll(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "g"))].map((m) => m[1]).join(""))
          .filter(Boolean)
          .join("\n"),
      );
      return kind === "pptx" ? `--- Slide ${i + 1} ---\n${text}` : text;
    })
    .join("\n\n");
}

/**
 * Splits uploads into what Gemma can read directly (PDF, images) and text
 * we pull out ourselves (PowerPoint, Word, plain text).
 */
export function prepare(uploads: Upload[]): { files: FilePart[]; text: string } {
  const files: FilePart[] = [];
  const texts: string[] = [];
  for (const u of uploads.slice(0, 4)) {
    const name = u.name.toLowerCase();
    const bytes = () => Uint8Array.from(Buffer.from(u.data, "base64"));
    if (u.mime === "application/pdf" || u.mime.startsWith("image/")) files.push({ mime: u.mime, data: u.data });
    else if (u.mime === PPTX || name.endsWith(".pptx")) texts.push(`File ${u.name}:\n${officeText(bytes(), "pptx")}`);
    else if (u.mime === DOCX || name.endsWith(".docx")) texts.push(`File ${u.name}:\n${officeText(bytes(), "docx")}`);
    else if (u.mime.startsWith("text/") || name.endsWith(".txt") || name.endsWith(".md")) texts.push(`File ${u.name}:\n${Buffer.from(u.data, "base64").toString("utf8")}`);
  }
  return { files, text: texts.join("\n\n").slice(0, 12000) };
}
