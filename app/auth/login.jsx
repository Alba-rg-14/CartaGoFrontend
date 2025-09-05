// app/auth/login.jsx
import { useState, useCallback } from "react";
import {
    View,
    Image,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, TextInput, Button, ActivityIndicator, Snackbar } from "react-native-paper";
import { router } from "expo-router";
import { login as doLogin } from "../../lib/auth";
import { tokens } from "../../theme";
import PillSwitch from "../../components/ui/PillSwitch";

export default function Login() {
    const [authTab, setAuthTab] = useState("login"); // login | register
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState("");

    const onChangeAuthTab = (v) => {
        setAuthTab(v);
        if (v === "register") router.replace("/auth/register");
    };

    const onSubmit = useCallback(async () => {
        console.log("LOGIN onSubmit tapped", { email, hasPassword: !!password });

        if (!email || !password) {
            setMsg("Introduce email y contraseña.");
            return;
        }
        try {
            setLoading(true);
            const { role } = await doLogin(email, password);
            console.log("LOGIN ok, role:", role);
            router.replace(role === "RESTAURANTE" ? "/restaurante" : "/cliente");
        } catch (err) {
            const status = err?.response?.status;
            const data = err?.response?.data;
            const backendMsg =
                data?.message || data?.error || (typeof data === "string" ? data : null);
            setMsg(
                `Inicio de sesión falló${status ? ` (${status})` : ""}: ${backendMsg || "Revisa las credenciales."
                }`
            );
            console.log("LOGIN ERR ->", status, data || err?.message);
        } finally {
            setLoading(false);
        }
    }, [email, password]);


    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: tokens.colors.surface }}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
                <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.container}>
                    <View style={styles.card}>
                        {/* Toggle Login / Registro (pastilla deslizante) */}
                        <PillSwitch
                            value={authTab}
                            onChange={onChangeAuthTab}
                            options={[
                                { value: "login", label: "Iniciar sesión" },
                                { value: "register", label: "Registrarse" },
                            ]}
                            style={styles.pill}
                            height={44}
                        />

                        {/* Ilustración */}
                        <Image
                            source={require("../../assets/images/tomatoeating.png")}
                            style={styles.illustration}
                            resizeMode="contain"
                        />

                        <Text variant="headlineSmall" style={styles.title}>¡Hola de nuevo!</Text>

                        <TextInput
                            label="Email"
                            mode="flat"
                            autoCapitalize="none"
                            keyboardType="email-address"
                            value={email}
                            onChangeText={setEmail}
                            style={styles.input}
                        />
                        <TextInput
                            label="Contraseña"
                            mode="flat"
                            secureTextEntry
                            value={password}
                            onChangeText={setPassword}
                            style={styles.input}
                        />

                        <Button
                            mode="text"
                            onPress={() => router.push("/auth/reset")}
                            compact
                            style={{ alignSelf: "flex-start" }}
                            labelStyle={{ color: tokens.colors.primary }}
                        >
                            ¿Has olvidado tu contraseña?
                        </Button>

                        {loading ? (
                            <ActivityIndicator animating style={{ marginTop: tokens.spacing(2) }} />
                        ) : (
                            <Button
                                mode="contained"
                                onPress={onSubmit}
                                contentStyle={{
                                    height: 56,
                                    alignItems: "center",
                                    justifyContent: "center",

                                }}
                                labelStyle={{
                                    fontSize: 18,
                                    fontWeight: "700",
                                    textAlign: "center",
                                    width: "100%",
                                    marginTop: 10,
                                    marginLeft: 25,
                                }}
                                style={[styles.cta, { paddingHorizontal: 0 }]} uppercase={false}
                            >
                                Iniciar sesión
                            </Button>
                        )}
                    </View>

                    <Snackbar visible={!!msg} onDismiss={() => setMsg("")} duration={2500}>
                        {msg}
                    </Snackbar>
                </ScrollView>
            </KeyboardAvoidingView>
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
    card: {
        alignSelf: "center",
        width: "100%",
        maxWidth: 380,
        gap: tokens.spacing(2),
    },
    pill: {
        alignSelf: "center",
        width: "100%",
        maxWidth: 360,
        borderRadius: 999,
    },
    illustration: { width: 220, height: 220, alignSelf: "center" },
    title: {
        color: tokens.colors.primary,
        fontWeight: "800",
        marginBottom: tokens.spacing(1),
        alignSelf: "flex-start",
    },
    input: { backgroundColor: "transparent" },
    btnContent: { height: 56, justifyContent: "center" },
    btnPrimary: { borderRadius: 999, marginTop: tokens.spacing(1) },
    btnPrimaryLabel: { fontWeight: "700", fontSize: 18 },
});
