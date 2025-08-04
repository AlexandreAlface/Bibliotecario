import { Card } from '@mui/material';
import React from 'react';
export interface InfoStepCardProps {
    step: number | string;
    title: string;
    description: string;
    accentColor?: string;
    backgroundColor?: string;
    /** Diâmetro do círculo (px) – default 88 px */
    circleSize?: number;
    /** Largura do aro branco (px) – default 6 px */
    circleBorderWidth?: number;
    /** Cor do aro – default #fff */
    circleBorderColor?: string;
    cardProps?: React.ComponentProps<typeof Card>;
}
declare const InfoStepCard: React.FC<InfoStepCardProps>;
export default InfoStepCard;
