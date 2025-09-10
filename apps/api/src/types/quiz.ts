import z from "zod";

export const QuizAnswerSchema = z.object({
  id: z.string(),          // OBRIGATÓRIO
  value: z.unknown(),      // usa unknown/any conforme preferires
});
export type QuizAnswer = z.infer<typeof QuizAnswerSchema>;

export const QuizBodySchema = z.object({
  answers: z.array(QuizAnswerSchema).nonempty(),
});
export type QuizBody = z.infer<typeof QuizBodySchema>;
