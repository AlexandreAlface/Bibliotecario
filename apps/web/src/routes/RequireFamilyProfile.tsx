// src/routes/RequireFamilyProfile.tsx
import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useUserSession } from "@/contexts/UserSession";

export default function RequireFamilyProfile() {
  const { loading, isFamily, isAdmin, isLibrarian, asChild, user } = useUserSession();

  if (loading) return null; // evita redirecionar enquanto carrega

  // Staff e quem não é família nunca é forçado a escolher perfil
  if (isAdmin || isLibrarian || !isFamily) {
    return <Outlet />;
  }

  const hasKids = (user?.children?.length ?? 0) > 0;
  const choseFamilyMode = sessionStorage.getItem("familyMode") === "1";
  const mustPick = hasKids && !asChild && !choseFamilyMode;

  return mustPick ? <Navigate to="/profiles" replace /> : <Outlet />;
}
