// apps/api/src/services/badgesEngine.ts
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/* ---------- helpers ---------- */
const norm = (s?: string | null) =>
  (s || "")
    .replace(/\u00A0/g, " ")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

async function awardIfNotExists(childId: number, badgeId: number) {
  try {
    await prisma.badgeAssignment.create({
      data: { childId, badgeId, assignedAt: new Date() },
    });
    return true;
  } catch {
    return false; // já existia (PK composto impede duplicado)
  }
}

async function getBadgeIdByName(name: string) {
  const b = await prisma.badge.findFirst({ where: { name } });
  return b?.id;
}

async function getFamilyIdsForChild(childId: number) {
  const links = await prisma.childFamily.findMany({
    where: { childId },
    select: { familyId: true },
  });
  return links.map(l => l.familyId);
}

/* ---------- CHECKERS por badge (true = cumpre) ---------- */
/** 1) Primeiro Livro — Ler e avaliar o primeiro livro. */
async function checkPrimeiroLivro(childId: number) {
  const finished = await prisma.reading.count({
    where: { childId, finishedAt: { not: null } },
  });
  if (!finished) return false;
  const anyRating = await prisma.rating.count({ where: { childId } });
  return anyRating > 0;
}

/** 2) 5 Leituras — Concluir cinco livros diferentes. */
async function checkCincoLeituras(childId: number) {
  const rows = await prisma.reading.findMany({
    where: { childId, finishedAt: { not: null } },
    distinct: ["bookIsbn"],
    select: { bookIsbn: true },
  });
  return rows.length >= 5;
}

/** 3) Crítico Literário — Fazer cinco avaliações com comentário. */
async function checkCincoAvaliacoesComComentario(childId: number) {
  const cnt = await prisma.rating.count({
    where: { childId, comment: { not: null } },
  });
  return cnt >= 5;
}

/** 4) Curioso — Clicar em 10 microconteúdos “Sabia que…”. */
async function checkCurioso(childId: number) {
  // TODO: MicroInteraction liga User (não Child). Quando existir user<->child (login criança)
  // ou mapear família->user, implementar aqui (e filtrar por categoria “sabias que” se existir).
  return false;
}

/** 5) Leitor Frequente — Três livros em sete dias consecutivos. */
async function checkLeitorFrequente(childId: number) {
  const rows = await prisma.reading.findMany({
    where: { childId, finishedAt: { not: null } },
    select: { finishedAt: true },
    orderBy: { finishedAt: "asc" },
  });
  for (let i = 0; i < rows.length; i++) {
    const a = rows[i].finishedAt!;
    let count = 1;
    for (let j = i + 1; j < rows.length; j++) {
      const b = rows[j].finishedAt!;
      if (+b - +a <= 7 * 24 * 3600 * 1000) count++;
      else break;
      if (count >= 3) return true;
    }
  }
  return false;
}

/** 6) Explorador de Géneros — Pelo menos 1 livro em 4 géneros diferentes. */
async function checkExploradorGeneros(childId: number) {
  const rows = await prisma.reading.findMany({
    where: { childId, finishedAt: { not: null } },
    select: { book: { select: { category: true } } },
  });
  const set = new Set(rows.map(r => norm(r.book?.category)));
  set.delete("");
  return set.size >= 4;
}

/** 7) Pontual — Participar em 3 eventos culturais reservados pela agenda.
 * (Sem childId na reserva; verificamos pelas famílias do child.)
 */
async function checkPontual(childId: number) {
  const famIds = await getFamilyIdsForChild(childId);
  if (!famIds.length) return false;
  const cnt = await prisma.eventReservation.count({
    where: { familyId: { in: famIds } }, // podes filtrar status: "CONFIRMADA"
  });
  return cnt >= 3;
}

/** 8) Ilustrador de Palavras — 5 comentários em livros ilustrados. */
async function checkIlustradorDePalavras(childId: number) {
  // Aproximação: categoria contém “ilustr”
  const rows = await prisma.rating.findMany({
    where: { childId, comment: { not: null } },
    select: { book: { select: { category: true } } },
  });
  const count = rows.filter(r => norm(r.book?.category).includes("ilustr")).length;
  return count >= 5;
}

/** 9) Boa Noite, Livro — 3 livros de “Histórias para Dormir”. */
async function checkBoaNoiteLivro(childId: number) {
  const rows = await prisma.reading.findMany({
    where: { childId, finishedAt: { not: null } },
    select: { book: { select: { category: true } } },
  });
  const count = rows.filter(r => {
    const c = norm(r.book?.category);
    return c.includes("historia") || c.includes("dormir");
  }).length;
  return count >= 3;
}

/** 10) Descobridor de Curiosidades — Explorar 5 conteúdos de boas práticas. */
async function checkDescobridorCuriosidades(childId: number) {
  // TODO: precisa MicroInteraction por criança (ou mapear family->user).
  return false;
}

/** 11) Mini Bibliófilo — Ler 10 livros. */
async function checkLerDezLivros(childId: number) {
  const cnt = await prisma.reading.count({
    where: { childId, finishedAt: { not: null } },
  });
  return cnt >= 10;
}

/** 12) Família Leitora — Todos os elementos da família leram ≥ 1 livro. */
async function checkFamiliaLeitora(childId: number) {
  const famIds = await getFamilyIdsForChild(childId);
  if (!famIds.length) return false;

  // filhos dessa(s) família(s)
  const children = await prisma.childFamily.findMany({
    where: { familyId: { in: famIds } },
    select: { childId: true },
    distinct: ["childId"],
  });
  if (!children.length) return false;

  const readByChild = await prisma.reading.groupBy({
    by: ["childId"],
    where: { childId: { in: children.map(c => c.childId) }, finishedAt: { not: null } },
    _count: { childId: true },
  });

  const set = new Set(readByChild.map(r => r.childId));
  return children.every(c => set.has(c.childId));
}

/** 13) Aventureiro Literário — aventura + fantasia + mistério. */
async function checkAventureiroLiterario(childId: number) {
  const rows = await prisma.reading.findMany({
    where: { childId, finishedAt: { not: null } },
    select: { book: { select: { category: true } } },
  });
  const cats = new Set(rows.map(r => norm(r.book?.category)));
  const has = (k: string) => Array.from(cats).some(c => c.includes(k));
  return has("aventur") && has("fantas") && has("mister");
}

/** 14) Clube da Lareira — Participação em 3 eventos culturais com marcação. */
async function checkClubeDaLareira(childId: number) {
  const famIds = await getFamilyIdsForChild(childId);
  if (!famIds.length) return false;
  const cnt = await prisma.eventReservation.count({
    where: { familyId: { in: famIds } },
  });
  return cnt >= 3;
}

/** 15) Contador de Histórias — 3 comentários “em destaque”. */
async function checkContadorDeHistorias(childId: number) {
  // TODO: falta campo rating.approved / highlighted. Quando existir: count >= 3.
  return false;
}

/** 16) Explorador Global — Ler livros de cinco países diferentes. */
async function checkExploradorGlobal(childId: number) {
  // TODO: Book não tem país/origem. Quando existir (ex.: book.country), distinct >= 5.
  return false;
}

/** 17) Meta Atingida — Cumprir 3 metas de leitura. */
async function checkMetaAtingida(childId: number) {
  // TODO: não há tabela de metas de leitura.
  return false;
}

/** 18) Embaixador da Leitura — Partilhar com 3 novas famílias. */
async function checkEmbaixadorDaLeitura(childId: number) {
  // TODO: falta mecanismo de referrals/invites aceites.
  return false;
}

/** 19) Guardião da Biblioteca — Nível máximo + 5 troféus anteriores. */
async function checkGuardiaoDaBiblioteca(childId: number) {
  // Sem “nível” no schema. Poderíamos verificar ≥5 troféus (type TROFÉU) já atribuídos:
  const trophies = await prisma.badgeAssignment.count({
    where: {
      childId,
      badge: { type: { contains: "TROF", mode: "insensitive" } },
    },
  });
  const hasFiveTrophies = trophies >= 5;
  // TODO: conjugar com “nível máximo” quando existir.
  return false && hasFiveTrophies;
}

/* ---------- mapa Nome -> checker ---------- */
const CHECKERS: Record<string, (childId: number) => Promise<boolean>> = {
  "Primeiro Livro": checkPrimeiroLivro,
  "5 Leituras": checkCincoLeituras,
  "Crítico Literário": checkCincoAvaliacoesComComentario,
  "Curioso": checkCurioso,
  "Leitor Frequente": checkLeitorFrequente,
  "Explorador de Géneros": checkExploradorGeneros,
  "Pontual": checkPontual,
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

/* ---------- API do motor ---------- */
export async function checkAndAwardAllForChild(childId: number) {
  const badges = await prisma.badge.findMany({
    where: { name: { in: Object.keys(CHECKERS) } },
    select: { id: true, name: true },
  });

  let newlyAwarded = 0;
  for (const b of badges) {
    const fn = CHECKERS[b.name];
    if (!fn) continue;
    const ok = await fn(childId);
    if (!ok) continue;
    const created = await awardIfNotExists(childId, b.id);
    if (created) newlyAwarded++;
  }
  return { newlyAwarded };
}

/** Recalcula tudo para todos os filhos (p/ cron/admin) */
export async function recomputeAllChildren() {
  const children = await prisma.child.findMany({ select: { id: true } });
  let total = 0;
  for (const c of children) {
    const res = await checkAndAwardAllForChild(c.id);
    total += res.newlyAwarded;
  }
  return { total };
}
