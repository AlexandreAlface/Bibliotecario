import { z } from "zod";
import { AuthLayout } from "../../components/Layouts/AuthLayout";
import { Box, Typography } from "@mui/material";
import {
  EmailField, Logo, PasswordField, PrimaryButton,
  RouteLink, SecondaryButton, SectionDivider, WhiteCard,
} from "@bibliotecario/ui-web";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/contexts/AuthContext";

const schema = z.object({
  email: z.string().min(1, "Obrigatório").email("Formato inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});
type FormData = z.infer<typeof schema>;

export default function Login() {
  const { login } = useAuth();
  const { control, handleSubmit, formState } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: FormData) {
    try {
      await login(values.email, values.password); // seta user via /auth/me
      window.location.href = "/";                 // cai no index com sessão
    } catch (e: any) {
      alert(e?.response?.data?.error || e?.message || "Falha no login.");
    }
  }

  const compactInputSX = {
    "& .MuiInputBase-root": { height: 40 },
    "& .MuiInputBase-input": { py: 0.75 },
  };

  return (
    <AuthLayout>
      <Box sx={{ width: "100%", maxWidth: 520, mx: "auto", px: 2, pt: 4 }}>
        <WhiteCard width="100%" sx={{ py: 3, px: 2 }}>
          <Box textAlign="center" display="flex" justifyContent="center">
            <Logo width="300px" />
          </Box>

          <Typography variant="h5" textAlign="center" mb={2}>Entrar</Typography>

          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
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
                    size="small"
                    sx={{ mb: 2, ...compactInputSX }}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                );
              }}
            />

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
                    size="small"
                    sx={{ mb: 3, ...compactInputSX }}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                );
              }}
            />

            <PrimaryButton type="submit" fullWidth disabled={formState.isSubmitting} sx={{ mb: 3 }}>
              Entrar
            </PrimaryButton>
          </Box>

          <Box display="flex" justifyContent="space-between" mb={3}>
            <RouteLink href="#" weight={400}>Problemas ao entrar?</RouteLink>
            <RouteLink href="#" weight={400}>Esqueceste-te da palavra-passe?</RouteLink>
          </Box>

          <SectionDivider label="Novo por aqui?" sx={{ mb: 2 }} />
          <SecondaryButton fullWidth href="/criar-conta">Criar conta</SecondaryButton>
        </WhiteCard>
      </Box>
    </AuthLayout>
  );
}
