import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'


// src/main.tsx
import '@fontsource/poppins/400.css';  // regular
import '@fontsource/poppins/500.css';  // semi-bold
import '@fontsource/poppins/600.css';  // bold
import { BibliotecarioThemeProvider } from 'bibliotecario-ui';


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BibliotecarioThemeProvider>
      <App />
    </BibliotecarioThemeProvider>
  </StrictMode>,
)
