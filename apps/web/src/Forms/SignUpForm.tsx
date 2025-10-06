/**
 * Alexandre Brrissos 21131
 * Descrição: Formulário de registo (família) com validação Zod + RHF.
 * - Funções < 30 linhas (hook + subcomponentes pequenos)
 * - Comentários/JSDoc e coerções PT (telefone, CC, CP)
 */
import React from "react";
import Grid from "@mui/material/GridLegacy";
import { Box, MenuItem } from "@mui/material";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  BaseTextField,
  EmailField,
  PasswordField,
  PrimaryButton,
  SecondaryButton,
} from "@bibliotecario/ui-web";
import { FamilySignupDraftSchema, type FamilySignupDraft } from "../interfaces/auth";
import { http } from "@/services/https";

/* ---------- Validações PT ---------- */
const clean = (s: string) => String(s || "").replace(/\s+/g, "").toUpperCase();
const citizenCardRegex = /^\d{8}[0-9A-Z]{4}$/; // 8 dígitos + 4 alfanum.
const phoneRegex = /^(?:2\d{8}|9\d{8})$/; // 2xxxxxxxx/9xxxxxxxx
const postalCodeRegex = /^\d{4}-\d{3}$/; // 1234-567

/* ---------- Schema do Form (INPUT) ---------- */
const SignUpFormSchema = z
  .object({
    firstName: z.string().min(1, "Obrigatório"),
    lastName: z.string().min(1, "Obrigatório"),
    email: z.string().email("E-mail inválido"),
    phone: z
      .string()
      .optional()
      .transform((v) => (v ?? "").trim())
      .refine((v) => v === "" || phoneRegex.test(v), "Telefone inválido"),
    citizenCard: z
      .string()
      .optional()
      .transform((v) => clean(v ?? ""))
      .refine((v) => v === "" || citizenCardRegex.test(v), "Cartão de Cidadão inválido"),
    address: z
      .string()
      .optional()
      .transform((v) => (v ?? "").trim())
      .refine((v) => v === "" || v.length >= 5, "Morada muito curta"),
    postalCode: z
      .string()
      .optional()
      .transform((v) => (v ?? "").trim())
      .refine((v) => v === "" || postalCodeRegex.test(v), "Código-postal inválido"),
    // Select pode devolver número ou string vazia
    libraryId: z.union([z.number().int().positive(), z.literal("")]).optional(),
    password: z.string().min(8, "Mínimo 8 caracteres"),
    confirmPassword: z.string().min(8, "Mínimo 8 caracteres"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "As passwords não coincidem",
  });

type SignUpFormValues = z.input<typeof SignUpFormSchema>;
type Library = { id: number; name: string };

export interface SignUpFormProps {
  onSubmit?: (data: FamilySignupDraft) => void;
  onBack?: () => void;
}

/* ---------- Hook: bibliotecas ---------- */
/** Carrega bibliotecas públicas para o selector. */
function useLibraries() {
  const [libraries, setLibraries] = React.useState<Library[]>([]);
  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await http<{ items?: Library[] } | Library[]>({
          url: "/public/libraries",
          method: "GET",
        });
        if (!alive) return;
        const arr = Array.isArray(res) ? res : res?.items ?? [];
        setLibraries(arr);
      } catch {
        setLibraries([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  return libraries;
}

/* ---------- Subcomponentes pequenos ---------- */

function NameFields({
  control,
  errors,
}: {
  control: any;
  errors: any;
}) {
  return (
    <>
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
    </>
  );
}

function EmailRow({ control }: { control: any }) {
  return (
    <Grid item xs={12}>
      <Controller
        name="email"
        control={control}
        render={({ field, fieldState }) => {
          const { ref, ...rest } = field;
          return (
            <EmailField
              {...rest}
              inputRef={ref}
              label="Email"
              fullWidth
              error={!!fieldState.error}
              helperText={fieldState.error?.message}
            />
          );
        }}
      />
    </Grid>
  );
}

function PhoneCcRow({
  control,
  errors,
}: {
  control: any;
  errors: any;
}) {
  return (
    <>
      <Grid item xs={12} md={6}>
        <Controller
          name="phone"
          control={control}
          render={({ field }) => (
            <BaseTextField
              {...field}
              fullWidth
              label="Telefone"
              placeholder="9xxxxxxxx ou 2xxxxxxxx"
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
              placeholder="12345678 1ZZ1"
              error={!!errors.citizenCard}
              helperText={errors.citizenCard?.message}
            />
          )}
        />
      </Grid>
    </>
  );
}

function AddressPostalRow({
  control,
  errors,
}: {
  control: any;
  errors: any;
}) {
  return (
    <>
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
              placeholder="1234-567"
              error={!!errors.postalCode}
              helperText={errors.postalCode?.message}
            />
          )}
        />
      </Grid>
    </>
  );
}

function LibrarySelectRow({
  control,
  libraries,
  error,
}: {
  control: any;
  libraries: Library[];
  error?: any;
}) {
  return (
    <Grid item xs={12}>
      <Controller
        name="libraryId"
        control={control}
        render={({ field }) => (
          <BaseTextField
            {...field}
            select
            fullWidth
            label="Biblioteca"
            helperText="Seleciona a biblioteca a que vais pertencer"
            error={!!error}
          >
            <MenuItem value="">— Selecionar —</MenuItem>
            {libraries.map((l) => (
              <MenuItem key={l.id} value={l.id}>
                {l.name}
              </MenuItem>
            ))}
          </BaseTextField>
        )}
      />
    </Grid>
  );
}

function PasswordRows({ control }: { control: any }) {
  return (
    <>
      <Grid item xs={12} md={6}>
        <Controller
          name="password"
          control={control}
          render={({ field, fieldState }) => {
            const { ref, ...rest } = field;
            return (
              <PasswordField
                {...rest}
                inputRef={ref}
                fullWidth
                label="Palavra-passe"
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
              />
            );
          }}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <Controller
          name="confirmPassword"
          control={control}
          render={({ field, fieldState }) => {
            const { ref, ...rest } = field;
            return (
              <PasswordField
                {...rest}
                inputRef={ref}
                fullWidth
                label="Confirmar palavra-passe"
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
              />
            );
          }}
        />
      </Grid>
    </>
  );
}

function ButtonsRow({
  onBack,
  isSubmitting,
}: {
  onBack?: () => void;
  isSubmitting: boolean;
}) {
  return (
    <Grid item xs={12} container justifyContent="space-between">
      <SecondaryButton type="button" onClick={onBack}>
        Voltar
      </SecondaryButton>
      <PrimaryButton type="submit" disabled={isSubmitting}>
        {isSubmitting ? "A validar…" : "Seguinte"}
      </PrimaryButton>
    </Grid>
  );
}

/* ---------- Componente principal ---------- */
/**
 * Orquestra o form RHF + validação e delega UI nos subcomponentes.
 */
export default function SignUpForm({ onBack, onSubmit }: SignUpFormProps) {
  const libraries = useLibraries();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(SignUpFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      citizenCard: "",
      address: "",
      postalCode: "",
      password: "",
      confirmPassword: "",
      libraryId: "",
    },
    mode: "onBlur",
  });

  const submit = (values: SignUpFormValues) => {
    const draft: FamilySignupDraft = {
      fullName: `${values.firstName} ${values.lastName}`.trim(),
      email: values.email,
      phone: values.phone || undefined,
      citizenCard: values.citizenCard || undefined,
      address: values.address || undefined,
      postalCode: values.postalCode || undefined,
      password: values.password,
      libraryId: typeof values.libraryId === "number" ? values.libraryId : undefined,
    };
    FamilySignupDraftSchema.parse(draft); // validação final “oficial”
    onSubmit?.(draft);
  };

  return (
    <Box component="form" onSubmit={handleSubmit(submit)} noValidate>
      <Grid container spacing={3}>
        <NameFields control={control} errors={errors} />
        <EmailRow control={control} />
        <PhoneCcRow control={control} errors={errors} />
        <AddressPostalRow control={control} errors={errors} />
        <LibrarySelectRow control={control} libraries={libraries} error={errors.libraryId} />
        <PasswordRows control={control} />
        <ButtonsRow onBack={onBack} isSubmitting={isSubmitting} />
      </Grid>
    </Box>
  );
}
