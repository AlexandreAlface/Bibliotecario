// apps/web/src/services/admin/books.ts
const API_BASE = import.meta.env.VITE_API_URL || "/api";

export type ImportResult = {
  ok: boolean;
  total?: number;
  inserted: number;
  updated: number;
  linked: number;
  inputs?: { files: number };
  totals?: {
    deduplicados: number;
    bejaPresent?: number;
    filteredOut?: number;
    inserted: number;
    updated: number;
    linked: number;
  };
  embeddings?: { total: number; done: number; ok: number; fail: number };
  sample?: any[];
};

export async function importBooksCsv(
  libraryId: number,
  file: File,
  opts?: { replace?: boolean; recalc?: boolean }
): Promise<ImportResult> {
  const fd = new FormData();
  fd.append("file", file);
  if (opts?.replace) fd.append("replace", "true");
  if (opts?.recalc) fd.append("recalc", "true");

  const resp = await fetch(
    `${API_BASE}/admin/libraries/${libraryId}/books/import.csv`,
    {
      method: "POST",
      body: fd,
      credentials: "include",
    }
  );
  if (!resp.ok) throw await httpError(resp, "Falha no import");
  return (await resp.json()) as ImportResult;
}

export async function runBooksPipeline(
  libraryId: number,
  files: File[],
  opts: { concurrency?: number; recalc?: boolean } // 👈 tipos simplificados
): Promise<ImportResult> {
  const fd = new FormData();
  for (const f of files) fd.append("files", f);
  if (opts.concurrency != null)
    fd.append("concurrency", String(opts.concurrency));
  if (opts.recalc) fd.append("recalc", "true");
  // (sem replace/bejaOnly — o servidor já força)

  const resp = await fetch(
    `${API_BASE}/admin/libraries/${libraryId}/books/pipeline`,
    {
      method: "POST",
      body: fd,
      credentials: "include",
    }
  );
  if (!resp.ok) throw await httpError(resp, "Falha na pipeline");
  return (await resp.json()) as ImportResult;
}

/** Resposta do endpoint /admin/books/reindex-embeddings */
export type ReindexEmbeddingsResponse = {
  ok: boolean;
  result: { total: number; done: number; ok: number; fail: number };
};

export async function reindexEmbeddingsAdmin(opts?: {
  libraryId?: number;
  limit?: number;
  concurrency?: number;
}): Promise<ReindexEmbeddingsResponse> {
  const resp = await fetch(`${API_BASE}/admin/books/reindex-embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(opts || {}),
  });
  if (!resp.ok) throw await httpError(resp, "Falha no reindex");
  return (await resp.json()) as ReindexEmbeddingsResponse;
}

export async function cleanupOrphanBooks(): Promise<{
  ok: boolean;
  deleted: number;
}> {
  const resp = await fetch(`${API_BASE}/admin/books/cleanup-orphans`, {
    method: "POST",
    credentials: "include",
  });
  if (!resp.ok) throw await httpError(resp, "Falha na limpeza");
  return await resp.json();
}

async function httpError(resp: Response, fallback: string) {
  try {
    const j = await resp.json();
    throw new Error(j?.error || `${fallback}: HTTP ${resp.status}`);
  } catch {
    throw new Error(`${fallback}: HTTP ${resp.status}`);
  }
}
