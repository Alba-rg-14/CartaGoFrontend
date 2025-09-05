// app/auth/welcome.jsx
import { View, Image, StyleSheet } from "react-native";
import { Text, Button, useTheme } from "react-native-paper";
import { router } from "expo-router";
import { tokens } from "../../theme";

export default function Welcome() {
    const theme = useTheme();

    return (
        <View style={styles.container}>
            <Image
                source={require("../../assets/images/tomato.png")}
                style={styles.illustration}
                resizeMode="contain"
            />

            <Text variant="displayMedium" style={styles.brand}>
                <Text style={{ color: tokens.colors.primary, fontWeight: "800" }}>
                    Carta
                </Text>
                <Text style={{ color: tokens.colors.error, fontWeight: "800" }}>Go</Text>
            </Text>

            <Text variant="titleMedium" style={styles.subtitle}>
                La carta en tus manos, {"\n"}la cuenta sin líos.
            </Text>

            <Button
                mode="contained"
                onPress={() => router.push("/auth/login")}
                contentStyle={styles.btnContent}
                style={styles.btnPrimary}
                labelStyle={styles.btnPrimaryLabel}
            >
                Iniciar sesión
            </Button>

            <Button
                mode="outlined"
                onPress={() => router.push("/auth/register")}
                contentStyle={styles.btnContent}
                style={[styles.btnOutlined, { borderColor: theme.colors.primary }]}
                labelStyle={[styles.btnOutlinedLabel, { color: theme.colors.primary }]}
            >
                Registrarse
            </Button>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: tokens.spacing(4),
        justifyContent: "center",
        backgroundColor: tokens.colors.surface,
    },
    illustration: {
        width: 220,
        height: 220,
        alignSelf: "center",
        marginBottom: tokens.spacing(3),
    },
    brand: {
        alignSelf: "center",
        marginBottom: tokens.spacing(1),
        letterSpacing: 0.5,
    },
    subtitle: {
        color: tokens.colors.muted,
        textAlign: "center",
        marginBottom: tokens.spacing(4),
    },
    btnContent: {
        height: 48,
    },
    btnPrimary: {
        borderRadius: 999,
        marginBottom: tokens.spacing(2),
    },
    btnPrimaryLabel: {
        fontWeight: "700",
    },
    btnOutlined: {
        borderRadius: 999,
        borderWidth: 2,
    },
    btnOutlinedLabel: {
        fontWeight: "700",
    },
});
