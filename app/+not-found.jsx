import React, { useEffect, useState, useRef } from "react";
import { View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { Redirect } from "expo-router";
import { isLoggedIn, getRole } from "../lib/auth";

export default function NotFound() {
  const [href, setHref] = useState(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      const logged = await isLoggedIn();
      if (!logged) {
        setHref("/auth/welcome");
        return;
      }
      const role = await getRole();
      setHref(role === "RESTAURANTE" ? "/restaurante" : "/cliente");
    })();
  }, []);

  if (!href) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 12 }}>Redirigiendo…</Text>
      </View>
    );
  }

  return <Redirect href={href} />;
}
