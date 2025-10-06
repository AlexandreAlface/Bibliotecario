/**
 * ============================================================================
 *  Página: Login
 *  Autor:  Alexandre Brissos — Nº 21131
 * ----------------------------------------------------------------------------
 *  Reforços aplicados (como combinado):
 *   • Comentários claros em PT-PT em todo o código.
 *   • Helpers/métodos curtos (≤ 30 linhas) e coesos.
 *   • Marcação explícita de helpers **PUROS**.
 *   • UX: mensagens de erro normalizadas e pequenos melhoramentos de acessibilidade.
 * ============================================================================
 */

import { z } from "zod";
import { AuthLayout } from "../../components/Layouts/AuthLayout";
import { Box, Typography } from "@mui/material";
import {
  EmailField,
  Logo,
  PasswordField,
  PrimaryButton,
  RouteLink,
  SecondaryButton,
  SectionDivider,
  WhiteCard,
} from "@bibliotecario/ui-web";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { pickLandingRoute } from "@/services/auth";

/* ========================= Validação (Zod) ========================= */
/** ✅ **PURO**: apenas descreve e valida a forma dos dados do formulário */
const schema = z.object({
  email: z.string().min(1, "Obrigatório").email("Formato inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});
type FormData = z.infer<typeof schema>;

/* ==================== Helper de erro (PURO) ==================== */
/**
 * Normaliza mensagens de erro vindas do Axios/fetch para uma string exibível.
 * ✅ **PURO**: mesma entrada → mesma saída, sem efeitos colaterais.
 */
function toErrorMessage(e: unknown): string {
  const anyErr = e as any;
  return anyErr?.response?.data?.error || anyErr?.message || "Falha no login.";
}

/* ============================= Página ============================= */
export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  // RHF + Zod — controlamos valores/erros do formulário
  const { control, handleSubmit, formState } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
    mode: "onBlur",
  });

  /**
   * Submissão do formulário de login.
   * ⚠️ **NÃO PURO**: chama API, altera navegação, apresenta alert().
   * Curto e direto (≈ 15 linhas).
   */
  async function onSubmit(values: FormData) {
    try {
      // useAuth.login deverá tratar sessão/token e devolver o utilizador atual
      const user = await login(values.email, values.password);

      // Decide rota de destino consoante o papel (família/bibliotecário/admin)
      const next = pickLandingRoute(user);
      navigate(next, { replace: true });
    } catch (e) {
      alert(toErrorMessage(e));
    }
  }

  // Estilização compacta dos inputs (altura consistente)
  const compactInputSX = {
    "& .MuiInputBase-root": { height: 40 },
    "& .MuiInputBase-input": { py: 0.75 },
  } as const;

  return (
    <AuthLayout>
      <Box sx={{ width: "100%", maxWidth: 520, mx: "auto", px: 2, pt: 4 }}>
        <WhiteCard width="100%" sx={{ py: 3, px: 2 }}>
          {/* Marca/Identidade */}
          <Box textAlign="center" display="flex" justifyContent="center">
            <Logo
              variant="biblio"
              sx={{
                height: { xs: 240, sm: 246, md: 252 },
                lineHeight: 0,
                display: "flex",
                alignItems: "center",
              }}
              aria-label="Bibliotecário — Logótipo"
            />
          </Box>

          <Typography variant="h5" textAlign="center" mb={2}>
            Entrar
          </Typography>

          {/* Formulário controlado por RHF (sem reload de página) */}
          <Box
            component="form"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            autoComplete="on"
            aria-busy={formState.isSubmitting ? "true" : "false"}
          >
            {/* Campo: Email */}
            <Controller
              name="email"
              control={control}
              render={({ field, fieldState }) => {
                const { ref, ...rest } = field;
                return (
                  <EmailField
                    {...rest}
                    inputRef={ref}
                    label="Email"
                    fullWidth
                    autoComplete="email"
                    size="small"
                    sx={{ mb: 2, ...compactInputSX }}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                );
              }}
            />

            {/* Campo: Password */}
            <Controller
              name="password"
              control={control}
              render={({ field, fieldState }) => {
                const { ref, ...rest } = field;
                return (
                  <PasswordField
                    {...rest}
                    inputRef={ref}
                    label="Palavra-passe"
                    fullWidth
                    autoComplete="current-password"
                    size="small"
                    sx={{ mb: 3, ...compactInputSX }}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                );
              }}
            />

            {/* Submit */}
            <PrimaryButton
              type="submit"
              fullWidth
              disabled={formState.isSubmitting}
              sx={{ mb: 3 }}
            >
              {formState.isSubmitting ? "A entrar…" : "Entrar"}
            </PrimaryButton>
          </Box>

          {/* Ações secundárias / ajuda */}
          <Box display="flex" justifyContent="space-between" mb={3}>
            <RouteLink href="#" weight={400}>
              Problemas ao entrar?
            </RouteLink>
            <RouteLink href="#" weight={400}>
              Esqueceste-te da palavra-passe?
            </RouteLink>
          </Box>

          <SectionDivider label="Novo por aqui?" sx={{ mb: 2 }} />

          {/* CTA para criação de conta */}
          <SecondaryButton fullWidth href="/auth/create-account">
            Criar conta
          </SecondaryButton>
        </WhiteCard>
      </Box>
    </AuthLayout>
  );
}

/** ============================== Fim ===============================
 *  Alexandre Brissos — Nº 21131
 *  =================================================================
 */
