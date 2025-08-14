import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { useTheme } from "react-native-paper";
const ProgressBar = ({ progress, color, height = 8, backgroundColor, borderRadius = 4, style, animationDuration = 300, }) => {
    const theme = useTheme();
    const animatedValue = useRef(new Animated.Value(progress)).current;
    useEffect(() => {
        Animated.timing(animatedValue, {
            toValue: progress,
            duration: animationDuration,
            useNativeDriver: false, // largura não pode usar native driver
        }).start();
    }, [progress, animationDuration, animatedValue]);
    const barColor = color || theme.colors.primary;
    const bgColor = backgroundColor || theme.colors.surfaceVariant;
    const widthInterpolated = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: ["0%", "100%"],
    });
    return (_jsx(View, { style: [
            styles.container,
            { height, borderRadius, backgroundColor: bgColor },
            style,
        ], accessible: true, accessibilityRole: "progressbar", accessibilityValue: { now: Math.round(progress * 100), min: 0, max: 100 }, children: _jsx(Animated.View, { style: {
                width: widthInterpolated,
                height: "100%",
                backgroundColor: barColor,
                borderRadius,
            } }) }));
};
const styles = StyleSheet.create({
    container: {
        overflow: "hidden",
    },
});
export default ProgressBar;
//# sourceMappingURL=ProgressBar.js.map