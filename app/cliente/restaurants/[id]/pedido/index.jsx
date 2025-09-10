// app/cliente/restaurants/[id]/pedido/index.jsx
import React, { useEffect, useMemo, useState } from "react";
import { View, Image, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Text, Button, Icon, ActivityIndicator, Chip, Snackbar, Dialog, Portal, RadioButton } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { tokens } from "../../../../../theme";
import { FlujoPagoAPI } from "../../../../../lib/api/flujoPago";
import PlatoPreviewCard from "../../../../../components/ui/PlatoPreviewCard";

export default function PedidoScreen() {
    const { id, salaId, restauranteNombre, restauranteImagen } = useLocalSearchParams();
    const salaIdNum = Number(salaId);
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [resumen, setResumen] = useState(null); // { comensales, platos, subtotal, ... }

    const handleDeletePlato = async (platoSalaId) => {
        try {
            setRemovingId(platoSalaId);
            await FlujoPagoAPI.deletePlato(salaIdNum, platoSalaId);
            const data = await FlujoPagoAPI.getResumen(salaIdNum);
            setResumen(data || {});
            setSnack({ visible: true, text: "Plato eliminado del pedido." });
        } catch (e) {
            const status = e?.response?.status;
            const msg =
                status === 409 ? "La sala está cerrada." :
                    status === 400 ? "El plato no pertenece a esta sala." :
                        status === 404 ? "Plato o sala no encontrado." :
                            "No se pudo eliminar el plato.";
            setSnack({ visible: true, text: msg });
        } finally {
            setRemovingId(null);
        }
    };

    // editar participantes de un plato
    const [editVisible, setEditVisible] = useState(false);
    const [editLoading, setEditLoading] = useState(false);
    const [editPlatoSalaId, setEditPlatoSalaId] = useState(null);
    const [editSelectedIds, setEditSelectedIds] = useState([]); // [clienteId,...]

    const openEditParticipantes = (plato) => {
        setEditPlatoSalaId(plato.platoSalaId);
        const current = Array.isArray(plato.participantes) ? plato.participantes.map(x => Number(x.id)) : [];
        setEditSelectedIds(current);
        setEditVisible(true);
    };

    const toggleEditSelect = (id) => {
        setEditSelectedIds((curr) =>
            curr.includes(id) ? curr.filter(x => x !== id) : [...curr, id]
        );
    };

    const saveEditParticipantes = async () => {
        try {
            setEditLoading(true);
            await FlujoPagoAPI.replaceParticipantes(salaIdNum, editPlatoSalaId, editSelectedIds);
            const data = await FlujoPagoAPI.getResumen(salaIdNum);
            setResumen(data || {});
            setEditVisible(false);
            setSnack({ visible: true, text: "Participantes actualizados." });
        } catch (e) {
            const status = e?.response?.status;
            const msg =
                status === 409 ? "La sala está cerrada." :
                    status === 400 ? "Participantes no válidos para esta sala." :
                        status === 404 ? "Plato o sala no encontrado." :
                            "No se pudo actualizar.";
            setSnack({ visible: true, text: msg });
        } finally {
            setEditLoading(false);
        }
    };

    const [payVisible, setPayVisible] = useState(false);
    const [payMode, setPayMode] = useState("personalizado"); // por defecto
    const [paying, setPaying] = useState(false);
    const isCerrada = String(resumen?.estado || "").toLowerCase() === "cerrada";

    const handleGenerarInstrucciones = async () => {
        try {
            if (!salaIdNum) return;
            setPaying(true);
            await FlujoPagoAPI.generarInstrucciones(salaIdNum, payMode); // cierra la sala en el back
            setPayVisible(false);
            // Empuja ya (este usuario no espera al poll)
            router.replace({
                pathname: "/cliente/restaurants/[id]/instrucciones",
                params: {
                    id: String(id),
                    salaId: String(salaIdNum),
                    restauranteNombre: restauranteNombre ?? "",
                    restauranteImagen: restauranteImagen ?? "",
                    v: String(Date.now()),
                },
            });
        } catch (e) {
            const status = e?.response?.status;
            const msg =
                status === 409 ? "La sala ya está cerrada." :
                    status === 400 ? "Faltan comensales o platos, o modo inválido." :
                        status === 404 ? "Sala no encontrada." :
                            "No se pudo generar el resumen de pago.";
            setSnack({ visible: true, text: msg });
        } finally {
            setPaying(false);
        }
    };

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const data = await FlujoPagoAPI.getResumen(salaIdNum);
                if (!alive) return;
                setResumen(data || {});
            } catch {
                if (!alive) return;
                setResumen({ platos: [], comensales: [] });
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, [salaIdNum]);

    useFocusEffect(
        React.useCallback(() => {
            let cancelled = false;
            (async () => {
                if (!salaIdNum || Number.isNaN(salaIdNum)) return;
                try {
                    const data = await FlujoPagoAPI.getResumen(salaIdNum);
                    if (!cancelled) setResumen(data || {});
                } catch { }
            })();
            return () => { cancelled = true; };
        }, [salaIdNum])
    );

    // Auto-push a Instrucciones si detectamos la sala cerrada (cada 2s)
    useFocusEffect(
        React.useCallback(() => {
            let cancelled = false;
            let t = setInterval(async () => {
                if (!salaIdNum) return;
                try {
                    const data = await FlujoPagoAPI.getResumen(salaIdNum);
                    if (cancelled) return;
                    if (String(data?.estado).toLowerCase() === "cerrada") {
                        clearInterval(t);
                        router.replace({
                            pathname: "/cliente/restaurants/[id]/instrucciones",
                            params: {
                                id: String(id),
                                salaId: String(salaIdNum),
                                restauranteNombre: restauranteNombre ?? "",
                                restauranteImagen: restauranteImagen ?? "",
                                v: String(Date.now()),
                            },
                        });
                    }
                } catch { }
            }, 2000);
            return () => { cancelled = true; clearInterval(t); };
        }, [salaIdNum, id, restauranteNombre, restauranteImagen])
    );


    const salaLabel = resumen?.salaId ?? salaIdNum ?? "—";
    const codigoSala = resumen?.codigo ?? null;
    const platos = useMemo(() => Array.isArray(resumen?.platos) ? resumen.platos : [], [resumen]);
    const comensales = useMemo(() => Array.isArray(resumen?.comensales) ? resumen.comensales : [], [resumen]);
    const [removingId, setRemovingId] = useState(null);
    const [snack, setSnack] = useState({ visible: false, text: "" });


    if (loading) {
        return <View style={styles.loader}><ActivityIndicator /></View>;
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: tokens.colors.surface }} edges={["top"]}>
            <ScrollView contentContainerStyle={{ paddingBottom: 120, flexGrow: 1 }}>
                {/* Back */}
                <TouchableOpacity onPress={() => router.back()} style={styles.backRow}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Icon source="chevron-left" size={22} color={tokens.colors.primary} />
                    <Text style={styles.backText}>Volver a la carta</Text>
                </TouchableOpacity>

                {/* Hero con overlay */}
                <View style={{ position: "relative", marginHorizontal: tokens.spacing(3) }}>
                    <Image
                        source={{ uri: restauranteImagen || "https://via.placeholder.com/1200x800?text=Restaurante" }}
                        style={styles.hero}
                        resizeMode="cover"
                    />
                    <View style={styles.overlay} />
                    <View style={styles.overlayTextWrap}>
                        <Text numberOfLines={1} style={styles.heroTitle}>{restauranteNombre || "Restaurante"}</Text>
                        <Text style={styles.heroSubtitle}>Detalles del pedido</Text>
                    </View>
                </View>

                {/* Datos de la sala */}
                <View style={{ paddingHorizontal: tokens.spacing(3), marginTop: tokens.spacing(2) }}>
                    <View style={styles.infoCard}>
                        <Text style={styles.infoTitle}>
                            Sala #{salaLabel}{codigoSala ? ` · Código ${codigoSala}` : ""}
                        </Text>
                        <View style={{ height: 8 }} />
                        <Text style={styles.infoLabel}>Participantes:</Text>
                        <View style={styles.chipsWrap}>
                            {comensales.length === 0 ? (
                                <Text style={{ color: tokens.colors.muted }}>Sin participantes aún</Text>
                            ) : (
                                comensales.map((c) => (
                                    <Chip
                                        key={`${c.id}`}
                                        mode="flat"
                                        compact
                                        style={[
                                            styles.chip,
                                            {
                                                backgroundColor: tokens.colors.primary,
                                                borderColor: tokens.colors.primary,
                                                height: 28,
                                                paddingHorizontal: 5,
                                            },
                                        ]}
                                        textStyle={{ color: "#FFF", fontWeight: "700", lineHeight: 16 }}
                                        icon={({ size }) => <Icon source="account" size={size - 2} color="#FFF" />}
                                    >
                                        {c.nombre}
                                    </Chip>

                                ))
                            )}
                        </View>
                    </View>
                </View>

                {/* Lista de platos */}
                <View style={{ paddingHorizontal: tokens.spacing(3), marginTop: tokens.spacing(2), gap: 12 }}>
                    {platos.length === 0 && (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>
                                Aún no hay platos en el pedido.
                            </Text>
                            <Text style={styles.emptySub}>
                                Empieza a añadir platos desde la carta.
                            </Text>
                        </View>
                    )}

                    {platos.map((p) => (
                        <PlatoPreviewCard
                            key={p.platoSalaId}
                            item={{
                                id: p.platoSalaId,
                                nombre: p.platoNombre ?? "Plato",
                                precio: p.precioActual ?? 0,
                                imagen: p.imagen || null,
                                subtitle: Array.isArray(p.participantes) ? `${p.participantes.length} comensal(es)` : "",
                            }}
                            // select visual de comensales
                            centerSlot={
                                <Button
                                    mode="outlined"
                                    icon="account-multiple-outline"
                                    contentStyle={{ height: 36, paddingHorizontal: 14 }}
                                    style={{ borderRadius: 999 }}
                                    uppercase={false}
                                    onPress={() => openEditParticipantes(p)}
                                    rightIcon="menu-down"
                                >
                                    Comensales
                                </Button>
                            }
                            // botón borrar 
                            rightSlot={
                                <TouchableOpacity
                                    onPress={() => handleDeletePlato(p.platoSalaId)}
                                    disabled={removingId === p.platoSalaId}
                                    style={{
                                        width: 30, height: 30, borderRadius: 15, borderWidth: 2,
                                        borderColor: tokens.colors.error,
                                        alignItems: "center", justifyContent: "center",
                                        opacity: removingId === p.platoSalaId ? 0.5 : 1,
                                    }}
                                >
                                    {removingId === p.platoSalaId ? (
                                        <ActivityIndicator size="small" />
                                    ) : (
                                        <Icon source="delete" size={18} color={tokens.colors.error} />
                                    )}
                                </TouchableOpacity>
                            }
                        />
                    ))}
                </View>
            </ScrollView>

            {/*Resumen de pago */}
            <View style={styles.bottomBar}>
                <Button
                    mode="contained"
                    onPress={() => setPayVisible(true)}
                    contentStyle={{ height: 48 }}
                    labelStyle={{ fontWeight: "800" }}
                    disabled={paying || isCerrada || platos.length === 0 || comensales.length === 0}
                >
                    Generar instrucciones de pago
                </Button>
            </View>
            <Snackbar
                visible={snack.visible}
                onDismiss={() => setSnack({ visible: false, text: "" })}
                duration={2200}
                style={{ borderRadius: 6 }}
            >
                <Text style={{ color: "#FFF" }}>{String(snack.text ?? "")}</Text>
            </Snackbar>
            <Portal>
                <Dialog
                    visible={editVisible}
                    onDismiss={() => { if (!editLoading) setEditVisible(false); }}
                    style={{ borderRadius: 6 }}
                >
                    <Dialog.Title>¿Quién participa en este plato?</Dialog.Title>
                    <Dialog.Content>
                        <Text style={{ color: tokens.colors.muted }}>
                            Marca los comensales que compartirán este plato. Puedes dejarlo vacío si nadie participa.
                        </Text>
                        <View style={{ height: 10 }} />
                        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                            {comensales.length === 0 ? (
                                <Text style={{ color: tokens.colors.muted }}>No hay participantes en la sala.</Text>
                            ) : (
                                comensales.map((c) => {
                                    const selected = editSelectedIds.includes(c.id);
                                    return (
                                        <Chip
                                            key={c.id}
                                            compact
                                            mode="flat"
                                            style={{
                                                marginRight: 6, marginBottom: 6,
                                                backgroundColor: selected ? tokens.colors.primary : "#FFF",
                                                borderColor: selected ? tokens.colors.primary : "#E5E7EB",
                                                borderWidth: 1,
                                                height: 28,
                                            }}
                                            textStyle={{ color: selected ? "#FFF" : "#111827", fontWeight: "700", lineHeight: 16 }}
                                            icon={({ size }) => (
                                                <Icon source="account" size={size - 2} color={selected ? "#FFF" : "#6B7280"} />
                                            )}
                                            onPress={() => toggleEditSelect(c.id)}
                                        >
                                            {c.nombre}
                                        </Chip>
                                    );
                                })
                            )}
                        </View>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setEditVisible(false)} disabled={editLoading}>Cancelar</Button>
                        <Button mode="contained" onPress={saveEditParticipantes} loading={editLoading} disabled={editLoading}>
                            Guardar
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
            <Portal>
                <Dialog
                    visible={payVisible}
                    onDismiss={() => { if (!paying) setPayVisible(false); }}
                    style={{ borderRadius: 12 }}
                >
                    <Dialog.Title>¿Cómo queréis dividir la cuenta?</Dialog.Title>
                    <Dialog.Content>
                        <Text style={{ color: tokens.colors.muted, marginBottom: 8 }}>
                            Elige la forma de pago. Enviaremos las instrucciones a todos y la sala quedará cerrada.
                        </Text>

                        <RadioButton.Group onValueChange={setPayMode} value={payMode}>
                            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                                <RadioButton value="personalizado" />
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontWeight: "800" }}>Pago personalizado</Text>
                                    <Text style={{ color: tokens.colors.muted }}>
                                        Cada uno paga su parte según lo que ha consumido.
                                    </Text>
                                </View>
                            </View>
                            <View style={{ flexDirection: "row", alignItems: "center" }}>
                                <RadioButton value="igualitario" />
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontWeight: "800" }}>Pago igualitario</Text>
                                    <Text style={{ color: tokens.colors.muted }}>
                                        Repartir el total a partes iguales entre todos.
                                    </Text>
                                </View>
                            </View>
                        </RadioButton.Group>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setPayVisible(false)} disabled={paying}>Cancelar</Button>
                        <Button mode="contained" onPress={handleGenerarInstrucciones} loading={paying} disabled={paying}>
                            Generar y enviar
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>


            <Snackbar
                visible={snack.visible}
                onDismiss={() => setSnack({ visible: false, text: "" })}
                duration={2200}
                style={{ borderRadius: 6 }}
            >
                <Text style={{ color: "#FFF" }}>{String(snack.text ?? "")}</Text>
            </Snackbar>
        </SafeAreaView>

    );
}

const styles = StyleSheet.create({
    loader: { flex: 1, justifyContent: "center", alignItems: "center" },
    backRow: {
        flexDirection: "row", alignItems: "center", alignSelf: "flex-start",
        marginTop: tokens.spacing(1), marginBottom: tokens.spacing(1), paddingHorizontal: tokens.spacing(3),
    },
    backText: { marginLeft: 4, color: tokens.colors.muted, fontWeight: "700" },
    hero: { width: "100%", height: 160, borderRadius: 16 },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.35)",
        borderRadius: 16,
    },
    overlayTextWrap: { position: "absolute", left: 16, right: 16, bottom: 16 },
    heroTitle: { color: "#FFF", fontWeight: "900", fontSize: 22 },
    heroSubtitle: { color: "#FFF", marginTop: 2, fontWeight: "700" },
    bottomBar: {
        position: "absolute", left: 0, right: 0, bottom: 0,
        padding: tokens.spacing(3), backgroundColor: tokens.colors.surface,
        borderTopWidth: 1, borderTopColor: "#E5E7EB",
    },
    infoCard: {
        backgroundColor: "#F9FAFB",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 12,
        padding: 12,
    },
    infoTitle: { fontWeight: "800", fontSize: 16 },
    infoLabel: { fontWeight: "700", color: tokens.colors.muted },
    chipsWrap: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
    chip: { marginRight: 6, marginBottom: 4 },
    emptyState: {
        alignItems: "center",
        justifyContent: "center",
        minHeight: 280,
        paddingHorizontal: tokens.spacing(3),
        paddingVertical: tokens.spacing(4),
    },
    emptyText: {
        textAlign: "center",
        fontWeight: "900",
        fontSize: 16,
        color: "#111827",
    },
    emptySub: {
        textAlign: "center",
        marginTop: 6,
        fontWeight: "700",
        color: tokens.colors.primary,          // un toque de color para resaltar
    },
});
