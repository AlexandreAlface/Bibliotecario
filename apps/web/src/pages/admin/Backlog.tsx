import { useEffect, useState } from "react";
import { Box, Container, Divider, Stack, Typography, Chip } from "@mui/material";
import { WhiteCard, RouteLink } from "@bibliotecario/ui-web";

// TODO: substituir por serviço real (p.ex. services/proposals.ts -> listProposals)
type BacklogItem = {
  id: number;
  consultationId: number;
  childName?: string | null;
  familyName?: string | null;
  toStartAt: string;
  toEndAt: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED";
};

export default function AdminBacklog() {
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      // mock—integra com backend quando existir
      const now = new Date();
      const mk = (i: number): BacklogItem => ({
        id: i,
        consultationId: 1000 + i,
        childName: i % 2 ? "Pedro Silva" : "Lara Brissos",
        familyName: "Família Exemplo",
        toStartAt: new Date(now.getTime() + i * 3600_000).toISOString(),
        toEndAt: new Date(now.getTime() + (i * 3600_000) + 45 * 60_000).toISOString(),
        status: "PENDING",
      });
      setItems([1, 2, 3, 4, 5].map(mk));
      setLoading(false);
    })();
  }, []);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" fontWeight={900} sx={{ mb: 2 }}>
        Backlog de propostas
      </Typography>

      <WhiteCard>
        {loading ? (
          <Typography sx={{ opacity: 0.7 }}>A carregar…</Typography>
        ) : items.length === 0 ? (
          <Typography sx={{ opacity: 0.7 }}>Sem propostas pendentes.</Typography>
        ) : (
          <Stack spacing={1.25} divider={<Divider />}>
            {items.map((p) => {
              const a = new Date(p.toStartAt);
              const b = new Date(p.toEndAt);
              return (
                <Box key={p.id} sx={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 1 }}>
                  <Box>
                    <Typography fontWeight={900}>
                      {p.childName ? `Consulta de ${p.childName}` : "Consulta"}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      {p.familyName || "—"}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 0.5 }} useFlexGap flexWrap="wrap">
                      <Chip size="small" label={a.toLocaleDateString("pt-PT")} />
                      <Chip
                        size="small"
                        label={`${a.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })} — ${b.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}`}
                      />
                      <Chip size="small" color="warning" variant="outlined" label="Pendente" />
                    </Stack>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <RouteLink href="/librarian/consultas/pendentes">Abrir gestão</RouteLink>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        )}
      </WhiteCard>
    </Container>
  );
}
