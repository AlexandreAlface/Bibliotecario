// apps/api/src/reco/utils.ts
// Autor: Alexandre Brissos 21131
// Utilidades de recomendação:
// - getAlreadyReadIsbns: devolve ISBNs já lidos (por child ou família)
// - toSqlVector: serializa arrays numéricos para vetor SQL (pgvector)
// - buildProfileText: constrói texto de perfil a partir de respostas do quiz
// - weightedCentroid: centroide ponderado de embeddings

import { PrismaClient } from "@prisma/client";
import pgvector from "pgvector";

const prisma = new PrismaClient();

/* ============================ Tipos ============================ */

type AlreadyReadArgs = {
  childId?: number;
  familyId?: number;
};

type Answer = { id: string; value: unknown };

/* ============================ Helpers PUROS ============================ */

// String “limpa” ou undefined.
function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

// Array de strings “limpas” (aceita string única ou array misto).
function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof v === "string" && v.trim()) return [v.trim()];
  return [];
}

/* ============================ Funções Exportadas ============================ */

/**
 * Lê ISBNs já lidos (qualquer registo em Reading) por child ou por família.
 * Puro do ponto de vista da API: não altera estado, só consulta.
 */
export async function getAlreadyReadIsbns(
  { childId, familyId }: AlreadyReadArgs = {}
): Promise<string[]> {
  if (childId) {
    const rows = await prisma.reading.findMany({ where: { childId }, select: { bookIsbn: true } });
    return rows.map((r) => r.bookIsbn);
  }
  if (familyId) {
    const rows = await prisma.reading.findMany({
      where: { child: { families: { some: { familyId } } } },
      select: { bookIsbn: true },
    });
    return rows.map((r) => r.bookIsbn);
  }
  return [];
}

/**
 * Converte um vetor numérico JS para literal SQL do pgvector.
 * Usa o pacote pgvector; tipagem é “solta” para manter compatibilidade.
 */
export function toSqlVector(vec: number[]): string {
  // pgvector typings podem não estar presentes em alguns setups
  return (pgvector as any).toSql(vec);
}

/**
 * Constrói o “perfil do quiz” (string) a partir das respostas normalizadas.
 * Mantém prioridade por 'moment' (se existir) e inclui objetivos (goals).
 */
export function buildProfileText(answers: Answer[]): string {
  const get = (id: string) => answers.find((a) => a.id === id)?.value;

  const idade = asString(get("age")) ?? asString(get("ageRange"));
  const generos = asStringArray(get("genres")).join(", ");
  const formato = asStringArray(get("format")).join(", ");
  const goals = asStringArray(get("goals")).join(", ");
  const momentoOuMood = asString(get("moment")) ?? asString(get("mood"));

  return [
    "Perfil do quiz:",
    idade ? `Faixa etária: ${idade}.` : "",
    generos ? `Géneros preferidos: ${generos}.` : "",
    formato ? `Formato preferido: ${formato}.` : "",
    goals ? `Objetivos: ${goals}.` : "",
    momentoOuMood ? `Momento de leitura: ${momentoOuMood}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Centroide ponderado de vetores (ignora pesos ≤ 0 e vetores malformados).
 * Não muta inputs; devolve novo array ou null se não houver dados válidos.
 */
export function weightedCentroid(vecs: number[][], weights: number[] = []): number[] | null {
  if (!vecs?.length) return null;
  const d = vecs[0]?.length ?? 0;
  if (!d) return null;

  const acc = new Array<number>(d).fill(0);
  let sumW = 0;

  for (let i = 0; i < vecs.length; i++) {
    const v = vecs[i];
    const w = Number(weights?.[i] ?? 1);
    if (!Array.isArray(v) || v.length !== d) continue;
    if (!Number.isFinite(w) || w <= 0) continue;
    for (let j = 0; j < d; j++) acc[j] += v[j] * w;
    sumW += w;
  }
  if (sumW === 0) return null;
  for (let j = 0; j < d; j++) acc[j] /= sumW;
  return acc;
}
