import type { FileOperationFormat } from "@shared/types";
import type { TNoteDto } from "@treonstudio/petso-lib";
import { petsoClient } from "~/utils/petsoClient";

/** Downloads tenant notes from the Pet Store API in a supported local format. */
export async function exportPetStoreNotes(
  collectionId: string | undefined,
  format: FileOperationFormat,
  filename: string
): Promise<void> {
  const notes = (await petsoClient.admin.notes()).filter(
    (note) => !collectionId || note.collectionId === collectionId
  );
  const payload = formatPayload(notes, format);
  const extension =
    format === "json" ? "json" : format === "html" ? "html" : "md";
  const blob = new Blob([payload], {
    type: format === "html" ? "text/html" : "text/plain",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${safeFilename(filename)}.${extension}`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function formatPayload(
  notes: readonly TNoteDto[],
  format: FileOperationFormat
): string {
  if (format === "json") {
    return JSON.stringify(notes, null, 2);
  }
  if (format === "html") {
    return `<!doctype html><html><body>${notes
      .map(
        (note) =>
          `<article><h1>${escapeHtml(note.title)}</h1><p>${escapeHtml(extractText(note.content))}</p></article>`
      )
      .join("\n")}</body></html>`;
  }
  return notes
    .map((note) => `# ${note.title}\n\n${extractText(note.content)}`)
    .join("\n\n---\n\n");
}

function extractText(value: Record<string, unknown>): string {
  const texts: string[] = [];
  const visit = (current: unknown) => {
    if (typeof current === "string") {
      texts.push(current);
      return;
    }
    if (Array.isArray(current)) {
      current.forEach(visit);
      return;
    }
    if (typeof current === "object" && current !== null) {
      Object.values(current).forEach(visit);
    }
  };
  visit(value);
  return texts.join(" ").trim();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function safeFilename(value: string): string {
  return value.trim().replace(/[^a-z0-9-_]+/gi, "-") || "pet-store-notes";
}
