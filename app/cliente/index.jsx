import { View } from "react-native";
import { Text, Button } from "react-native-paper";
import { logout } from "../../lib/auth";
import { router } from "expo-router";
import { tokens } from "../../theme";

export default function HomeCliente() {
    const handleLogout = async () => {
        await logout();
        router.replace("/auth/login");
    };

    return (
        <View
            style={{
                flex: 1,
                padding: tokens.spacing(2),
                justifyContent: "center",
                gap: tokens.spacing(2),
            }}
        >
            <Text variant="headlineMedium">Hola, Cliente 👋</Text>

            <Text>
                (Aquí irá la pantalla principal del cliente, con restaurantes, categorías, etc.)
            </Text>

            <Button mode="outlined" onPress={handleLogout}>
                Cerrar sesión
            </Button>
        </View>
    );
}
