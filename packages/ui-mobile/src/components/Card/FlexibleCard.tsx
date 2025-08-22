// packages/ui-mobile/src/components/Card/FlexibleCard.tsx
import * as React from "react";
import {
  View,
  StyleSheet,
  ViewStyle,
  Image,
  ScrollView,
  ImageSourcePropType,
} from "react-native";
import { Surface, Text, TouchableRipple, useTheme } from "react-native-paper";
import type { MD3Elevation } from "react-native-paper/lib/typescript/types";

export type FlexibleCardProps = {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  images?: (string | ImageSourcePropType)[];
  carouselHeight?: number;
  carouselGap?: number;
  imageRadius?: number;
  backgroundColor?: string;
  elevation?: MD3Elevation;
  padding?: number;
  style?: ViewStyle;
  onPress?: () => void;
  accessibilityLabel?: string;
};

const FlexibleCard: React.FC<FlexibleCardProps> = ({
  title,
  subtitle,
  children,
  header,
  footer,
  images,
  carouselHeight = 160,
  carouselGap = 8,
  imageRadius = 12,
  backgroundColor,
  elevation = 1 as MD3Elevation,
  padding = 16,
  style,
  onPress,
  accessibilityLabel,
}) => {
  const theme = useTheme();
  const bg = backgroundColor ?? theme.colors.surfaceVariant;

  const Body = (
    <View style={[styles.clip, { borderRadius: 16 }]}>
      <View style={[styles.inner, { padding }]}>
        {header ? <View style={{ marginBottom: 8 }}>{header}</View> : null}

        {(title || subtitle) && (
          <View style={{ marginBottom: children || images ? 8 : 0 }}>
            {title ? (
              <Text
                variant="titleMedium"
                style={{ fontWeight: "700", color: theme.colors.onSurface }}
              >
                {title}
              </Text>
            ) : null}
            {subtitle ? (
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onSurfaceVariant, marginTop: title ? 4 : 0 }}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
        )}

        {images && images.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: carouselGap }}
            style={{ marginBottom: children ? 12 : 0 }}
          >
            {images.map((src, idx) => (
              <Image
                key={idx}
                source={typeof src === "string" ? { uri: src } : src}
                style={{
                  width: carouselHeight * 1.4,
                  height: carouselHeight,
                  borderRadius: imageRadius,
                  backgroundColor: theme.colors.surface,
                }}
                resizeMode="cover"
                accessible
                accessibilityRole="image"
              />
            ))}
          </ScrollView>
        )}

        {children}

        {footer ? <View style={{ marginTop: 12 }}>{footer}</View> : null}
      </View>
    </View>
  );

  return (
    <Surface
      elevation={elevation}
      style={[styles.card, { backgroundColor: bg }, style]} // <- sem overflow aqui
    >
      {onPress ? (
        <TouchableRipple
          onPress={onPress}
          borderless
          style={{ borderRadius: 16 }}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ?? title ?? "Cartão"}
        >
          <View>{Body}</View>
        </TouchableRipple>
      ) : (
        Body
      )}
    </Surface>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    width: "100%",
    alignSelf: "center",
  },
  // clipping de conteúdo para respeitar o raio, sem quebrar sombra do Surface
  clip: {
    overflow: "hidden",
  },
  inner: {
    width: "100%",
  },
});

export default FlexibleCard;
