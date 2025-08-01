import { styled, Button as MuiButton, ButtonProps } from '@mui/material';

const PrimaryButton = styled(MuiButton)(({ theme }) => ({
  borderRadius: '2rem',
  textTransform: 'none',
  paddingInline: theme.spacing(3),
}));

export function Button(props: ButtonProps) {
  return <PrimaryButton color="primary" variant="contained" {...props} />;
}
