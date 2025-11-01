// ========================== apps/web/src/pages/consultas.tsx ==========================
/**
 * Autor: Alexandre Brrissos — Nº 21131
 * Página: Consultas (família marca consultas em slots de bibliotecários)
 *
 * Princípios:
 * - Helpers PUROS (sem side-effects) e com < 30 linhas
 * - Handlers curtos e nomeados
 * - Componentes pequenos/memo sempre que possível
 * - Tipagem explícita nas estruturas passadas entre UI e serviços
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  WhiteCard,
  RouteLink,
  AvatarSelect,
  PrimaryButton,
} from "@bibliotecario/ui-web";
import type { AvatarOption } from "@bibliotecario/ui-web";
import {
  Avatar,
  Box,
  Chip,
  Container,
  Divider,
  IconButton,
  Stack,
  Typography,
  Tooltip,
  Skeleton,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import TodayRounded from "@mui/icons-material/TodayRounded";
import ChevronLeftRounded from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import CalendarMonthRounded from "@mui/icons-material/CalendarMonthRounded";
import AccessTimeRounded from "@mui/icons-material/AccessTimeRounded";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import FilterListRounded from "@mui/icons-material/FilterListRounded";
import EventBusyRounded from "@mui/icons-material/EventBusyRounded";
import PersonRounded from "@mui/icons-material/PersonRounded";
import EditNoteRounded from "@mui/icons-material/EditNoteRounded";
import PlaceRounded from "@mui/icons-material/PlaceRounded";

import { useUserSession } from "@/contexts/UserSession";
import {
  type ConsultaLite,
  type SlotLite,
  listOpenSlots,
} from "@/services/consultations";

// 👇 novo wizard
import ConsultationWizard from "@/components/consultations/ConsultationWizard";

/* =====================================================================================
   HELPERS (PUROS / <30 linhas)
   ===================================================================================== */

/** PURE: devolve o início do dia (00:00:00.000) para uma data */
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** PURE: devolve o fim do dia (23:59:59.999) para uma data */
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/** PURE: formata hora/min "HH:MM" a partir de ISO */
function timeLabel(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
}

/* =====================================================================================
   CABEÇALHO DE CARTÕES (UI PEQUENA)
   ===================================================================================== */

/** Cabeçalho reutilizável para cartões */
const CardHeader = memo(function CardHeader({
  title,
  action,
  icon,
}: {
  title: string;
  action?: React.ReactNode;
  icon?: React.ReactElement;
}) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{ mb: 1.25 }}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        {icon}
        <Typography variant="h6" fontWeight={900} component="h2">
          {title}
        </Typography>
      </Stack>
      {action}
    </Stack>
  );
});

/* =====================================================================================
   CHIP DE SLOT (UI PEQUENA)
   ===================================================================================== */

/** Chip de seleção de um slot (horário) */
const SlotChip = memo(function SlotChip({
  slot,
  selected,
  onSelect,
}: {
  slot: SlotLite;
  selected: boolean;
  onSelect: () => void;
}) {
  const label = `${timeLabel(slot.startAt)}–${timeLabel(slot.endAt)}`;
  return (
    <Chip
      clickable
      variant={selected ? "filled" : "outlined"}
      label={label}
      onClick={onSelect}
      icon={<AccessTimeRounded fontSize="small" />}
      aria-label={`Selecionar horário ${label}`}
      sx={{ mr: 0.75, mb: 0.75, borderRadius: 2 }}
    />
  );
});

/* =====================================================================================
   PÁGINA
   ===================================================================================== */

export default function ConsultasPage() {
  const { user, asChild, clearChild } = useUserSession();

  // 🎯 Filtro LOCAL por criança (modo família) — NÃO mexe no contexto global.
  const [localChildId, setLocalChildId] = useState<string>("");

  // Estado principal
  const [dayRef, setDayRef] = useState(startOfDay(new Date()));
  const [slotsAll, setSlotsAll] = useState<SlotLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SlotLite | null>(null);

  // ✅ Novo: abrir/fechar wizard + info de sucesso
  const [wizardOpen, setWizardOpen] = useState(false);
  const [bookedWithName, setBookedWithName] = useState<string | null>(null);

  // Filtro por bibliotecário
  const [selectedLibrarianId, setSelectedLibrarianId] = useState<string>("");

  // Opções de filhos para o AvatarSelect
  const childOptions: AvatarOption[] = (user?.children || []).map((c) => ({
    id: String(c.id),
    nome: c.name ?? "",
    avatar: (c as any).avatarUrl ?? undefined,
  }));
  const selectOptions: AvatarOption[] = [
    {
      id: "",
      nome: "Todos os filhos (consulta da família)",
      avatar: undefined,
    },
    ...childOptions,
  ];

  /* ------------------------- Carregamento de slots ------------------------- */

  /**
   * Efeito: carrega slots abertos para o dia selecionado, aplicando (opcionalmente)
   * filtro por bibliotecário. Mantém loading e limpa seleção ao mudar dependências.
   */
  useEffect(() => {
    (async () => {
      setLoading(true);
      setSelectedSlot(null);
      setBookedWithName(null);
      try {
        const from = startOfDay(dayRef).toISOString();
        const to = endOfDay(dayRef).toISOString();
        const list = await listOpenSlots({
          from,
          to,
          librarianId: selectedLibrarianId
            ? Number(selectedLibrarianId)
            : undefined,
        });
        setSlotsAll(list);
      } finally {
        setLoading(false);
      }
    })();
  }, [dayRef, selectedLibrarianId]);

  /* ------------------------- Opções por bibliotecário ------------------------- */

  /** Memo: cria opções únicas de bibliotecário a partir dos slots carregados */
  const librarianOptions: AvatarOption[] = useMemo(() => {
    const seen = new Set<number>();
    const opts: AvatarOption[] = [];
    for (const s of slotsAll) {
      if (seen.has(s.librarianId)) continue;
      seen.add(s.librarianId);
      opts.push({
        id: String(s.librarianId),
        nome: s.librarianName || "Bibliotecário",
        avatar: s.librarianAvatarUrl || undefined,
      });
    }
    return [
      { id: "", nome: "Todos os bibliotecários", avatar: undefined },
      ...opts,
    ];
  }, [slotsAll]);

  /* ------------------------- Filtro aplicado ------------------------- */

  /** Memo: lista final de slots com filtro por bibliotecário aplicado */
  const slots = useMemo(() => {
    if (!selectedLibrarianId) return slotsAll;
    return slotsAll.filter(
      (s) => String(s.librarianId) === String(selectedLibrarianId)
    );
  }, [slotsAll, selectedLibrarianId]);

  /* ------------------------- Agrupar por bibliotecário ------------------------- */

  type Group = {
    librarianId: number;
    librarianName: string;
    librarianAvatarUrl?: string | null;
    items: SlotLite[];
  };

  /** Memo: agrupa slots por bibliotecário e ordena por nome e hora */
  const grouped = useMemo<Group[]>(() => {
    const map = new Map<number, Group>();

    for (const s of slots) {
      const k = s.librarianId;
      let g = map.get(k);
      if (!g) {
        g = {
          librarianId: k,
          librarianName: s.librarianName || "Bibliotecário",
          librarianAvatarUrl: s.librarianAvatarUrl ?? null,
          items: [],
        };
        map.set(k, g);
      }
      g.items.push(s);
    }

    const out = Array.from(map.values()).map((g) => ({
      ...g,
      items: g.items
        .slice()
        .sort(
          (a, b) =>
            new Date(a.startAt || 0).getTime() -
            new Date(b.startAt || 0).getTime()
        ),
    }));

    out.sort((a, b) => a.librarianName.localeCompare(b.librarianName));
    return out;
  }, [slots]);

  /* ------------------------- Navegação por dia ------------------------- */

  /** Handler: vai para o dia anterior */
  const prevDay = useCallback(
    () => setDayRef(startOfDay(new Date(dayRef.getTime() - 86400000 /* 1d */))),
    [dayRef]
  );
  /** Handler: vai para o dia seguinte */
  const nextDay = useCallback(
    () => setDayRef(startOfDay(new Date(dayRef.getTime() + 86400000 /* 1d */))),
    [dayRef]
  );
  /** Handler: vai para hoje */
  const goToday = useCallback(() => setDayRef(startOfDay(new Date())), []);

  /* ------------------------- Dados auxiliares p/ Wizard ------------------------- */

  // bibliotecas disponíveis a partir dos slots carregados
  const libraryOptions = useMemo(() => {
    const seen = new Set<number>();
    const arr: Array<{ id: number; name: string }> = [];
    for (const s of slotsAll) {
      if (!s.libraryId || seen.has(s.libraryId)) continue;
      seen.add(s.libraryId);
      arr.push({ id: s.libraryId, name: s.libraryName || "Biblioteca" });
    }
    return arr;
  }, [slotsAll]);

  // abre o wizard (requer slot selecionado)
  const openWizard = useCallback(() => {
    if (!selectedSlot) return;
    // Se quiseres forçar seleção de criança antes de abrir:
    // if (!localChildId) { alert("Escolhe a criança para quem queres marcar."); return; }
    setWizardOpen(true);
  }, [selectedSlot]);

  // quando a consulta for criada pelo wizard
  const onWizardCreated = useCallback(
    (newId: number) => {
      if (selectedSlot) {
        // remove slot usado da lista
        setSlotsAll((old) => old.filter((s) => s.id !== selectedSlot.id));
        setBookedWithName(selectedSlot.librarianName || "bibliotecário");
        setSelectedSlot(null);
      }
    },
    [selectedSlot]
  );

  const title = "Consultas";

  /* =================================================================================
     RENDER
     ================================================================================= */

  return (
    <Container maxWidth={false} sx={{ py: 4, px: { xs: 2, md: 4 } }}>
      {/* Título */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: 0.3 }}>
          {title}
        </Typography>
        <CalendarMonthRounded />
      </Stack>

      {/* Aviso se estiver em modo criança */}
      {asChild && (
        <WhiteCard sx={{ mb: 2 }}>
          <Typography sx={{ mb: 1 }}>
            Esta página é para a <b>família</b>. Estás em modo criança.
          </Typography>
          <PrimaryButton onClick={clearChild}>
            Sair do modo criança
          </PrimaryButton>
        </WhiteCard>
      )}

      {/* Seletor de criança (família decide para quem marca) — filtro LOCAL */}
      {!asChild && !!user?.children?.length && (
        <WhiteCard sx={{ mb: 2 }}>
          <CardHeader title="Escolher criança" icon={<PersonRounded />} />
          <AvatarSelect
            label="Marcar para"
            options={selectOptions}
            value={localChildId ?? ""} // "" = nenhum / todos
            onChange={(id?: string) => setLocalChildId(id ?? "")}
            minWidth={320}
          />
        </WhiteCard>
      )}

      <Grid container spacing={2}>
        {/* Coluna 1 – escolher dia */}
        <Grid item xs={12} md={3}>
          <WhiteCard>
            <CardHeader
              title={new Date(dayRef).toLocaleDateString("pt-PT", {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
              icon={<TodayRounded />}
              action={
                <Stack direction="row" spacing={1}>
                  <Tooltip title="Dia anterior">
                    <span>
                      <IconButton onClick={prevDay} aria-label="Dia anterior">
                        <ChevronLeftRounded />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Dia seguinte">
                    <span>
                      <IconButton onClick={nextDay} aria-label="Dia seguinte">
                        <ChevronRightRounded />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Hoje">
                    <span>
                      <IconButton onClick={goToday} aria-label="Hoje">
                        <TodayRounded />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              }
            />
            <Typography variant="body2" sx={{ opacity: 0.7, mb: 1 }}>
              Mostrando slots disponíveis para o dia selecionado.
            </Typography>

            <Divider sx={{ my: 1 }} />

            {loading ? (
              <Stack spacing={1}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} variant="rounded" height={32} />
                ))}
              </Stack>
            ) : slots.length === 0 ? (
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ opacity: 0.8 }}
              >
                <EventBusyRounded />
                <Typography>Sem slots disponíveis neste dia.</Typography>
              </Stack>
            ) : (
              <Typography sx={{ opacity: 0.7 }}>
                {slots.length} slot(s) disponível(eis).
              </Typography>
            )}
          </WhiteCard>
        </Grid>

        {/* Coluna 2 – filtros + lista de slots por bibliotecário */}
        <Grid item xs={12} md={6}>
          {/* Filtro por bibliotecário */}
          <WhiteCard sx={{ mb: 2 }}>
            <CardHeader
              title="Filtrar por bibliotecário"
              icon={<FilterListRounded />}
            />
            <AvatarSelect
              label="Bibliotecário"
              options={librarianOptions}
              value={selectedLibrarianId || undefined}
              onChange={(id) => {
                setSelectedLibrarianId(id ?? "");
                setSelectedSlot(null);
              }}
              minWidth={320}
            />
          </WhiteCard>

          <WhiteCard
            sx={{ minHeight: 380, display: "flex", flexDirection: "column" }}
          >
            <CardHeader title="Escolher horário" icon={<AccessTimeRounded />} />
            <Box
              sx={{
                flex: 1,
                overflowY: "auto",
                pr: 1,
                "&::-webkit-scrollbar": { width: 6 },
                "&::-webkit-scrollbar-thumb": {
                  backgroundColor: "rgba(0,0,0,.15)",
                  borderRadius: 8,
                },
              }}
            >
              {loading ? (
                <Stack spacing={1.25}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} variant="rounded" height={88} />
                  ))}
                </Stack>
              ) : grouped.length ? (
                <Stack spacing={1.5}>
                  {grouped.map((g) => (
                    <Box
                      key={g.librarianId}
                      sx={{
                        p: 1.25,
                        borderRadius: 2,
                        border: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        sx={{ mb: 1 }}
                      >
                        <Avatar
                          src={g.librarianAvatarUrl || undefined}
                          sx={{ width: 32, height: 32 }}
                        />
                        <Typography fontWeight={900}>
                          {g.librarianName}
                        </Typography>
                      </Stack>

                      <Box>
                        {g.items.map((s) => (
                          <SlotChip
                            key={s.id}
                            slot={s}
                            selected={selectedSlot?.id === s.id}
                            onSelect={() => setSelectedSlot(s)}
                          />
                        ))}
                      </Box>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Typography sx={{ opacity: 0.7 }}>
                  Sem slots disponíveis neste dia.
                </Typography>
              )}
            </Box>
          </WhiteCard>
        </Grid>

        {/* Coluna 3 – detalhe e ação */}
        <Grid item xs={12} md={3}>
          <WhiteCard>
            <CardHeader title="Detalhe" icon={<EditNoteRounded />} />
            {selectedSlot ? (
              <>
                <Typography variant="h6" fontWeight={900} sx={{ mb: 1 }}>
                  {selectedSlot.librarianName}
                </Typography>

                <Stack direction="row" spacing={1} sx={{ mb: 1.25 }}>
                  <Chip
                    icon={<CalendarMonthRounded fontSize="small" />}
                    label={new Date(selectedSlot.startAt).toLocaleDateString(
                      "pt-PT",
                      {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      }
                    )}
                  />
                  <Chip
                    icon={<AccessTimeRounded fontSize="small" />}
                    label={`${timeLabel(selectedSlot.startAt)} – ${timeLabel(
                      selectedSlot.endAt
                    )}`}
                  />
                </Stack>

                {!!selectedSlot.libraryName && (
                  <Chip
                    sx={{ mb: 1 }}
                    icon={<PlaceRounded fontSize="small" />}
                    label={`Biblioteca: ${selectedSlot.libraryName}`}
                  />
                )}

                {/* Ação: abrir wizard */}
                <Stack sx={{ mt: 1 }}>
                  <PrimaryButton
                    onClick={openWizard}
                    aria-label="Continuar para detalhes"
                  >
                    Continuar
                  </PrimaryButton>
                  {/* dica: selecionar criança antes (opcional) */}
                  {!localChildId && (
                    <Typography
                      variant="caption"
                      sx={{ mt: 0.5, opacity: 0.75 }}
                    >
                      (Opcional) escolhe a criança acima antes de continuar.
                    </Typography>
                  )}
                </Stack>
              </>
            ) : bookedWithName ? (
              <>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ mb: 1 }}
                >
                  <CheckCircleRounded color="success" />
                  <Typography fontWeight={900}>Reserva efetuada!</Typography>
                </Stack>
                <Typography sx={{ mb: 1 }}>
                  Consulta marcada com <b>{bookedWithName}</b>
                </Typography>
                <RouteLink href="/agenda">Ver na Agenda</RouteLink>
              </>
            ) : (
              <Typography sx={{ opacity: 0.7 }}>
                Seleciona um horário.
              </Typography>
            )}
          </WhiteCard>
        </Grid>
      </Grid>

      {/* ===== Wizard ===== */}
      {wizardOpen && selectedSlot && (
        <ConsultationWizard
          open
          onClose={() => setWizardOpen(false)}
          defaultFamilyId={Number(user?.id)}
          defaultLibrarianId={selectedSlot.librarianId}
          defaultSlotId={selectedSlot.id}
          libraries={libraryOptions}
          defaultChildId={
            localChildId && localChildId !== ""
              ? Number(localChildId)
              : undefined
          }
          onCreated={(id) => {
            setWizardOpen(false);
            onWizardCreated(id);
          }}
        />
      )}
    </Container>
  );
}
