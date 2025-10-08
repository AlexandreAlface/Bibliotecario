// apps/api/src/routes/consultations/consultations.ts
// O que faz: CRUD + queries de Consultations e Slots, com regras de conflito/estado.
// Estilo: helpers PUROS, serviços curtos e handlers <= 30 linhas.

import {
  Router,
  type Request,
  type Response,
  type RequestHandler,
} from "express";
import { PrismaClient, $Enums, ConsultationStatus } from "@prisma/client";
import {
  requireFamilyOrLibrarian,
  requireRole,
  ROLES,
  withUser,
} from "../../../middlewares/auth";

import PDFDocument from "pdfkit";

const prisma = new PrismaClient();
const r = Router();

/* ============================== Tipos & Utils ============================== */

type Authed = Request & { user?: { id?: number; roles?: string[] } | null };

const asInt = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};
const asDate = (v: unknown) => {
  const d = v ? new Date(String(v)) : undefined;
  return d && !isNaN(+d) ? d : undefined;
};
const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));
const safeNotes = (v: unknown) =>
  typeof v === "string" ? v.slice(0, 500) : null;

// tiny helpers de autorização (puros)
const isAdmin = (req: Authed) => (req.user?.roles || []).includes(ROLES.ADMIN);
const isActor = (req: Authed, c: { librarianId: number; familyId: number }) =>
  req.user?.id === c.librarianId || req.user?.id === c.familyId;

/* ============================== Services (DB) ============================== */

// Cria consulta: com slot (BOOKED) ou sem slot (pendente).
async function svcCreateConsultation(input: {
  familyId: number;
  librarianId: number;
  childId?: number;
  libraryId?: number;
  slotId?: number;
  // ou sem slot:
  startAt?: string | Date;
  endAt?: string | Date;

  // 🔹 NOVOS
  title?: string;
  purpose?: string;
  description?: string;
  modeEnum?: $Enums.ConsultationMode;
  meetingUrl?: string;

  notes?: string | null;

  // anexos opcionais
  bookIsbns?: string[];
  microContentIds?: number[];
  eventIds?: number[];
}) {
  const {
    familyId,
    librarianId,
    childId,
    libraryId,
    slotId,
    startAt,
    endAt,
    title,
    purpose,
    description,
    modeEnum,
    meetingUrl,
    notes,
    bookIsbns = [],
    microContentIds = [],
    eventIds = [],
  } = input;

  // validação de modo/local
  if (modeEnum === $Enums.ConsultationMode.ONLINE && !meetingUrl) {
    throw new Error("meeting_url_required_for_online");
  }
  if (modeEnum === $Enums.ConsultationMode.IN_PERSON && !libraryId) {
    throw new Error("library_required_for_in_person");
  }

  // criar via SLOT (mantém o teu fluxo)
  if (slotId) {
    return prisma.$transaction(async (tx) => {
      const slot = await tx.consultationSlot.findUnique({
        where: { id: slotId },
        include: { consultation: true },
      });
      if (!slot) throw new Error("slot_not_found");
      if (slot.status !== $Enums.SlotStatus.OPEN)
        throw new Error("slot_not_open");
      if (slot.consultation) throw new Error("slot_already_linked");

      const c = await tx.consultation.create({
        data: {
          familyId,
          librarianId,
          childId: childId ?? null,
          libraryId: libraryId ?? null,
          // 🔹 novos
          title: title ?? null,
          purpose: purpose ?? null,
          description: description ?? null,
          modeEnum: modeEnum ?? null,
          meetingUrl: meetingUrl ?? null,
          // legacy (mantém por compat se front antigo ainda manda)
          mode: modeEnum
            ? modeEnum === $Enums.ConsultationMode.ONLINE
              ? "ONLINE"
              : "IN_PERSON"
            : null,
          location: libraryId ? "LIBRARY" : null,

          startAt: slot.startAt,
          endAt: slot.endAt,
          status: $Enums.ConsultationStatus.PENDING,
          slotId,
          notes,
          events: { create: [{ type: "REQUESTED" }] },

          // anexos
          books: {
            create: bookIsbns.map((isbn) => ({ book: { connect: { isbn } } })),
          },
          microContents: {
            create: microContentIds.map((id) => ({
              microContent: { connect: { id } },
            })),
          },
          culturalEvents: {
            create: eventIds.map((id) => ({ event: { connect: { id } } })),
          },
        },
      });

      await tx.consultationSlot.update({
        where: { id: slotId },
        data: { status: $Enums.SlotStatus.BOOKED },
      });

      return c;
    });
  }

  // criar sem slot (com start/end explícitos)
  if (!startAt || !endAt) throw new Error("time_required");
  return prisma.consultation.create({
    data: {
      familyId,
      librarianId,
      childId: childId ?? null,
      libraryId: libraryId ?? null,
      title: title ?? null,
      purpose: purpose ?? null,
      description: description ?? null,
      modeEnum: modeEnum ?? null,
      meetingUrl: meetingUrl ?? null,
      mode: modeEnum
        ? modeEnum === $Enums.ConsultationMode.ONLINE
          ? "ONLINE"
          : "IN_PERSON"
        : null,
      location: libraryId ? "LIBRARY" : null,
      startAt: new Date(startAt),
      endAt: new Date(endAt),
      status: $Enums.ConsultationStatus.PENDING,
      notes,
      events: { create: [{ type: "REQUESTED" }] },
      books: {
        create: bookIsbns.map((isbn) => ({ book: { connect: { isbn } } })),
      },
      microContents: {
        create: microContentIds.map((id) => ({
          microContent: { connect: { id } },
        })),
      },
      culturalEvents: {
        create: eventIds.map((id) => ({ event: { connect: { id } } })),
      },
    },
  });
}

// Lista todas com filtros simples.
async function svcListAllConsultations(q: {
  limit: number;
  statuses?: $Enums.ConsultationStatus[];
  order: "asc" | "desc";
  from?: Date;
  to?: Date;
  librarianId?: number;
  familyId?: number;
  childId?: number;
}) {
  const where: any = {};
  if (q.statuses?.length) where.status = { in: q.statuses };
  if (q.from || q.to)
    where.startAt = {
      ...(q.from ? { gte: q.from } : {}),
      ...(q.to ? { lte: q.to } : {}),
    };
  if (q.librarianId) where.librarianId = q.librarianId;
  if (q.familyId) where.familyId = q.familyId;
  if (q.childId) where.childId = q.childId;

  return prisma.consultation.findMany({
    where,
    take: q.limit,
    orderBy: [{ startAt: q.order }, { id: "desc" }],
    include: {
      family: { select: { id: true, fullName: true, email: true } },
      librarian: { select: { id: true, fullName: true, email: true } },
      child: { select: { id: true, name: true } },
      library: { select: { id: true, name: true } },
      slot: { select: { id: true, startAt: true, endAt: true, status: true } },
      events: {
        select: { id: true, type: true, at: true, actorId: true },
        orderBy: { at: "desc" },
        take: 5,
      },
    },
  });
}

// Próximas consultas (pend/confirmed) a partir de uma data.
async function svcListNext(q: {
  limit: number;
  from: Date;
  familyId?: number;
  librarianId?: number;
  childId?: number;
}) {
  const where: any = {
    status: {
      in: [
        $Enums.ConsultationStatus.PENDING,
        $Enums.ConsultationStatus.CONFIRMED,
      ],
    },
    startAt: { gte: q.from },
  };
  if (q.familyId) where.familyId = q.familyId;
  if (q.librarianId) where.librarianId = q.librarianId;
  if (q.childId) where.childId = q.childId;

  const items = await prisma.consultation.findMany({
    where,
    take: q.limit,
    orderBy: { startAt: "asc" },
    select: {
      id: true,
      startAt: true,
      endAt: true,
      status: true,
      family: { select: { id: true, fullName: true } },
      librarian: { select: { id: true, fullName: true } },
      child: { select: { id: true, name: true } },
      library: { select: { id: true, name: true } },
    },
  });

  return items.map((c) => ({
    id: c.id,
    title: c.child?.name
      ? `Consulta de ${c.child.name}`
      : `Consulta com ${c.librarian?.fullName ?? "bibliotecário"}`,
    date: c.startAt?.toISOString(),
    scheduledAt: c.startAt?.toISOString(),
    status: c.status,
    librarianId: c.librarian?.id ?? null,
    librarianName: c.librarian?.fullName ?? undefined,
    familyId: c.family?.id,
    childId: c.child?.id,
    libraryId: c.library?.id ?? undefined,
    libraryName: c.library?.name ?? undefined,
  }));
}

// Lista bibliotecários (roleId=2) e, opcionalmente, da biblioteca X.
async function svcListLibrarians(libraryId?: number) {
  const where: any = { userRoles: { some: { roleId: 2 } } };
  if (libraryId) where.userLibraries = { some: { libraryId } };
  const users = await prisma.user.findMany({
    where,
    select: { id: true, fullName: true },
    orderBy: { fullName: "asc" },
  });
  return users.map((u) => ({ id: u.id, name: u.fullName }));
}

// Lista slots OPEN num intervalo (futuros por defeito quando onlyBookable=true).
async function svcListSlots(q: {
  from: Date;
  to: Date;
  onlyBookable: boolean;
  librarianId?: number;
  libraryId?: number;
}) {
  const now = new Date();
  const where: any = {
    status: $Enums.SlotStatus.OPEN,
    startAt: { gte: q.onlyBookable ? (q.from > now ? q.from : now) : q.from },
    endAt: { lte: q.to },
  };
  if (q.librarianId) where.librarianId = q.librarianId;
  if (q.libraryId) where.libraryId = q.libraryId;

  const items = await prisma.consultationSlot.findMany({
    where,
    orderBy: { startAt: "asc" },
    select: {
      id: true,
      startAt: true,
      endAt: true,
      status: true,
      librarianId: true,
      librarian: { select: { fullName: true } },
      libraryId: true,
      library: { select: { name: true } },
    },
  });

  return items.map((s) => ({
    id: s.id,
    startAt: s.startAt,
    endAt: s.endAt,
    status: s.status,
    librarianId: s.librarianId,
    librarianName: s.librarian?.fullName ?? null,
    librarianAvatarUrl: null as string | null,
    libraryId: s.libraryId ?? undefined,
    libraryName: s.library?.name ?? undefined,
  }));
}

// Bibliotecários que têm slots OPEN num intervalo (e opcionalmente biblioteca X).
async function svcLibrariansWithOpenSlots(
  from: Date,
  to: Date,
  libraryId?: number
) {
  const now = new Date();
  const effFrom = from > now ? from : now;
  const users = await prisma.user.findMany({
    where: {
      userRoles: { some: { roleId: 2 } },
      consultationSlots: {
        some: {
          status: $Enums.SlotStatus.OPEN,
          startAt: { gte: effFrom },
          endAt: { lte: to },
          ...(libraryId ? { libraryId } : {}),
        },
      },
    },
    select: { id: true, fullName: true },
    orderBy: { fullName: "asc" },
  });
  return users.map((u) => ({ id: u.id, name: u.fullName }));
}

// Confirma consulta, valida conflito e marca slot BOOKED.
async function svcConfirmConsultation(id: number, req: Authed) {
  return prisma.$transaction(async (tx) => {
    const c = await tx.consultation.findUnique({
      where: { id },
      include: { slot: true },
    });
    if (!c) throw new Error("not found");
    if (!isAdmin(req) && req.user?.id !== c.librarianId)
      throw new Error("forbidden");
    if (!c.startAt || !c.endAt)
      throw new Error("consulta sem horário para confirmar");

    const conflict = await tx.consultation.findFirst({
      where: {
        librarianId: c.librarianId,
        status: ConsultationStatus.CONFIRMED,
        startAt: { lt: c.endAt },
        endAt: { gt: c.startAt },
        id: { not: c.id },
      },
      select: { id: true, startAt: true, endAt: true, familyId: true },
    });
    if (conflict) return { error: "conflict", conflict };

    if (c.slotId) {
      await tx.consultationSlot.update({
        where: { id: c.slotId },
        data: { status: $Enums.SlotStatus.BOOKED },
      });
    }
    return tx.consultation.update({
      where: { id: c.id },
      data: {
        status: ConsultationStatus.CONFIRMED,
        events: { create: { type: "CONFIRMED", actorId: req.user?.id } },
      },
    });
  });
}

// Declina consulta e reabre slot se existir.
async function svcDeclineConsultation(id: number) {
  const c = await prisma.consultation.update({
    where: { id },
    data: { status: "DECLINED", events: { create: { type: "DECLINED" } } },
  });
  if (c.slotId) {
    await prisma.consultationSlot.update({
      where: { id: c.slotId },
      data: { status: $Enums.SlotStatus.OPEN },
    });
  }
  return c;
}

// Cancela consulta (autorização + libertar slot + expirar propostas + evento).
async function svcCancelConsultation(id: number, req: Authed, reason?: string) {
  class ApiError extends Error {
    code: number;
    constructor(code: number, msg: string) {
      super(msg);
      this.code = code;
    }
  }

  await prisma.$transaction(async (tx) => {
    const c = await tx.consultation.findUnique({
      where: { id },
      include: { slot: true },
    });
    if (!c) throw new ApiError(404, "not_found");
    if (!isAdmin(req) && !isActor(req, c)) throw new ApiError(403, "forbidden");

    if (c.status === $Enums.ConsultationStatus.CANCELLED)
      throw new ApiError(409, "already_cancelled");
    if (c.status === $Enums.ConsultationStatus.COMPLETED)
      throw new ApiError(409, "completed");
    if (c.status === $Enums.ConsultationStatus.DECLINED)
      throw new ApiError(409, "invalid_state");

    if (c.slotId)
      await tx.consultationSlot.update({
        where: { id: c.slotId },
        data: { status: $Enums.SlotStatus.OPEN },
      });

    await tx.consultation.update({
      where: { id: c.id },
      data: { status: $Enums.ConsultationStatus.CANCELLED, slotId: null },
    });
    await tx.consultationProposal.updateMany({
      where: { consultationId: c.id, status: $Enums.ProposalStatus.PENDING },
      data: { status: $Enums.ProposalStatus.EXPIRED, decidedAt: new Date() },
    });
    await tx.consultationEvent.create({
      data: {
        consultationId: c.id,
        type: "CONSULTATION_CANCELLED",
        actorId: req.user?.id ?? null,
        payload: { reason },
      },
    });
  });
}

// Completa consulta (+ evento).
const svcComplete = (id: number) =>
  prisma.consultation.update({
    where: { id },
    data: { status: "COMPLETED", events: { create: { type: "COMPLETED" } } },
  });

// Detalhe por id (saída enxuta).
async function svcGetById(id: number) {
  const c = await prisma.consultation.findUnique({
    where: { id },
    include: {
      family: { select: { id: true, fullName: true } },
      librarian: { select: { id: true, fullName: true } },
      child: { select: { id: true, name: true } },
      library: { select: { id: true, name: true } },
      slot: { select: { id: true, startAt: true, endAt: true, status: true } },
    },
  });
  if (!c) return null;
  return {
    id: c.id,
    status: c.status,
    startAt: c.startAt,
    endAt: c.endAt,
    familyId: c.familyId,
    childId: c.childId,
    librarianId: c.librarianId,
    libraryId: c.libraryId,
  };
}

/* ============================== Handlers (<= 30 linhas) ============================== */

r.post(
  "/:id/attachments",
  withUser as RequestHandler,
  requireFamilyOrLibrarian as RequestHandler,
  async (req: Request, res: Response) => {
    const authed = req as Authed;
    const id = asInt(req.params.id);
    if (!id) return res.status(400).json({ error: "invalid_id" });

    const {
      bookIsbns = [],
      microContentIds = [],
      eventIds = [],
    } = req.body ?? {};

    try {
      const data: any = {};
      if (Array.isArray(bookIsbns) && bookIsbns.length) {
        data.books = {
          createMany: {
            data: bookIsbns.map((isbn: string) => ({ bookIsbn: isbn })),
          },
        };
      }
      if (Array.isArray(microContentIds) && microContentIds.length) {
        data.microContents = {
          createMany: {
            data: microContentIds.map((mid: number) => ({
              microContentId: mid,
            })),
          },
        };
      }
      if (Array.isArray(eventIds) && eventIds.length) {
        data.culturalEvents = {
          createMany: {
            data: eventIds.map((eid: number) => ({ eventId: eid })),
          },
        };
      }

      const out = await prisma.consultation.update({
        where: { id },
        data: {
          ...data,
          events: {
            create: [
              { type: "ATTACHMENT_ADDED", payload: (req as any).body ?? {} },
            ],
          },
        },
        include: { books: true, microContents: true, culturalEvents: true },
      });

      res.json(out);
    } catch (e: any) {
      res.status(400).json({ error: e?.message ?? "failed_to_attach" });
    }
  }
);

r.get(
  "/:id/details",
  withUser as RequestHandler,
  requireRole(ROLES.LIBRARIAN, ROLES.ADMIN) as RequestHandler,
  async (req: Request, res: Response) => {
    const authed = req as Authed;
    const id = asInt(req.params.id);
    if (!id) return res.status(400).json({ error: "invalid_id" });

    // consulta + anexos + família + criança
    const c = await prisma.consultation.findUnique({
      where: { id },
      include: {
        family: { select: { id: true, fullName: true, email: true } },
        child: { select: { id: true, name: true, birthDate: true } },
        library: { select: { id: true, name: true, address: true } },
        books: {
          include: {
            book: { select: { isbn: true, title: true, coverUrl: true } },
          },
        },
        microContents: { include: { microContent: true } },
        culturalEvents: { include: { event: true } },
      },
    });
    if (!c) return res.status(404).json({ error: "not_found" });

    // histórico da família (últimas 10)
    const pastConsultations = await prisma.consultation.findMany({
      where: { familyId: c.familyId, id: { not: c.id } },
      orderBy: { startAt: "desc" },
      take: 10,
      select: {
        id: true,
        title: true,
        purpose: true,
        startAt: true,
        status: true,
      },
    });

    // filhos da família
    const familyChildren = await prisma.childFamily.findMany({
      where: { familyId: c.familyId },
      select: { childId: true, child: { select: { name: true } } },
    });
    const childIds = familyChildren.map((x) => x.childId);

    // leituras (últimas 10)
    const readings = childIds.length
      ? await prisma.reading.findMany({
          where: { childId: { in: childIds } },
          orderBy: { finishedAt: "desc" },
          take: 10,
          select: {
            childId: true,
            child: { select: { name: true } },
            bookIsbn: true,
            book: { select: { title: true, coverUrl: true } },
            finishedAt: true,
            ratings: {
              select: {
                stars: true,
                comment: true,
                ratedAt: true,
                userId: true,
                childId: true,
              },
              take: 1, // 1 por leitura (se houver)
            },
          },
        })
      : [];

    // eventos reservados pela família (últimos 10)
    const reservations = await prisma.eventReservation.findMany({
      where: { familyId: c.familyId },
      orderBy: { bookedAt: "desc" },
      take: 10,
      include: { event: true },
    });

    const timeline = await prisma.consultationEvent.findMany({
      where: { consultationId: id },
      orderBy: { at: "desc" },
      take: 20,
      select: {
        id: true,
        type: true,
        at: true,
        payload: true,
        actor: { select: { id: true, fullName: true } },
      },
    });

    // resposta formatada para o front
    const out = {
      consultation: {
        id: c.id,
        title: c.title ?? undefined,
        purpose: c.purpose ?? undefined,
        description: c.description ?? undefined,
        modeEnum: c.modeEnum ?? undefined,
        meetingUrl: c.meetingUrl ?? undefined,
        startAt: c.startAt ?? undefined,
        endAt: c.endAt ?? undefined,
        status: c.status,
        child: c.child ? { id: c.child.id, name: c.child.name } : undefined,
        family: c.family,
        library: c.library ?? undefined,
        notes: c.notes ?? "", 
        attachments: {
          books: c.books.map((b) => ({
            isbn: b.book.isbn,
            title: b.book.title,
            coverUrl: b.book.coverUrl ?? undefined,
          })),
          microContents: c.microContents.map((m) => ({
            id: m.microContent.id,
            type: m.microContent.type,
            text: m.microContent.text,
            tags: m.microContent.tags,
          })),
          events: c.culturalEvents.map((e) => ({
            id: e.event.id,
            title: e.event.title,
            startDate: e.event.startDate,
          })),
        },
      },
      history: {
        consultations: pastConsultations,
        readings: readings.map((r) => ({
          childId: r.childId,
          childName: r.child?.name,
          bookIsbn: r.bookIsbn,
          bookTitle: r.book?.title,
          bookCoverUrl: r.book?.coverUrl ?? undefined,
          finishedAt: r.finishedAt,
          rating: r.ratings?.[0]
            ? {
                stars: r.ratings[0].stars,
                comment: r.ratings[0].comment ?? undefined,
                ratedAt: r.ratings[0].ratedAt,
              }
            : undefined,
        })),
        events: reservations.map((r) => ({
          id: r.event.id,
          title: r.event.title,
          startDate: r.event.startDate,
        })),
      },
      timeline: timeline.map((e) => ({
        id: e.id,
        type: e.type,
        at: e.at,
        payload: e.payload ?? undefined,
        actor: e.actor
          ? { id: e.actor.id, fullName: e.actor.fullName }
          : undefined,
      })),
    };

    res.json(out);
  }
);

r.patch(
  "/:id/notes",
  withUser as RequestHandler,
  requireRole(ROLES.LIBRARIAN, ROLES.ADMIN) as RequestHandler,
  async (req: Request, res: Response) => {
    const authed = req as Authed;
    const id = asInt(req.params.id);
    const notes = String((req.body as any)?.notes ?? "").trim();
    if (!id) return res.status(400).json({ error: "invalid_id" });

    const out = await prisma.$transaction(async (tx) => {
      const existing = await tx.consultation.findUnique({ where: { id } });
      if (!existing) throw new Error("not_found");

      const updated = await tx.consultation.update({
        where: { id },
        data: { notes },
      });

      await tx.consultationEvent.create({
        data: {
          consultationId: id,
          type: "NOTES_UPDATED",
          actorId: authed.user?.id ?? null,
          payload: { length: notes.length },
        },
      });

      return updated;
    });

    res.json({ ok: true, id: out.id, notes: out.notes });
  }
);

// POST /api/consultations (com/sem slot) — aceita notes
r.post(
  "/:id/attachments",
  withUser as RequestHandler,
  requireRole(ROLES.LIBRARIAN, ROLES.ADMIN) as RequestHandler,
  async (req: Request, res: Response) => {
    const authed = req as Authed;
    const id = asInt(req.params.id);
    if (!id) return res.status(400).json({ error: "invalid_id" });

    const {
      books = [],
      microContents = [],
      events = [],
      files = [],
    } = (req.body || {}) as {
      books?: string[];
      microContents?: number[];
      events?: number[];
      files?: Array<{ name: string; url: string }>;
    };

    const out = await prisma.$transaction(async (tx) => {
      const existing = await tx.consultation.findUnique({ where: { id } });
      if (!existing) throw new Error("not_found");

      // Livros
      for (const isbn of books) {
        try {
          await tx.consultationBook.create({
            data: { consultationId: id, bookIsbn: String(isbn) },
          });
        } catch {}
      }
      // Micro-conteúdos
      for (const mid of microContents) {
        try {
          await tx.consultationMicroContent.create({
            data: { consultationId: id, microContentId: Number(mid) },
          });
        } catch {}
      }
      // Eventos culturais
      for (const eid of events) {
        try {
          await tx.consultationCulturalEvent.create({
            data: { consultationId: id, eventId: Number(eid) },
          });
        } catch {}
      }

      // Registo de evento (inclui ficheiros se vierem)
      await tx.consultationEvent.create({
        data: {
          consultationId: id,
          type: "ATTACHMENTS_ADDED",
          actorId: authed.user?.id ?? null,
          payload: {
            booksCount: books.length,
            microContentsCount: microContents.length,
            eventsCount: events.length,
            files,
          },
        },
      });

      return true;
    });

    res.json({ ok: !!out });
  }
);

// GET /api/consultations/all
r.get(
  "/all",
  withUser as RequestHandler,
  requireFamilyOrLibrarian as RequestHandler,
  async (req: Request, res: Response) => {
    try {
      const limit = clamp(Number(req.query.limit ?? 50), 1, 200);
      const statuses = String(req.query.status || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean) as $Enums.ConsultationStatus[];

      const items = await svcListAllConsultations({
        limit,
        statuses,
        order: req.query.order === "desc" ? "desc" : "asc",
        from: asDate(req.query.from),
        to: asDate(req.query.to),
        librarianId: asInt(req.query.librarianId),
        familyId: asInt(req.query.familyId),
        childId: asInt(req.query.childId),
      });
      res.json(items);
    } catch (e: any) {
      res
        .status(400)
        .json({ error: e?.message ?? "failed to list consultations" });
    }
  }
);

// GET /api/consultations/next
r.get(
  "/next",
  withUser as RequestHandler,
  requireFamilyOrLibrarian as RequestHandler,
  async (req: Request, res: Response) => {
    const limit = clamp(Number(req.query.limit ?? 6), 1, 50);
    const from = asDate(req.query.from) ?? new Date();
    const familyId = asInt(req.query.familyId);
    const librarianId = asInt(req.query.librarianId);
    const childId = asInt(req.query.childId);
    if (!familyId && !librarianId)
      return res
        .status(400)
        .json({ error: "familyId ou librarianId são obrigatórios" });

    try {
      const items = await svcListNext({
        limit,
        from,
        familyId,
        librarianId,
        childId,
      });
      res.json(items);
    } catch (e: any) {
      res
        .status(400)
        .json({ error: e?.message ?? "failed to list next consultations" });
    }
  }
);

// GET /api/consultations/librarians
r.get(
  "/librarians",
  withUser as RequestHandler,
  requireFamilyOrLibrarian as RequestHandler,
  async (req: Request, res: Response) => {
    try {
      const libraryId = asInt(req.query.libraryId);
      res.json(await svcListLibrarians(libraryId));
    } catch (e: any) {
      res
        .status(400)
        .json({ error: e?.message ?? "failed to list librarians" });
    }
  }
);

// GET /api/consultations/slots
r.get("/slots", async (req: Request, res: Response) => {
  const from = asDate(req.query.from);
  const to = asDate(req.query.to);
  if (!from || !to)
    return res.status(400).json({ error: "from e to (ISO) são obrigatórios" });

  try {
    const items = await svcListSlots({
      from,
      to,
      onlyBookable: String(req.query.onlyBookable ?? "true") === "true",
      librarianId: asInt(req.query.librarianId),
      libraryId: asInt(req.query.libraryId),
    });
    res.json(items);
  } catch (e: any) {
    res.status(400).json({ error: e?.message ?? "failed to list slots" });
  }
});

// GET /api/consultations/librarians/with-open-slots
r.get(
  "/librarians/with-open-slots",
  withUser as RequestHandler,
  requireFamilyOrLibrarian as RequestHandler,
  async (req: Request, res: Response) => {
    const from = asDate(req.query.from);
    const to = asDate(req.query.to);
    if (!from || !to)
      return res
        .status(400)
        .json({ error: "from e to (ISO) são obrigatórios" });

    try {
      res.json(
        await svcLibrariansWithOpenSlots(from, to, asInt(req.query.libraryId))
      );
    } catch (e: any) {
      res.status(400).json({
        error: e?.message ?? "failed to list librarians with open slots",
      });
    }
  }
);

// POST /api/consultations/:id/confirm
r.post(
  "/:id/confirm",
  withUser as RequestHandler,
  requireRole(ROLES.LIBRARIAN, ROLES.ADMIN) as RequestHandler,
  async (req: Request, res: Response) => {
    const id = asInt(req.params.id);
    if (!id) return res.status(400).json({ error: "invalid_id" });
    try {
      const result = await svcConfirmConsultation(id, req as Authed);
      if ((result as any)?.error === "conflict")
        return res.status(409).json(result);
      return res.json(result);
    } catch (e: any) {
      const msg = String(e?.message || "");
      if (msg === "forbidden")
        return res.status(403).json({ error: "forbidden" });
      if (msg === "not found")
        return res.status(404).json({ error: "not found" });
      if (/unique|constraint|slotId|startAt.*endAt/i.test(msg))
        return res.status(409).json({ error: "concurrency" });
      return res.status(400).json({ error: "failed to confirm" });
    }
  }
);

// POST /api/consultations/:id/decline
r.post(
  "/:id/decline",
  withUser as RequestHandler,
  requireFamilyOrLibrarian as RequestHandler,
  async (req: Request, res: Response) => {
    const id = asInt(req.params.id);
    if (!id) return res.status(400).json({ error: "invalid_id" });
    try {
      res.json(await svcDeclineConsultation(id));
    } catch (e: any) {
      res.status(400).json({ error: e?.message ?? "failed to decline" });
    }
  }
);

// POST /api/consultations/:id/cancel  → 204
r.post(
  "/:id/cancel",
  withUser as RequestHandler,
  async (req: Request, res: Response) => {
    const id = asInt(req.params.id);
    if (!id) return res.status(400).json({ error: "invalid_id" });
    try {
      await svcCancelConsultation(id, req as Authed, (req.body as any)?.reason);
      res.status(204).end();
    } catch (e: any) {
      if (e?.code && e?.message)
        return res.status(e.code).json({ error: e.message });
      const msg = String(e?.message || "");
      if (/unique|constraint|slotId|startAt.*endAt/i.test(msg))
        return res.status(409).json({ error: "concurrency" });
      res.status(400).json({ error: e?.message ?? "error" });
    }
  }
);

// POST /api/consultations/:id/complete
r.post(
  "/:id/complete",
  withUser as RequestHandler,
  requireFamilyOrLibrarian as RequestHandler,
  async (req: Request, res: Response) => {
    const id = asInt(req.params.id);
    if (!id) return res.status(400).json({ error: "invalid_id" });
    res.json(await svcComplete(id));
  }
);

// GET /api/consultations/:id
r.get(
  "/:id",
  withUser as RequestHandler,
  requireFamilyOrLibrarian as RequestHandler,
  async (req: Request, res: Response) => {
    const id = asInt(req.params.id);
    if (!id) return res.status(400).json({ error: "invalid_id" });
    const out = await svcGetById(id);
    if (!out) return res.status(404).json({ error: "not_found" });
    res.json(out);
  }
);

// ✅ concluir consulta (status -> COMPLETED + event + endAt se vazio)
r.patch(
  "/:id/complete",
  withUser as RequestHandler,
  requireRole(ROLES.LIBRARIAN, ROLES.ADMIN) as RequestHandler,
  async (req: Request, res: Response) => {
    const authed = req as Authed;
    const id = asInt(req.params.id);
    if (!id) return res.status(400).json({ error: "invalid_id" });

    const now = new Date();
    const out = await prisma.$transaction(async (tx) => {
      const existing = await tx.consultation.findUnique({ where: { id } });
      if (!existing) throw new Error("not_found");
      if (existing.status === "CANCELLED" || existing.status === "DECLINED")
        return existing; // nada a fazer

      const updated = await tx.consultation.update({
        where: { id },
        data: {
          status: "COMPLETED",
          endAt: existing.endAt ?? now,
        },
      });

      await tx.consultationEvent.create({
        data: {
          consultationId: id,
          type: "COMPLETED",
          actorId: authed.user?.id ?? null,
          payload: { at: now.toISOString() },
        },
      });

      return updated;
    });

    res.json({ ok: true, id: out.id, status: out.status, endAt: out.endAt });
  }
);

r.get(
  "/:id/summary.pdf",
  withUser as RequestHandler,
  requireRole(ROLES.LIBRARIAN, ROLES.ADMIN) as RequestHandler,
  async (req: Request, res: Response) => {
    const id = asInt(req.params.id);
    if (!id) return res.status(400).send("invalid_id");

    const c = await prisma.consultation.findUnique({
      where: { id },
      include: {
        family: true,
        child: true,
        library: true,
        books: { include: { book: true } },
        microContents: { include: { microContent: true } },
        culturalEvents: { include: { event: true } },
      },
    });
    if (!c) return res.status(404).send("not_found");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=consulta-${id}.pdf`);

    const doc = new PDFDocument({ size: "A4", margin: 48 });
    doc.pipe(res);

    // Cabeçalho
    doc
      .fontSize(18)
      .text(c.title || "Resumo da consulta", { align: "left" })
      .moveDown(0.5);
    doc
      .fontSize(10)
      .fillColor("#666")
      .text(`ID: ${c.id}`)
      .text(`Data: ${c.startAt ? new Date(c.startAt).toLocaleString() : "-"}`)
      .text(`Estado: ${c.status}`)
      .moveDown();
    doc.fillColor("#000");

    // Família/criança
    doc.fontSize(12).text("Família", { underline: true });
    if (c.family)
      doc
        .fontSize(11)
        .text(
          `${c.family.fullName}${
            (c as any).family.email ? " — " + (c as any).family.email : ""
          }`
        );
    if (c.child) doc.text(`Criança: ${c.child.name}`);
    if (c.library) doc.text(`Biblioteca: ${c.library.name}`);
    doc.moveDown();

    // Resumo
    doc.fontSize(12).text("Resumo", { underline: true });
    doc
      .fontSize(11)
      .text(c.purpose || c.description || "(sem descrição)")
      .moveDown();

    // Notas
    doc.fontSize(12).text("Notas", { underline: true });
    doc
      .fontSize(11)
      .text(c.notes || "(sem notas)")
      .moveDown();

    // Anexos
    const bookTitles = c.books
      .map((cb) => cb.book?.title)
      .filter(Boolean) as string[];
    const microTexts = c.microContents
      .map((cm) => cm.microContent?.text)
      .filter(Boolean) as string[];
    const eventTitles = c.culturalEvents
      .map((ce) => ce.event?.title)
      .filter(Boolean) as string[];

    doc.fontSize(12).text("Anexos", { underline: true });
    doc.fontSize(11);
    doc.text(`Livros (${bookTitles.length}): ${bookTitles.join("; ") || "-"}`);
    doc.text(
      `Micro-conteúdos (${microTexts.length}): ${
        microTexts.join(" | ").slice(0, 1000) || "-"
      }`
    );
    doc.text(
      `Eventos (${eventTitles.length}): ${eventTitles.join("; ") || "-"}`
    );

    doc.end();
  }
);

export default r;
