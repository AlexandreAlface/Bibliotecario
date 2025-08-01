import { jsx } from 'react/jsx-runtime';
import { styled, Button as Button$1 } from '@mui/material';

const PrimaryButton = styled(Button$1)(({ theme }) => ({
    borderRadius: '2rem',
    textTransform: 'none',
    paddingInline: theme.spacing(3),
}));
function Button(props) {
    return jsx(PrimaryButton, { color: "primary", variant: "contained", ...props });
}

export { Button };
//# sourceMappingURL=index.js.map
