/**
 * Alexandre Brrissos 21131
 * Descrição: Schemas Zod para signup de família e perfis de filhos,
 *            com coerções (string->number), trims e validações leves.
 */
import { z } from "zod";

/* ---------- Comuns ---------- */

/** Género aceites no frontend (mantém labels do backend). */
export const GenderSchema = z.enum(["M", "F", "Outro"]);

/** ISO Date (YYYY-MM-DD) opcional. */
const IsoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (usar YYYY-MM-DD)")
  .optional();

/* ---------- Passo 1 (Família) ---------- */

/**
 * Draft de registo da família.
 * - `libraryId` aceita string numérica (coerce)
 * - campos de texto com `.trim()` para evitar espaços supérfluos
 * - `postalCode` valida formato PT (1234-567 ou 1234-567)
 */
export const FamilySignupDraftSchema = z.object({
  fullName: z.string().trim().min(1, "Obrigatório"),
  email: z.string().trim().email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
  phone: z.string().trim().optional(),
  citizenCard: z.string().trim().optional(),
  address: z.string().trim().optional(),
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{4}-?\d{3}$/, "Código postal inválido")
    .optional(),
  libraryId: z.coerce.number().int().positive().optional(),
});

export type FamilySignupDraft = z.infer<typeof FamilySignupDraftSchema>;

/* ---------- Filhos ---------- */

/**
 * Perfil de filho:
 * - `age` é `coerce.number()` (aceita input string)
 * - `birthDate` ISO (YYYY-MM-DD) opcional
 */
export const ChildInputSchema = z.object({
  firstName: z.string().trim().min(1, "Obrigatório"),
  lastName: z.string().trim().optional(),
  age: z.coerce.number().int().min(0).max(120).optional(),
  birthDate: IsoDate,
  gender: GenderSchema.optional(),
  readerProfile: z.string().trim().optional(),
});

export const ChildrenFormSchema = z.object({
  children: z.array(ChildInputSchema).min(1, "Adiciona pelo menos 1 perfil"),
});

export type ChildrenFormValues = z.infer<typeof ChildrenFormSchema>;

/* ---------- Payload final para API ---------- */

/** Payload final de registo = dados da família + array de filhos. */
export const RegisterPayloadSchema = FamilySignupDraftSchema.extend({
  children: z.array(ChildInputSchema),
});

export type RegisterPayload = z.infer<typeof RegisterPayloadSchema>;
