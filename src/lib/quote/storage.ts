import { normalizeQuoteDocument, normalizeTemplate } from "./calc";
import type { QuoteDocument, QuoteTemplate, SavedQuoteItem } from "./types";
import { isQuoteTemplate } from "./defaults";

const QUOTES_KEY = "hoaphong-quote-saves";
const TEMPLATES_KEY = "hoaphong-quote-templates";
const DRAFT_KEY = "hoaphong-quote-draft";

function readJson<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJson(key: string, list: unknown[]) {
  localStorage.setItem(key, JSON.stringify(list));
}

export function listSavedQuotes(): QuoteDocument[] {
  return readJson<Record<string, unknown>>(QUOTES_KEY)
    .map(normalizeQuoteDocument)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function listSavedTemplates(): QuoteTemplate[] {
  return readJson<Record<string, unknown>>(TEMPLATES_KEY)
    .map(normalizeTemplate)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function saveQuote(doc: QuoteDocument): QuoteDocument {
  const updated = { ...doc, kind: "quote" as const, updatedAt: new Date().toISOString() };
  const list = readJson<Record<string, unknown>>(QUOTES_KEY).map(normalizeQuoteDocument);
  const idx = list.findIndex((q) => q.id === updated.id);
  if (idx >= 0) list[idx] = updated;
  else list.unshift(updated);
  writeJson(QUOTES_KEY, list);
  saveDraft(updated);
  return updated;
}

export function saveTemplate(tmpl: QuoteTemplate): QuoteTemplate {
  const updated = { ...tmpl, kind: "template" as const, updatedAt: new Date().toISOString() };
  const list = readJson<Record<string, unknown>>(TEMPLATES_KEY).map(normalizeTemplate);
  const idx = list.findIndex((t) => t.id === updated.id);
  if (idx >= 0) list[idx] = updated;
  else list.unshift(updated);
  writeJson(TEMPLATES_KEY, list);
  return updated;
}

export function deleteSavedQuote(id: string) {
  const list = readJson<Record<string, unknown>>(QUOTES_KEY)
    .map(normalizeQuoteDocument)
    .filter((q) => q.id !== id);
  writeJson(QUOTES_KEY, list);
}

export function deleteSavedTemplate(id: string) {
  const list = readJson<Record<string, unknown>>(TEMPLATES_KEY)
    .map(normalizeTemplate)
    .filter((t) => t.id !== id);
  writeJson(TEMPLATES_KEY, list);
}

export function loadSavedQuote(id: string): QuoteDocument | null {
  const doc = readJson<Record<string, unknown>>(QUOTES_KEY)
    .map(normalizeQuoteDocument)
    .find((q) => q.id === id);
  return doc ?? null;
}

export function loadSavedTemplate(id: string): QuoteTemplate | null {
  const tmpl = readJson<Record<string, unknown>>(TEMPLATES_KEY)
    .map(normalizeTemplate)
    .find((t) => t.id === id);
  return tmpl ?? null;
}

export function saveDraft(doc: QuoteDocument) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(doc));
}

export function loadDraft(): QuoteDocument | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return normalizeQuoteDocument(JSON.parse(raw) as Record<string, unknown>);
  } catch {
    return null;
  }
}

export function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

export function isSavedTemplate(item: SavedQuoteItem): item is QuoteTemplate {
  return isQuoteTemplate(item);
}
