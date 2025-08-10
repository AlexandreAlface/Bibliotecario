// src/pages/auth/Login.tsx
import {
  WhiteCard,
  EmailField,
  PasswordField,
  PrimaryButton,
  SecondaryButton,
  SectionDivider,
  RouteLink,
  Logo
} from 'bibliotecario-ui';
import { Typography, Box } from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthLayout } from '../../components/Layouts/AuthLayout';

// Schema de validação
const schema = z.object({
  email:    z.string().min(1, 'Obrigatório').email('Formato inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});
type FormData = z.infer<typeof schema>;

export function Login() {
  const { control, handleSubmit, formState } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: FormData) => {
    console.log('Login', data);
  };

  return (
    <AuthLayout>
      {/* Wrapper para centrar tudo e limitar largura */}
      <Box
        sx={{
          width:         '100%',
          maxWidth:      520,    // cartão mais estreito
          mx:            'auto', 
          px:            2,
          pt:            4,
        }}
      >
        {/* Cartão branco */}
        <WhiteCard
          width="100%"
          sx={{
            py: 3,            // menos padding vertical
            px: 2,
          }}
        >
          {/* Logo no topo do cartão */}
        <Box textAlign="center" justifyContent="center" display={'flex'}>
          <Logo width="300px" />
        </Box>

          <Typography variant="h5" textAlign="center" mb={2}>
            Entrar
          </Typography>

          {/* Formulário */}
          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <Controller
              name="email"
              control={control}
              render={({ field, fieldState }) => (
                <EmailField
                  {...field}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                  fullWidth
                  sx={{ mb: 2 }}
                />
              )}
            />

            <Controller
              name="password"
              control={control}
              render={({ field, fieldState }) => (
                <PasswordField
                  {...field}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                  fullWidth
                  sx={{ mb: 3 }}
                />
              )}
            />

            <PrimaryButton
              type="submit"
              fullWidth
              disabled={formState.isSubmitting}
              sx={{ mb: 3 }}
            >
              Entrar
            </PrimaryButton>
          </Box>

          {/* Links de ajuda */}
          <Box display="flex" justifyContent="space-between" mb={3}>
            <RouteLink href="#" weight={400}>
              Problemas ao entrar?
            </RouteLink>
            <RouteLink href="#" weight={400}>
              Esqueceste-te da palavra-passe?
            </RouteLink>
          </Box>

          {/* Divisor e botão de criar conta */}
          <SectionDivider label="Novo por aqui?" sx={{ mb: 2 }} />
          <SecondaryButton fullWidth href="/criar-conta">
            Criar conta
          </SecondaryButton>
        </WhiteCard>
      </Box>
    </AuthLayout>
  );
}
