/**
 * Alexandre Brrissos 21131
 * Descrição: Formulário de perfil de criança com upload de avatar.
 * - Funções < 30 linhas (hook + subcomponentes pequenos)
 * - Comentários/JSDoc claros
 */

import React, { useEffect, useState } from "react";
import { Box, Button, Stack, TextField } from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { AvatarUpload, SelectableOptions } from "@bibliotecario/ui-web";

/* ---------- Tipos ---------- */
export interface ChildProfile {
  id: string;
  avatar?: string;
  firstName: string;
  lastName: string;
  birthDate: string; // YYYY-MM-DD
  gender: "M" | "F" | "O";
}
interface Props {
  onSave: (child: ChildProfile, isEdit: boolean) => void;
  editing?: ChildProfile | null;
}

/* ---------- Helpers ---------- */
/** Gera ID temporário estável para novos registos. */
const makeTempId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `tmp_${Math.random().toString(36).slice(2)}`;

/* ---------- Hook ---------- */
/**
 * Encapsula estado/handlers do formulário.
 * - Preenche com dados ao entrar em modo edição.
 * - Gera ID temporário em novos registos.
 */
function useChildProfileForm({ onSave, editing }: Props) {
  const [avatar, setAvatar] = useState<string | null>(null);
  const [data, setData] = useState<Omit<ChildProfile, "id" | "avatar">>({
    firstName: "",
    lastName: "",
    birthDate: "",
    gender: "M",
  });

  useEffect(() => {
    if (!editing) return;
    setAvatar(editing.avatar ?? null);
    setData({
      firstName: editing.firstName,
      lastName: editing.lastName,
      birthDate: editing.birthDate ?? "",
      gender: editing.gender,
    });
  }, [editing]);

  const handle =
    (field: keyof typeof data) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setData((prev) => ({ ...prev, [field]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const child: ChildProfile = {
      id: editing ? editing.id : makeTempId(),
      avatar: avatar ?? undefined,
      ...data,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
    };
    onSave(child, Boolean(editing));
    if (!editing) {
      setAvatar(null);
      setData({ firstName: "", lastName: "", birthDate: "", gender: "M" });
    }
  };

  return { avatar, setAvatar, data, setData, handle, submit };
}

/* ---------- Subcomponentes de UI (pequenos) ---------- */

/** Bloco de avatar centralizado. */
function ChildAvatarBlock({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  return (
    <Box display="flex" justifyContent="center" mb={1}>
      <AvatarUpload
        value={value ?? undefined}
        onChange={(_, url) => onChange(url)}
        size={80}
      />
    </Box>
  );
}

/** Campos de nome próprio e apelido. */
function NameFields({
  firstName,
  lastName,
  onFirst,
  onLast,
}: {
  firstName: string;
  lastName: string;
  onFirst: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLast: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <>
      <Grid item xs={12}>
        <TextField
          fullWidth
          size="small"
          label="Primeiro Nome"
          value={firstName}
          onChange={onFirst}
          required
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          size="small"
          label="Último Nome"
          value={lastName}
          onChange={onLast}
          required
        />
      </Grid>
    </>
  );
}

/** Campo de data + seleção de género. */
function BirthAndGenderFields({
  birthDate,
  gender,
  onBirth,
  onGender,
}: {
  birthDate: string;
  gender: ChildProfile["gender"];
  onBirth: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onGender: (v: ChildProfile["gender"]) => void;
}) {
  return (
    <>
      <Grid item xs={12}>
        <TextField
          fullWidth
          size="small"
          type="date"
          label="Data de Nascimento"
          value={birthDate}
          onChange={onBirth}
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
            { value: "M", label: "Masculino" },
            { value: "F", label: "Feminino" },
            { value: "O", label: "Outro" },
          ]}
          value={gender}
          onChange={(val) => onGender(val as ChildProfile["gender"])}
          sx={{ "& .MuiFormControlLabel-root": { mr: 3 } }}
        />
      </Grid>
    </>
  );
}

/** Linha com botão de submissão. */
function SubmitRow({ isEdit }: { isEdit: boolean }) {
  return (
    <Grid item xs={12}>
      <Stack direction="row" justifyContent="flex-end">
        <Button variant="contained" type="submit" size="large">
          {isEdit ? "Guardar alterações" : "Adicionar criança"}
        </Button>
      </Stack>
    </Grid>
  );
}

/* ---------- Componente principal ---------- */
/**
 * Formulário de perfil de criança.
 * Usa o hook para estado/handlers e subcomponentes pequenos para a UI.
 */
const ChildProfileForm: React.FC<Props> = (props) => {
  const { avatar, setAvatar, data, handle, submit, setData } =
    useChildProfileForm(props);
  const isEdit = Boolean(props.editing);

  return (
    <Box component="form" onSubmit={submit} noValidate>
      <ChildAvatarBlock value={avatar} onChange={setAvatar} />
      <Grid container spacing={2}>
        <NameFields
          firstName={data.firstName}
          lastName={data.lastName}
          onFirst={handle("firstName")}
          onLast={handle("lastName")}
        />
        <BirthAndGenderFields
          birthDate={data.birthDate}
          gender={data.gender}
          onBirth={handle("birthDate")}
          onGender={(g) => setData((prev) => ({ ...prev, gender: g }))}
        />
        <SubmitRow isEdit={isEdit} />
      </Grid>
    </Box>
  );
};

export default ChildProfileForm;
