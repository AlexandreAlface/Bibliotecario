
import { GradientBackgroundWithShapes } from '@bibliotecario/ui-web';
import { Box } from '@mui/material';

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <GradientBackgroundWithShapes>
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        {children}
      </Box>
    </GradientBackgroundWithShapes>
  );
}
