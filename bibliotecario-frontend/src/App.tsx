// bibliotecario-frontend/src/App.tsx
import { Button } from 'bibliotecario-ui';   // ou '@teu-scope/bibliotecario-ui'

export default function App() {
  return (
    <Button onClick={() => alert('Funciona!')}>
      Clique aqui
    </Button>
  );
}
