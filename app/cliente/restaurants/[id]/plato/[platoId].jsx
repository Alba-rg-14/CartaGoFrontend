import React, { useEffect, useState } from "react";
import { View, Image, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Text, Icon, ActivityIndicator } from "react-native-paper";
import { tokens } from "../../../../../theme";
import { RestauranteAPI } from "../../../../../lib/api/restaurante";

const fmtPrice = (n) =>
    typeof n === "number" ? `${String(n.toFixed(1)).replace(".", ",")}€` : "";

export default function PlatoDetalle() {
    const { platoId } = useLocalSearchParams();
    const router = useRouter();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const p = await RestauranteAPI.getPlato(platoId);
                if (alive) setData(p || {});
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, [platoId]);

    if (loading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: tokens.colors.surface }} edges={["top"]}>
                <View style={styles.loader}>
                    <ActivityIndicator />
                </View>
            </SafeAreaView>
        );
    }

    const alerg = Array.isArray(data?.alergenos) ? data.alergenos : [];

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: tokens.colors.surface }} edges={["top"]}>
            <View style={styles.container}>
                {/* Back */}
                <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
                    <Icon source="chevron-left" size={22} color={tokens.colors.primary} />
                    <Text style={styles.backText}>Volver a la carta</Text>
                </TouchableOpacity>

                {/* Imagen */}
                <Image
                    source={{
                        uri: data?.imagen || "https://via.placeholder.com/1200x800?text=Plato",
                    }}
                    style={styles.hero}
                    resizeMode="cover"
                />

                {/* Título + precio */}
                <View style={styles.titleRow}>
                    <Text variant="headlineSmall" style={styles.title} numberOfLines={2}>
                        {data?.nombre || "Plato"}
                    </Text>
                    <Text style={styles.price}>{fmtPrice(data?.precio)}</Text>
                </View>

                {/* Descripción */}
                {!!data?.descripcion && (
                    <Text style={styles.desc}>{data.descripcion}</Text>
                )}

                {/* Alergenos */}
                <Text variant="titleMedium" style={styles.sectionTitle}>
                    Alérgenos:
                </Text>

                {alerg.length ? (
                    <View style={styles.allergenGrid}>
                        {alerg.map((a) => (
                            <View key={a.id ?? a.nombre} style={styles.allergenCard}>
                                <Image
                                    source={{
                                        uri:
                                            a?.imagen ||
                                            "https://via.placeholder.com/80x80.png?text=⚠️",
                                    }}
                                    style={styles.allergenIcon}
                                />
                                <Text numberOfLines={1} style={styles.allergenLabel}>
                                    {a?.nombre || "—"}
                                </Text>
                            </View>
                        ))}
                    </View>
                ) : (
                    <Text style={{ color: tokens.colors.muted }}>
                        Este plato no contiene alérgenos declarados.
                    </Text>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    loader: { flex: 1, alignItems: "center", justifyContent: "center" },
    container: { flex: 1, padding: tokens.spacing(3) },
    backRow: { flexDirection: "row", alignItems: "center", marginBottom: tokens.spacing(2) },
    backText: { marginLeft: 4, color: tokens.colors.muted, fontWeight: "700" },

    hero: {
        width: "100%",
        height: 220,
        borderRadius: 16,
        marginBottom: tokens.spacing(2),
        backgroundColor: "#EEE",
    },

    titleRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: tokens.spacing(1),
    },
    title: { fontWeight: "800", flex: 1, marginRight: tokens.spacing(2) },
    price: { fontWeight: "800", fontSize: 18 },

    desc: {
        color: "#4B5563",
        lineHeight: 20,
        marginTop: tokens.spacing(1),
        marginBottom: tokens.spacing(2),
    },

    sectionTitle: {
        fontWeight: "800",
        marginTop: tokens.spacing(2),
        marginBottom: tokens.spacing(1),
    },

    allergenGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },
    allergenCard: {
        width: 104,
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderRadius: 12,
        backgroundColor: "#F3F4F6",
        alignItems: "center",
    },
    allergenIcon: {
        width: 28,
        height: 28,
        marginBottom: 6,
    },
    allergenLabel: {
        fontWeight: "700",
        color: "#374151",
        fontSize: 12,
    },
});
