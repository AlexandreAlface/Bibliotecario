import * as React from "react";
import { NavLink } from "react-router-dom"; // ou next/link se for Next
import type { WebUser } from "../services/auth";

// ícones: troca pelos da tua ui-web
const Icon = ({ children }: { children: React.ReactNode }) => (
  <span style={{ width: 22, display: "inline-flex", justifyContent: "center" }}>{children}</span>
);

type Item = { href: string; label: string; icon: React.ReactNode };

function itemsForRole(user: WebUser): Item[] {
  const asChild = !!user.actingChild;
  if (asChild) {
    return [
      { href: "/",              label: "Início",      icon: "🏠" },
      { href: "/suggestions",   label: "Sugestões",   icon: "📚" },
      { href: "/achievements",  label: "Conquistas",  icon: "⭐" },
      { href: "/agenda",        label: "Agenda",      icon: "🗓️" },
    ];
  }
  const role = user.roles?.[0] || "FAMÍLIA";
  if (role === "BIBLIOTECÁRIO") {
    return [
      { href: "/",                label: "Início",               icon: "🏠" },
      { href: "/consultas/admin", label: "Gestão de Consultas",  icon: "📋" },
      { href: "/eventos/admin",   label: "Gestão de Eventos",    icon: "🎟️" },
      { href: "/familias",        label: "Famílias",             icon: "👪" },
      { href: "/gamificacao",     label: "Gamificação",          icon: "🏆" },
      { href: "/definicoes",      label: "Definições",           icon: "⚙️" },
    ];
  }
  // FAMÍLIA
  return [
    { href: "/",              label: "Início",      icon: "🏠" },
    { href: "/suggestions",   label: "Sugestões",   icon: "📚" },
    { href: "/achievements",  label: "Conquistas",  icon: "⭐" },
    { href: "/agenda",        label: "Agenda",      icon: "🗓️" },
    { href: "/consultas",     label: "Consultas",   icon: "👩‍⚕️" },
    { href: "/familia",       label: "Família",     icon: "👪" },
    { href: "/feed",          label: "Feed",        icon: "📰" },
  ];
}

export default function RoleSidebar({ user }: { user: WebUser }) {
  const items = itemsForRole(user);
  return (
    <aside style={{ width: 220, padding: 16, borderRight: "1px solid rgba(0,0,0,.06)" }}>
      <div style={{ fontWeight: 700, marginBottom: 16 }}>
        {user.actingChild ? `Ativo: ${user.actingChild.name}` : user.fullName}
      </div>
      <nav style={{ display: "grid", gap: 8 }}>
        {items.map((it) => (
          <NavLink
            key={it.href}
            to={it.href}
            style={({ isActive }) => ({
              padding: "10px 12px",
              borderRadius: 10,
              textDecoration: "none",
              color: isActive ? "#22577A" : "inherit",
              background: isActive ? "rgba(34,87,122,.10)" : "transparent",
              display: "flex", alignItems: "center", gap: 10,
            })}
          >
            <Icon>{it.icon}</Icon>{it.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
