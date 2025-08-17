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
    /** Hora obrigatória: abre sempre após escolher a data */
    withTime?: boolean;
    /** Hora opcional: abre, mas se cancelar fica só a data */
    withOptionalTime?: boolean;
    /** Se passares, mostra grelha de horários em vez do TimePicker */
    timeSlots?: TimeSlot[];
    /** iOS: usar picker nativo (sem slots) */
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
/** Cria slots automaticamente: "09:00" → "18:00" a cada `stepMinutes` */
export declare function generateTimeSlots(startHHmm: string, endHHmm: string, stepMinutes: number, disabledTimes?: string[]): TimeSlot[];
export default DateTimeField;
