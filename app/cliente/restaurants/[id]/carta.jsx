import React, { useEffect, useMemo, useState } from "react";
import { View, Image, ScrollView, StyleSheet, TouchableOpacity, Share } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import {
    ActivityIndicator, Text, Button, Icon, useTheme,
    Portal, Dialog, Snackbar, TextInput, Chip
} from "react-native-paper";
import * as Clipboard from "expo-clipboard";
import { tokens } from "../../../../theme";
import { RestauranteAPI } from "../../../../lib/api/restaurante";
import { FlujoPagoAPI } from "../../../../lib/api/flujoPago";
import { getMe, getClienteByUsuario } from "../../../../lib/auth";
import PlatoPreviewCard from "../../../../components/ui/PlatoPreviewCard";
import BottomActionBar from "../../../../components/ui/BottomActionBar";

export default function CartaScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const theme = useTheme();

    const [info, setInfo] = useState({});
    const [platos, setPlatos] = useState(null);
    const [loading, setLoading] = useState(true);


    const [me, setMe] = useState(null);
    const [sala, setSala] = useState(null);
    const [clienteId, setClienteId] = useState(null);
    const [codeVisible, setCodeVisible] = useState(false);
    const [snack, setSnack] = useState({ visible: false, text: "" });
    const [joinVisible, setJoinVisible] = useState(false);
    const [joinCode, setJoinCode] = useState("");
    const [joining, setJoining] = useState(false);

    const [selectVisible, setSelectVisible] = useState(false);
    const [selectLoading, setSelectLoading] = useState(false);
    const [comensalesSala, setComensalesSala] = useState([]); // [{id,nombre}]
    const [selectedIds, setSelectedIds] = useState([]);       // [clienteId,...]
    const [pendingPlatoId, setPendingPlatoId] = useState(null);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const [i, c, m] = await Promise.all([
                    RestauranteAPI.getInfo(id),
                    RestauranteAPI.getCarta(id),
                    getMe().catch(() => null),
                ]);
                if (!alive) return;
                setInfo(i || {});
                setPlatos(Array.isArray(c) ? c : []);
                setMe(m || null);
                if (m?.id) {
                    try {
                        const cliente = await getClienteByUsuario(m.id);
                        if (alive) setClienteId(Number(cliente?.id) || null);
                    } catch {
                        if (alive) setClienteId(null);
                    }
                } else {
                    setClienteId(null);
                }
            } catch {
                if (!alive) return;
                setInfo({});
                setPlatos([]);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, [id]);

    const secciones = useMemo(() => {
        const map = {};
        (platos || []).forEach(p => {
            const key = p.seccion || p.categoria || p.tipo || "Otros";
            (map[key] ||= []).push(p);
        });
        return Object.entries(map);
    }, [platos]);

    const isOpen = String(info?.estado || "").toLowerCase() === "abierto";
    const hasSala = !!(sala?.id);

    function normalizeSala(res) {
        if (!res) return null;
        const sid = res?.salaId ?? res?.id ?? res?.data?.salaId ?? res?.data?.id;
        return {
            id: sid != null ? Number(sid) : null,
            codigo: res?.codigo ?? res?.data?.codigo ?? null,
            estado: res?.estado ?? res?.data?.estado ?? null,
            fechaCreacion: res?.fechaCreacion ?? res?.data?.fechaCreacion ?? null,
            raw: res,
        };
    }

    const [backConfirmVisible, setBackConfirmVisible] = useState(false);

    const handleBackPress = () => {
        if (hasSala) {
            setBackConfirmVisible(true);
        } else {
            router.back();
        }
    };

    // ---- Handlers sala de pago
    const handleCreateSala = async () => {
        try {
            if (!isOpen) {
                setSnack({ visible: true, text: "El restaurante está cerrado. Inténtalo cuando esté abierto." });
                return;
            }
            if (!me?.id) {
                setSnack({ visible: true, text: "No pudimos identificar tu usuario. Inicia sesión de nuevo." });
                return;
            }
            if (!clienteId) {
                setSnack({ visible: true, text: "No se pudo obtener tu cliente. Vuelve a iniciar sesión o reintenta." });
                return;
            }
            const restauranteId = Number(info?.id ?? id);
            console.log("CREAR SALA params =>", { restauranteId, clienteId });
            const res = await FlujoPagoAPI.createSala(restauranteId, clienteId);
            const ns = normalizeSala(res);
            setSala(ns);
            setCodeVisible(true);
        } catch (e) {
            console.log(
                "createSala ERR",
                e?.response?.status,
                e?.response?.data || e?.message
            );
            const msg =
                e?.response?.status === 500
                    ? "No se pudo crear la sala (error del servidor). ¿Tu clienteId es correcto?"
                    : "No se pudo crear la sala. Revisa restaurante/cliente.";
            setSnack({ visible: true, text: msg });
        }
    };

    const handleShareCode = async () => {
        if (!sala?.codigo) return;
        setCodeVisible(true);
    };

    const handleJoinSala = async () => {
        try {
            const code = joinCode.trim().toUpperCase();
            if (!code) {
                setSnack({ visible: true, text: "Introduce un código de sala." });
                return;
            }
            if (!clienteId) {
                setSnack({ visible: true, text: "No pudimos identificar tu cliente. Inicia sesión." });
                return;
            }
            const restauranteId = Number(info?.id ?? id);
            setJoining(true);
            const res = await FlujoPagoAPI.joinSala(restauranteId, code, Number(clienteId));
            const ns = normalizeSala(res);
            setSala(ns);
            setJoinVisible(false);
            setJoinCode("");
            setSnack({ visible: true, text: "Te has unido a la sala." });
        } catch (e) {
            const status = e?.response?.status;
            const msg =
                status === 404 ? "Código no encontrado." :
                    status === 409 ? "Ya estabas en esa sala." :
                        "No se pudo unir a la sala.";
            setSnack({ visible: true, text: msg });
        } finally {
            setJoining(false);
        }
    };

    const handleOpenDetalles = () => {
        const currentSalaId = sala?.id;
        if (!currentSalaId) return;
        router.push({
            pathname: "/cliente/restaurants/[id]/pedido",
            params: {
                id: String(id),
                salaId: String(currentSalaId),
                restauranteNombre: info?.nombre ?? "",
                restauranteImagen: info?.imagen ?? "",
                v: String(Date.now()),
            },
        });
    };

    const handleAddPlatoPress = async (platoId) => {
        if (!hasSala) {
            setSnack({ visible: true, text: "Crea o únete a una sala antes de añadir platos." });
            return;
        }
        try {
            setPendingPlatoId(platoId);
            setSelectLoading(true);
            const resumen = await FlujoPagoAPI.getResumen(Number(sala.id));
            const lista = Array.isArray(resumen?.comensales) ? resumen.comensales : [];
            setComensalesSala(lista);
            setSelectedIds((prev) => {
                const mine = clienteId ? [Number(clienteId)] : [];
                return mine.filter(id => lista.some(c => c.id === id));
            });
            setSelectVisible(true);
        } catch (e) {
            setSnack({ visible: true, text: "No se pudieron cargar los participantes de la sala." });
        } finally {
            setSelectLoading(false);
        }
    };

    const toggleSelect = (id) => {
        setSelectedIds((curr) =>
            curr.includes(id) ? curr.filter(x => x !== id) : [...curr, id]
        );
    };

    const confirmAddPlato = async () => {
        try {
            if (!pendingPlatoId) return;
            const participantes = selectedIds.map(Number).filter(Boolean);
            if (!participantes.length) {
                setSnack({ visible: true, text: "Selecciona al menos un comensal." });
                return;
            }
            setSelectLoading(true);
            await FlujoPagoAPI.addPlato(Number(sala.id), { platoId: Number(pendingPlatoId), participantes });
            setSelectVisible(false);
            setPendingPlatoId(null);
            setSnack({ visible: true, text: "¡Plato añadido al pedido!" });
        } catch (e) {
            const status = e?.response?.status;
            const msg =
                status === 409 ? "La sala está cerrada."
                    : status === 400 ? "Faltan datos o hay participantes fuera de la sala."
                        : status === 404 ? "Sala o plato no encontrado."
                            : "No se pudo añadir el plato.";
            setSnack({ visible: true, text: msg });
        } finally {
            setSelectLoading(false);
        }
    };


    const copyCode = async () => {
        if (!sala?.codigo) return;
        await Clipboard.setStringAsync(String(sala.codigo));
        setSnack({ visible: true, text: "Código copiado" });
    };
    const shareCodeSystem = async () => {
        if (!sala?.codigo) return;
        try {
            await Share.share({ message: `Código de sala: ${sala.codigo}` });
        } catch { }
    };

    useFocusEffect(
        React.useCallback(() => {
            if (!sala?.id) return;

            let cancelled = false;

            const check = async () => {
                try {
                    const data = await FlujoPagoAPI.getResumen(Number(sala.id));
                    if (cancelled) return;

                    if (String(data?.estado).toLowerCase() === "cerrada") {
                        router.replace({
                            pathname: "/cliente/restaurants/[id]/instrucciones",
                            params: {
                                id: String(id),
                                salaId: String(sala.id),
                                restauranteNombre: info?.nombre ?? "",
                                restauranteImagen: info?.imagen ?? "",
                                v: String(Date.now()),
                            },
                        });
                    }
                } catch (e) {
                }
            };

            check();
            const t = setInterval(check, 2000);

            return () => { cancelled = true; clearInterval(t); };
        }, [sala?.id, id, info?.nombre, info?.imagen])
    );




    if (loading) {
        return <View style={styles.loader}><ActivityIndicator /></View>;
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: tokens.colors.surface }} edges={["top"]}>
            <ScrollView contentContainerStyle={[styles.container, { paddingBottom: 140 }]}>
                {/* Back */}
                <TouchableOpacity onPress={handleBackPress} style={styles.backRow}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Icon source="chevron-left" size={22} color={tokens.colors.primary} />
                    <Text style={styles.backText}>Volver a info del restaurante</Text>
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

                {/* Secciones */}
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
                                    onDetails={() => router.push(`/cliente/restaurants/${id}/plato/${p.id}`)}
                                    rightSlot={
                                        hasSala ? (
                                            <TouchableOpacity
                                                onPress={() => handleAddPlatoPress(p.id)}
                                                style={{
                                                    width: 30, height: 30, borderRadius: 15, borderWidth: 2,
                                                    borderColor: tokens.colors.primary, alignItems: "center", justifyContent: "center",
                                                }}>
                                                <Icon source="plus" size={18} color={tokens.colors.primary} />
                                            </TouchableOpacity>
                                        ) : (
                                            <View style={{
                                                width: 30, height: 30, borderRadius: 15, borderWidth: 2,
                                                borderColor: "#D1D5DB", alignItems: "center", justifyContent: "center", opacity: 0.5
                                            }}>
                                                <Icon source="plus" size={18} color="#9CA3AF" />
                                            </View>
                                        )
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

            {/* Barra inferior: cambia según haya sala o no */}
            <BottomActionBar
                items={[
                    hasSala
                        ? { icon: "share-variant", label: "Compartir\ncódigo", onPress: handleShareCode }
                        : { icon: "plus-circle", label: "Crear sala\nde pago", onPress: handleCreateSala },
                    { icon: "clipboard-list", label: "Detalles\ndel pedido", disabled: !hasSala, onPress: handleOpenDetalles },
                    { icon: "arrow-right", label: "Unirse a\nsala", disabled: hasSala, onPress: () => setJoinVisible(true) },
                ]}
            />

            {/* POPUP con el código de sala */}
            <Portal>
                <Dialog visible={codeVisible} onDismiss={() => setCodeVisible(false)} style={{ borderRadius: 18 }} >
                    <Dialog.Title>Código de sala</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="headlineMedium" style={{ fontWeight: "800", textAlign: "center" }}>
                            {sala?.codigo || "—"}
                        </Text>
                        <Text style={{ color: tokens.colors.muted, textAlign: "center", marginTop: 6 }}>
                            Compártelo con tu mesa para que se unan a la sala.
                        </Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button
                            mode="outlined"
                            onPress={copyCode}
                            style={{ marginRight: 6 }}
                        >
                            Copiar
                        </Button>
                        <Button mode="contained" onPress={shareCodeSystem}>
                            Compartir
                        </Button>
                    </Dialog.Actions>
                </Dialog>
                {/* Dialog para UNIRSE A SALA */}
                <Dialog
                    visible={joinVisible}
                    onDismiss={() => setJoinVisible(false)}
                    style={{ borderRadius: 6 }}
                >
                    <Dialog.Title>Unirse a una sala</Dialog.Title>
                    <Dialog.Content>
                        <Text style={{ marginBottom: 8 }}>
                            Introduce el código de sala que te han compartido:
                        </Text>
                        <TextInput
                            mode="outlined"
                            placeholder="p. ej. VGBM2D"
                            value={joinCode}
                            onChangeText={setJoinCode}
                            autoCapitalize="characters"
                            autoCorrect={false}
                            style={{ marginTop: 4 }}
                        />
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setJoinVisible(false)} disabled={joining}>
                            Cancelar
                        </Button>
                        <Button mode="contained" onPress={handleJoinSala} loading={joining} disabled={joining}>
                            Unirse
                        </Button>
                    </Dialog.Actions>
                </Dialog>
                {/* DIALOG: seleccionar comensales para el plato */}
                <Dialog
                    visible={selectVisible}
                    onDismiss={() => { if (!selectLoading) setSelectVisible(false); }}
                    style={{ borderRadius: 6 }}
                >
                    <Dialog.Title>¿Quiénes compartirán este plato?</Dialog.Title>
                    <Dialog.Content>
                        <Text style={{ color: tokens.colors.muted }}>
                            Elige los comensales de tu mesa que van a participar en este plato. Podrás cambiarlo más tarde.
                        </Text>

                        <View style={{ height: 10 }} />


                        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                            {comensalesSala.length === 0 ? (
                                <Text style={{ color: tokens.colors.muted }}>Aún no hay participantes en la sala.</Text>
                            ) : (
                                comensalesSala.map((c) => {
                                    const selected = selectedIds.includes(c.id);
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
                                            }}
                                            textStyle={{ color: selected ? "#FFF" : "#111827", fontWeight: "700" }}
                                            icon={({ size }) => (
                                                <Icon source="account" size={size - 2} color={selected ? "#FFF" : "#6B7280"} />
                                            )}
                                            onPress={() => toggleSelect(c.id)}
                                        >
                                            {c.nombre}
                                        </Chip>
                                    );
                                })
                            )}
                        </View>

                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setSelectVisible(false)} disabled={selectLoading}>Cancelar</Button>
                        <Button mode="contained" onPress={confirmAddPlato} loading={selectLoading} disabled={selectLoading || !selectedIds.length}>
                            Añadir al pedido
                        </Button>
                    </Dialog.Actions>
                </Dialog>
                <Dialog
                    visible={backConfirmVisible}
                    onDismiss={() => setBackConfirmVisible(false)}
                    style={{ borderRadius: 10 }}
                >
                    <Dialog.Title>Tienes una sala de pago activa</Dialog.Title>
                    <Dialog.Content>
                        <Text style={{ color: tokens.colors.muted }}>
                            Mientras estés en una sala, no puedes volver al listado de restaurantes.
                            Ve a <Text style={{ fontWeight: "800", color: tokens.colors.primary }}>Detalles del pedido</Text>
                            para gestionarla o cerrarla.
                        </Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setBackConfirmVisible(false)}>Seguir aquí</Button>
                        <Button
                            mode="contained"
                            onPress={() => {
                                setBackConfirmVisible(false);
                                handleOpenDetalles();  //pantalla de pedido
                            }}
                        >
                            Ir a Detalles
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
