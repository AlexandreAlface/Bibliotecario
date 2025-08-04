import React from 'react';
import Grid from '@mui/material/GridLegacy';
import { Box } from '@mui/material';
import {
  BaseTextField,
  EmailField,
  PasswordField,
  PrimaryButton,
  SecondaryButton,
} from 'bibliotecario-ui';

export interface SignUpFormProps {
  onSubmit?: (data: Record<string, FormDataEntryValue>) => void;
  onBack?: () => void;
}

const SignUpForm: React.FC<SignUpFormProps> = ({ onSubmit, onBack }) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit?.(Object.fromEntries(new FormData(e.currentTarget)));
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Grid container spacing={3}>
        {/* Nome */}
        <Grid item xs={12} md={6}>
          <BaseTextField fullWidth label="Primeiro Nome" name="firstName" required />
        </Grid>
        <Grid item xs={12} md={6}>
          <BaseTextField fullWidth label="Último Nome" name="lastName" required />
        </Grid>

        {/* Email */}
        <Grid item xs={12}>
          <EmailField fullWidth required />
        </Grid>

        {/* Telefone + CC */}
        <Grid item xs={12} md={6}>
          <BaseTextField fullWidth label="Telefone" name="phone" />
        </Grid>
        <Grid item xs={12} md={6}>
          <BaseTextField fullWidth label="Cartão de Cidadão" name="citizenCard" />
        </Grid>

        {/* Morada + Código-postal */}
        <Grid item xs={12} md={8}>
          <BaseTextField fullWidth label="Morada" name="address" />
        </Grid>
        <Grid item xs={12} md={4}>
          <BaseTextField fullWidth label="Código Postal" name="postalCode" />
        </Grid>

        {/* Passwords */}
        <Grid item xs={12}>
          <PasswordField fullWidth label="Palavra-Passe" name="password" required />
        </Grid>
        <Grid item xs={12}>
          <PasswordField
            fullWidth
            label="Confirmar palavra-passe"
            name="confirmPassword"
            required
          />
        </Grid>

        {/* Botões */}
        <Grid item xs={12} container justifyContent="space-between">
          <SecondaryButton type="button" onClick={onBack}>
            Voltar
          </SecondaryButton>
          <PrimaryButton type="submit">Seguinte</PrimaryButton>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SignUpForm;
