import React from 'react';
import { Typography, Box } from '@mui/material';
import Grid from '@mui/material/GridLegacy'
import { GradientBackground, WhiteCard ,HowItWorksSection, RouteLink } from 'bibliotecario-ui';
import SignUpForm from '../../Forms/SignUpForm';


const steps = [
  {
    step: 1,
    title: 'Dados da Família',
    description:
      'Diz-nos quem és! Indica o teu nome, contacto e morada da família para te recebermos de braços abertos.',
    accentColor: '#7A44BD',
    backgroundColor: 'rgba(122,68,189,0.08)',
  },
  {
    step: 2,
    title: 'Perfil das Crianças',
    description:
      'Mostra-nos os leitores! Indica o nome, a idade e o perfil de cada criança para receber sugestões perfeitas.',
    accentColor: '#C09CDC',
    backgroundColor: 'rgba(192,156,220,0.12)',
  },
];

const CreateAccountPage: React.FC = () => (
  <GradientBackground>
    <Box py={{ xs: 6, md: 10 }} maxWidth="lg" mx="auto">
      <Grid container spacing={10} justifyContent="center">
        {/* Coluna ESQ – How it works */}
        <Grid item xs={12} md={4}>
          <WhiteCard sx={{ py: 6, px: 4, textAlign: 'center' }}>
            <Typography variant="h4" component="h1" gutterBottom>
              Como Funciona?
            </Typography>

            <HowItWorksSection steps={steps} />
          </WhiteCard>
        </Grid>

        {/* Coluna DIR – Formulário */}
        <Grid item xs={12} md={6}>
          <WhiteCard sx={{ py: 6, px: { xs: 4, md: 6 } }}>
            <Typography variant="h4" component="h2" gutterBottom>
              Criar Nova Conta
            </Typography>

            <SignUpForm
              onBack={() => history.back()}
              onSubmit={(data) => console.log('SUBMIT', data)}
            />

            <Typography variant="body2" sx={{ mt: 4, textAlign: 'center' }}>
              Já és um membro? <RouteLink href="/login">Entrar</RouteLink>
            </Typography>
          </WhiteCard>
        </Grid>
      </Grid>
    </Box>
  </GradientBackground>
);

export default CreateAccountPage;
