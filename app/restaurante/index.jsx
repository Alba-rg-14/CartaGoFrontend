import { View } from "react-native";
import { Text, Button } from "react-native-paper";
import { logout } from "../../lib/auth";
import { router } from "expo-router";
import { tokens } from "../../theme";

export default function HomeRestaurante() {

    const handleLogout = async () => {
        await logout();
        router.replace("/auth/login"); // volvemos al login
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
            <Text variant="headlineMedium">Hola, Restaurante 👋</Text>

            <Text>
                (Aquí irá la pantalla principal del restaurante, con pedidos, estadísticas, etc.)
            </Text>

            <Button mode="outlined" onPress={handleLogout}>
                Cerrar sesión
            </Button>
        </View>
    );
}