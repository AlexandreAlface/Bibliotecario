// apps\web\src\pages\Logout.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function Logout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        await logout();
      } finally {
        navigate("/auth/login", { replace: true });
      }
    })();
  }, [logout, navigate]);

  return null; // podes mostrar um spinner se quiseres
}
