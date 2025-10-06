/**
 * Alexandre Brrissos 21131
 * Descrição: Serviços de administração de livros (import CSV, pipeline,
 *            reindex embeddings e limpeza). Usa o cliente HTTP central.
 */
import { http } from "../https";

/* ---------------- Tipos ---------------- */

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

export type ReindexEmbeddingsResponse = {
  ok: boolean;
  result: { total: number; done: number; ok: number; fail: number };
};

/* -------------- Helpers -------------- */

/** Constrói FormData a partir de pares chave/valor (aceita File/Blob). */
function fdOf(entries: Record<string, any>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) v.forEach((x) => fd.append(k, x));
    else fd.append(k, v);
  }
  return fd;
}

/* --------------- Endpoints --------------- */

/** Importa um CSV de livros para uma biblioteca. */
export async function importBooksCsv(
  libraryId: number,
  file: File,
  opts?: { replace?: boolean; recalc?: boolean }
): Promise<ImportResult> {
  const data = fdOf({
    file,
    ...(opts?.replace ? { replace: "true" } : {}),
    ...(opts?.recalc ? { recalc: "true" } : {}),
  });
  return http<ImportResult>({
    url: `/admin/libraries/${libraryId}/books/import.csv`,
    method: "POST",
    data,
  });
}

/** Executa a pipeline de ingestão (múltiplos ficheiros). */
export async function runBooksPipeline(
  libraryId: number,
  files: File[],
  opts: { concurrency?: number; recalc?: boolean }
): Promise<ImportResult> {
  const data = fdOf({
    files,
    ...(opts.concurrency != null
      ? { concurrency: String(opts.concurrency) }
      : {}),
    ...(opts.recalc ? { recalc: "true" } : {}),
  });
  return http<ImportResult>({
    url: `/admin/libraries/${libraryId}/books/pipeline`,
    method: "POST",
    data,
  });
}

/** Reindexa embeddings (global ou por biblioteca). */
export async function reindexEmbeddingsAdmin(opts?: {
  libraryId?: number;
  limit?: number;
  concurrency?: number;
}): Promise<ReindexEmbeddingsResponse> {
  return http<ReindexEmbeddingsResponse>({
    url: `/admin/books/reindex-embeddings`,
    method: "POST",
    data: opts ?? {},
  });
}

/** Remove livros órfãos. */
export async function cleanupOrphanBooks(): Promise<{
  ok: boolean;
  deleted: number;
}> {
  return http<{ ok: boolean; deleted: number }>({
    url: `/admin/books/cleanup-orphans`,
    method: "POST",
  });
}
