"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAndAwardAllForChild = checkAndAwardAllForChild;
exports.recomputeAllChildren = recomputeAllChildren;
// apps/api/src/services/badgesEngine.ts
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
/* ---------------- helpers ---------------- */
const DAY_MS = 24 * 60 * 60 * 1000;
const norm = (s) => (s || "")
    .replace(/\u00A0/g, " ")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
const onlyWords = (s) => norm(s)
    .split(/[^a-z0-9]+/g)
    .filter(Boolean);
const toYmd = (d) => d.toISOString().slice(0, 10);
const diffDays = (a, b) => Math.floor((+b - +a) / DAY_MS);
async function getFamilyIdsForChild(childId) {
    const links = await prisma.childFamily.findMany({
        where: { childId },
        select: { familyId: true },
    });
    return links.map((l) => l.familyId);
}
/* Premiar em segurança: vamos usar createMany + skipDuplicates no final */
function buildGenresFrom(category, genres) {
    const set = new Set();
    (genres ?? []).forEach((g) => {
        const tok = norm(g);
        if (tok)
            set.add(tok);
    });
    if (category) {
        // tenta extrair possíveis géneros de category
        for (const t of norm(category).split(/[;|,/–-]/g)) {
            const s = t.trim();
            if (s)
                set.add(s);
        }
    }
    return set;
}
/* ---------------- CHECKERS ---------------- */
/** 1) Primeiro Livro — Ler e avaliar o primeiro livro. */
async function checkPrimeiroLivro(childId) {
    const first = await prisma.reading.findFirst({
        where: { childId, finishedAt: { not: null } },
        orderBy: { finishedAt: "asc" },
        select: { bookIsbn: true },
    });
    if (!first)
        return false;
    const rated = await prisma.rating.count({
        where: { childId, bookIsbn: first.bookIsbn },
    });
    return rated > 0;
}
/** 2) 5 Leituras — Concluir cinco livros diferentes. */
async function checkCincoLeituras(childId) {
    const rows = await prisma.reading.findMany({
        where: { childId, finishedAt: { not: null } },
        distinct: ["bookIsbn"],
        select: { bookIsbn: true },
    });
    return rows.length >= 5;
}
/** 3) Crítico Literário — Fazer cinco avaliações com comentário (>= 20 chars). */
async function checkCincoAvaliacoesComComentario(childId) {
    const rows = await prisma.rating.findMany({
        where: { childId, comment: { not: null } },
        select: { comment: true },
    });
    const cnt = rows.filter((r) => (r.comment?.trim().length ?? 0) >= 20).length;
    return cnt >= 5;
}
/** 4) Curioso — Clicar em 10 microconteúdos “Sabia que…” (FACTO). */
async function checkCurioso(childId) {
    const famIds = await getFamilyIdsForChild(childId);
    if (!famIds.length)
        return false;
    // Distintos por microContent (independente de qual familiar clicou)
    const grouped = await prisma.microInteraction.groupBy({
        by: ["microContentId"],
        where: {
            userId: { in: famIds },
            microContent: { type: client_1.MicroContentType.FACTO, isPublished: true },
        },
    });
    return grouped.length >= 10;
}
/** 5) Leitor Frequente — Ler em 3 dias dentro de qualquer janela de 7 dias. */
async function checkLeitorFrequente(childId) {
    const rows = await prisma.reading.findMany({
        where: { childId, finishedAt: { not: null } },
        select: { finishedAt: true },
        orderBy: { finishedAt: "asc" },
    });
    if (!rows.length)
        return false;
    // 1 livro conta 1 por dia (não interessa quantos livros no mesmo dia)
    const days = Array.from(new Set(rows.map((r) => toYmd(r.finishedAt)))).map((d) => new Date(d + "T00:00:00Z"));
    days.sort((a, b) => +a - +b);
    let i = 0;
    for (let j = 0; j < days.length; j++) {
        while (diffDays(days[i], days[j]) > 6)
            i++;
        if (j - i + 1 >= 3)
            return true; // 3 dias dentro de 7
    }
    return false;
}
/** 6) Explorador de Géneros — >=1 livro em 4 géneros diferentes. */
async function checkExploradorGeneros(childId) {
    const rows = await prisma.reading.findMany({
        where: { childId, finishedAt: { not: null } },
        select: { book: { select: { category: true, genres: true } } },
    });
    const set = new Set();
    for (const r of rows) {
        const gset = buildGenresFrom(r.book?.category, r.book?.genres);
        gset.forEach((g) => set.add(g));
    }
    set.delete("");
    return set.size >= 4;
}
/** 7) Pontual — Participar em 3 eventos (reservas) da(s) família(s). */
async function checkPontual(childId) {
    const famIds = await getFamilyIdsForChild(childId);
    if (!famIds.length)
        return false;
    const cnt = await prisma.eventReservation.count({
        where: {
            familyId: { in: famIds },
            // Se quiseres só confirmadas, ativa a linha abaixo:
            // status: { in: ["CONFIRMED", "CONFIRMADO", "CONFIRMADA"] }
        },
    });
    return cnt >= 3;
}
/** 8) Ilustrador de Palavras — 5 comentários em livros ilustrados. */
async function checkIlustradorDePalavras(childId) {
    const rows = await prisma.rating.findMany({
        where: { childId, comment: { not: null } },
        select: { book: { select: { category: true, genres: true } } },
    });
    const isIllustrated = (cat, genres) => {
        const bag = buildGenresFrom(cat, genres);
        const txt = Array.from(bag).join(" ");
        return (txt.includes("ilustr") ||
            txt.includes("album") ||
            txt.includes("picture") ||
            txt.includes("picturebook") ||
            txt.includes("picture-book"));
    };
    const count = rows.filter((r) => isIllustrated(r.book?.category, r.book?.genres)).length;
    return count >= 5;
}
/** 9) Boa Noite, Livro — 3 livros de “histórias para dormir/bedtime”. */
async function checkBoaNoiteLivro(childId) {
    const rows = await prisma.reading.findMany({
        where: { childId, finishedAt: { not: null } },
        select: {
            book: { select: { category: true, title: true, genres: true } },
        },
    });
    const hit = (title, cat, genres) => {
        const bag = buildGenresFrom(cat, genres);
        const hay = [Array.from(bag).join(" "), norm(title)].join(" ");
        return (hay.includes("boa noite") ||
            hay.includes("dormir") ||
            hay.includes("adormec") ||
            hay.includes("sono") ||
            hay.includes("bedtime"));
    };
    const count = rows.filter((r) => hit(r.book?.title, r.book?.category, r.book?.genres)).length;
    return count >= 3;
}
/** 10) Descobridor de Curiosidades — 5 conteúdos de boas práticas (DICA). */
async function checkDescobridorCuriosidades(childId) {
    const famIds = await getFamilyIdsForChild(childId);
    if (!famIds.length)
        return false;
    const grouped = await prisma.microInteraction.groupBy({
        by: ["microContentId"],
        where: {
            userId: { in: famIds },
            microContent: { type: client_1.MicroContentType.DICA, isPublished: true },
        },
    });
    return grouped.length >= 5;
}
/** 11) Mini Bibliófilo — Ler 10 livros. */
async function checkLerDezLivros(childId) {
    const cnt = await prisma.reading.count({
        where: { childId, finishedAt: { not: null } },
    });
    return cnt >= 10;
}
/** 12) Família Leitora — todos os elementos (crianças) da(s) família(s) leram ≥1 livro. */
async function checkFamiliaLeitora(childId) {
    const famIds = await getFamilyIdsForChild(childId);
    if (!famIds.length)
        return false;
    const children = await prisma.childFamily.findMany({
        where: { familyId: { in: famIds } },
        select: { childId: true },
        distinct: ["childId"],
    });
    if (!children.length)
        return false;
    const readByChild = await prisma.reading.groupBy({
        by: ["childId"],
        where: {
            childId: { in: children.map((c) => c.childId) },
            finishedAt: { not: null },
        },
        _count: { childId: true },
    });
    const set = new Set(readByChild.map((r) => r.childId));
    return children.every((c) => set.has(c.childId));
}
/** 13) Aventureiro Literário — aventura + fantasia + mistério. */
async function checkAventureiroLiterario(childId) {
    const rows = await prisma.reading.findMany({
        where: { childId, finishedAt: { not: null } },
        select: { book: { select: { category: true, genres: true } } },
    });
    const bag = new Set();
    for (const r of rows) {
        buildGenresFrom(r.book?.category, r.book?.genres).forEach((g) => bag.add(g));
    }
    const has = (k) => Array.from(bag).some((c) => c.includes(k));
    return has("aventur") && has("fantas") && has("mister");
}
/** 14) Clube da Lareira — Participação em 3 eventos com marcação. */
async function checkClubeDaLareira(childId) {
    const famIds = await getFamilyIdsForChild(childId);
    if (!famIds.length)
        return false;
    const cnt = await prisma.eventReservation.count({
        where: { familyId: { in: famIds } },
    });
    return cnt >= 3;
}
/** 15) Contador de Histórias — 3 comentários “em destaque”.
 * Sem campo dedicado → aproximação: 3 comentários longos (>= 200 chars).
 */
async function checkContadorDeHistorias(childId) {
    const rows = await prisma.rating.findMany({
        where: { childId, comment: { not: null } },
        select: { comment: true },
    });
    const long = rows.filter((r) => (r.comment?.trim().length ?? 0) >= 200).length;
    return long >= 3;
}
/** 16–19: dependem de dados não existentes no schema → ficam desativados. */
async function checkExploradorGlobal(_childId) {
    return false;
}
async function checkMetaAtingida(_childId) {
    return false;
}
async function checkEmbaixadorDaLeitura(_childId) {
    return false;
}
async function checkGuardiaoDaBiblioteca(_childId) {
    return false;
}
/* ---------------- mapa Nome -> checker ---------------- */
const CHECKERS = {
    "Primeiro Livro": checkPrimeiroLivro,
    "5 Leituras": checkCincoLeituras,
    "Crítico Literário": checkCincoAvaliacoesComComentario,
    Curioso: checkCurioso,
    "Leitor Frequente": checkLeitorFrequente,
    "Explorador de Géneros": checkExploradorGeneros,
    Pontual: checkPontual,
    "Ilustrador de Palavras": checkIlustradorDePalavras,
    "Boa Noite, Livro": checkBoaNoiteLivro,
    "Descobridor de Curiosidades": checkDescobridorCuriosidades,
    "Mini Bibliófilo": checkLerDezLivros,
    "Família Leitora": checkFamiliaLeitora,
    "Aventureiro Literário": checkAventureiroLiterario,
    "Clube da Lareira": checkClubeDaLareira,
    "Contador de Histórias": checkContadorDeHistorias,
    "Explorador Global": checkExploradorGlobal,
    "Meta Atingida": checkMetaAtingida,
    "Embaixador da Leitura": checkEmbaixadorDaLeitura,
    "Guardião da Biblioteca": checkGuardiaoDaBiblioteca,
};
/* ---------------- API do motor ---------------- */
/** Corre todos os checkers e premia em lote (idempotente). */
async function checkAndAwardAllForChild(childId) {
    // 1) run all checkers em paralelo
    const names = Object.keys(CHECKERS);
    const results = await Promise.all(names.map((n) => CHECKERS[n](childId)));
    const passedNames = names.filter((_, i) => results[i]);
    if (!passedNames.length)
        return { newlyAwarded: 0 };
    // 2) buscar ids das badges correspondentes
    const badges = await prisma.badge.findMany({
        where: { name: { in: passedNames } },
        select: { id: true },
    });
    if (!badges.length)
        return { newlyAwarded: 0 };
    // 3) premiar em lote (ignora duplicados via PK composto)
    const created = await prisma.badgeAssignment.createMany({
        data: badges.map((b) => ({
            childId,
            badgeId: b.id,
            assignedAt: new Date(),
        })),
        skipDuplicates: true,
    });
    return { newlyAwarded: created.count };
}
/** Recalcula tudo para todos os filhos (p/ cron/admin) */
async function recomputeAllChildren() {
    const children = await prisma.child.findMany({ select: { id: true } });
    let total = 0;
    for (const c of children) {
        const res = await checkAndAwardAllForChild(c.id);
        total += res.newlyAwarded;
    }
    return { total };
}
