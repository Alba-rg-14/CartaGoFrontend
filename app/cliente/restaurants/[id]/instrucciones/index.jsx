// app/cliente/restaurants/[id]/instrucciones/index.jsx
import React, { useEffect, useMemo, useState } from "react";
import { View, Image, StyleSheet, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, Button, ActivityIndicator } from "react-native-paper";
import { tokens } from "../../../../../theme";
import { FlujoPagoAPI } from "../../../../../lib/api/flujoPago";
import { getClienteByUsuario, getMe } from "../../../../../lib/auth";

export default function InstruccionesScreen() {
    const { id, salaId, restauranteNombre, restauranteImagen } = useLocalSearchParams();
    const salaIdNum = Number(salaId);
    const router = useRouter();
    const [me, setMe] = useState(null);
    const [loading, setLoading] = useState(true);
    const [dto, setDto] = useState(null);
    const [meClienteId, setMeClienteId] = useState(null);
    const toNum = (v) => {
        if (typeof v === "number") return v;
        const s = String(v ?? "").trim().replace(",", ".");
        const n = Number(s);
        return Number.isFinite(n) ? n : 0;
    };
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const m = await getMe().catch(() => null);
                if (alive) setMe(m);
                if (m?.id) {
                    const c = await getClienteByUsuario(m.id).catch(() => null);
                    if (alive) setMeClienteId(c?.id ? Number(c.id) : null);
                }
                // ⚠️ opcional: evita caché si tu API tiene CDN o Vercel cacheando GET
                const data = await FlujoPagoAPI.getInstrucciones(salaIdNum /* , { headers: { 'Cache-Control':'no-cache' } } */).catch(() => null);
                if (!alive) return;
                setDto(data || {});
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, [salaIdNum]);

    useEffect(() => {
        if (!loading) {
            console.log("miLinea:", miLinea);
            console.log("detalles:", detalles);
        }
    }, [loading, miLinea, detalles]);


    const porCliente = useMemo(
        () => (Array.isArray(dto?.porCliente) ? dto.porCliente : []),
        [dto]
    );

    const miLinea = useMemo(() => {
        if (!porCliente.length) return null;

        // 1) match por clienteId / cliente.id
        if (meClienteId != null) {
            const byClienteId = porCliente.find(x =>
                Number(x?.clienteId ?? x?.cliente?.id) === Number(meClienteId)
            );
            if (byClienteId) return byClienteId;
        }

        // 2) match por usuarioId / usuario.id
        if (me?.id != null) {
            const byUsuarioId = porCliente.find(x =>
                Number(x?.usuarioId ?? x?.usuario?.id) === Number(me.id)
            );
            if (byUsuarioId) return byUsuarioId;
        }

        // 3) match por email
        const meEmail = String(me?.email || "").toLowerCase();
        if (meEmail) {
            const byEmail = porCliente.find(x => {
                const lineEmail = String(
                    x?.email ?? x?.usuario?.email ?? x?.cliente?.usuario?.email ?? ""
                ).toLowerCase();
                return lineEmail === meEmail;
            });
            if (byEmail) return byEmail;
        }

        // 4) fallback: si solo hay una línea, muestra esa
        if (porCliente.length === 1) return porCliente[0];

        return null;
    }, [porCliente, meClienteId, me]);

    const detalles = useMemo(
        () => (Array.isArray(miLinea?.detalles) ? miLinea.detalles : []),
        [miLinea]
    );
    const total = useMemo(() => {
        const primarios = [miLinea?.total, miLinea?.totalCliente, miLinea?.importe];
        const primeroValido = primarios.find(v => toNum(v) > 0);
        if (primarios.some(v => toNum(v) >= 0) && primeroValido != null) {
            return toNum(primeroValido);
        }
        // fallback: suma de detalles
        return detalles.reduce((acc, d) => acc + toNum(d?.tuParte), 0);
    }, [miLinea, detalles]);

    if (loading) return <View style={styles.loader}><ActivityIndicator /></View>;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: tokens.colors.surface }} edges={["top"]}>
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Hero con overlay y títulos */}
                <View style={{ margin: tokens.spacing(3) }}>
                    <View style={{ position: "relative" }}>
                        <Image
                            source={{ uri: restauranteImagen || "https://via.placeholder.com/1200x800?text=Restaurante" }}
                            style={styles.hero}
                        />
                        <View style={styles.overlay} />
                        <View style={styles.overlayTextWrap}>
                            <Text numberOfLines={1} style={styles.heroTitle}>{restauranteNombre || "Restaurante"}</Text>
                            <Text style={styles.heroSubtitle}>Instrucciones de pago</Text>
                        </View>
                    </View>

                    {/* Total del usuario */}
                    <View style={{ marginTop: tokens.spacing(3) }}>
                        <Text style={{ fontWeight: "800", fontSize: 16 }}>Tu parte de la cuenta es:</Text>
                        <Text style={{ fontWeight: "900", fontSize: 32, marginTop: 4 }}>
                            {Number(total).toFixed(2).replace(".", ",")}€
                        </Text>
                    </View>

                    {/* Tabla simple de detalles */}
                    <View style={styles.tableCard}>
                        <View style={styles.tableHeader}>
                            <Text style={[styles.th, { flex: 1.5 }]}>Plato</Text>
                            <Text style={[styles.th, { width: 80, textAlign: "right" }]}>Monto</Text>
                        </View>
                        {detalles.length === 0 ? (
                            <Text style={{ color: tokens.colors.muted, marginTop: 6 }}>
                                No hay desglose disponible.
                            </Text>
                        ) : (
                            detalles.map((d, idx) => (
                                <View key={`${d.platoSalaId}-${idx}`} style={styles.tr}>
                                    <Text style={[styles.td, { flex: 1.5 }]} numberOfLines={1}>
                                        {d.platoNombre}
                                    </Text>
                                    <Text style={[styles.td, { width: 80, textAlign: "right", fontWeight: "800" }]}>
                                        {Number(d.tuParte ?? 0).toFixed(2).replace(".", ",")}€
                                    </Text>
                                </View>
                            ))
                        )}
                    </View>

                    {/* CTA */}
                    <View style={{ marginTop: tokens.spacing(3) }}>
                        <Button
                            mode="contained"
                            onPress={() => router.replace("/cliente")}
                            contentStyle={{ height: 48 }}
                            labelStyle={{ fontWeight: "800" }}
                        >
                            Listado restaurantes
                        </Button>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    loader: { flex: 1, justifyContent: "center", alignItems: "center" },
    hero: { width: "100%", height: 160, borderRadius: 16 },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)", borderRadius: 16 },
    overlayTextWrap: { position: "absolute", left: 16, right: 16, bottom: 16 },
    heroTitle: { color: "#FFF", fontWeight: "900", fontSize: 22 },
    heroSubtitle: { color: "#FFF", marginTop: 2, fontWeight: "700" },
    tableCard: {
        marginTop: tokens.spacing(3),
        backgroundColor: "#FFF",
        borderRadius: 12,
        borderWidth: 1, borderColor: "#E5E7EB",
        padding: 12,
    },
    tableHeader: { flexDirection: "row", marginBottom: 8 },
    th: { fontWeight: "800", color: "#111827" },
    tr: { flexDirection: "row", paddingVertical: 8, borderTopWidth: 1, borderTopColor: "#F3F4F6" },
    td: { color: "#111827" },
});
