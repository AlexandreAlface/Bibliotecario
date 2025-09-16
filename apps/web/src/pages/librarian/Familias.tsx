import { Box, Typography } from "@mui/material";
import { WhiteCard } from "@bibliotecario/ui-web";

export default function LibrarianFamilias() {
  return (
    <Box sx={{ py: 3, display: "grid", gap: 2 }}>
      <Typography variant="h5">Famílias</Typography>

      <WhiteCard>
        <Typography variant="body2">
          (Stub) Gestão de famílias e respetivos filhos — listagem, pesquisa e detalhe (breve).
        </Typography>
      </WhiteCard>
    </Box>
  );
}
