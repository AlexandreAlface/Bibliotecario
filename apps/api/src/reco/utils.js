import { PrismaClient } from "@prisma/client";
import pgvector from "pgvector";
const prisma = new PrismaClient();

export async function getAlreadyReadIsbns({ childId, familyId } = {}) {
  if (childId) {
    const rows = await prisma.reading.findMany({
      where: { childId },
      select: { bookIsbn: true },
    });
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

export function toSqlVector(vec) {
  return pgvector.toSql(vec);
}

function asString(v) {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}
function asStringArray(v) {
  if (Array.isArray(v)) return v.map((x) => String(x)).filter((s) => s.trim());
  if (typeof v === "string" && v.trim()) return [v.trim()];
  return [];
}

/**
 * Constrói o texto de perfil para gerar o embedding.
 * Agora inclui:
 *  - moment (prioritário) ou mood
 *  - goals (objetivos)
 */
export function buildProfileText(answers) {
  const get = (id) => answers.find((a) => a.id === id)?.value;

  const idade   = asString(get("age")) ?? asString(get("ageRange"));
  const generos = asStringArray(get("genres")).join(", ");
  const formato = asStringArray(get("format")).join(", ");
  const goals   = asStringArray(get("goals")).join(", ");
  // PRIORIDADE: usa 'moment' se existir; caso contrário, cai para 'mood'
  const momentoOuMood = asString(get("moment")) ?? asString(get("mood"));

  return [
    "Perfil do quiz:",
    idade         ? `Faixa etária: ${idade}.` : "",
    generos       ? `Géneros preferidos: ${generos}.` : "",
    formato       ? `Formato preferido: ${formato}.` : "",
    goals         ? `Objetivos: ${goals}.` : "",
    momentoOuMood ? `Momento de leitura: ${momentoOuMood}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}
