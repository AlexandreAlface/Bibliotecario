import { ViewStyle } from "react-native";
/** slot tipo agenda */
export type TimeSlot = {
    time: string;
    label?: string;
    disabled?: boolean;
};
export type DateTimeFieldProps = {
    label?: string;
    value: Date | null;
    onChange: (date: Date | null) => void;
    withTime?: boolean;
    withOptionalTime?: boolean;
    timeSlots?: TimeSlot[];
    iosNativeTimePicker?: boolean;
    minimumDate?: Date;
    maximumDate?: Date;
    error?: boolean;
    helperText?: string;
    fullWidth?: boolean;
    style?: ViewStyle | ViewStyle[];
    use24Hour?: boolean;
    locale?: string;
    readOnly?: boolean;
    disabled?: boolean;
};
export declare function DateTimeField({ label, value, onChange, withTime, withOptionalTime, timeSlots, iosNativeTimePicker, minimumDate, maximumDate, error, helperText, fullWidth, style, use24Hour, locale, readOnly, disabled, }: DateTimeFieldProps): import("react/jsx-runtime").JSX.Element;
export declare function generateTimeSlots(startHHmm: string, endHHmm: string, stepMinutes: number, disabledTimes?: string[]): TimeSlot[];
export default DateTimeField;
