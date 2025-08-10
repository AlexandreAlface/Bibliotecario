import React, { useEffect, useMemo, useState } from 'react';
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

import { z } from 'zod';
import {
  ChildInputSchema,
  RegisterPayloadSchema,
  type FamilySignupDraft,
  type RegisterPayload,
} from '../../interfaces/auth';
import { api } from '../../services/authservice';

import ChildProfileForm, { type ChildProfile } from '../../Forms/ChildProfileForm';

// ---- Tipos internos (UI) e utilitários --------------------------------------
type ChildInput = z.input<typeof ChildInputSchema>;        // input aceito pelo Zod (antes da coerção)
type ChildUI = ChildInput & { id: string; avatar?: string };

const genId = () =>
  (globalThis.crypto?.randomUUID?.() ?? `tmp_${Math.random().toString(36).slice(2)}`);

// calcula idade a partir de YYYY-MM-DD
const calcAge = (birthDate?: string): number | null => {
  if (!birthDate) return null;
  const d = new Date(birthDate);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age < 0 ? null : age;
};

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

// Converte do tipo do form (ChildProfile -> 'O') para o schema ('Outro')
const profileToInput = (p: ChildProfile): ChildInput => ({
  firstName: p.firstName,
  lastName: p.lastName ?? '',                 // garantir string
  age: undefined,                             // não usamos idade no payload (deriva da data)
  birthDate: p.birthDate || undefined,        // '' -> undefined
  gender: p.gender === 'O' ? 'Outro' : p.gender,
});

// Converte do que guardas na lista (ChildUI -> 'Outro') para o tipo do form ('O')
const uiToProfile = (c: ChildUI): ChildProfile => ({
  id: c.id,
  firstName: c.firstName,
  lastName: c.lastName ?? '',
  birthDate: c.birthDate ?? '',
  gender: c.gender ? (c.gender === 'Outro' ? 'O' : c.gender) : 'O',
  avatar: c.avatar,
});

const CreateProfilesPage: React.FC = () => {
  const [children, setChildren] = useState<ChildUI[]>([]);
  const [editing, setEditing] = useState<ChildProfile | null>(null); // o form espera ChildProfile

  // Gate: sem passo 1 volta atrás
  useEffect(() => {
    const exists = localStorage.getItem('bf_signup_family');
    if (!exists) window.location.href = '/criar-conta';
  }, []);

  // Guardar (novo/editar) vindo do ChildProfileForm — assinatura EXACTA do form
  const saveChild = (child: ChildProfile, isEdit: boolean) => {
    // Validar com Zod (usa o input antes da coerção)
    const parsed = ChildInputSchema.safeParse(profileToInput(child));
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || 'Dados do perfil inválidos.';
      alert(msg);
      return;
    }
    const clean = parsed.data; // birthDate validada, gender normalizado

    setChildren(prev => {
      if (isEdit) {
        const targetId = child.id ?? editing?.id ?? '';
        return prev.map(c => (c.id === targetId ? { ...c, ...clean } : c));
      }
      return [...prev, { id: child.id ?? genId(), ...clean }];
    });
    setEditing(null);
  };

  const removeChild = (id: string) =>
    setChildren(prev => prev.filter(c => c.id !== id));

  const canSubmit = useMemo(() => children.length > 0, [children.length]);

  // Submeter conta: valida payload completo e envia
  const handleCreateAccount = async () => {
    try {
      const family = JSON.parse(localStorage.getItem('bf_signup_family') || '{}') as FamilySignupDraft;

      // Retira campos só de UI e valida tudo
      const payload: RegisterPayload = RegisterPayloadSchema.parse({
        ...family,
        children: children.map(({ id, avatar, ...rest }) => rest),
      });

      await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      alert('Conta criada! Verifica o teu e-mail para confirmar.');
      window.location.href = '/login';
    } catch (e: any) {
      alert(e.message || 'Ocorreu um erro ao criar a conta.');
    }
  };

  return (
    <GradientBackground sx={{ height: '100vh' }} display='flex' justifyContent={'center'}>
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

          {/* Mantém o teu componente e layout antigos */}
          <ChildProfileForm
            onSave={saveChild}                          // (child: ChildProfile, isEdit: boolean) => void
            editing={editing}                           // ChildProfile | null
          />

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
            {children.map((c) => {
              const age = calcAge(c.birthDate);
              const trailing = age != null ? `, ${age} anos` : '';
              return (
                <AvatarListItem
                  key={c.id}
                  avatarSrc={c.avatar}
                  label={`${c.firstName} ${c.lastName ?? ''}${trailing}`}
                  actions={[
                    {
                      icon: <EditIcon fontSize="small" />,
                      tooltip: 'Editar',
                      onClick: () => setEditing(uiToProfile(c)),   // converter para o tipo do form
                    },
                    {
                      icon: <DeleteIcon fontSize="small" />,
                      tooltip: 'Apagar',
                      onClick: () => removeChild(c.id),
                    },
                  ]}
                  sx={{ mb: 1 }}
                />
              );
            })}
          </Box>

          <PrimaryButton fullWidth disabled={!canSubmit} onClick={handleCreateAccount}>
            Criar Conta
          </PrimaryButton>
        </WhiteCard>
      </Box>
    </GradientBackground>
  );
};

export default CreateProfilesPage;
