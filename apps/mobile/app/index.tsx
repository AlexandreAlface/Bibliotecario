import * as React from "react";
import { View, Alert } from "react-native";
import { AvatarItem } from "@bibliotecario/ui-mobile";

export default function HomeScreen() {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <AvatarItem
        label="Camila, 7 anos"
        avatarSrc="https://api.dicebear.com/7.x/adventurer/png?seed=Camila&backgroundColor=ffdf9e"
        actions={[
          {
            icon: "pencil",
            accessibilityLabel: "Editar",
            onPress: () => Alert.alert("Editar Camila"),
          },
          {
            icon: "delete",
            accessibilityLabel: "Remover",
            onPress: () => Alert.alert("Remover Camila"),
          },
        ]}
      />
    </View>
  );
}

