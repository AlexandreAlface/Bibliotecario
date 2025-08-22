import * as React from "react";
import { View, StyleSheet } from "react-native";
import { Text, IconButton, useTheme } from "react-native-paper";
import { Swipeable } from "react-native-gesture-handler";

export type NotificationItem = {
  id: string;
  title: string;
  subtitle?: string;
};

type Props = {
  item: NotificationItem;
  onDelete: (id: string) => void;
};

const SwipeableNotification: React.FC<Props> = ({ item, onDelete }) => {
  const theme = useTheme();

  // Botão visível ao arrastar para o lado
  const renderRightActions = () => (
    <View style={styles.rightAction}>
      <IconButton
        icon="delete"
        iconColor="#fff"
        size={20}
        onPress={() => onDelete(item.id)}
      />
    </View>
  );

  return (
    <Swipeable renderRightActions={renderRightActions}>
      <View style={styles.container}>
        <Text variant="titleSmall" style={styles.title}>
          {item.title}
        </Text>
        {item.subtitle && (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {item.subtitle}
          </Text>
        )}
      </View>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ddd",
  },
  title: {
    fontWeight: "600",
  },
  rightAction: {
    backgroundColor: "#e74c3c",
    justifyContent: "center",
    alignItems: "center",
    width: 64,
  },
});

export default SwipeableNotification;
