import { Container,  Typography } from "@mui/material";
import { WhiteCard } from "@bibliotecario/ui-web";
import Grid from "@mui/material/GridLegacy";


export default function AdminMetrics() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" fontWeight={900} sx={{ mb: 2 }}>
        Métricas & Dashboard
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <WhiteCard>Consultas por semana (gráfico) — em breve</WhiteCard>
        </Grid>
        <Grid item xs={12} md={4}>
          <WhiteCard>Utilização de slots (gráfico) — em breve</WhiteCard>
        </Grid>
        <Grid item xs={12} md={4}>
          <WhiteCard>Nº bibliotecários ativos — em breve</WhiteCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <WhiteCard>Nº famílias atendidas — em breve</WhiteCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <WhiteCard>Top eventos / participação — em breve</WhiteCard>
        </Grid>
      </Grid>
    </Container>
  );
}
