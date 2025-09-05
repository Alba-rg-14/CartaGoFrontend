// app/auth/register.jsx
import { useState, useCallback } from "react";
import {
    View,
    Image,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from "react-native";
import {
    SafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
    Text,
    TextInput,
    Button,
    ActivityIndicator,
    Snackbar,
} from "react-native-paper";
import { router } from "expo-router";
import { register as apiRegister, login } from "../../lib/auth";
import { tokens } from "../../theme";
import PillSwitch from "../../components/ui/PillSwitch";

export default function Register() {
    const insets = useSafeAreaInsets();

    const [authTab, setAuthTab] = useState("register"); // login | register
    const [nombre, setNombre] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [rol, setRol] = useState("CLIENTE");
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState("");

    const onChangeAuthTab = (v) => {
        setAuthTab(v);
        if (v === "login") router.replace("/auth/login");
    };

    const onSubmit = useCallback(async () => {
        console.log("REGISTER onSubmit tapped", { nombre, email, hasPassword: !!password, rol });

        if (!nombre || !email || !password) {
            setMsg("Rellena nombre, email y contraseña.");
            return;
        }
        try {
            setLoading(true);

            // Registro
            await apiRegister(email, password, rol, nombre);
            console.log("REGISTER ok");
            setMsg("¡Registro correcto! Iniciando sesión…");

            // Login y redirección solo con el rol devuelto por /auth/login
            const { role } = await login(email, password);
            console.log("AUTO-LOGIN ok, role:", role);
            router.replace(role === "RESTAURANTE" ? "/restaurante" : "/cliente");
        } catch (err) {
            const status = err?.response?.status;
            const data = err?.response?.data;
            const backendMsg =
                data?.message || data?.error || (typeof data === "string" ? data : null);
            setMsg(`Error${status ? ` (${status})` : ""}: ${backendMsg || "Inténtalo de nuevo."}`);
            console.log("REGISTER/LOGIN ERR ->", status, data || err?.message);
        } finally {
            setLoading(false);
        }
    }, [nombre, email, password, rol]);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: tokens.colors.surface }}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <ScrollView
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={[
                        styles.container,
                        { paddingBottom: insets.bottom + tokens.spacing(2) },
                    ]}
                >
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

                        {/* Ilustración (asegúrate de que existe el archivo) */}
                        <Image
                            source={require("../../assets/images/tomatoeating.png")}
                            style={styles.illustration}
                            resizeMode="contain"
                        />

                        <Text variant="headlineSmall" style={styles.title}>
                            ¡Bienvenido!
                        </Text>

                        <TextInput
                            label="Nombre de usuario"
                            mode="flat"
                            value={nombre}
                            onChangeText={setNombre}
                            style={styles.input}
                        />
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

                        <Text style={styles.sectionLabel}>Selecciona tu rol</Text>

                        {/* Toggle Cliente / Restaurante */}
                        <PillSwitch
                            value={rol}
                            onChange={setRol}
                            options={[
                                { value: "CLIENTE", label: "Cliente" },
                                { value: "RESTAURANTE", label: "Restaurante" },
                            ]}
                            style={styles.pill}
                            height={44}
                        />

                        {loading ? (
                            <ActivityIndicator
                                animating
                                style={{ marginTop: tokens.spacing(2) }}
                            />
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
                                Registrarme
                            </Button>

                        )}
                    </View>

                    <Snackbar
                        visible={!!msg}
                        onDismiss={() => setMsg("")}
                        duration={2500}
                    >
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
    sectionLabel: { marginTop: tokens.spacing(1), color: tokens.colors.muted },
    cta: {
        borderRadius: 999,
        alignSelf: "center",
        width: "100%",
        maxWidth: 260,
        marginTop: tokens.spacing(1),
    },
    btnContent: { height: 56, justifyContent: "center" },
    btnPrimary: { borderRadius: 999, marginTop: tokens.spacing(1) },
    btnPrimaryLabel: { fontWeight: "700", fontSize: 18 },
});
