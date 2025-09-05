// app/modal.jsx
import { View, StyleSheet } from "react-native";
import { Text, Button } from "react-native-paper";
import { router } from "expo-router";
import { tokens } from "../theme";

export default function ModalScreen() {
  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>Modal</Text>
      <Text style={styles.subtitle}>Contenido del modal.</Text>

      <Button
        mode="contained"
        onPress={() => router.back()}
        style={styles.button}
      >
        Cerrar
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: tokens.spacing(4),
    justifyContent: "center",
    gap: tokens.spacing(2),
    backgroundColor: tokens.colors.surface,
  },
  title: {
    textAlign: "center",
    marginBottom: tokens.spacing(1),
  },
  subtitle: {
    textAlign: "center",
    color: tokens.colors.muted,
    marginBottom: tokens.spacing(3),
  },
  button: {
    alignSelf: "center",
    borderRadius: 999,
  },
});
