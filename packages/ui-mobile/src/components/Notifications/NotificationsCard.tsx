import * as React from "react";
import { View, StyleSheet, ViewStyle, ScrollView, Animated } from "react-native";
import {
  Surface,
  Text,
  useTheme,
  List,
  IconButton,
  Divider,
  ActivityIndicator,
} from "react-native-paper";
import type { MD3Elevation } from "react-native-paper/lib/typescript/types";
import { Swipeable } from "react-native-gesture-handler";

export type NotificationItem = {
  id: string;
  title: string;
  subtitle?: string;
  read?: boolean;
  leftIcon?: string;
  accessibilityLabel?: string;
};

export type NotificationsCardProps = {
  items: NotificationItem[];
  headerTitle?: string;
  onItemPress?: (item: NotificationItem) => void;
  onItemDelete?: (item: NotificationItem) => void;
  onClearAll?: () => void;
  loading?: boolean;
  emptyText?: string;
  maxHeight?: number;
  elevation?: MD3Elevation;
  style?: ViewStyle;

  /** Ativa gesto de arrastar para apagar (direita->esquerda) */
  swipeToDelete?: boolean;
};

const ACTION_WIDTH = 64;

const NotificationsCard: React.FC<NotificationsCardProps> = ({
  items,
  headerTitle = "Notificações",
  onItemPress,
  onItemDelete,
  onClearAll,
  loading = false,
  emptyText = "Sem notificações",
  maxHeight = 320,
  elevation = 2 as MD3Elevation,
  style,
  swipeToDelete = false,
}) => {
  const theme = useTheme();

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    item: NotificationItem,
    close?: () => void
  ) => {
    return (
      <View
        style={[
          styles.action,
          { backgroundColor: theme.colors.error, width: ACTION_WIDTH },
        ]}
      >
        <IconButton
          icon="delete"
          accessibilityLabel={`Apagar "${item.title}"`}
          iconColor={theme.colors.onError}
          onPress={() => {
            close?.();
            onItemDelete?.(item);
          }}
        />
      </View>
    );
  };

  const Row: React.FC<{ item: NotificationItem; last: boolean }> = ({
    item,
    last,
  }) => {
    const swipeRef = React.useRef<Swipeable>(null);

    const content = (
      <View>
        <List.Item
          title={item.title}
          description={item.subtitle}
          onPress={onItemPress ? () => onItemPress(item) : undefined}
          accessibilityRole={onItemPress ? "button" : "text"}
          accessibilityLabel={
            item.accessibilityLabel ??
            [item.title, item.subtitle].filter(Boolean).join(". ")
          }
          titleStyle={{
            fontWeight: "700",
            color: item.read ? theme.colors.onSurfaceVariant : theme.colors.onSurface,
          }}
          descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
          left={
            item.leftIcon ? (props) => <List.Icon {...props} icon={item.leftIcon!} /> : undefined
          }
          right={
            onItemDelete && !swipeToDelete
              ? () => (
                  <IconButton
                    icon="delete-outline"
                    onPress={() => onItemDelete(item)}
                    accessibilityLabel={`Apagar "${item.title}"`}
                  />
                )
              : undefined
          }
        />
        {!last && <Divider />}
      </View>
    );

    if (swipeToDelete && onItemDelete) {
      return (
        <Swipeable
          ref={swipeRef}
          friction={2}
          rightThreshold={28}
          renderRightActions={(progress) =>
            renderRightActions(progress, item, () => swipeRef.current?.close())
          }
          onSwipeableOpen={() => {
            // se quiseres apagar automaticamente ao abrir:
            // onItemDelete(item); swipeRef.current?.close();
          }}
        >
          {content}
        </Swipeable>
      );
    }
    return content;
  };

  return (
    <Surface
      elevation={elevation}
      style={[styles.container, { backgroundColor: theme.colors.surface }, style]}
      accessibilityRole="summary"
      accessibilityLabel={`${headerTitle}. ${
        items.length ? `${items.length} itens.` : "Sem notificações."
      }`}
    >
      {/* Clip interno para não estragar a sombra do Surface */}
      <View style={[styles.clip, { borderRadius: 16 }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text variant="titleMedium" style={{ fontWeight: "700" }}>
            {headerTitle}
          </Text>
        </View>

        <Divider />

        {/* Lista / Estado */}
        <View style={{ maxHeight }}>
          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator accessibilityLabel="A carregar notificações" />
            </View>
          ) : items.length === 0 ? (
            <View style={styles.empty}>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {emptyText}
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator contentContainerStyle={{ paddingVertical: 4 }}>
              {items.map((it, idx) => (
                <Row key={it.id} item={it} last={idx === items.length - 1} />
              ))}
            </ScrollView>
          )}
        </View>

        <Divider />

        {/* Footer */}
        <View style={styles.footer}>
          <Text
            variant="titleSmall"
            onPress={onClearAll}
            accessibilityRole="button"
            accessibilityLabel="Limpar todas as notificações"
            style={{ color: theme.colors.primary, fontWeight: "600", textAlign: "center" }}
          >
            Limpar todas
          </Text>
        </View>
      </View>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 320,
    borderRadius: 16,
  },
  clip: { overflow: "hidden" },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  footer: { paddingHorizontal: 16, paddingVertical: 12 },
  loading: { height: 160, alignItems: "center", justifyContent: "center" },
  empty: { paddingVertical: 24, alignItems: "center", justifyContent: "center" },
  action: {
    alignItems: "center",
    justifyContent: "center",
  },
});

export default NotificationsCard;
