import React, { useState } from 'react';
import { Box, Typography, Divider } from '@mui/material';
import {
  GradientBackground,
  WhiteCard,
  HowItWorksSection,
  PrimaryButton,
  AvatarListItem,
} from 'bibliotecario-ui';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ChildProfileForm, { type ChildProfile } from '../../Forms/ChildProfileForm';

const steps = [
  {
    step: 1,
    title: 'Dados da Família',
    description:
      'Diz-nos quem és! Indica o teu nome, contacto e morada da família para te recebermos de braços abertos.',
    accentColor: '#413f7f',
    backgroundColor: 'rgba(122,68,189,0.08)',
    cardProps: { sx: { minHeight: 'auto', py: 2 } }
  },
  {
    step: 2,
    title: 'Perfil das Crianças',
    description:
      'Mostra-nos os leitores! Indica o nome, a idade e o perfil de cada criança para receber sugestões perfeitas.',
    accentColor: '#05a79e',
    backgroundColor: 'rgba(192,156,220,0.12)',
    cardProps: { sx: { minHeight: 'auto', py: 2 } }
  },
];

const CreateProfilesPage: React.FC = () => {
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [editing, setEditing] = useState<ChildProfile | null>(null);

  /* guardar (novo ou editado) */
  const saveChild = (child: ChildProfile, isEdit: boolean) => {
    setChildren((prev) =>
      isEdit ? prev.map((c) => (c.id === child.id ? child : c)) : [...prev, child],
    );
    setEditing(null);
  };

  const removeChild = (id: string) =>
    setChildren((prev) => prev.filter((c) => c.id !== id));

  return (
    <GradientBackground sx={{ minHeight: '100vh' }}>
      <Box
        py={{ xs: 8, md: 10 }}
        px={{ xs: 2, md: 4 }}
        maxWidth="100%"
        mx="auto"
        display="flex"
        flexDirection={{ xs: 'column', md: 'row' }}
        gap={{ xs: 6, md: 8 }}
      >
        {/* Esquerda */}
        <WhiteCard sx={{ flex: '1 1 380px', maxWidth: 420, py: 4, px: 3 }}>
          <Typography pb={4} variant="h4" align="center">
            Como Funciona?
          </Typography>
          <HowItWorksSection steps={steps} />
        </WhiteCard>

        {/* Direita */}
        <WhiteCard
          sx={{
            flex: '1 1 480px',
            maxWidth: 540,
            py: 4,
            px: { xs: 3, md: 5 },
            overflow: 'auto',
          }}
        >
          <Typography variant="h4" align="center" gutterBottom>
            Criar Perfil Criança
          </Typography>

          <ChildProfileForm onSave={saveChild} editing={editing} />

          <Divider sx={{ my: 3 }} />

          <Typography variant="subtitle2" gutterBottom>
            Perfis Criados:
          </Typography>

          <Box
            maxHeight={160}
            overflow="auto"
            mb={3}
            pr={1}
            sx={{ '&::-webkit-scrollbar': { width: 6 } }}
          >
            {children.map((c) => (
              <AvatarListItem
                key={c.id}
                avatarSrc={c.avatar}
                label={`${c.firstName} ${c.lastName}, ${c.age} anos`}
                actions={[
                  {
                    icon: <EditIcon fontSize="small" />,
                    tooltip: 'Editar',
                    onClick: () => setEditing(c),
                  },
                  {
                    icon: <DeleteIcon fontSize="small" />,
                    tooltip: 'Apagar',
                    onClick: () => removeChild(c.id),
                  },
                ]}
                sx={{ mb: 1 }}
              />
            ))}
          </Box>

          <PrimaryButton fullWidth disabled={!children.length}>
            Criar Conta
          </PrimaryButton>
        </WhiteCard>
      </Box>
    </GradientBackground>
  );
};

export default CreateProfilesPage;
