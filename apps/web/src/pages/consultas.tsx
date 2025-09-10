// apps/web/src/pages/consultas.tsx
import { useEffect, useMemo, useState } from "react";
import {
  WhiteCard,
  RouteLink,
  AvatarSelect,
  PrimaryButton,
} from "@bibliotecario/ui-web";
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
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import TodayRounded from "@mui/icons-material/TodayRounded";
import ChevronLeftRounded from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import CalendarMonthRounded from "@mui/icons-material/CalendarMonthRounded";
import AccessTimeRounded from "@mui/icons-material/AccessTimeRounded";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";

import { useUserSession } from "../contexts/UserSession";
import {
  type ConsultaLite,
  type SlotLite,
  listOpenSlots,
  createConsultationWithSlot,
} from "../services/consultations";

/* ---------- utils ---------- */
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function timeLabel(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
}

/* ---------- cabeçalho de cards ---------- */
function CardHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{ mb: 1.25 }}
    >
      <Typography variant="h6" fontWeight={900}>
        {title}
      </Typography>
      {action}
    </Stack>
  );
}

/* ---------- botão de slot ---------- */
function SlotChip({
  slot,
  selected,
  onSelect,
}: {
  slot: SlotLite;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Chip
      clickable
      variant={selected ? "filled" : "outlined"}
      label={`${timeLabel(slot.startAt)}–${timeLabel(slot.endAt)}`}
      onClick={onSelect}
      sx={{
        mr: 0.75,
        mb: 0.75,
        borderRadius: 2,
      }}
    />
  );
}

/* =================== Página =================== */
export default function ConsultasPage() {
  const {
    user,
    asChild,
    selectedChildId,
    setSelectedChildId,
    actAsChild,
    exitChild,
  } = useUserSession();

  // --- estado
  const [dayRef, setDayRef] = useState(startOfDay(new Date()));
  const [slotsAll, setSlotsAll] = useState<SlotLite[]>([]); // todos os slots do dia
  const [loading, setLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SlotLite | null>(null);
  const [justBooked, setJustBooked] = useState<ConsultaLite | null>(null);

  // filtro por bibliotecário ("" = todos)
  const [selectedLibrarianId, setSelectedLibrarianId] = useState<string>("");

  const childOptions = (user?.children || []).map((c) => ({
    id: String(c.id),
    nome: c.name,
    avatar: (c as any).avatarUrl || undefined,
  }));
  const selectOptions = [{ id: "", nome: "Todos os filhos" }, ...childOptions];

  // carregar slots abertos para o dia selecionado (todas as bibs e todos os bibliotecários)
  useEffect(() => {
    (async () => {
      setLoading(true);
      setSelectedSlot(null);
      setJustBooked(null);
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

  // opções de bibliotecário (deduzidas dos slots do dia)
  const librarianOptions = useMemo(() => {
    const seen = new Set<number>();
    const opts = slotsAll
      .filter((s) => {
        if (seen.has(s.librarianId)) return false;
        seen.add(s.librarianId);
        return true;
      })
      .map((s) => ({
        id: String(s.librarianId),
        nome: s.librarianName || "Bibliotecário",
        avatar: s.librarianAvatarUrl || undefined,
      }));
    return [{ id: "", nome: "Todos os bibliotecários" }, ...opts];
  }, [slotsAll]);

  // aplica o filtro por bibliotecário em memória
  const slots = useMemo(() => {
    if (!selectedLibrarianId) return slotsAll;
    return slotsAll.filter(
      (s) => String(s.librarianId) === String(selectedLibrarianId)
    );
  }, [slotsAll, selectedLibrarianId]);

  type Group = {
    librarianId: number;
    librarianName: string;
    librarianAvatarUrl?: string | null;
    items: SlotLite[];
  };

  // agrupar por bibliotecário (já com slots filtrados)
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
          items: [] as SlotLite[],
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

  // navegação de dias
  const prevDay = () =>
    setDayRef(startOfDay(new Date(dayRef.getTime() - 86400000)));
  const nextDay = () =>
    setDayRef(startOfDay(new Date(dayRef.getTime() + 86400000)));
  const goToday = () => setDayRef(startOfDay(new Date()));

  // ação: reservar
  async function reservar() {
    if (!selectedSlot) return;
    const familyId = Number(user?.id);
    const childIdNum =
      selectedChildId && String(selectedChildId).length
        ? Number(selectedChildId)
        : undefined;

    if (!Number.isFinite(familyId)) {
      alert("Sessão inválida.");
      return;
    }
    if (!childIdNum) {
      alert("Escolhe a criança para quem queres marcar.");
      return;
    }

    try {
      setLoading(true);
      const booked = await createConsultationWithSlot({
        familyId,
        librarianId: selectedSlot.librarianId,
        childId: childIdNum,
        libraryId: selectedSlot.libraryId,
        slotId: selectedSlot.id,
      });
      setJustBooked(booked);
      setSlotsAll((old) => old.filter((s) => s.id !== selectedSlot.id));
      setSelectedSlot(null);
    } catch (e: any) {
      alert(e?.message || "Falha a reservar o slot.");
    } finally {
      setLoading(false);
    }
  }

  const title = "Consultas";

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Título */}
      <Typography
        variant="h3"
        fontWeight={900}
        sx={{ mb: 2, letterSpacing: 0.3 }}
      >
        {title}
      </Typography>

      {/* Aviso se estiver em modo criança */}
      {asChild && (
        <WhiteCard sx={{ mb: 2 }}>
          <Typography sx={{ mb: 1 }}>
            Esta página é para a <b>família</b>. Estás em modo criança.
          </Typography>
          <PrimaryButton onClick={exitChild}>
            Sair do modo criança
          </PrimaryButton>
        </WhiteCard>
      )}

      {/* Seletor de criança (família decide para quem marca) */}
      {!!user?.children?.length && (
        <WhiteCard sx={{ mb: 2 }}>
          <CardHeader title="Escolher criança" />
          <AvatarSelect
            label="Marcar para"
            options={selectOptions}
            value={selectedChildId ?? ""}
            onChange={async (id) => {
              const eff = id && String(id).length ? id : "";
              if (asChild && eff) await actAsChild(eff);
              setSelectedChildId(eff);
            }}
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
              action={
                <Stack direction="row" spacing={1}>
                  <IconButton onClick={prevDay} aria-label="Dia anterior">
                    <ChevronLeftRounded />
                  </IconButton>
                  <IconButton onClick={nextDay} aria-label="Dia seguinte">
                    <ChevronRightRounded />
                  </IconButton>
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
              <Typography sx={{ opacity: 0.7 }}>A carregar…</Typography>
            ) : slots.length === 0 ? (
              <Typography sx={{ opacity: 0.7 }}>
                Sem slots disponíveis neste dia.
              </Typography>
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
            <CardHeader title="Filtrar por bibliotecário" />
            <AvatarSelect
              label="Bibliotecário"
              options={librarianOptions}
              value={selectedLibrarianId}
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
            <CardHeader title="Escolher horário" />
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
              {grouped.length ? (
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
                  {loading ? "A carregar…" : "Sem slots disponíveis neste dia."}
                </Typography>
              )}
            </Box>
          </WhiteCard>
        </Grid>

        {/* Coluna 3 – detalhe e ação */}
        <Grid item xs={12} md={3}>
          <WhiteCard>
            <CardHeader title="Detalhe" />
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
                      { day: "2-digit", month: "2-digit", year: "numeric" }
                    )}
                  />
                  <Chip
                    icon={<AccessTimeRounded fontSize="small" />}
                    label={`${timeLabel(selectedSlot.startAt)} – ${timeLabel(
                      selectedSlot.endAt
                    )}`}
                  />
                </Stack>

                {!!selectedChildId ? (
                  <Typography sx={{ mb: 1 }}>
                    Marcar para:{" "}
                    <b>
                      {
                        childOptions.find(
                          (c) => c.id === String(selectedChildId)
                        )?.nome
                      }
                    </b>
                  </Typography>
                ) : (
                  <Tooltip
                    title={
                      !selectedChildId
                        ? "Escolhe a criança acima para reservar"
                        : ""
                    }
                  >
                    <span>
                      <PrimaryButton
                        onClick={reservar}
                        disabled={loading || !selectedChildId}
                      >
                        Reservar
                      </PrimaryButton>
                    </span>
                  </Tooltip>
                )}

                <PrimaryButton
                  onClick={reservar}
                  disabled={loading || !selectedChildId}
                >
                  Reservar
                </PrimaryButton>

                {!!selectedSlot.libraryName && (
                  <Typography
                    variant="caption"
                    sx={{ display: "block", mt: 1 }}
                  >
                    Biblioteca: {selectedSlot.libraryName}
                  </Typography>
                )}
              </>
            ) : justBooked ? (
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
                  Consulta marcada com <b>{justBooked.librarianName}</b>
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
    </Container>
  );
}
