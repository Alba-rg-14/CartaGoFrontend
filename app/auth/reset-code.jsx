// app/auth/reset-code.jsx
import { useCallback, useMemo, useRef, useState } from "react";
import { StyleSheet, ScrollView, View, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, TextInput, Button, Snackbar } from "react-native-paper";
import { router } from "expo-router";
import { tokens } from "../../theme";
import PillSwitch from "../../components/ui/PillSwitch";
import { sendResetCode, confirmResetCode } from "../../lib/auth";
import { Image } from "react-native";

const RESEND_SECONDS = 45;

export default function ResetByCode() {
    const [tab, setTab] = useState("reset"); // login | reset
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [pw1, setPw1] = useState("");
    const [pw2, setPw2] = useState("");
    const [step, setStep] = useState(1); // 1: pedir código, 2: introducir código + nueva pass
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState("");
    const [resendIn, setResendIn] = useState(0);
    const timerRef = useRef(null);

    const onChangeTab = (v) => {
        setTab(v);
        if (v === "login") router.replace("/auth/login");
    };

    const startResendTimer = () => {
        setResendIn(RESEND_SECONDS);
        clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setResendIn((s) => {
                if (s <= 1) {
                    clearInterval(timerRef.current);
                    return 0;
                }
                return s - 1;
            });
        }, 1000);
    };

    const requestCode = useCallback(async () => {
        if (!email) {
            setMsg("Introduce tu email.");
            return;
        }
        try {
            setLoading(true);
            await sendResetCode(email); // 204 siempre
            setMsg("Si tu email existe, te hemos enviado un código.");
            setStep(2);
            startResendTimer();
        } catch (err) {
            const s = err?.response?.status;
            const d = err?.response?.data;
            const backendMsg = d?.message || d?.error || (typeof d === "string" ? d : null);
            setMsg(`Error${s ? ` (${s})` : ""}: ${backendMsg || "Inténtalo más tarde."}`);
            console.log("RESET SEND CODE ERR ->", s, d || err?.message);
        } finally {
            setLoading(false);
        }
    }, [email]);

    const canSubmit = useMemo(() => {
        return (
            step === 2 &&
            email &&
            code && code.trim().length >= 4 &&
            pw1.length >= 8 &&
            pw1 === pw2
        );
    }, [step, email, code, pw1, pw2]);

    const submitNewPassword = useCallback(async () => {
        if (!canSubmit) return;
        try {
            setLoading(true);
            await confirmResetCode({ email, code: code.trim(), newPassword: pw1 }); // 204
            setMsg("¡Contraseña cambiada! Entrando...");
            setTimeout(() => router.replace("/auth/login"), 900);
        } catch (err) {
            const s = err?.response?.status;
            const d = err?.response?.data;
            const backendMsg = d?.message || d?.error || (typeof d === "string" ? d : null);
            setMsg(`Error${s ? ` (${s})` : ""}: ${backendMsg || "Código inválido o caducado."}`);
            console.log("RESET CONFIRM ERR ->", s, d || err?.message);
        } finally {
            setLoading(false);
        }
    }, [email, code, pw1, canSubmit]);

    const resend = async () => {
        if (!email || resendIn > 0) return;
        await requestCode();
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: tokens.colors.surface }}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={0}
            >
                <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled"
                    keyboardDismissMode={Platform.OS === "android" ? "on-drag" : "interactive"}>
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
                    <Image
                        source={require("../../assets/images/tomatoeating.png")}
                        style={styles.illustration}
                        resizeMode="contain"
                    />
                    <Text variant="headlineSmall" style={styles.title}>
                        Recupera tu contraseña
                    </Text>

                    {/*  1: pedir código */}
                    {step === 1 && (
                        <>
                            <Text style={styles.subtitle}>
                                Te enviaremos un <Text style={{ fontWeight: "700" }}>código</Text> a tu correo.
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
                                onPress={requestCode}
                                loading={loading}
                                disabled={loading || !email}
                                contentStyle={{ height: 56, justifyContent: "center" }}
                                style={styles.btnPrimary}
                                labelStyle={styles.btnPrimaryLabel}
                                uppercase={false}
                            >
                                Enviarme el código
                            </Button>
                        </>
                    )}

                    {/* 2: introducir código + nueva pass */}
                    {step === 2 && (
                        <>
                            <Text style={[styles.subtitle, { marginBottom: tokens.spacing(1) }]}>
                                Hemos enviado un código a <Text style={{ fontWeight: "700" }}>{email}</Text>.
                            </Text>

                            <TextInput
                                label="Código"
                                mode="flat"
                                autoCapitalize="characters"
                                value={code}
                                onChangeText={setCode}
                                style={styles.input}
                            />
                            <View style={styles.resendRow}>
                                <Text style={{ color: tokens.colors.muted }}>
                                    ¿No te llegó?
                                </Text>
                                <TouchableOpacity disabled={resendIn > 0} onPress={resend}>
                                    <Text style={[styles.resendLink, resendIn > 0 && { opacity: 0.5 }]}>
                                        Reenviar {resendIn > 0 ? `(${resendIn}s)` : ""}
                                    </Text>
                                </TouchableOpacity>
                            </View>

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
                                onPress={submitNewPassword}
                                disabled={!canSubmit || loading}
                                loading={loading}
                                contentStyle={{ height: 56, justifyContent: "center" }}
                                style={styles.btnPrimary}
                                labelStyle={styles.btnPrimaryLabel}
                                uppercase={false}
                            >
                                Guardar y entrar
                            </Button>

                            <Button
                                mode="text"
                                onPress={() => setStep(1)}
                                style={{ alignSelf: "center", marginTop: tokens.spacing(1) }}
                            >
                                Cambiar email
                            </Button>
                        </>
                    )}

                    <Snackbar visible={!!msg} onDismiss={() => setMsg("")} duration={2600}>
                        {msg}
                    </Snackbar>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: tokens.spacing(4),
        justifyContent: "center",
        backgroundColor: tokens.colors.surface,
    },
    illustration: { width: 220, height: 220, alignSelf: "center" },
    pill: {
        alignSelf: "center",
        width: "100%",
        maxWidth: 360,
        borderRadius: 999,
    },
    title: { color: tokens.colors.primary, fontWeight: "800", marginTop: tokens.spacing(1) },
    subtitle: { color: tokens.colors.muted, marginTop: 4 },
    input: { backgroundColor: "transparent", marginTop: tokens.spacing(2) },
    btnPrimary: {
        borderRadius: 999,
        alignSelf: "center",
        width: "100%",
        maxWidth: 999,
        marginTop: tokens.spacing(2),
    },
    btnPrimaryLabel: { fontSize: 18, fontWeight: "700", textAlign: "center", width: "100%" },
    resendRow: {
        marginTop: 6,
        flexDirection: "row",
        gap: 10,
        alignItems: "center",
    },
    resendLink: { textDecorationLine: "underline" },
});
