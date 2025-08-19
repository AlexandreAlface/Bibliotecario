// src/app/router.tsx
import { createBrowserRouter, Navigate } from 'react-router-dom';
import Login from '@/pages/auth/Login';
import CreateAccount from '@/pages/auth/CreateAccount';
import CreateProfilesPage from '@/pages/auth/CreateProfilesPage';
import LandingPage from '@/pages';
import { requireAuthLoader } from './route-loaders';

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/criar-conta', element: <CreateAccount /> },
  { path: '/criar-conta-filhos', element: <CreateProfilesPage /> },

  // “/” só abre se o loader devolver o utilizador; caso contrário, redireciona
  { path: '/', element: <LandingPage />, loader: requireAuthLoader },

  { path: '*', element: <Navigate to="/" replace /> },
]);
