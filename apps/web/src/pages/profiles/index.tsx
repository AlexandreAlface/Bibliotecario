import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardActionArea,
  Avatar,
  Typography,
  Button,
} from "@mui/material";
import { useUserSession } from "@/contexts/UserSession";
import { GradientBackground } from "@bibliotecario/ui-web";

export default function ProfilesPage() {
  const { user, actAsChild, clearChild, isAdmin, isLibrarian } = useUserSession();
  const navigate = useNavigate();

  const isStaff = isAdmin || isLibrarian;
  const children = user?.children ?? [];

  async function pickFamilyMode() {
    await clearChild();         // << sem sessionStorage
    navigate("/", { replace: true });
  }

  async function pickChild(childId: number) {
    await actAsChild(childId);  // << sem sessionStorage
    navigate("/", { replace: true });
  }

  return (
    <GradientBackground>
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: 3,
          py: 6,
        }}
      >
        <Box sx={{ width: "100%", maxWidth: 1200 }}>
          <Typography
            variant="h4"
            align="center"
            sx={{ fontWeight: 800, mb: 4 }}
          >
            Quem está a ver?
          </Typography>

          <Box
            sx={{
              display: "grid",
              gap: 3,
              gridTemplateColumns: {
                xs: "repeat(2, minmax(0, 1fr))",
                sm: "repeat(3, minmax(0, 1fr))",
                md: "repeat(4, minmax(0, 1fr))",
                lg: "repeat(5, minmax(0, 1fr))",
              },
              justifyItems: "center",
              alignItems: "stretch",
            }}
          >
            {/* Cartão “Família” */}
            <Card elevation={3} sx={{ borderRadius: 3, width: 220 }}>
              <CardActionArea
                onClick={pickFamilyMode}
                sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2 }}
              >
                <Avatar
                  sx={{ width: 96, height: 96, fontSize: 36 }}
                  alt="Família"
                >
                  F
                </Avatar>
                <Typography align="center" fontWeight={700}>
                  Família
                </Typography>
              </CardActionArea>
            </Card>

            {/* Perfis das crianças */}
            {children.map((c) => (
              <Card
                key={c.id}
                elevation={3}
                sx={{ borderRadius: 3, width: 220 }}
              >
                <CardActionArea
                  onClick={() => pickChild(Number(c.id))}
                  sx={{
                    p: 3,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  <Avatar
                    src={c.avatarUrl ?? undefined}
                    sx={{ width: 96, height: 96, fontSize: 36 }}
                  >
                    {(c.name || "?").slice(0, 1).toUpperCase()}
                  </Avatar>
                  <Typography align="center" fontWeight={700}>
                    {c.name || "Criança"}
                  </Typography>
                </CardActionArea>
              </Card>
            ))}
          </Box>

          {/* Sem crianças? Mostrar CTA para criar (apenas não-staff) */}
          {children.length === 0 && !isStaff && (
            <Box sx={{ mt: 4, textAlign: "center" }}>
              <Typography sx={{ opacity: 0.75, mb: 2 }}>
                Ainda não tens perfis de criança.
              </Typography>
              <Button variant="contained" onClick={() => navigate("/familia")}>
                Criar perfil de criança
              </Button>
            </Box>
          )}
        </Box>
      </Box>
    </GradientBackground>
  );
}
