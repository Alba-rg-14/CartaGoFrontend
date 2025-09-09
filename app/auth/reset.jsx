// app/auth/reset.jsx
import { useState, useCallback } from "react";
import { StyleSheet, ScrollView, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, TextInput, Button, Snackbar } from "react-native-paper";
import { router } from "expo-router";
import { requestPasswordReset } from "../../lib/auth";
import { tokens } from "../../theme";
import PillSwitch from "../../components/ui/PillSwitch";

export default function ResetRequest() {
    const [tab, setTab] = useState("reset"); // login | reset
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState("");

    const onChangeTab = (v) => {
        setTab(v);
        if (v === "login") router.replace("/auth/login");
    };

    const onSubmit = useCallback(async () => {
        if (!email) {
            setMsg("Introduce tu email.");
            return;
        }
        try {
            setLoading(true);
            await requestPasswordReset(email); // 204 (aunque el email no exista)
            setMsg("Si tu email existe, te hemos enviado un enlace.");
        } catch (err) {
            const status = err?.response?.status;
            const data = err?.response?.data;
            const backendMsg =
                data?.message || data?.error || (typeof data === "string" ? data : null);
            setMsg(`Error${status ? ` (${status})` : ""}: ${backendMsg || "Inténtalo más tarde."}`);
            console.log("RESET REQUEST ERR ->", status, data || err?.message);
        } finally {
            setLoading(false);
        }
    }, [email]);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: tokens.colors.surface }}>
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                {/* Toggle Login / Recuperar (pastilla deslizante) */}
                <PillSwitch
                    value={tab}
                    onChange={onChangeTab}
                    options={[
                        { value: "login", label: "Iniciar sesión" },
                        { value: "reset", label: "Recuperar" },
                    ]}
                    style={styles.pill}
                    height={44}
                />

                {/* Ilustración (opcional; comenta si no la tienes) */}
                <Image
                    source={require("../../assets/images/tomatoeating.png")}
                    style={styles.illustration}
                    resizeMode="contain"
                />

                <Text variant="headlineSmall" style={styles.title}>Recupera tu contraseña</Text>
                <Text style={styles.subtitle}>
                    Te enviaremos un enlace para que elijas una nueva contraseña.
                </Text>

                <TextInput
                    label="Email"
                    mode="flat"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                    style={styles.input}
                />

                <Button
                    mode="contained"
                    onPress={onSubmit}
                    loading={loading}
                    disabled={loading || !email}
                    contentStyle={{ height: 56, justifyContent: "center" }}
                    style={{ borderRadius: 999, alignSelf: "center", width: "100%", maxWidth: 280, marginTop: tokens.spacing(2) }}
                    labelStyle={{ fontSize: 18, fontWeight: "700", textAlign: "center", width: "100%" }}
                    uppercase={false}
                >
                    Enviarme el enlace
                </Button>

                <Button
                    mode="text"
                    onPress={() => router.push("/auth/reset-confirm")}
                    style={{ alignSelf: "center", marginTop: tokens.spacing(2) }}
                >
                    ¿Ya tienes el enlace? Ir a confirmar
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
    pill: {
        alignSelf: "center",
        width: "100%",
        maxWidth: 360,
        borderRadius: 999,
    },
    illustration: { width: 200, height: 200, alignSelf: "center", marginTop: tokens.spacing(1) },
    title: {
        color: tokens.colors.primary,
        fontWeight: "800",
        marginTop: tokens.spacing(1),
    },
    subtitle: { color: tokens.colors.muted, marginTop: 4 },
    input: { backgroundColor: "transparent", marginTop: tokens.spacing(2) },
});
