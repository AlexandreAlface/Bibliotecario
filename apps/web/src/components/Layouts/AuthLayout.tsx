import { GradientBackground } from 'bibliotecario-ui';
import { Box } from '@mui/material';

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <GradientBackground>
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        {children}
      </Box>
    </GradientBackground>
  );
}
