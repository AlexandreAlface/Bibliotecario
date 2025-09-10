// services/reservations.ts
import axios from "axios";
import { API_URL } from "./api";

export async function reserveBook(childId: number, isbn: string) {
  try {
    const { data } = await axios.post(
      `${API_URL}/reservations?childId=${childId}`,
      { isbn },
      { withCredentials: true }
    );
    return data; // { ok, id, reservedAt }
  } catch (err: any) {
    const status = err?.response?.status;
    const code = err?.response?.data?.error;
    if (status === 409 && code === "already_reading") {
      throw new Error("Já estás a ler este livro.");
    }
    if (status === 409 && code === "already_reserved") {
      throw new Error("Este livro já está reservado para esta criança.");
    }
    throw new Error("Não foi possível reservar. Tenta novamente.");
  }
}
