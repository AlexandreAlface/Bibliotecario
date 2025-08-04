import { createBrowserRouter } from 'react-router-dom';
import { Login } from '../pages/auth/Login';
import CreateAccount from '../pages/auth/CreateAccount';

export const router = createBrowserRouter([
  { path: '/', element: <Login /> },
  { path: '/criar-conta', element: <CreateAccount  /> },
  
]);
