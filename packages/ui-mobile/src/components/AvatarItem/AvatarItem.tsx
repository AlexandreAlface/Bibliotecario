import * as React from "react";
import { View } from "react-native";
import type { AccessibilityRole } from "react-native";
import { List, Avatar, IconButton, useTheme } from "react-native-paper";

export type AvatarAction = {
  icon: React.ComponentProps<typeof IconButton>["icon"];
  onPress: () => void;
  accessibilityLabel?: string;
  disabled?: boolean;
  testID?: string;
};

export interface AvatarItemProps
  extends Omit<
    React.ComponentProps<typeof List.Item>,
    "title" | "description" | "left" | "right"
  > {
  label: string;
  description?: string;
  avatarSrc?: string;       // usar PNG/JPG (evitar SVG remoto)
  avatarSize?: number;
  actions?: AvatarAction[];
  accessibilityRole?: AccessibilityRole;
}

function getInitials(label: string) {
  const first = label.split(/[,\s]/).filter(Boolean)[0] ?? "";
  return first.slice(0, 1).toUpperCase();
}

export const AvatarItem: React.FC<AvatarItemProps> = ({
  label,
  description,
  avatarSrc,
  avatarSize = 40,
  actions = [],
  accessibilityRole,
  onPress,
  ...rest
}) => {
  const theme = useTheme();

  const left = () =>
    avatarSrc ? (
      <Avatar.Image size={avatarSize} source={{ uri: avatarSrc }} />
    ) : (
      <Avatar.Text
        size={avatarSize}
        label={getInitials(label)}
        style={{ backgroundColor: theme.colors.secondaryContainer }}
        labelStyle={{ fontFamily: "Poppins_600SemiBold" }}
      />
    );

  const right = () => (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      {actions.map((a, idx) => (
        <IconButton
          key={idx}
          icon={a.icon}
          onPress={a.onPress}
          disabled={a.disabled}
          accessibilityLabel={a.accessibilityLabel}
          testID={a.testID}
          size={20}
          style={idx > 0 ? { marginLeft: 4 } : undefined}
        />
      ))}
    </View>
  );

  return (
    <List.Item
      title={label}
      description={description}
      left={left}
      right={right}
      onPress={onPress}
      titleStyle={{ fontFamily: "Poppins_500Medium", fontSize: 16 }}
      descriptionStyle={{ fontFamily: "Poppins_400Regular" }}
      accessibilityRole={accessibilityRole ?? (onPress ? "button" : "text")}
      accessibilityLabel={label}
      {...rest}
    />
  );
};
