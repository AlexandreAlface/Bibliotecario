import Grid from '@mui/material/GridLegacy';
import { Box } from '@mui/material';
import {
  BaseTextField,
  EmailField,
  PasswordField,
  PrimaryButton,
  SecondaryButton,
} from 'bibliotecario-ui';

import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { FamilySignupDraftSchema, type FamilySignupDraft } from '../interfaces/auth';

export interface SignUpFormProps {
  onSubmit?: (data: FamilySignupDraft) => void; // <-- recebe draft tipado
  onBack?: () => void;
}

// Schema específico do formulário (tem first/last + confirmPassword)
const SignUpFormSchema = z.object({
  firstName: z.string().min(1, 'Obrigatório'),
  lastName: z.string().min(1, 'Obrigatório'),
  email: z.string().email('E-mail inválido'),
  phone: z.string().optional(),
  citizenCard: z.string().optional(),
  address: z.string().optional(),
  postalCode: z.string().optional(),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  confirmPassword: z.string().min(8, 'Mínimo 8 caracteres'),
}).refine(v => v.password === v.confirmPassword, {
  path: ['confirmPassword'],
  message: 'As passwords não coincidem',
});

type SignUpFormValues = z.infer<typeof SignUpFormSchema>;

export function SignUpForm({ onBack, onSubmit }: SignUpFormProps) {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(SignUpFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      citizenCard: '',
      address: '',
      postalCode: '',
      password: '',
      confirmPassword: '',
    },
    mode: 'onBlur',
  });

  // No submit: mapear para FamilySignupDraft e validar novamente (defensivo)
  const submit = (values: SignUpFormValues) => {
    const draft: FamilySignupDraft = {
      fullName: `${values.firstName} ${values.lastName}`.trim(),
      email: values.email,
      phone: values.phone || undefined,
      citizenCard: values.citizenCard || undefined,
      address: values.address || undefined,
      password: values.password,
      // se tiveres readerProfile no form, acrescenta aqui
    };

    // validação final contra o schema oficial (opcional mas recomendado)
    FamilySignupDraftSchema.parse(draft);

    onSubmit?.(draft);
  };

  return (
    <Box component="form" onSubmit={handleSubmit(submit)} noValidate>
      <Grid container spacing={3}>
        {/* Nome */}
        <Grid item xs={12} md={6}>
          <Controller
            name="firstName"
            control={control}
            render={({ field }) => (
              <BaseTextField
                {...field}
                fullWidth
                label="Primeiro Nome"
                required
                error={!!errors.firstName}
                helperText={errors.firstName?.message}
              />
            )}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <Controller
            name="lastName"
            control={control}
            render={({ field }) => (
              <BaseTextField
                {...field}
                fullWidth
                label="Último Nome"
                required
                error={!!errors.lastName}
                helperText={errors.lastName?.message}
              />
            )}
          />
        </Grid>

        {/* Email */}
        <Grid item xs={12}>
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <EmailField
                {...field}
                fullWidth
                required
                error={!!errors.email}
                helperText={errors.email?.message}
              />
            )}
          />
        </Grid>

        {/* Telefone + CC */}
        <Grid item xs={12} md={6}>
          <Controller
            name="phone"
            control={control}
            render={({ field }) => (
              <BaseTextField
                {...field}
                fullWidth
                label="Telefone"
                error={!!errors.phone}
                helperText={errors.phone?.message}
              />
            )}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <Controller
            name="citizenCard"
            control={control}
            render={({ field }) => (
              <BaseTextField
                {...field}
                fullWidth
                label="Cartão de Cidadão"
                error={!!errors.citizenCard}
                helperText={errors.citizenCard?.message}
              />
            )}
          />
        </Grid>

        {/* Morada + Código-postal */}
        <Grid item xs={12} md={6}>
          <Controller
            name="address"
            control={control}
            render={({ field }) => (
              <BaseTextField
                {...field}
                fullWidth
                label="Morada"
                error={!!errors.address}
                helperText={errors.address?.message}
              />
            )}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <Controller
            name="postalCode"
            control={control}
            render={({ field }) => (
              <BaseTextField
                {...field}
                fullWidth
                label="Código Postal"
                error={!!errors.postalCode}
                helperText={errors.postalCode?.message}
              />
            )}
          />
        </Grid>

        {/* Passwords */}
        <Grid item xs={12}>
          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <PasswordField
                {...field}
                fullWidth
                label="Palavra-Passe"
                required
                error={!!errors.password}
                helperText={errors.password?.message}
              />
            )}
          />
        </Grid>
        <Grid item xs={12}>
          <Controller
            name="confirmPassword"
            control={control}
            render={({ field }) => (
              <PasswordField
                {...field}
                fullWidth
                label="Confirmar palavra-passe"
                required
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword?.message}
              />
            )}
          />
        </Grid>

        {/* Botões */}
        <Grid item xs={12} container justifyContent="space-between">
          <SecondaryButton type="button" onClick={onBack}>
            Voltar
          </SecondaryButton>

          {/* sem href para não saltar a validação */}
          <PrimaryButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'A validar…' : 'Seguinte'}
          </PrimaryButton>
        </Grid>
      </Grid>
    </Box>
  );
}

export default SignUpForm;
