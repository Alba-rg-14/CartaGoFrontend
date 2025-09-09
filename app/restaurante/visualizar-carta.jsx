// app/restaurante/carta.jsx
import React, { useEffect, useMemo, useState } from "react";
import { View, Image, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    ActivityIndicator,
    Text,
    Button,
    Icon,
    Portal,
    Dialog,
    Snackbar,
} from "react-native-paper";

import { tokens } from "../../theme";
import { RestauranteAPI } from "../../lib/api/restaurante";
import { getMe, getUser, getRestauranteByUsuario } from "../../lib/auth";
import PlatoPreviewCard from "../../components/ui/PlatoPreviewCard";
import BottomActionBar from "../../components/ui/BottomActionBar";

export default function CartaRestauranteScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [confirmDeletePlatoId, setConfirmDeletePlatoId] = useState(null);
    const [deletingPlato, setDeletingPlato] = useState(false);

    // popup de éxito si venimos del escaneo (?scanned=1)
    const [scanSuccessVisible, setScanSuccessVisible] = useState(String(params?.scanned || "") === "1");

    const [restauranteId, setRestauranteId] = useState(null);
    const [info, setInfo] = useState({});
    const [platos, setPlatos] = useState(null);
    const [loading, setLoading] = useState(true);
    const [snack, setSnack] = useState({ visible: false, text: "" });

    // Resolver restauranteId del usuario (igual que en editar)
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
            } finally { }
        })();
        return () => { alive = false; };
    }, []);

    // Cargar info + carta
    useEffect(() => {
        if (!restauranteId) return;
        let alive = true;
        (async () => {
            try {
                setLoading(true);
                const [i, c] = await Promise.all([
                    RestauranteAPI.getInfo(restauranteId),
                    RestauranteAPI.getCarta(restauranteId),
                ]);
                if (!alive) return;
                setInfo(i || {});
                setPlatos(Array.isArray(c) ? c : []);
            } catch {
                if (!alive) return;
                setInfo({});
                setPlatos([]);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, [restauranteId]);

    const secciones = useMemo(() => {
        const map = {};
        (platos || []).forEach(p => {
            const key = p.seccion || p.categoria || p.tipo || "Otros";
            (map[key] ||= []).push(p);
        });
        return Object.entries(map);
    }, [platos]);

    const isOpen = String(info?.estado || "").toLowerCase() === "abierto";

    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);


    if (loading) {
        return <View style={styles.loader}><ActivityIndicator /></View>;
    }

    if (!restauranteId) {
        return (
            <SafeAreaView style={styles.center} edges={["top"]}>
                <Text style={{ fontWeight: "800", marginBottom: 6 }}>No encuentro tu restaurante</Text>
                <Button onPress={() => router.replace("/restaurante")}>Volver</Button>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: tokens.colors.surface }} edges={["top"]}>
            <ScrollView contentContainerStyle={[styles.container, { paddingBottom: 140 }]}>
                {/* Back */}
                <TouchableOpacity onPress={() => router.replace("/restaurante")} style={styles.backRow}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Icon source="chevron-left" size={22} color={tokens.colors.primary} />
                    <Text style={styles.backText}>Volver al restaurante</Text>
                </TouchableOpacity>

                {/* Imagen + header */}
                <Image
                    source={{ uri: info?.imagen || "https://via.placeholder.com/1200x800?text=Restaurante" }}
                    style={[styles.hero, { marginTop: tokens.spacing(1) }]}
                    resizeMode="cover"
                />
                <View style={styles.headerRow}>
                    <Text variant="headlineLarge" style={styles.title} numberOfLines={2}>
                        {info?.nombre || "Restaurante"}
                    </Text>
                    <View style={[styles.statePill, { backgroundColor: isOpen ? tokens.colors.primary : "#9CA3AF" }]}>
                        <Icon source={isOpen ? "check-circle" : "close-circle"} size={18} color="#FFF" />
                        <Text style={styles.statePillText}>{isOpen ? "Abierto" : "Cerrado"}</Text>
                    </View>
                </View>

                {/* Secciones y platos */}
                {secciones.map(([nombreSeccion, lista]) => (
                    <View key={nombreSeccion} style={{ marginTop: tokens.spacing(2), marginBottom: tokens.spacing(1) }}>
                        <Text variant="titleMedium" style={styles.sectionTitle}>{nombreSeccion}:</Text>
                        <View style={{ gap: 10 }}>
                            {lista.map((p) => (
                                <PlatoPreviewCard
                                    key={p.id}
                                    item={{
                                        nombre: p.nombre,
                                        precio: p.precio,
                                        imagen: p.imagen || p.imagenUrl,
                                        subtitle: p.descripcionBreve || p.descripcion || "",
                                    }}
                                    onDetails={() => router.push(`/restaurante/plato/${p.id}`)}
                                    rightSlot={
                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                            {/* Izquierda: EDITAR */}
                                            <TouchableOpacity
                                                onPress={() => router.push(`/restaurante/plato/${p.id}/editar`)}
                                                style={{
                                                    width: 30, height: 30, borderRadius: 15, borderWidth: 2,
                                                    borderColor: tokens.colors.primary, alignItems: "center", justifyContent: "center",
                                                }}
                                            >
                                                <Icon source="pencil" size={16} color={tokens.colors.primary} />
                                            </TouchableOpacity>

                                            {/* Derecha: BORRAR */}
                                            <TouchableOpacity
                                                onPress={() => setConfirmDeletePlatoId(p.id)}
                                                style={{
                                                    width: 30, height: 30, borderRadius: 15, borderWidth: 2,
                                                    borderColor: "#EF4444", alignItems: "center", justifyContent: "center",
                                                }}
                                            >
                                                <Icon source="delete" size={16} color="#EF4444" />
                                            </TouchableOpacity>
                                        </View>
                                    }
                                />
                            ))}
                        </View>
                    </View>
                ))}

                {(!secciones.length) && (
                    <Text style={{ color: tokens.colors.muted, marginTop: tokens.spacing(2) }}>
                        Esta carta está vacía por ahora.
                    </Text>
                )}
            </ScrollView>

            <BottomActionBar
                items={[
                    { icon: "playlist-edit", label: "Editar\nsecciones", onPress: () => router.push("/restaurante/editar-secciones") },
                    { icon: "plus-circle", label: "Añadir\nplato", onPress: () => router.push("/restaurante/plato/nuevo") },
                    { icon: "delete", label: "Eliminar\ncarta", onPress: () => setConfirmDelete(true) },
                ]}
            />

            {/* Pop-up de éxito tras escanear */}
            <Portal>
                <Dialog
                    visible={scanSuccessVisible}
                    onDismiss={() => setScanSuccessVisible(false)}
                    style={{ borderRadius: 18 }}
                >
                    <Dialog.Content>
                        <Text style={{ fontWeight: "800", fontSize: 16, marginBottom: 4 }}>
                            Carta escaneada y creada con éxito.
                        </Text>
                        <Text style={{ color: tokens.colors.muted }}>
                            Puede editarla a continuación.
                        </Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button mode="contained" onPress={() => setScanSuccessVisible(false)}>
                            Entendido
                        </Button>
                    </Dialog.Actions>
                </Dialog>
                <Dialog
                    visible={confirmDelete}
                    onDismiss={() => setConfirmDelete(false)}
                    style={{ borderRadius: 18 }}
                >
                    <Dialog.Title>Eliminar carta</Dialog.Title>
                    <Dialog.Content>
                        <Text style={{ color: tokens.colors.muted }}>
                            ¿Seguro que quieres eliminar toda la carta? Esta acción no se puede deshacer.
                        </Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setConfirmDelete(false)} disabled={deleting}>
                            Cancelar
                        </Button>
                        <Button
                            mode="contained"
                            onPress={async () => {
                                try {
                                    setDeleting(true);
                                    await RestauranteAPI.deleteCarta(restauranteId);
                                    setConfirmDelete(false);
                                    router.replace("/restaurante/visualizar-carta");
                                } catch (e) {
                                    const msg = e?.response?.data?.message || e?.message || "No se pudo eliminar la carta.";
                                    setSnack({ visible: true, text: msg });
                                } finally {
                                    setDeleting(false);
                                }
                            }}
                            loading={deleting}
                        >
                            Eliminar
                        </Button>
                    </Dialog.Actions>
                </Dialog>
                <Dialog
                    visible={!!confirmDeletePlatoId}
                    onDismiss={() => setConfirmDeletePlatoId(null)}
                    style={{ borderRadius: 18 }}
                >
                    <Dialog.Title>Eliminar plato</Dialog.Title>
                    <Dialog.Content>
                        <Text style={{ color: tokens.colors.muted }}>
                            ¿Seguro que quieres eliminar este plato? Esta acción no se puede deshacer.
                        </Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setConfirmDeletePlatoId(null)} disabled={deletingPlato}>
                            Cancelar
                        </Button>
                        <Button
                            mode="contained"
                            onPress={async () => {
                                if (!confirmDeletePlatoId) return;
                                try {
                                    setDeletingPlato(true);
                                    await RestauranteAPI.deletePlato(confirmDeletePlatoId);
                                    // quitar de la lista sin recargar
                                    setPlatos((prev) => (prev || []).filter(p => p.id !== confirmDeletePlatoId));
                                    setConfirmDeletePlatoId(null);
                                    setSnack({ visible: true, text: "Plato eliminado." });
                                } catch (e) {
                                    const msg = e?.response?.data?.message || e?.message || "No se pudo eliminar el plato.";
                                    setSnack({ visible: true, text: msg });
                                } finally {
                                    setDeletingPlato(false);
                                }
                            }}
                            loading={deletingPlato}
                        >
                            Eliminar
                        </Button>
                    </Dialog.Actions>
                </Dialog>


                <Snackbar
                    visible={snack.visible}
                    onDismiss={() => setSnack({ visible: false, text: "" })}
                    duration={2200}
                >
                    <Text style={{ color: "#FFF" }}>{String(snack.text ?? "")}</Text>
                </Snackbar>
            </Portal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    loader: { flex: 1, justifyContent: "center", alignItems: "center" },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    container: { paddingHorizontal: tokens.spacing(3) },

    backRow: {
        flexDirection: "row", alignItems: "center", alignSelf: "flex-start",
        marginTop: tokens.spacing(1), marginBottom: tokens.spacing(1),
    },
    backText: { marginLeft: 4, color: tokens.colors.muted, fontWeight: "700" },

    hero: { width: "100%", height: 180, borderRadius: 16, marginBottom: tokens.spacing(2) },
    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: tokens.spacing(1) },
    title: { fontWeight: "800", flex: 1, marginRight: tokens.spacing(2) },

    statePill: { borderRadius: 999, paddingHorizontal: 12, height: 30, alignItems: "center", justifyContent: "center", flexDirection: "row" },
    statePillText: { color: "#FFF", fontWeight: "800", marginLeft: 6 },

    sectionTitle: { fontWeight: "800", marginBottom: tokens.spacing(1) },
});
