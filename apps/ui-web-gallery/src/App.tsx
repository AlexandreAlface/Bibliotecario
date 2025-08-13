import { useState } from "react";
import {
  AgendaFeed,
  AgendaLargeCard,
  AvatarListItem,
  AvatarSelect,
  AvatarUpload,
  BaseTextField,
  BibliotecarioThemeProvider,
  BookCard,
  EmailField,
  FilterBar,
  GradientBackground,
  HowItWorksSection,
  InfoStepCard,
  Logo,
  NotificationBell,
  NumericField,
  PasswordField,
  PrimaryButton,
  QuizProgressBar,
  RouteLink,
  SecondaryButton,
  SectionDivider,
  SelectableOptions,
  SidebarMenu,
  SimpleDataTable,
  WhiteCard,
} from "@bibliotecario/ui-web";

export default function App() {
  const [clicks, setClicks] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [idade, setIdade] = useState<number | "">("");
  const [avatarId, setAvatarId] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  const [selectValores, setSelectValores] = useState<(string | number)[]>(["aventura"]);
  const [radioValor, setRadioValor] = useState<string | number>("m");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [notifs, setNotifs] = useState([
    { id: "1", titulo: "Consulta confirmada", mensagem: "Quinta, 18:00", lida: false },
    { id: "2", titulo: "Novo evento", mensagem: "Hora do Conto - Sábado", lida: false },
  ]);

  const filtros = [
    {
      id: "idade",
      label: "Idade",
      options: [
        { label: "3-5", value: "3-5" },
        { label: "6-8", value: "6-8" },
        { label: "9-12", value: "9-12" },
      ],
    },
    {
      id: "tema",
      label: "Tema",
      options: [
        { label: "Aventura", value: "aventura" },
        { label: "Fantasia", value: "fantasia" },
        { label: "Mistério", value: "misterio" },
      ],
    },
  ];
  const [selecionados, setSelecionados] = useState<Record<string, string[]>>({
    idade: [],
    tema: ["aventura"],
  });

  const colunas = [
    { label: "Título", field: "titulo" as const },
    { label: "Autor", field: "autor" as const },
    { label: "Avaliação", render: (row: any) => `${row.rating}★` },
  ];
  const linhas = [
    { titulo: "O Principezinho", autor: "Antoine de Saint-Exupéry", rating: 5 },
    { titulo: "A Fada Oriana", autor: "Sophia de Mello Breyner", rating: 4 },
  ];

  const passos = [
    { step: 1, title: "Perfil", description: "Define a idade e interesses da criança." },
    { step: 2, title: "Sugestões", description: "Recebe livros do PNL à medida." },
    { step: 3, title: "Ler & Avaliar", description: "Ganha selos e pontos ao ler." },
  ];

  const agendaItem = {
    title: "Hora do Conto",
    link: "#",
    description: "Sessão para famílias com crianças 4–7.",
    pubDate: new Date().toISOString(),
    categories: ["famílias", "hora do conto"],
    thumbnailUrl: undefined,
  };

  return (
    <BibliotecarioThemeProvider>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <Logo width={160} />
        </div>
        <h1 style={{ textAlign: "center", margin: "8px 0 24px" }}>
          UI Gallery — @bibliotecario/ui-web
        </h1>

        <GradientBackground style={{ borderRadius: 16, padding: 24 }}>
          <div style={{ display: "grid", gap: 24 }}>

            {/* Botões, link e notificações */}
            <WhiteCard width="100%">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  justifyContent: "center",
                  flexWrap: "wrap",
                  padding: 12,
                }}
              >
                <PrimaryButton onClick={() => setClicks((c) => c + 1)}>Primário (+1)</PrimaryButton>
                <SecondaryButton onClick={() => setClicks(0)}>Reset</SecondaryButton>
                <span style={{ fontWeight: 600 }}>Cliques: {clicks}</span>
                <RouteLink href="#exemplo">Um link de rota</RouteLink>
                <NotificationBell
                  items={notifs}
                  onSelect={(item) => console.log("selecionado", item)}
                  onRemove={(id) => setNotifs((ns) => ns.filter((n) => n.id !== id))}
                  onClearAll={() => setNotifs([])}
                />
              </div>
            </WhiteCard>

            {/* Inputs / Fields */}
            <WhiteCard width="100%">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
                  gap: 16,
                  placeItems: "center",
                }}
              >
                <EmailField
                  label="Email"
                  placeholder="familia@exemplo.pt"
                  value={email}
                  onChange={(e: any) => setEmail(e.target.value)}
                />
                <PasswordField
                  label="Palavra-passe"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e: any) => setPassword(e.target.value)}
                />
                <NumericField
                  label="Idade"
                  placeholder="7"
                  value={idade as any}
                  onChange={(e: any) => {
                    const v = e.target.value;
                    setIdade(v === "" ? "" : Number(v));
                  }}
                />
                <BaseTextField label="Texto livre" placeholder="Escreve algo..." />
              </div>
            </WhiteCard>

            {/* Avatares e seleção de criança */}
            <WhiteCard width="100%">
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  flexWrap: "wrap",
                  padding: 12,
                }}
              >
                <AvatarUpload value={avatarUrl} onChange={(_, url) => setAvatarUrl(url || undefined)} />
                <AvatarSelect
                  label="Selecionar criança"
                  options={[
                    { id: "1", nome: "Camila", avatar: undefined },
                    { id: "2", nome: "João", avatar: undefined },
                  ]}
                  value={avatarId}
                  onChange={setAvatarId}
                  minWidth={220}
                />
                {/* ⚠️ label apenas com elementos inline para evitar <div> dentro de <p> */}
                <AvatarListItem
                  label={
                    <span>
                      <strong>Camila</strong>
                      <br />
                      <small style={{ opacity: 0.8 }}>7 anos</small>
                    </span>
                  }
                  actions={[
                    { icon: <span>✏️</span>, tooltip: "Editar" },
                    { icon: <span>🗑️</span>, tooltip: "Apagar" },
                  ]}
                />
              </div>
            </WhiteCard>

            {/* Filtros, opções e chips */}
            <WhiteCard width="100%">
              <div style={{ padding: 12, display: "grid", gap: 16 }}>
                <SectionDivider label="Filtros" width="100%" />
                <FilterBar
                  filters={filtros}
                  selected={selecionados}
                  onChange={(id, values) => setSelecionados((prev) => ({ ...prev, [id]: values }))}
                />
                <SelectableOptions
                  label="Temas (checkbox)"
                  variant="checkbox"
                  options={[
                    { label: "Aventura", value: "aventura" },
                    { label: "Fantasia", value: "fantasia" },
                    { label: "Mistério", value: "misterio" },
                  ]}
                  value={selectValores}
                  onChange={(v) => setSelectValores(Array.isArray(v) ? v : [v])}
                />
                <SelectableOptions
                  label="Género (radio)"
                  variant="radio"
                  options={[
                    { label: "Masculino", value: "m" },
                    { label: "Feminino", value: "f" },
                  ]}
                  value={radioValor}
                  onChange={(v) => setRadioValor(v as any)}
                  row
                />
              </div>
            </WhiteCard>

            {/* Cartões de livro */}
            <WhiteCard width="100%">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
                  gap: 16,
                }}
              >
                <BookCard
                  variant="view"
                  title="O Principezinho"
                  coverImage="https://covers.openlibrary.org/b/id/9251996-L.jpg"
                  rating={5}
                  comment="Clássico intemporal"
                />
                <BookCard
                  variant="reserve"
                  title="A Fada Oriana"
                  coverImage="https://covers.openlibrary.org/b/id/11153227-L.jpg"
                  onReserve={() => alert("Reservado!")}
                />
                <BookCard
                  variant="edit"
                  title="O Cuquedo"
                  coverImage="https://covers.openlibrary.org/b/id/9251996-L.jpg"
                  rating={4}
                  comment="Muito divertido"
                  onSave={(r, c) => alert(`Guardado: rating=${r}, comentário=${c}`)}
                />
              </div>
            </WhiteCard>

            {/* Passos / barra de progresso */}
            <WhiteCard width="100%">
              <div style={{ display: "grid", gap: 12, placeItems: "center" }}>
                <QuizProgressBar passo={2} total={5} mostrarTexto />
                <HowItWorksSection orientation="horizontal" steps={passos} />
                <InfoStepCard step={1} title="Criar Perfil" description="Adiciona as crianças e preferências." />
              </div>
            </WhiteCard>

            {/* Tabela simples */}
            <WhiteCard width="100%">
              <div style={{ display: "grid", gap: 12 }}>
                <SimpleDataTable columns={colunas as any} rows={linhas} />
              </div>
            </WhiteCard>

            {/* Agenda (cartão grande + feed via proxy) */}
            <WhiteCard width="100%">
              <div style={{ display: "grid", gap: 16, placeItems: "center" }}>
                <AgendaLargeCard {...agendaItem} width="100%" imageRatio="16/9" truncateLength={120} />
                <AgendaFeed feedUrl="/rss/eventos" />
              </div>
            </WhiteCard>

            {/* Sidebar menu */}
            <WhiteCard width="100%">
              <div style={{ display: "grid", gap: 12, placeItems: "center" }}>
                <SidebarMenu
                  items={[
                    { label: "Início", icon: <span>🏠</span>, selected: true },
                    { label: "Sugestões", icon: <span>📚</span> },
                    { label: "Agenda", icon: <span>🗓️</span> },
                  ]}
                  footerItems={[
                    {
                      label: sidebarOpen ? "Fechar" : "Abrir",
                      icon: <span>🧭</span>,
                      onClick: () => setSidebarOpen((o) => !o),
                    },
                  ]}
                  open={sidebarOpen}
                  onToggle={setSidebarOpen}
                />
              </div>
            </WhiteCard>

          </div>
        </GradientBackground>
      </div>
    </BibliotecarioThemeProvider>
  );
}
