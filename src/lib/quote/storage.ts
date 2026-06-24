import { normalizeQuoteDocument, normalizeTemplate } from "./calc";
import type { QuoteDocument, QuoteTemplate, SavedQuoteItem } from "./types";
import { isQuoteTemplate } from "./defaults";

/** Mini tool (public) vs báo giá ERP — dữ liệu localStorage tách biệt. */
export type QuoteStorageScope = "mini" | "erp";

const LEGACY_KEYS = {
  quotes: "hoaphong-quote-saves",
  templates: "hoaphong-quote-templates",
  draft: "hoaphong-quote-draft",
};

function keysForScope(scope: QuoteStorageScope) {
  const tag = scope === "erp" ? "erp" : "mini";
  return {
    quotes: `hoaphong-quote-${tag}-saves`,
    templates: `hoaphong-quote-${tag}-templates`,
    draft: `hoaphong-quote-${tag}-draft`,
  };
}

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

export function createQuoteStorage(scope: QuoteStorageScope) {
  const keys = keysForScope(scope);

  return {
    listSavedQuotes(): QuoteDocument[] {
      return readJson<Record<string, unknown>>(keys.quotes)
        .map(normalizeQuoteDocument)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },

    listSavedTemplates(): QuoteTemplate[] {
      return readJson<Record<string, unknown>>(keys.templates)
        .map(normalizeTemplate)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },

    saveQuote(doc: QuoteDocument): QuoteDocument {
      const updated = { ...doc, kind: "quote" as const, updatedAt: new Date().toISOString() };
      const list = readJson<Record<string, unknown>>(keys.quotes).map(normalizeQuoteDocument);
      const idx = list.findIndex((q) => q.id === updated.id);
      if (idx >= 0) list[idx] = updated;
      else list.unshift(updated);
      writeJson(keys.quotes, list);
      this.saveDraft(updated);
      return updated;
    },

    saveTemplate(tmpl: QuoteTemplate): QuoteTemplate {
      const updated = { ...tmpl, kind: "template" as const, updatedAt: new Date().toISOString() };
      const list = readJson<Record<string, unknown>>(keys.templates).map(normalizeTemplate);
      const idx = list.findIndex((t) => t.id === updated.id);
      if (idx >= 0) list[idx] = updated;
      else list.unshift(updated);
      writeJson(keys.templates, list);
      return updated;
    },

    deleteSavedQuote(id: string) {
      const list = readJson<Record<string, unknown>>(keys.quotes)
        .map(normalizeQuoteDocument)
        .filter((q) => q.id !== id);
      writeJson(keys.quotes, list);
    },

    deleteSavedTemplate(id: string) {
      const list = readJson<Record<string, unknown>>(keys.templates)
        .map(normalizeTemplate)
        .filter((t) => t.id !== id);
      writeJson(keys.templates, list);
    },

    loadSavedQuote(id: string): QuoteDocument | null {
      const doc = readJson<Record<string, unknown>>(keys.quotes)
        .map(normalizeQuoteDocument)
        .find((q) => q.id === id);
      return doc ?? null;
    },

    loadSavedTemplate(id: string): QuoteTemplate | null {
      const tmpl = readJson<Record<string, unknown>>(keys.templates)
        .map(normalizeTemplate)
        .find((t) => t.id === id);
      return tmpl ?? null;
    },

    saveDraft(doc: QuoteDocument) {
      localStorage.setItem(keys.draft, JSON.stringify(doc));
    },

    loadDraft(): QuoteDocument | null {
      if (typeof window === "undefined") return null;
      try {
        let raw = localStorage.getItem(keys.draft);
        if (!raw && scope === "mini") {
          raw = localStorage.getItem(LEGACY_KEYS.draft);
        }
        if (!raw) return null;
        return normalizeQuoteDocument(JSON.parse(raw) as Record<string, unknown>);
      } catch {
        return null;
      }
    },

    clearDraft() {
      localStorage.removeItem(keys.draft);
    },
  };
}

export type QuoteStorage = ReturnType<typeof createQuoteStorage>;

export function isSavedTemplate(item: SavedQuoteItem): item is QuoteTemplate {
  return isQuoteTemplate(item);
}
