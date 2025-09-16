import { Box, Typography } from "@mui/material";
import { WhiteCard, RouteLink } from "@bibliotecario/ui-web";
import { useUserSession } from "@/contexts/UserSession";

export default function LibrarianHome() {
  const { user } = useUserSession();

  return (
    <Box sx={{ py: 3, display: "grid", gap: 2 }}>
      <Typography variant="h5" sx={{ mb: 1 }}>
        Olá{user?.fullName ? `, ${user.fullName}` : ""} 👋
      </Typography>

      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 2 }}>
        <WhiteCard>
          <Typography variant="subtitle1" sx={{ mb: 0.5 }}>Consultas pendentes</Typography>
          <Typography variant="body2" sx={{ opacity: 0.7, mb: 1 }}>
            Veja e aceite/recuse propostas de consulta.
          </Typography>
          <RouteLink href="/librarian/consultas/pendentes">Abrir</RouteLink>
        </WhiteCard>

        <WhiteCard>
          <Typography variant="subtitle1" sx={{ mb: 0.5 }}>Agenda</Typography>
          <Typography variant="body2" sx={{ opacity: 0.7, mb: 1 }}>
            Consulte slots e consultas confirmadas.
          </Typography>
          <RouteLink href="/librarian/agenda">Abrir</RouteLink>
        </WhiteCard>

        <WhiteCard>
          <Typography variant="subtitle1" sx={{ mb: 0.5 }}>Famílias</Typography>
          <Typography variant="body2" sx={{ opacity: 0.7, mb: 1 }}>
            Gestão básica de famílias e filhos (breve).
          </Typography>
          <RouteLink href="/librarian/familias">Abrir</RouteLink>
        </WhiteCard>
      </Box>
    </Box>
  );
}
