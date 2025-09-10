import React, { useEffect, useState } from "react";
import { Stack, useFocusEffect } from "expo-router";
import { Provider as PaperProvider, ActivityIndicator, Text } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, BackHandler } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { theme } from "../theme";
import { bootstrapAuth } from "../lib/auth";

function DisableAndroidBackGlobal() {
  useFocusEffect(
    React.useCallback(() => {
      const onBack = () => true; // true = consumimos, no navega
      const sub = BackHandler.addEventListener("hardwareBackPress", onBack);
      return () => sub.remove();
    }, [])
  );
  return null;
}

function PreventPopGlobal() {
  const navigation = useNavigation();
  useFocusEffect(
    React.useCallback(() => {
      const sub = navigation.addListener("beforeRemove", (e) => {
        e.preventDefault(); // bloquea retroceso del sistema
      });
      return sub;
    }, [navigation])
  );
  return null;
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      await bootstrapAuth();
      setReady(true);
    })();
  }, []);

  if (!ready) {

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
        {/* Hooks globales de bloqueo */}
        <DisableAndroidBackGlobal />
        <PreventPopGlobal />

        <Stack
          screenOptions={{
            headerShown: false,
            gestureEnabled: false
          }}
        />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
