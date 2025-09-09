import React, { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { Provider as PaperProvider, ActivityIndicator, Text } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View } from "react-native";
import { theme } from "../theme";
import { bootstrapAuth } from "../lib/auth";

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      await bootstrapAuth();   // rehidrata Authorization si ya había sesión
      setReady(true);
    })();
  }, []);

  if (!ready) {
    // Loader con el mismo tema para evitar flashes
    return (
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator />
            <Text style={{ marginTop: 12 }}>Cargando…</Text>
          </View>
        </PaperProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <Stack screenOptions={{ headerShown: false }} />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
