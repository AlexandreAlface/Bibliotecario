/**
 * =============================================================================
 *  Página · Criar Conta (Família)
 * -----------------------------------------------------------------------------
 *  Ficheiro: apps/web/src/pages/auth/CreateAccountPage.tsx (ou equivalente)
 *  Autor:    Alexandre Brissos — Nº 21131
 *
 *  Reforços pedidos:
 *   • Comentários claros (pt-PT) por todo o código.
 *   • Identificar funções **puras** (determinísticas, sem efeitos colaterais).
 *   • Métodos curtos (≲ 30 linhas) e focados.
 *   • Manter o comportamento original (guardar draft e redirecionar).
 * =============================================================================
 */

import React, { useCallback } from "react";
import { Box, Typography } from "@mui/material";

import SignUpForm from "../../Forms/SignUpForm";
import type { FamilySignupDraft } from "../../interfaces/auth";
import {
  GradientBackgroundWithShapes,
  HowItWorksSection,
  RouteLink,
  WhiteCard,
} from "@bibliotecario/ui-web";

/* ========================================================================== */
/*                              Tipos auxiliares                               */
/* ========================================================================== */

type HowItWorksStep = {
  step: number;
  title: string;
  description: string;
  accentColor: string;
  backgroundColor: string;
  cardProps?: Record<string, unknown>;
};

/* ========================================================================== */
/*                          Dados estáticos (UI) — PURO                        */
/*  Constante imutável usada apenas para renderização.                         */
/* ========================================================================== */
const steps: HowItWorksStep[] = [
  {
    step: 1,
    title: "Dados da Família",
    description:
      "Diz-nos quem és! Indica o teu nome, contacto e morada da família para te recebermos de braços abertos.",
    accentColor: "#05a79e",
    backgroundColor: "rgba(122,68,189,0.08)",
    cardProps: { sx: { minHeight: "auto", py: 2 } },
  },
  {
    step: 2,
    title: "Perfil das Crianças",
    description:
      "Mostra-nos os leitores! Indica o nome, a idade e o perfil de cada criança para receber sugestões perfeitas.",
    accentColor: "#413f7f",
    backgroundColor: "rgba(192,156,220,0.12)",
    cardProps: { sx: { minHeight: "auto", py: 2 } },
  },
];

/* ========================================================================== */
/*                       Funções utilitárias (PURO/IMPURAS)                   */
/* ========================================================================== */

/**
 * Serializa o draft para JSON. ✅ **PURO**
 * (Isolamos a serialização para facilitar teste/reutilização.)
 */
function serializeSignupDraft(draft: FamilySignupDraft): string {
  return JSON.stringify(draft);
}

/**
 * Guarda no localStorage com chave estável.
 * ⚠️ **NÃO é puro** (efeito colateral: escrita no storage).
 * Pequeno e resiliente (try/catch).
 */
function persistSignupDraft(json: string, key = "bf_signup_family") {
  try {
    localStorage.setItem(key, json);
  } catch {
    // Silencia erros de quota/privacidade; fluxo segue para o redirect.
  }
}

/**
 * Redireciona para a página seguinte do onboarding.
 * ⚠️ **NÃO é puro** (efeito colateral: navegação).
 */
function goToCreateProfiles() {
  window.location.href = "/auth/create-profiles";
}

/* ========================================================================== */
/*                                 Componente                                  */
/* ========================================================================== */

/**
 * Página "Criar Nova Conta" (famílias).
 * Renderiza:
 *  - Coluna de apoio "Como Funciona?"
 *  - Formulário de registo com onSubmit que guarda o draft e avança.
 */
const CreateAccountPage: React.FC = () => {
  /**
   * Handler de submit do SignUpForm.
   * Curto, intencional e com passos explícitos:
   *  1) Serializar (PURO)
   *  2) Persistir no localStorage (efeito controlado)
   *  3) Redirecionar para a próxima etapa
   */
  const handleSubmit = useCallback((values: FamilySignupDraft) => {
    const json = serializeSignupDraft(values);
    persistSignupDraft(json);
    goToCreateProfiles();
  }, []);

  return (
    <GradientBackgroundWithShapes
      sx={{ height: "100vh" }}
      display="flex"
      justifyContent="center"
    >
      <Box
        py={{ xs: 8, md: 10 }}
        px={{ xs: 2, md: 4 }}
        maxWidth="100%"
        mx="auto"
        display="flex"
        flexDirection={{ xs: "column", md: "row" }}
        alignItems="stretch"
        gap={{ xs: 6, md: 8 }}
      >
        {/* Coluna esquerda: explicação do processo */}
        <WhiteCard
          sx={{
            flex: "1 1 380px",
            maxWidth: 420,
            py: 4,
            px: 3,
            textAlign: "center",
          }}
        >
          <Typography paddingBottom="15px" variant="h4" component="h1" gutterBottom>
            Como Funciona?
          </Typography>
          <HowItWorksSection steps={steps} />
        </WhiteCard>

        {/* Coluna direita: formulário + navegação */}
        <WhiteCard
          sx={{
            flex: "1 1 480px",
            maxWidth: 540,
            py: 4,
            px: { xs: 3, md: 5 },
          }}
        >
          <Typography variant="h4" component="h2" gutterBottom>
            Criar Nova Conta
          </Typography>

          {/* onBack usa o histórico do browser; onSubmit aplica fluxo descrito acima */}
          <SignUpForm onBack={() => history.back()} onSubmit={handleSubmit} />

          <Typography variant="body2" sx={{ mt: 1, textAlign: "center" }}>
            Já és um membro? <RouteLink href="/auth/login">Entrar</RouteLink>
          </Typography>
        </WhiteCard>
      </Box>
    </GradientBackgroundWithShapes>
  );
};

export default CreateAccountPage;

/**
 * =============================================================================
 *  FIM — Alexandre Brissos • Nº 21131
 * =============================================================================
 */
