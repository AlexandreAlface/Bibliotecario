import React, { useEffect, useState } from 'react';
import { Box, Button, Stack, TextField } from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { AvatarUpload, SelectableOptions } from 'bibliotecario-ui';

/* ---------- Tipos ---------- */
export interface ChildProfile {
  id: string;
  avatar?: string;
  firstName: string;
  lastName: string;
  birthDate: string;           // YYYY-MM-DD
  gender: 'M' | 'F' | 'O';
}

interface Props {
  onSave: (child: ChildProfile, isEdit: boolean) => void;
  editing?: ChildProfile | null;
}

/* ---------- Componente ---------- */
const ChildProfileForm: React.FC<Props> = ({ onSave, editing }) => {
  const [avatar, setAvatar] = useState<string | null>(null);
  const [data, setData] = useState<Omit<ChildProfile, 'id' | 'avatar'>>({
    firstName: '',
    lastName: '',
    birthDate: '',
    gender: 'M',
  });

  /* quando entra em modo edição, preenche o formulário */
  useEffect(() => {
    if (editing) {
      setAvatar(editing.avatar ?? null);
      setData({
        firstName: editing.firstName,
        lastName: editing.lastName,
        birthDate: editing.birthDate ?? '',
        gender: editing.gender,
      });
    }
  }, [editing]);

  const handle =
    (field: keyof typeof data) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setData({ ...data, [field]: e.target.value });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const child: ChildProfile = {
      id: editing ? editing.id : (globalThis.crypto?.randomUUID?.() ?? `tmp_${Math.random().toString(36).slice(2)}`),
      avatar: avatar ?? undefined,
      ...data,
    };
    onSave(child, Boolean(editing));
    /* reset apenas se for nova criança */
    if (!editing) {
      setAvatar(null);
      setData({ firstName: '', lastName: '', birthDate: '', gender: 'M' });
    }
  };

  return (
    <Box component="form" onSubmit={submit} noValidate>
      <Box display="flex" justifyContent="center" mb={1}>
        <AvatarUpload
          value={avatar ?? undefined}
          onChange={(_, url) => setAvatar(url)}
          size={80}
        />
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            size="small"
            label="Primeiro Nome"
            value={data.firstName}
            onChange={handle('firstName')}
            required
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            size="small"
            label="Último Nome"
            value={data.lastName}
            onChange={handle('lastName')}
            required
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            size="small"
            type="date"
            label="Data de Nascimento"
            value={data.birthDate}
            onChange={handle('birthDate')}
            InputLabelProps={{ shrink: true }}
            required
          />
        </Grid>
        <Grid item xs={12}>
          <SelectableOptions
            label="Género"
            variant="radio"
            row
            options={[
              { value: 'M', label: 'Masculino' },
              { value: 'F', label: 'Feminino' },
              { value: 'O', label: 'Outro' },
            ]}
            value={data.gender}
            onChange={(val) =>
              setData({ ...data, gender: val as ChildProfile['gender'] })
            }
            sx={{ '& .MuiFormControlLabel-root': { mr: 3 } }}
          />
        </Grid>
        <Grid item xs={12}>
          <Stack direction="row" justifyContent="flex-end">
            <Button variant="contained" type="submit" size="large">
              {editing ? 'Guardar alterações' : 'Adicionar criança'}
            </Button>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ChildProfileForm;
