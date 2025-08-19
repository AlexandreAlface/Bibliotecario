// apps/web/src/pages/index.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BibliotecarioThemeProvider,
  GradientBackground,
  WhiteCard,
  NotificationBell,
  BookCard,
  SectionDivider,
  PrimaryButton,
  RouteLink,
  SidebarMenu,
  AvatarSelect,
} from "@bibliotecario/ui-web";
import { Box, Container, Divider, Stack, Typography } from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { Home, Book, Calendar, Users } from "lucide-react";

import { getProximosEventos } from "../services/events";
import {
  getLeiturasAtuais,
  getSugestoes,
  type BookLite,
} from "../services/books";
import { getNextConsultas } from "../services/consultations";
import {
  type WebUser,
  type WebChild,
  actAsChild,
  clearActingChild,
  getMe,
} from "../services/auth";

type ConsultaLite = { id: number; title: string; date?: string; time?: string };

const SIDEBAR_OPEN = 260;
const SIDEBAR_CLOSED = 64;

export default function LandingPage() {
  const [user, setUser] = useState<WebUser | null>(null);
  const [eventos, setEventos] = useState<
    Array<{
      id: number;
      title: string;
      date?: string;
      time?: string;
      imageUrl?: string | null;
    }>
  >([]);
  const [leituras, setLeituras] = useState<BookLite[]>([]);
  const [sugestoes, setSugestoes] = useState<BookLite[]>([]);
  const [consultas, setConsultas] = useState<ConsultaLite[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const [me, ev, le, su, co] = await Promise.all([
          getMe(),
          getProximosEventos(5),
          getLeiturasAtuais(3),
          getSugestoes(5),
          getNextConsultas(3),
        ]);
        setUser(me);
        setEventos(ev);
        setLeituras(le);
        setSugestoes(su);
        setConsultas(co);
        const active = me.actingChild ?? null;
        const first = active?.id ? active : me.children?.[0];
        setSelectedChildId(first ? String(first.id) : "");
      } catch {}
    })();
  }, []);

  const asChild = !!user?.actingChild;
  const familyName = user?.fullName ?? "Família";

  const menuItems = [
    { label: "Início", icon: <Home />, href: "/" },
    { label: "Sugestões", icon: <Book />, href: "/suggestions" },
    { label: "Conquistas", icon: <Users />, href: "/achievements" },
    { label: "Agenda", icon: <Calendar />, href: "/agenda" },
    { label: "Consultas", icon: <Calendar />, href: "/consultas" },
    { label: "Família", icon: <Users />, href: "/familia" },
    // { label: "Feed",      icon: <Newspaper />, href: "/feed" },
  ];

  const sidebarWidth = useMemo(
    () => (menuOpen ? SIDEBAR_OPEN : SIDEBAR_CLOSED),
    [menuOpen]
  );

  const childOptions = (user?.children || []).map((c) => ({
    id: String(c.id),
    nome: c.name,
    avatar: c.avatarUrl || undefined,
  }));

  async function handleEnterChild() {
    if (!selectedChildId) return;
    const updated = await actAsChild(Number(selectedChildId));
    setUser(updated);
  }
  async function handleExitChild() {
    const updated = await clearActingChild();
    setUser(updated);
    const first = updated.children?.[0];
    setSelectedChildId(first ? String(first.id) : "");
  }

  const headerTitle =
    asChild && user?.actingChild
      ? user.actingChild.name
      : `Família ${familyName}`;
  const headerSubtitle = asChild ? "Modo criança" : "Família";

  console.log("user?.children?.length -> ", user?.children?.length);

  return (
    <BibliotecarioThemeProvider>
      <GradientBackground>
<SidebarMenu
  open={menuOpen}
  onToggle={(open) => setMenuOpen(open)}
  items={menuItems}
  headerTitle={headerTitle}
  headerSubtitle={headerSubtitle}
  headerAvatarUrl={user?.actingChild?.avatarUrl ?? undefined}
>
  {!!user?.children?.length && (
    <Stack spacing={1}>
      <AvatarSelect
        label={user?.actingChild ? "A atuar como" : "Escolher criança"}
        options={(user.children || []).map(c => ({
          id: String(c.id),
          nome: c.name,
          avatar: c.avatarUrl || undefined,
        }))}
        value={
          user?.actingChild
            ? String(user.actingChild.id)
            : (selectedChildId || String(user.children[0]?.id ?? ""))
        }
        onChange={(id) => setSelectedChildId(id)}
        minWidth={200}
      />
      {user?.actingChild ? (
        <PrimaryButton onClick={handleExitChild}>
          Sair do modo criança
        </PrimaryButton>
      ) : (
        <PrimaryButton onClick={handleEnterChild} disabled={!selectedChildId}>
          Entrar como criança
        </PrimaryButton>
      )}
    </Stack>
  )}
</SidebarMenu>

        <Box
          sx={{
            ml: `${sidebarWidth}px`,
            transition: (t) =>
              t.transitions.create("margin-left", {
                duration: t.transitions.duration.shorter,
              }),
          }}
        >
          <Container maxWidth="lg" sx={{ py: 3 }}>
            <Box display="flex" gap={2}>
              <Box flex={1}>
                {/* Header da página (sem SearchBar) */}
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  mb={2}
                >
                  <Box>
                    <Typography variant="h4" fontWeight={700} lineHeight={1.1}>
                      {asChild
                        ? "Bem vindo de volta!"
                        : `Olá, ${user?.fullName?.split(" ")[0] ?? ""}`}
                    </Typography>
                  </Box>
                  <NotificationBell onClick={() => {}} items={[]} />
                </Box>

                {/* Grid legacy */}
                <Grid container spacing={2}>
                  {/* Consultas / Sugestões */}
                  <Grid item xs={12} md={4}>
                    <WhiteCard
                      title={asChild ? "Sugestões" : "Próximas Consultas"}
                    >
                      {asChild ? (
                        <Stack spacing={1}>
                          {sugestoes.map((b) => (
                            <Stack
                              key={b.id}
                              direction="row"
                              spacing={1}
                              alignItems="center"
                            >
                              <BookCard
                                variant="reserve"
                                title={b.title}
                                coverImage={
                                  b.coverUrl || "/placeholder-book.jpg"
                                }
                                rating={5}
                                onReserve={() => {}}
                              />
                              <Link to="/suggestions">
                                <PrimaryButton>Reservar</PrimaryButton>
                              </Link>
                            </Stack>
                          ))}
                        </Stack>
                      ) : (
                        <Stack spacing={1}>
                          {consultas.map((c) => (
                            <Box
                              key={c.id}
                              display="flex"
                              alignItems="center"
                              gap={1}
                            >
                              <Box flex={1}>
                                <Typography fontWeight={600}>
                                  {c.title}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  sx={{ opacity: 0.7 }}
                                >
                                  {c.date} {c.time}
                                </Typography>
                              </Box>
                              <Link to="/consultas">
                                <PrimaryButton>Ver no calendário</PrimaryButton>
                              </Link>
                            </Box>
                          ))}
                        </Stack>
                      )}
                    </WhiteCard>
                  </Grid>

                  {/* Eventos */}
                  <Grid item xs={12} md={4}>
                    <WhiteCard title="Eventos em Destaque">
                      {eventos.length ? (
                        <Box display="grid" gap={1}>
                          <Box
                            sx={{
                              borderRadius: 2,
                              overflow: "hidden",
                              bgcolor: "background.paper",
                              boxShadow: 1,
                            }}
                          >
                            {eventos[0].imageUrl && (
                              <img
                                src={eventos[0].imageUrl}
                                alt=""
                                style={{ width: "100%", display: "block" }}
                              />
                            )}
                            <Box p={2}>
                              <Typography fontWeight={700}>
                                {eventos[0].title}
                              </Typography>
                              <Typography variant="body2" sx={{ opacity: 0.7 }}>
                                {(eventos[0].date ?? "") +
                                  (eventos[0].time
                                    ? `, ${eventos[0].time}`
                                    : "")}
                              </Typography>
                              <Box mt={1}>
                                <Link to="/eventos">
                                  <PrimaryButton>
                                    {asChild ? "Ver Eventos" : "Editar Evento"}
                                  </PrimaryButton>
                                </Link>
                              </Box>
                            </Box>
                          </Box>
                        </Box>
                      ) : (
                        <Typography>Nenhum evento encontrado.</Typography>
                      )}
                    </WhiteCard>
                  </Grid>

                  {/* Leituras */}
                  <Grid item xs={12} md={4}>
                    <WhiteCard title="Leituras">
                      <Stack spacing={1}>
                        {leituras.map((b) => (
                          <Box
                            key={b.id}
                            display="flex"
                            gap={1}
                            alignItems="center"
                          >
                            <img
                              src={b.coverUrl || "/placeholder-book.jpg"}
                              alt=""
                              width={46}
                              height={62}
                              style={{ borderRadius: 8, objectFit: "cover" }}
                            />
                            <Box flex={1}>
                              <Typography fontWeight={600}>
                                {b.title}
                              </Typography>
                              {!asChild && (
                                <Typography
                                  variant="body2"
                                  sx={{ opacity: 0.7 }}
                                >
                                  {b.date || ""}
                                </Typography>
                              )}
                            </Box>
                            <RouteLink
                              href={asChild ? "/suggestions" : "/leituras"}
                            >
                              {asChild ? "Reservar" : "Abrir"}
                            </RouteLink>
                          </Box>
                        ))}
                      </Stack>
                    </WhiteCard>
                  </Grid>

                  {/* Conquistas */}
                  <Grid item xs={12} md={6}>
                    <WhiteCard title="Conquistas Recentes">
                      <ul style={{ margin: 0, padding: "0 0 0 18px" }}>
                        <li>Primeira Leitura</li>
                        <li>3 livros numa semana</li>
                        <li>Streak todos os dias</li>
                      </ul>
                    </WhiteCard>
                  </Grid>

                  {/* Feed */}
                  <Grid item xs={12} md={6}>
                    <WhiteCard title="Feed de Notícias & Dicas">
                      <Typography sx={{ mt: 0 }}>
                        Biblioterapia: “Ler antes de dormir ajuda a acalmar a
                        mente…”
                      </Typography>
                      <RouteLink href="/feed">Ver mais</RouteLink>
                    </WhiteCard>
                  </Grid>
                </Grid>

                <SectionDivider label="" sx={{ my: 4 }} />
              </Box>
            </Box>
          </Container>
        </Box>
      </GradientBackground>
    </BibliotecarioThemeProvider>
  );
}
