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

const CreateLibrarianPage: React.FC = () => {
  const navigate = useNavigate();

  async function handleSubmit(values: FamilySignupDraft) {
    // O SignUpForm devolve um draft “de família”; mapeamos para o payload do admin
    const payload = {
      fullName: values.fullName,
      email: values.email,
      phone: values.phone || undefined,
      citizenCard: values.citizenCard || undefined,
      address: values.address || undefined,
      password: values.password,
      libraryId: values.libraryId, // obrigatório aqui
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

          {/* Reaproveita o formulário (nome, contactos, password, biblioteca) */}
          <SignUpForm
            onBack={() => history.back()}
            onSubmit={handleSubmit}
          />

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
