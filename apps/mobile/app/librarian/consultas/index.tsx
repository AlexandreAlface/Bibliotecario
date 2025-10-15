
// apps\mobile\app\librarian\consultas\index.tsx

import { Redirect } from "expo-router";

export default function ConsultasIndex() {
  // escolhe UMA das duas:
  return <Redirect href="/librarian/consultas/agenda" />;
  // return <Redirect href="/librarian/consultas/pendentes" />;
}
