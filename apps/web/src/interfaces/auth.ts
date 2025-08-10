// src/interfaces/auth.ts
import { z } from 'zod';

/* ---------- Comuns ---------- */
export const GenderSchema = z.enum(['M', 'F', 'Outro']);

/* ---------- Passo 1 (Família) ---------- */
export const FamilySignupDraftSchema = z.object({
  fullName: z.string().min(1, 'Obrigatório'),
  email: z.string().email('E-mail inválido'),
  phone: z.string().optional(),
  citizenCard: z.string().optional(),
  address: z.string().optional(),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  readerProfile: z.string().optional(),
});
export type FamilySignupDraft = z.infer<typeof FamilySignupDraftSchema>;

/* ---------- Filhos ---------- */
export const ChildInputSchema = z.object({
  firstName: z.string().min(1, 'Obrigatório'),
  lastName: z.string().optional(),
  // COERCE: converte string->number vindas do <input type="number">
  age: z.coerce.number().int().min(0).max(120).optional(),
  birthDate: z.string().optional(), // YYYY-MM-DD
  gender: GenderSchema.optional(),
  readerProfile: z.string().optional(),
});

export const ChildrenFormSchema = z.object({
  children: z.array(ChildInputSchema).min(1, 'Adiciona pelo menos 1 perfil'),
});

// (se precisares noutros sítios, também podes exportar)
export type ChildrenFormValues = z.infer<typeof ChildrenFormSchema>;

/* ---------- Payload final para API ---------- */
export const RegisterPayloadSchema = FamilySignupDraftSchema.extend({
  children: z.array(ChildInputSchema),
});
export type RegisterPayload = z.infer<typeof RegisterPayloadSchema>;
