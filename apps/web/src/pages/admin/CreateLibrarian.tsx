/**
 * =============================================================================
 *  Admin · Criar Bibliotecário
 * -----------------------------------------------------------------------------
 *  Ficheiro: apps/web/src/pages/admin/CreateLibrarianPage.tsx
 *  Autor:    Alexandre Brissos — Nº 21131
 *
 *  Melhorias feitas “como combinado”:
 *   • Comentários explicativos por todo o ficheiro (pt-PT).
 *   • Extra: funções utilitárias puras e curtas (≲ 30 linhas) sem side-effects.
 *   • Mantida a estrutura de UI, com estados claros de carregamento/erro.
 *   • Mapeamento de dados isolado em helper puro para facilitar testes.
 * =============================================================================
 */

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
import { getMyLibrary, type LibraryLite } from "@/services/admin/admin";

/* ============================================================================
 * Tipos & Helpers PUROS (sem side-effects)
 * ========================================================================== */

/** Payload esperado pelo endpoint de criação de bibliotecários (admin). */
type AdminCreateLibrarianPayload = {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  citizenCard?: string;
  address?: string;
  libraryId: number;
};

/**
 * Mapeia os valores do SignUpForm (draft de “família” reutilizado)
 * para o payload que o endpoint de admin espera.
 * — Puro, determinístico e fácil de testar.
 */
function mapSignupToAdminPayload(
  values: FamilySignupDraft,
  libraryId: number
): AdminCreateLibrarianPayload {
  return {
    fullName: values.fullName,
    email: values.email,
    password: values.password,
    phone: values.phone || undefined,
    citizenCard: values.citizenCard || undefined,
    address: values.address || undefined,
    libraryId, // força sempre a biblioteca do admin autenticado
  };
}

/* ============================================================================
 * Página
 * ========================================================================== */

const CreateLibrarianPage: React.FC = () => {
  const navigate = useNavigate();

  // Estado: biblioteca do admin (única) + flags de carregamento/erro
  const [myLib, setMyLib] = React.useState<LibraryLite | null>(null);
  const [libLoading, setLibLoading] = React.useState(true);
  const [libErr, setLibErr] = React.useState<string | null>(null);

  // Carrega a biblioteca associada ao admin ao montar a página
  React.useEffect(() => {
    (async () => {
      try {
        setLibLoading(true);
        const lib = await getMyLibrary();
        if (!lib) {
          setMyLib(null);
          setLibErr("Não estás associado a nenhuma biblioteca.");
        } else {
          setMyLib(lib);
          setLibErr(null);
        }
      } catch (e: any) {
        setMyLib(null);
        setLibErr(e?.message || "Falha a carregar a tua biblioteca.");
      } finally {
        setLibLoading(false);
      }
    })();
  }, []);

  /**
   * Submissão do formulário (≲ 30 linhas)
   * - Valida existência da biblioteca (segurança extra no cliente).
   * - Mapeia para o payload do endpoint de admin.
   * - Efetua o POST e redireciona para a lista.
   * - Lança erro para o SignUpForm poder mostrar feedback (se aplicável).
   */
  async function handleSubmit(values: FamilySignupDraft) {
    if (!myLib?.id) {
      throw new Error("Sem biblioteca associada — operação não permitida.");
    }

    const payload = mapSignupToAdminPayload(values, myLib.id);

    try {
      await api.post("/admin/librarians", payload);
      // volta à listagem de bibliotecários
      navigate("/admin/bibliotecarios", { replace: true });
    } catch (e: any) {
      // repassa mensagem para o form apresentar
      throw new Error(e?.message || "Não foi possível criar o bibliotecário.");
    }
  }

  /* ------------------------------------------------------------------------ */

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
          {/* Título da página */}
          <Typography variant="h4" component="h1" gutterBottom>
            Criar Bibliotecário
          </Typography>

          {/* Estado da biblioteca do admin (pré-requisito para criar) */}
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

          {/* Formulário de criação:
              — Só aparece quando existe biblioteca válida e não está a carregar.
              — Reutiliza o SignUpForm; o mapeamento garante o libraryId correto.
              — onBack usa o router para recuar uma página. */}
          {!libLoading && !libErr && (
            <SignUpForm onBack={() => navigate(-1)} onSubmit={handleSubmit} />
          )}

          {/* Link de retorno para a lista */}
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

/* =============================================================================
 *  FIM — Alexandre Brissos • Nº 21131
 * =============================================================================
 */
