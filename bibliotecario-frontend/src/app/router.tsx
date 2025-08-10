import { createBrowserRouter } from 'react-router-dom';
import { Login } from '../pages/auth/Login';
import CreateAccount from '../pages/auth/CreateAccount';
import CreateProfilesPage from '../pages/auth/CreateProfilesPage';

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/', element: <Login /> },
  { path: '/criar-conta', element: <CreateAccount  /> },
  { path: '/criar-conta-filhos', element: <CreateProfilesPage  /> },  
]);
