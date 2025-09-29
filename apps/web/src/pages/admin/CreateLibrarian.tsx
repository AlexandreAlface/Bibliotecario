// apps/web/src/pages/admin/CreateLibrarianPage.tsx
import * as React from "react";
import { Box, Typography } from "@mui/material";
import {
  GradientBackgroundWithShapes,
  RouteLink,
  WhiteCard,
} from "@bibliotecario/ui-web";

import SignUpForm from "@/Forms/SignUpForm";
import type { FamilySignupDraft } from "@/interfaces/auth";
import { api } from "@/services/https";
import { useNavigate } from "react-router-dom";
import { getMyLibrary, type LibraryLite } from "@/services/admin";

const CreateLibrarianPage: React.FC = () => {
  const navigate = useNavigate();

  // biblioteca do admin (única)
  const [myLib, setMyLib] = React.useState<LibraryLite | null>(null);
  const [libLoading, setLibLoading] = React.useState(true);
  const [libErr, setLibErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        setLibLoading(true);
        const lib = await getMyLibrary();
        if (!lib) {
          setLibErr("Não estás associado a nenhuma biblioteca.");
          setMyLib(null);
        } else {
          setMyLib(lib);
          setLibErr(null);
        }
      } catch (e: any) {
        setLibErr(e?.message || "Falha a carregar a tua biblioteca.");
        setMyLib(null);
      } finally {
        setLibLoading(false);
      }
    })();
  }, []);

  async function handleSubmit(values: FamilySignupDraft) {
    if (!myLib?.id) {
      throw new Error("Sem biblioteca associada — operação não permitida.");
    }

    // O SignUpForm devolve um draft de “família”; mapeamos para o payload do admin
    const payload = {
      fullName: values.fullName,
      email: values.email,
      phone: values.phone || undefined,
      citizenCard: values.citizenCard || undefined,
      address: values.address || undefined,
      password: values.password,
      // ⚠️ força sempre a biblioteca do admin
      libraryId: myLib.id,
    };

    await api.post("/admin/librarians", payload);
    navigate("/admin/bibliotecarios", { replace: true });
  }

  return (
    <GradientBackgroundWithShapes sx={{ minHeight: "100vh" }}>
      <Box
        py={{ xs: 8, md: 10 }}
        px={{ xs: 2, md: 4 }}
        maxWidth="100%"
        mx="auto"
        display="flex"
        justifyContent="center"
      >
        <WhiteCard sx={{ width: 560, py: 4, px: { xs: 3, md: 5 } }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Criar Bibliotecário
          </Typography>

          {/* Estado da biblioteca do admin */}
          {libLoading ? (
            <Typography sx={{ mb: 2, opacity: 0.75 }}>A carregar…</Typography>
          ) : libErr ? (
            <Typography color="error" sx={{ mb: 2 }}>
              {libErr}
            </Typography>
          ) : (
            <Typography variant="body2" sx={{ mb: 2 }}>
              Biblioteca: <b>{myLib?.name}</b>
            </Typography>
          )}

          {/* Reaproveita o formulário (nome, contactos, password) */}
          {/* Se o teu SignUpForm suportar, podes passar uma prop tipo `hideLibraryField`/`lockedLibrary`
              para esconder o seletor de biblioteca. Aqui, independentemente do que o form enviar,
              o handleSubmit força sempre o libraryId correto. */}
          {!libLoading && !libErr && (
            <SignUpForm onBack={() => history.back()} onSubmit={handleSubmit} />
          )}

          <Typography variant="body2" sx={{ mt: 1, textAlign: "center" }}>
            Voltar à{" "}
            <RouteLink href="/admin/bibliotecarios">
              lista de bibliotecários
            </RouteLink>
          </Typography>
        </WhiteCard>
      </Box>
    </GradientBackgroundWithShapes>
  );
};

export default CreateLibrarianPage;
