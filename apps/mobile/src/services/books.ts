// src/services/books.ts
import { api } from './api';

export type BookLite = {
  id: string;            // ISBN (ou string id)
  title: string;
  author?: string;
  date?: string;         // usado para “Leituras atuais”
  coverUrl?: string | null;
};

export async function getLeiturasAtuais(limit = 2): Promise<BookLite[]> {
  // Router: GET /books/current?limit=2
  const rows = await api<any[]>(`/books/current?limit=${limit}`);
  return rows.map((b) => ({
    id: String(b.id ?? b.isbn ?? b.ISBN ?? Math.random()),
    title: b.title,
    author: b.author ?? b.autor ?? undefined,
    date: b.date ?? undefined,
    coverUrl: b.coverUrl ?? null,
  }));
}

export async function getSugestoes(limit = 2): Promise<BookLite[]> {
  // Router: GET /books/suggestions?limit=2
  const rows = await api<any[]>(`/books/suggestions?limit=${limit}`);
  return rows.map((b) => ({
    id: String(b.id ?? b.isbn ?? b.ISBN ?? Math.random()),
    title: b.title,
    author: b.author ?? undefined,
    coverUrl: b.coverUrl ?? null,
  }));
}
