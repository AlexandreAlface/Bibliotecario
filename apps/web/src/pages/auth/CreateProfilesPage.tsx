/**
 * =============================================================================
 *  Página · Criar perfis de crianças (Passo 2 do registo)
 * -----------------------------------------------------------------------------
 *  Autor:  Alexandre Brissos — Nº 21131
 *
 *  Reforços aplicados:
 *   • Comentários detalhados em português.
 *   • Identificação explícita de funções **puras** vs. com efeitos colaterais.
 *   • Handlers e helpers curtos (≲ 30 linhas) e coesos.
 *   • Mantido o comportamento original (guardar passo 1 no localStorage,
 *     criar/editar/remover perfis de crianças e submeter registo).
 * =============================================================================
 */

import React, { useEffect, useMemo, useState } from "react";
import { Box, Typography, Divider } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { z } from "zod";

import {
  ChildInputSchema,
  RegisterPayloadSchema,
  type FamilySignupDraft,
  type RegisterPayload,
} from "../../interfaces/auth";

import ChildProfileForm, {
  type ChildProfile,
} from "../../Forms/ChildProfileForm";
import {
  AvatarListItem,
  GradientBackgroundWithShapes,
  HowItWorksSection,
  PrimaryButton,
  WhiteCard,
} from "@bibliotecario/ui-web";
import { api } from "@/services/https";

/* ========================================================================== */
/*                           Tipos e constantes UI                             */
/* ========================================================================== */

type ChildInput = z.input<typeof ChildInputSchema>; // input aceite pelo Zod (pré-coerção)
type ChildUI = ChildInput & { id: string; avatar?: string };
type Step = {
  step: number;
  title: string;
  description: string;
  accentColor: string;
  backgroundColor: string;
  cardProps?: Record<string, unknown>;
};

const LS_KEY = "bf_signup_family"; // chave estável do draft do Passo 1

/* ========================================================================== */
/*                          Helpers puros (sem efeitos)                        */
/* ========================================================================== */

/**
 * Gera a idade a partir de YYYY-MM-DD.
 * ✅ **PURO**: mesma entrada → mesma saída; não altera estado externo.
 */
const calcAge = (birthDate?: string): number | null => {
  if (!birthDate) return null;
  const d = new Date(birthDate);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age < 0 ? null : age;
};

/**
 * Converte do tipo do form (ChildProfile -> "Outro").
 * ✅ **PURO**
 */
const profileToInput = (p: ChildProfile): ChildInput => ({
  firstName: p.firstName,
  lastName: p.lastName ?? "", // garante string
  age: undefined, // idade vem da data; não é enviada
  birthDate: p.birthDate || undefined, // '' → undefined
  gender: p.gender === "O" ? "Outro" : p.gender,
});

/**
 * Converte do tipo guardado na lista (ChildUI -> 'Outro') para o tipo do form ('O').
 * ✅ **PURO**
 */
const uiToProfile = (c: ChildUI): ChildProfile => ({
  id: c.id,
  firstName: c.firstName,
  lastName: c.lastName ?? "",
  birthDate: c.birthDate ?? "",
  gender: c.gender ? (c.gender === "Outro" ? "O" : c.gender) : "O",
  avatar: c.avatar,
});

/**
 * Passos ilustrativos do onboarding.
 * ✅ **PURO** (constante imutável)
 */
const steps: Step[] = [
  {
    step: 1,
    title: "Dados da Família",
    description:
      "Diz-nos quem és! Indica o teu nome, contacto e morada da família para te recebermos de braços abertos.",
    accentColor: "#413f7f",
    backgroundColor: "rgba(122,68,189,0.08)",
    cardProps: { sx: { minHeight: "auto", py: 2 } },
  },
  {
    step: 2,
    title: "Perfil das Crianças",
    description:
      "Mostra-nos os leitores! Indica o nome, a idade e o perfil de cada criança para receber sugestões perfeitas.",
    accentColor: "#05a79e",
    backgroundColor: "rgba(192,156,220,0.12)",
    cardProps: { sx: { minHeight: "auto", py: 2 } },
  },
];

/* ========================================================================== */
/*                      Helpers NÃO puros (efeitos colaterais)                 */
/* ========================================================================== */

/**
 * Gera um ID estável para cada entrada de criança.
 * ⚠️ **NÃO PURO** (usa aleatoriedade/crypto).
 * Curto e resiliente: tenta crypto.randomUUID, faz fallback.
 */
const genId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `tmp_${Math.random().toString(36).slice(2)}`;

/**
 * Lê o draft do Passo 1 do localStorage.
 * ⚠️ **NÃO PURO** (acesso a storage).
 * Pequeno e robusto: devolve null se não existir ou JSON inválido.
 */
function readFamilyDraft(): FamilySignupDraft | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as FamilySignupDraft) : null;
  } catch {
    return null;
  }
}

/**
 * Redireciona para uma rota (navegação client-side simples).
 * ⚠️ **NÃO PURO**
 */
function goTo(path: string) {
  window.location.href = path;
}

/* ========================================================================== */
/*                                 Componente                                  */
/* ========================================================================== */

const CreateProfilesPage: React.FC = () => {
  // Estado local: lista de crianças e registo em edição
  const [children, setChildren] = useState<ChildUI[]>([]);
  const [editing, setEditing] = useState<ChildProfile | null>(null);

  // Gate: se o Passo 1 não foi preenchido, regressa a "Criar Conta"
  useEffect(() => {
    const exists = localStorage.getItem(LS_KEY);
    if (!exists) goTo("/criar-conta");
  }, []);

  /**
   * Guarda (novo/editar) vindo do ChildProfileForm.
   * 1) Normaliza o objeto para o schema Zod.
   * 2) Valida (segurança e UX).
   * 3) Aplica no estado (add/update).
   */
  const saveChild = (child: ChildProfile, isEdit: boolean) => {
    // 1) Normalizar para o input do schema
    const parsed = ChildInputSchema.safeParse(profileToInput(child));
    if (!parsed.success) {
      // 2) Mensagem amigável (usa o 1º erro para concisão)
      const msg =
        parsed.error.issues[0]?.message || "Dados do perfil inválidos.";
      alert(msg);
      return;
    }
    const clean = parsed.data; // birthDate validada, gender normalizado

    // 3) Atualizar estado: substitui se edição, caso contrário acrescenta
    setChildren((prev) => {
      if (isEdit) {
        const targetId = child.id ?? editing?.id ?? "";
        return prev.map((c) => (c.id === targetId ? { ...c, ...clean } : c));
      }
      return [...prev, { id: child.id ?? genId(), ...clean }];
    });
    setEditing(null);
  };

  /** Remove uma criança da lista (id local — não persistido no backend). */
  const removeChild = (id: string) =>
    setChildren((prev) => prev.filter((c) => c.id !== id));

  /** Botão principal fica ativo apenas com ≥1 criança. */
  const canSubmit = useMemo(() => children.length > 0, [children.length]);

  /**
   * Submete a conta (registo final):
   *  - Lê o draft do Passo 1 do localStorage.
   *  - Valida o payload completo com o Zod (RegisterPayloadSchema).
   *  - POST /auth/register com tratamento de erros comuns (409).
   *  - Redireciona para login em caso de sucesso.
   */
  const handleCreateAccount = async () => {
    try {
      const family = readFamilyDraft();
      if (!family) {
        alert("Dados da família em falta. Regressa ao passo anterior.");
        goTo("/criar-conta");
        return;
      }

      // Retira campos só de UI (id/avatar) e valida tudo com o schema final
      const payload: RegisterPayload = RegisterPayloadSchema.parse({
        ...family,
        children: children.map(({ id, avatar, ...rest }) => rest),
      });

      try {
        await api.post("/auth/register", payload);
      } catch (e: any) {
        // 409 → email já usado: UX direta
        if (e?.response?.status === 409) {
          alert(
            "Esse e-mail já está registado. Tenta iniciar sessão ou usa outro e-mail."
          );
          return;
        }
        // Outros erros devolvidos pela API
        alert(e?.response?.data?.error || "Falha ao registar.");
        return;
      }

      alert("Conta criada! Verifica o teu e-mail para confirmar.");
      goTo("/auth/login");
    } catch (e: any) {
      // Falhas de validação ou exceções inesperadas
      alert(e?.message || "Ocorreu um erro ao criar a conta.");
    }
  };

  return (
    <GradientBackgroundWithShapes
      sx={{ height: "100vh" }}
      display="flex"
      justifyContent={"center"}
    >
      <Box
        py={{ xs: 8, md: 10 }}
        px={{ xs: 2, md: 4 }}
        maxWidth="100%"
        mx="auto"
        display="flex"
        flexDirection={{ xs: "column", md: "row" }}
        gap={{ xs: 6, md: 8 }}
      >
        {/* Coluna esquerda: explicação do processo */}
        <WhiteCard sx={{ flex: "1 1 380px", maxWidth: 420, py: 4, px: 3 }}>
          <Typography pb={4} variant="h4" align="center">
            Como Funciona?
          </Typography>
          <HowItWorksSection steps={steps} />
        </WhiteCard>

        {/* Coluna direita: form de perfil + lista + submit */}
        <WhiteCard
          sx={{
            flex: "1 1 480px",
            maxWidth: 540,
            py: 4,
            px: { xs: 3, md: 5 },
            overflow: "auto",
          }}
        >
          <Typography variant="h4" align="center" gutterBottom>
            Criar Perfil Criança
          </Typography>

          {/* Mantém o teu componente e layout original */}
          <ChildProfileForm
            onSave={saveChild} // (child: ChildProfile, isEdit: boolean) => void
            editing={editing} // ChildProfile | null (preenche o formulário em modo edição)
          />

          <Divider sx={{ my: 3 }} />

          <Typography variant="subtitle2" gutterBottom>
            Perfis Criados:
          </Typography>

          {/* Lista compacta com scroll suave */}
          <Box
            maxHeight={160}
            overflow="auto"
            mb={3}
            pr={1}
            sx={{ "&::-webkit-scrollbar": { width: 6 } }}
          >
            {children.map((c) => {
              const age = calcAge(c.birthDate);
              const trailing = age != null ? `, ${age} anos` : "";
              return (
                <AvatarListItem
                  key={c.id}
                  avatarSrc={c.avatar}
                  label={`${c.firstName} ${c.lastName ?? ""}${trailing}`}
                  actions={[
                    {
                      icon: <EditIcon fontSize="small" />,
                      tooltip: "Editar",
                      onClick: () => setEditing(uiToProfile(c)), // converter para o tipo esperado pelo form
                    },
                    {
                      icon: <DeleteIcon fontSize="small" />,
                      tooltip: "Apagar",
                      onClick: () => removeChild(c.id),
                    },
                  ]}
                  sx={{ mb: 1 }}
                />
              );
            })}
          </Box>

          <PrimaryButton
            fullWidth
            disabled={!canSubmit}
            onClick={handleCreateAccount}
          >
            Criar Conta
          </PrimaryButton>
        </WhiteCard>
      </Box>
    </GradientBackgroundWithShapes>
  );
};

export default CreateProfilesPage;

/**
 * =============================================================================
 *  FIM — Alexandre Brissos • Nº 21131
 * =============================================================================
 */
