import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Image, ScrollView, StyleSheet, Platform, Linking } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { ActivityIndicator, Button, Text, Icon } from "react-native-paper";
import { api } from "../../lib/api";
import { tokens } from "../../theme";
import { RestauranteAPI } from "../../lib/api/restaurante";
import { getMe, getUser, getRestauranteByUsuario } from "../../lib/auth";
import BottomActionBar from "../../components/ui/BottomActionBar";

const DAYS_ORDER = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const DAY_ES = { MONDAY: "Lunes", TUESDAY: "Martes", WEDNESDAY: "Miércoles", THURSDAY: "Jueves", FRIDAY: "Viernes", SATURDAY: "Sábado", SUNDAY: "Domingo" };
const hhmm = (t) => String(t ?? "").slice(0, 5);
const fmtDay = (slots = []) => !slots.length ? "Cerrado"
    : slots.map(({ apertura, cierre }) => (apertura === "00:00" && cierre === "23:59") ? "Abierto 24h" : `${apertura}–${cierre}`).join(" | ");

export default function RestauranteLanding() {
    const router = useRouter();
    const [checkingCarta, setCheckingCarta] = useState(false);
    const [hasCarta, setHasCarta] = useState(false);

    const [restauranteId, setRestauranteId] = useState(null);
    const [resolvingId, setResolvingId] = useState(true);

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({});
    const [horarios, setHorarios] = useState([]);

    // Resolver restauranteId desde la sesión (sin params)
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const u = await getUser().catch(() => null);
                let rid = u?.restauranteId ? Number(u.restauranteId) : null;
                if (!rid) {
                    const me = await getMe().catch(() => null);
                    const dto = me?.id ? await getRestauranteByUsuario(me.id).catch(() => null) : null;
                    rid = dto?.id ? Number(dto.id) : null;
                }
                if (alive) setRestauranteId(Number.isFinite(rid) && rid > 0 ? rid : null);
            } finally {
                if (alive) setResolvingId(false);
            }
        })();
        return () => { alive = false; };
    }, []);

    const reload = React.useCallback(async () => {
        if (!restauranteId) return;
        setCheckingCarta(true);
        try {
            const [info, hs, carta] = await Promise.all([
                api.get(`/restaurante/${restauranteId}/info`, { params: { t: Date.now() } }).then(r => r.data),
                RestauranteAPI.getHorarios(restauranteId),
                RestauranteAPI.getCarta(restauranteId).catch(() => null), // por si devuelve 404
            ]);

            setData(info || {});
            setHorarios(hs || []);

            const existe =
                (Array.isArray(carta) && carta.length > 0) ||
                (carta && Array.isArray(carta.platos) && carta.platos.length > 0) ||
                (carta && Array.isArray(carta.secciones) && carta.secciones.length > 0);

            setHasCarta(Boolean(existe));
        } finally {
            setCheckingCarta(false);
        }
    }, [restauranteId]);


    useEffect(() => {
        if (!restauranteId) return;
        let alive = true;
        (async () => {
            try { await reload(); } finally { if (alive) setLoading(false); }
        })();
        return () => { alive = false; };
    }, [restauranteId, reload]);

    useFocusEffect(React.useCallback(() => { reload(); }, [reload]));

    const horariosPorDia = useMemo(() => {
        const map = { MONDAY: [], TUESDAY: [], WEDNESDAY: [], THURSDAY: [], FRIDAY: [], SATURDAY: [], SUNDAY: [] };
        (horarios || []).forEach(h => {
            const d = String(h?.dia || "").toUpperCase();
            if (map[d]) map[d].push({ apertura: hhmm(h.apertura), cierre: hhmm(h.cierre) });
        });
        return map;
    }, [horarios]);

    const isOpen = String(data?.estado || "").toLowerCase() === "abierto";

    const openInMaps = () => {
        const lat = Number(data?.lat), lon = Number(data?.lon);
        if (!lat || !lon) return;
        const label = encodeURIComponent(data?.nombre ?? "");
        const url = Platform.select({
            ios: `http://maps.apple.com/?ll=${lat},${lon}&q=${label}`,
            android: `geo:${lat},${lon}?q=${lat},${lon}(${label})`,
            default: `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`,
        });
        Linking.openURL(url).catch(() => { });
    };

    if (resolvingId) {
        return (
            <SafeAreaView style={styles.center}>
                <ActivityIndicator />
                <Text style={styles.muted}>Buscando tu restaurante…</Text>
            </SafeAreaView>
        );
    }
    if (!restauranteId) {
        return (
            <SafeAreaView style={styles.center}>
                <Text style={{ fontWeight: "800", marginBottom: 6 }}>No encuentro tu restaurante</Text>
                <Text style={styles.muted}>Inicia sesión con un usuario de restaurante.</Text>
            </SafeAreaView>
        );
    }
    if (loading) return <View style={styles.center}><ActivityIndicator /></View>;

    const hasImage = Boolean(data?.imagen);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: tokens.colors.surface }} edges={["top"]}>
            <ScrollView contentContainerStyle={styles.container}>
                {/* Imagen o placeholder */}
                {hasImage ? (
                    <Image source={{ uri: data.imagen }} style={[styles.hero, { marginTop: tokens.spacing(2) }]} resizeMode="cover" />
                ) : (
                    <View style={[styles.heroPlaceholder, { marginTop: tokens.spacing(2) }]}>
                        <Icon source="image-plus" size={28} color="#64748B" />
                        <Text style={{ marginTop: 6, color: "#475569", fontWeight: "800" }}>
                            Empieza a editar la info para añadir tu imagen
                        </Text>
                    </View>
                )}

                {/* Título + estado */}
                <View style={styles.headerRow}>
                    <Text variant="headlineLarge" style={styles.title} numberOfLines={2}>
                        {typeof data?.nombre === "string" ? data.nombre : ""}
                    </Text>
                    <View style={[styles.statePill, { backgroundColor: isOpen ? tokens.colors.primary : "#9CA3AF" }]}>
                        <Icon source={isOpen ? "check-circle" : "close-circle"} size={18} color="#FFF" />
                        <Text style={styles.statePillText}>{isOpen ? "Abierto" : "Cerrado"}</Text>
                    </View>
                </View>

                {/* Descripción */}
                {data?.descripcion ? (
                    <Text style={styles.subtitle} variant="titleSmall">{data.descripcion}</Text>
                ) : (
                    <Text style={[styles.subtitle, styles.mutedItalic]}>
                        Empieza a editar la info para añadir una descripción.
                    </Text>
                )}

                {/* Horario */}
                <Text variant="titleMedium" style={styles.sectionTitle}>Horario:</Text>
                <View style={{ marginBottom: tokens.spacing(3) }}>
                    {DAYS_ORDER.map((d) => (
                        <Text key={d} style={styles.scheduleLine}>
                            <Text style={{ fontWeight: "700" }}>{DAY_ES[d]}: </Text>
                            {fmtDay(horariosPorDia[d])}
                        </Text>
                    ))}
                    {!horarios?.length ? (
                        <Text style={[styles.muted, { marginTop: 4 }]}>Sin horarios. Edítalos desde el botón de abajo.</Text>
                    ) : null}
                </View>

                {/* Ubicación */}
                <Text variant="titleMedium" style={styles.sectionTitle}>Estamos aquí:</Text>
                {data?.lat && data?.lon ? (
                    <MapView
                        style={styles.map}
                        initialRegion={{
                            latitude: Number(data.lat),
                            longitude: Number(data.lon),
                            latitudeDelta: 0.004,
                            longitudeDelta: 0.004,
                        }}
                        onPress={openInMaps}
                    >
                        <Marker
                            coordinate={{ latitude: Number(data.lat), longitude: Number(data.lon) }}
                            title={data?.nombre ?? ""}
                            description={data?.direccion || ""}
                        />
                    </MapView>
                ) : (
                    <View style={styles.mapPlaceholder}>
                        <Text style={styles.muted}>Sin ubicación disponible.</Text>
                    </View>
                )}
                <Text style={[styles.address, !data?.direccion && styles.mutedItalic]}>
                    {data?.direccion || "Añade tu dirección desde Editar info."}
                </Text>
            </ScrollView>

            {/* Barra inferior → navega a pantallas separadas */}
            <BottomActionBar
                items={[
                    { icon: "pencil", label: "Editar info restaurante", onPress: () => router.push("/restaurante/editar") },
                    { icon: "qrcode-scan", label: "Escanear carta", onPress: () => router.push("/restaurante/escanear"), disabled: checkingCarta || hasCarta },
                    { icon: "eye", label: "Visualizar carta", onPress: () => router.push("/restaurante/visualizar-carta"), disabled: checkingCarta || !hasCarta },
                ]}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    muted: { color: tokens.colors.muted, textAlign: "center" },
    mutedItalic: { color: tokens.colors.muted, fontStyle: "italic" },
    container: { paddingHorizontal: tokens.spacing(3), paddingBottom: 120 },
    hero: { width: "100%", height: 220, borderRadius: 18, marginBottom: tokens.spacing(4) },
    heroPlaceholder: {
        width: "100%", height: 220, borderRadius: 18,
        borderWidth: 2, borderStyle: "dashed", borderColor: "#CBD5E1",
        backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center",
        marginBottom: tokens.spacing(2)
    },
    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: tokens.spacing(1) },
    title: { fontWeight: "800", flex: 1, marginRight: tokens.spacing(2) },
    statePill: { borderRadius: 999, paddingHorizontal: 12, height: 30, alignItems: "center", justifyContent: "center", flexDirection: "row" },
    statePillText: { color: "#FFF", fontWeight: "800", marginLeft: 6 },
    subtitle: { color: "#111827", marginBottom: tokens.spacing(3) },
    sectionTitle: { fontWeight: "800", marginTop: tokens.spacing(2), marginBottom: tokens.spacing(1) },
    scheduleLine: { marginBottom: 4, color: "#333" },
    mapPlaceholder: { height: 140, borderRadius: 16, backgroundColor: "#EEF2F7", alignItems: "center", justifyContent: "center", marginBottom: tokens.spacing(1.5) },
    address: { color: tokens.colors.muted, marginBottom: tokens.spacing(4), textAlign: "left" },
    map: { height: 160, borderRadius: 16, marginBottom: tokens.spacing(1.5), overflow: "hidden" },
    root: { flex: 1, backgroundColor: "#FFF" },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    header: { paddingHorizontal: tokens.spacing(3), paddingTop: tokens.spacing(3), paddingBottom: tokens.spacing(1) },
    actions: { paddingHorizontal: tokens.spacing(3), paddingTop: tokens.spacing(2) },
});
