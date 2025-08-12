// src/pages/auth/CreateAccountPage.tsx
import React from 'react';
import { Box, Typography } from '@mui/material';

import SignUpForm from '../../Forms/SignUpForm';
import type { FamilySignupDraft } from '../../interfaces/auth';
import { GradientBackground, HowItWorksSection, RouteLink, WhiteCard } from '@bibliotecario/ui-web';

const steps = [
  {
    step: 1,
    title: 'Dados da Família',
    description:
      'Diz-nos quem és! Indica o teu nome, contacto e morada da família para te recebermos de braços abertos.',
    accentColor: '#05a79e',
    backgroundColor: 'rgba(122,68,189,0.08)',
    cardProps: { sx: { minHeight: 'auto', py: 2 } }
  },
  {
    step: 2,
    title: 'Perfil das Crianças',
    description:
      'Mostra-nos os leitores! Indica o nome, a idade e o perfil de cada criança para receber sugestões perfeitas.',
    accentColor: '#413f7f',
    backgroundColor: 'rgba(192,156,220,0.12)',
    cardProps: { sx: { minHeight: 'auto', py: 2 } }
  },
];

const CreateAccountPage: React.FC = () => {
  const handleSubmit = (values: FamilySignupDraft) => {
    localStorage.setItem('bf_signup_family', JSON.stringify(values));
    window.location.href = '/criar-conta-filhos';
  };

  return (
    <GradientBackground sx={{ height: '100vh' }} display="flex" justifyContent="center">
      <Box
        py={{ xs: 8, md: 10 }}
        px={{ xs: 2, md: 4 }}
        maxWidth="100%"
        mx="auto"
        display="flex"
        flexDirection={{ xs: 'column', md: 'row' }}
        alignItems="stretch"
        gap={{ xs: 6, md: 8 }}
      >
        {/* Coluna ESQ – HowItWorks */}
        <WhiteCard
          sx={{
            flex: '1 1 380px',
            maxWidth: 420,
            py: 4,
            px: 3,
            textAlign: 'center',
          }}
        >
          <Typography paddingBottom="15px" variant="h4" component="h1" gutterBottom>
            Como Funciona?
          </Typography>
          <HowItWorksSection steps={steps} />
        </WhiteCard>

        {/* Coluna DIR – Formulário */}
        <WhiteCard
          sx={{
            flex: '1 1 480px',
            maxWidth: 540,
            py: 4,
            px: { xs: 3, md: 5 },
          }}
        >
          <Typography variant="h4" component="h2" gutterBottom>
            Criar Nova Conta
          </Typography>

          <SignUpForm
            onBack={() => history.back()}
            onSubmit={handleSubmit}
          />

          <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
            Já és um membro? <RouteLink href="/login">Entrar</RouteLink>
          </Typography>
        </WhiteCard>
      </Box>
    </GradientBackground>
  );
};

export default CreateAccountPage;
