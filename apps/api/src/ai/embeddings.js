import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.EMBEDDING_MODEL ?? "text-embedding-3-small";

export async function embedOne(text) {
  const r = await openai.embeddings.create({ model: MODEL, input: text });
  return r.data[0].embedding;
}
