import {
  WhiteCard,
  EmailField,
  PasswordField,
  PrimaryButton,
  SecondaryButton,
  SectionDivider,
  RouteLink,
} from 'bibliotecario-ui';

import { Typography, Box } from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthLayout } from '../../components/Layouts/AuthLayout';

const schema = z.object({
  email: z.string().min(1, 'Obrigatório').email('Formato inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

type FormData = z.infer<typeof schema>;

export function Login() {
  const { control, handleSubmit, formState } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: FormData) => {
    // TODO: call API via react-query / axios
    console.log('Login', data);
  };

  return (
    <AuthLayout>
      <WhiteCard width={480}>
        <Typography variant="h5" textAlign="center" mb={3}>
          Entrar
        </Typography>

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

          <PrimaryButton type="submit" fullWidth disabled={formState.isSubmitting} sx={{ mb: 3}}>
            Entrar
          </PrimaryButton>
        </Box>

        <Box display="flex" justifyContent="space-between" mb={4}>
          <RouteLink href="#" weight={400}>Problemas ao entrar?</RouteLink>
          <RouteLink href="#" weight={400}>Esqueceste-te da palavra-passe?</RouteLink>
        </Box>

        <SectionDivider label="Novo por aqui?" />

        <SecondaryButton fullWidth sx={{ mt: 3 }} href='/criar-conta'>
          Criar conta
        </SecondaryButton>
      </WhiteCard>
    </AuthLayout>
  );
}
