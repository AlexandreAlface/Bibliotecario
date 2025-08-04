import ReactDOM from 'react-dom/client';
import { BibliotecarioThemeProvider } from 'bibliotecario-ui';
import { RouterProvider } from 'react-router-dom';
import { router } from './app/router';


ReactDOM.createRoot(document.getElementById('root')!).render(
  <BibliotecarioThemeProvider>
    <RouterProvider router={router} />
  </BibliotecarioThemeProvider>
);
