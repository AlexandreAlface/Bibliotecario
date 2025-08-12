import { styled, shouldForwardProp } from '@mui/system';
import { TextField, type TextFieldProps } from '@mui/material';

export interface BaseProps {
  radius?: number;
  px?: number;
  py?: number;
}

export const BaseTextField = styled(TextField, {
  shouldForwardProp: (prop) =>
    shouldForwardProp(prop) && !['radius', 'px', 'py'].includes(prop as string),
})<TextFieldProps & BaseProps>(
  ({ theme, radius = 3, px = 2, py = 1.5 }) => ({
    '& .MuiOutlinedInput-root': {
      borderRadius: theme.spacing(radius),

      '& input': {
        padding: theme.spacing(py, px),
        fontSize:
          // pxToRem não está tipado em versões antigas, usa fallback
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (theme.typography as any).pxToRem
            ? // @ts-expect-error – método não existe nos tipos antigos
              theme.typography.pxToRem(14)
            : '0.875rem',
        lineHeight: 1.25,
      },

      '& fieldset': { borderColor: theme.palette.grey[400] },
      '&:hover fieldset': { borderColor: theme.palette.primary.main },
      '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main },
    },

    '& .MuiInputLabel-root': {
      fontSize:
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (theme.typography as any).pxToRem
          ? // @ts-expect-error idem
            theme.typography.pxToRem(14)
          : '0.875rem',
      lineHeight: 1.2,
    },
    '& .MuiInputLabel-shrink': {
      transform: 'translate(14px, -6px) scale(0.85)',
    },
  }),
);
