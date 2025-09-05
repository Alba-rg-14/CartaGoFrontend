// app/+not-found.jsx
import { View, StyleSheet } from "react-native";
import { Text, Button } from "react-native-paper";
import { Link } from "expo-router";
import { tokens } from "../theme"; // nota: +not-found está en /app, por eso ../

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>
        Página no encontrada
      </Text>
      <Text style={styles.subtitle}>
        Ups, no hemos encontrado esa ruta.
      </Text>

      {/* Usa Link de expo-router para volver a la Welcome */}
      <Link href="/auth/welcome" asChild>
        <Button mode="contained" style={styles.button}>
          Volver al inicio
        </Button>
      </Link>
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
