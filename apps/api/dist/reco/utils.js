"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAlreadyReadIsbns = getAlreadyReadIsbns;
exports.toSqlVector = toSqlVector;
exports.buildProfileText = buildProfileText;
exports.weightedCentroid = weightedCentroid;
const client_1 = require("@prisma/client");
const pgvector_1 = __importDefault(require("pgvector"));
const prisma = new client_1.PrismaClient();
async function getAlreadyReadIsbns({ childId, familyId } = {}) {
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
function toSqlVector(vec) {
    return pgvector_1.default.toSql(vec);
}
function asString(v) {
    return typeof v === "string" && v.trim() ? v.trim() : undefined;
}
function asStringArray(v) {
    if (Array.isArray(v))
        return v.map((x) => String(x)).filter((s) => s.trim());
    if (typeof v === "string" && v.trim())
        return [v.trim()];
    return [];
}
/**
 * Constrói o texto de perfil para gerar o embedding.
 * Agora inclui:
 *  - moment (prioritário) ou mood
 *  - goals (objetivos)
 */
function buildProfileText(answers) {
    const get = (id) => answers.find((a) => a.id === id)?.value;
    const idade = asString(get("age")) ?? asString(get("ageRange"));
    const generos = asStringArray(get("genres")).join(", ");
    const formato = asStringArray(get("format")).join(", ");
    const goals = asStringArray(get("goals")).join(", ");
    // PRIORIDADE: usa 'moment' se existir; caso contrário, cai para 'mood'
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
// ... (o que já tens)
function weightedCentroid(vecs, weights = []) {
    if (!vecs?.length)
        return null;
    const d = vecs[0].length;
    const acc = new Array(d).fill(0);
    let sumW = 0;
    for (let i = 0; i < vecs.length; i++) {
        const v = vecs[i];
        const w = Number(weights?.[i] ?? 1);
        if (!Array.isArray(v) || v.length !== d)
            continue;
        if (!Number.isFinite(w) || w <= 0)
            continue;
        for (let j = 0; j < d; j++)
            acc[j] += v[j] * w;
        sumW += w;
    }
    if (sumW === 0)
        return null;
    for (let j = 0; j < d; j++)
        acc[j] /= sumW;
    return acc;
}
