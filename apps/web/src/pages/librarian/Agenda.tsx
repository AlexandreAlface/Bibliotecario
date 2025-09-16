import { Box, Typography } from "@mui/material";
import { WhiteCard } from "@bibliotecario/ui-web";

export default function LibrarianAgenda() {
  return (
    <Box sx={{ py: 3, display: "grid", gap: 2 }}>
      <Typography variant="h5">Agenda do bibliotecário</Typography>

      <WhiteCard>
        <Typography variant="body2">
          (Stub) Aqui vamos mostrar os <b>slots</b> e as <b>consultas confirmadas</b> por dia/semana.
        </Typography>
      </WhiteCard>
    </Box>
  );
}
