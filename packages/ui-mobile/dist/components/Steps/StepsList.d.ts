import * as React from "react";
import { ViewStyle } from "react-native";
import { StepCardProps } from "./StepCard";
/**
 * Agrupa vários Steps verticalmente com espaçamento e padding.
 */
export type StepsListItem = Omit<StepCardProps, "elevation"> & {
    elevation?: StepCardProps["elevation"];
};
export type StepsListProps = {
    steps: StepsListItem[];
    spacing?: number;
    horizontalPadding?: number;
    maxWidth?: number;
    style?: ViewStyle;
};
declare const StepsList: React.FC<StepsListProps>;
export default StepsList;
export type { StepCardProps } from "./StepCard";
