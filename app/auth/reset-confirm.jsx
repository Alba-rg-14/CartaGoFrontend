import { useMemo, useState, useCallback } from "react";
import { StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, TextInput, Button, Snackbar } from "react-native-paper";
import { router, useLocalSearchParams } from "expo-router";
import { confirmPasswordReset } from "../../lib/auth";
import { tokens } from "../../theme";

export default function ResetConfirm() {
    const { token: tokenFromUrl } = useLocalSearchParams(); // ?token=...
    const initialToken = typeof tokenFromUrl === "string" ? tokenFromUrl : "";
    const [token, setToken] = useState(initialToken);
    const [pw1, setPw1] = useState("");
    const [pw2, setPw2] = useState("");
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState("");

    const hasToken = !!token;
    const valid = useMemo(() => pw1.length >= 8 && pw1 === pw2 && hasToken, [pw1, pw2, hasToken]);

    const onSubmit = useCallback(async () => {
        if (!valid) return;
        try {
            setLoading(true);
            await confirmPasswordReset(token, pw1); // 204
            setMsg("¡Contraseña cambiada! Inicia sesión.");
            setTimeout(() => router.replace("/auth/login"), 900);
        } catch (err) {
            const status = err?.response?.status;
            const data = err?.response?.data;
            const backendMsg =
                data?.message || data?.error || (typeof data === "string" ? data : null);
            setMsg(`Error${status ? ` (${status})` : ""}: ${backendMsg || "Token inválido o caducado."}`);
        } finally {
            setLoading(false);
        }
    }, [token, pw1, valid]);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: tokens.colors.surface }}>
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                <Text variant="headlineSmall" style={styles.title}>Nueva contraseña</Text>

                {/* Si el token viene en la URL, no mostramos el campo. */}
                {!hasToken && (
                    <TextInput
                        label="Token"
                        mode="flat"
                        value={token}
                        onChangeText={setToken}
                        style={styles.input}
                    />
                )}

                <TextInput
                    label="Nueva contraseña"
                    mode="flat"
                    secureTextEntry
                    value={pw1}
                    onChangeText={setPw1}
                    style={styles.input}
                />
                <TextInput
                    label="Repite la contraseña"
                    mode="flat"
                    secureTextEntry
                    value={pw2}
                    onChangeText={setPw2}
                    style={styles.input}
                />

                <Button
                    mode="contained"
                    onPress={onSubmit}
                    disabled={!valid || loading}
                    loading={loading}
                    contentStyle={styles.btnContent}
                    style={[styles.btnPrimary, { alignSelf: "center", width: "100%", maxWidth: 280 }]}
                    labelStyle={[styles.btnPrimaryLabel, { textAlign: "center", width: "100%" }]}
                    uppercase={false}
                >
                    Guardar y entrar
                </Button>

                <Snackbar visible={!!msg} onDismiss={() => setMsg("")} duration={2600}>
                    {msg}
                </Snackbar>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: tokens.spacing(4),
        justifyContent: "center",
        backgroundColor: tokens.colors.surface,
    },
    title: {
        color: tokens.colors.primary,
        fontWeight: "800",
        marginTop: tokens.spacing(2),
        marginBottom: tokens.spacing(1),
    },
    input: { backgroundColor: "transparent" },
    btnContent: { height: 56, justifyContent: "center" },
    btnPrimary: { borderRadius: 999, marginTop: tokens.spacing(1) },
    btnPrimaryLabel: { fontWeight: "700", fontSize: 18 },
});
