import { PrismaClient } from "@prisma/client";
import pgvector from "pgvector";
const prisma = new PrismaClient();

export async function getAlreadyReadIsbns({ childId, familyId } = {}) {
  if (childId) {
    const rows = await prisma.reading.findMany({ where: { childId }, select: { bookIsbn: true } });
    return rows.map(r => r.bookIsbn);
  }
  if (familyId) {
    const rows = await prisma.reading.findMany({
      where: { child: { families: { some: { familyId } } } },
      select: { bookIsbn: true },
    });
    return rows.map(r => r.bookIsbn);
  }
  return [];
}

export function toSqlVector(vec) {
  return pgvector.toSql(vec);
}

function asString(v) { return typeof v === "string" && v.trim() ? v.trim() : undefined; }
function asStringArray(v) {
  if (Array.isArray(v)) return v.map(x => String(x)).filter(s => s.trim());
  if (typeof v === "string" && v.trim()) return [v.trim()];
  return [];
}

export function buildProfileText(answers) {
  const get = id => answers.find(a => a.id === id)?.value;
  const idade = asString(get("age")) ?? asString(get("ageRange"));
  const generos = asStringArray(get("genres")).join(", ");
  const mood = asString(get("mood"));
  const formato = asStringArray(get("format")).join(", ");

  return [
    "Perfil do quiz:",
    idade ? `Faixa etária: ${idade}.` : "",
    generos ? `Géneros preferidos: ${generos}.` : "",
    mood ? `Contexto de leitura: ${mood}.` : "",
    formato ? `Formato: ${formato}.` : ""
  ].filter(Boolean).join(" ");
}
