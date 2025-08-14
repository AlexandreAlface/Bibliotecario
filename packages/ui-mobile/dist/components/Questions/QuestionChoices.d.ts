import React from "react";
import { ImageSourcePropType, ViewStyle, TextStyle } from "react-native";
export type QuestionChoice = {
    id: string;
    label: string;
    image?: ImageSourcePropType;
    disabled?: boolean;
    accessibilityLabel?: string;
};
export interface QuestionChoicesProps {
    question: string;
    options: QuestionChoice[];
    visibleCount?: number;
    multiple?: boolean;
    value?: string | string[];
    onChange?: (value: string | string[]) => void;
    columns?: number;
    itemMinHeight?: number;
    gap?: number;
    style?: ViewStyle;
    itemStyle?: ViewStyle;
    itemTextStyle?: TextStyle;
    itemRadius?: number;
}
declare const QuestionChoices: React.FC<QuestionChoicesProps>;
export default QuestionChoices;
