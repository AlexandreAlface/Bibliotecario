import React from 'react';
import { BoxProps } from '@mui/material';
export interface LogoProps extends BoxProps {
    width?: string | number;
    height?: string | number;
}
export declare const Logo: React.FC<LogoProps>;
