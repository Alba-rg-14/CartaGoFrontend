import React, { useEffect, useMemo, useState } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
    ActivityIndicator,
    Text,
    Button,
    Icon,
    Portal,
    Dialog,
    TextInput,
    Snackbar,
} from "react-native-paper";
import { tokens } from "../../theme";
import { RestauranteAPI } from "../../lib/api/restaurante";
import { getMe, getUser, getRestauranteByUsuario } from "../../lib/auth";

export default function EditarSeccionesScreen() {
    const router = useRouter();

    const [restauranteId, setRestauranteId] = useState(null);
    const [cartaId, setCartaId] = useState(null);
    const [platos, setPlatos] = useState(null);
    const [loading, setLoading] = useState(true);
    const [snack, setSnack] = useState({ visible: false, text: "" });

    // Diálogos
    const [renameDlg, setRenameDlg] = useState({ visible: false, from: "", to: "" });
    const [createDlg, setCreateDlg] = useState({ visible: false, name: "", selected: {}, submitting: false });
    const [deleteDlg, setDeleteDlg] = useState({ visible: false, from: "", to: "" });
    const [moveDlg, setMoveDlg] = useState({ visible: false, from: "", to: "", selected: {}, submitting: false });

    // Resolver restauranteId
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
                if (!alive) return;
                const ok = Number.isFinite(rid) && rid > 0 ? rid : null;
                setRestauranteId(ok);
            } finally { }
        })();
        return () => { alive = false; };
    }, []);

    // Carga cartaId + platos
    useEffect(() => {
        if (!restauranteId) return;
        let alive = true;
        (async () => {
            try {
                setLoading(true);
                const [cid, lista] = await Promise.all([
                    RestauranteAPI.getCartaId(restauranteId),
                    RestauranteAPI.getCarta(restauranteId),
                ]);
                if (!alive) return;
                setCartaId(cid);
                setPlatos(Array.isArray(lista) ? lista : []);
            } catch (e) {
                if (!alive) return;
                setCartaId(null);
                setPlatos([]);
                setSnack({ visible: true, text: e?.message || "No se pudo cargar la carta." });
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, [restauranteId]);

    const secciones = useMemo(() => {
        const map = {};
        (platos || []).forEach((p) => {
            const key = p.seccion || "Otros";
            (map[key] ||= []).push(p);
        });
        return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
    }, [platos]);

    const buildPlatosPreview = (lista = [], max = 6) => {
        const names = (lista || []).map(p => String(p?.nombre || "").trim()).filter(Boolean);
        if (names.length <= max) return names.join(" · ");
        const shown = names.slice(0, max).join(" · ");
        const rest = names.length - max;
        return `${shown}  (+${rest} más)`;
    };

    const openRename = (from) => setRenameDlg({ visible: true, from, to: from });
    const openDeleteSection = (from) => {
        const dest = (secciones.find(([s]) => s !== from)?.[0]) || "";
        setDeleteDlg({ visible: true, from, to: dest });
    };
    const openMovePlatos = (from) => {
        setMoveDlg({ visible: true, from, to: (secciones.find(([s]) => s !== from)?.[0]) || "", selected: {}, submitting: false });
    };
    const openCreate = () => setCreateDlg({ visible: true, name: "", selected: {}, submitting: false });

    const doRename = async () => {
        try {
            const from = (renameDlg.from || "").trim();
            const to = (renameDlg.to || "").trim();
            if (!from) return;
            if (!to) { setSnack({ visible: true, text: "El nuevo nombre no puede estar vacío." }); return; }
            await RestauranteAPI.renameSeccion(cartaId, from, to);
            setPlatos((prev) => prev.map((p) => (p.seccion === from ? { ...p, seccion: to } : p)));
            setRenameDlg({ visible: false, from: "", to: "" });
            setSnack({ visible: true, text: `Sección renombrada a “${to}”.` });
        } catch (e) {
            setSnack({ visible: true, text: e?.response?.data?.message || e?.message || "No se pudo renombrar la sección." });
        }
    };

    const doCreate = async () => {
        try {
            const name = (createDlg.name || "").trim();
            const ids = Object.entries(createDlg.selected).filter(([, v]) => v).map(([k]) => Number(k));
            if (!name) { setSnack({ visible: true, text: "Pon un nombre a la nueva sección." }); return; }
            if (ids.length === 0) { setSnack({ visible: true, text: "Selecciona al menos un plato." }); return; }

            setCreateDlg((s) => ({ ...s, submitting: true }));
            await RestauranteAPI.movePlatosToSeccion(ids, name);
            setPlatos(prev => prev.map(p => (ids.includes(p.id) ? { ...p, seccion: name } : p)));
            setCreateDlg({ visible: false, name: "", selected: {}, submitting: false });
            setSnack({ visible: true, text: `Sección “${name}” creada con ${ids.length} plato(s).` });
        } catch (e) {
            setSnack({ visible: true, text: e?.response?.data?.message || e?.message || "No se pudo crear la sección." });
            setCreateDlg((s) => ({ ...s, submitting: false }));
        }
    };

    if (loading) {
        return <View style={styles.loader}><ActivityIndicator /></View>;
    }

    if (!restauranteId || !cartaId) {
        return (
            <SafeAreaView style={styles.center} edges={["top"]}>
                <Text style={{ fontWeight: "800", marginBottom: 6 }}>No encuentro tu carta</Text>
                <Button onPress={() => router.replace("/restaurante")}>Volver</Button>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: tokens.colors.surface }} edges={["top"]}>
            <ScrollView contentContainerStyle={[styles.container, { paddingBottom: 24 }]}>

                {/* Back */}
                <TouchableOpacity
                    onPress={() => router.replace("/restaurante/visualizar-carta")}
                    style={styles.backRow}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Icon source="chevron-left" size={22} color={tokens.colors.primary} />
                    <Text style={styles.backText}>Volver a la carta</Text>
                </TouchableOpacity>

                {/* Header (evita solaparse) */}
                <View style={styles.headerRow}>
                    <Text variant="headlineSmall" style={styles.title}>Editar secciones</Text>
                    <Button
                        icon="plus"
                        mode="contained"
                        compact
                        onPress={openCreate}
                        contentStyle={{ paddingHorizontal: 12, height: 36 }}
                        style={{ borderRadius: 999 }}
                        labelStyle={{ fontWeight: "800" }}
                    >
                        Crear sección
                    </Button>
                </View>

                {/* Listado de secciones */}
                {secciones.map(([nombreSeccion, lista]) => (
                    <View key={nombreSeccion || "Sin-seccion"} style={styles.sectionItem}>
                        {/* Fila 1: título + contador + preview */}
                        <View style={styles.sectionInfo}>
                            <View style={{ flex: 1, paddingRight: 8 }}>
                                <Text variant="titleMedium" style={{ fontWeight: "800" }}>
                                    {nombreSeccion || "Sin sección"}
                                </Text>
                                <Text style={{ color: tokens.colors.muted, marginTop: 2 }}>
                                    {lista.length} plato(s)
                                </Text>

                                {!!lista?.length && (
                                    <Text style={styles.platosPreview} numberOfLines={2}>
                                        {(() => {
                                            const names = (lista || [])
                                                .map(p => String(p?.nombre || "").trim())
                                                .filter(Boolean);
                                            const max = 6;
                                            if (names.length <= max) return names.join(" · ");
                                            return `${names.slice(0, max).join(" · ")}  (+${names.length - max} más)`;
                                        })()}
                                    </Text>
                                )}
                            </View>
                        </View>

                        {/* Fila 2: acciones (debajo, con wrap) */}
                        <View style={styles.actionsRow}>
                            <Button
                                mode="outlined"
                                icon="rename-box"
                                compact
                                onPress={() => openRename(nombreSeccion)}
                                contentStyle={styles.btnContent}
                                style={styles.actionBtn}
                                labelStyle={styles.btnLabel}
                            >
                                Renombrar
                            </Button>

                            <Button
                                mode="outlined"
                                icon="swap-horizontal"
                                compact
                                onPress={() => openMovePlatos(nombreSeccion)}
                                contentStyle={styles.btnContent}
                                style={styles.actionBtn}
                                labelStyle={styles.btnLabel}
                            >
                                Mover platos
                            </Button>

                            <Button
                                mode="outlined"
                                icon="delete"
                                compact
                                onPress={() => openDeleteSection(nombreSeccion)}
                                contentStyle={styles.btnContent}
                                style={styles.actionBtn}
                                labelStyle={styles.btnLabel}
                            >
                                Eliminar sección
                            </Button>
                        </View>
                    </View>
                ))}


                {!secciones.length && (
                    <Text style={{ color: tokens.colors.muted, marginTop: tokens.spacing(2) }}>
                        No hay secciones todavía.
                    </Text>
                )}
            </ScrollView>

            <Portal>
                {/* DLG Renombrar */}
                <Dialog visible={renameDlg.visible} onDismiss={() => setRenameDlg({ visible: false, from: "", to: "" })} style={{ borderRadius: 18 }}>
                    <Dialog.Title>Renombrar sección</Dialog.Title>
                    <Dialog.Content>
                        <Text style={{ marginBottom: 8, color: tokens.colors.muted }}>De: {renameDlg.from}</Text>
                        <TextInput
                            label="Nuevo nombre"
                            mode="outlined"
                            value={renameDlg.to}
                            onChangeText={(v) => setRenameDlg((s) => ({ ...s, to: v }))}
                        />
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setRenameDlg({ visible: false, from: "", to: "" })}>Cancelar</Button>
                        <Button mode="contained" onPress={doRename}>Guardar</Button>
                    </Dialog.Actions>
                </Dialog>

                {/* DLG Eliminar (mover todo a otra sección) */}
                <Dialog visible={deleteDlg.visible} onDismiss={() => setDeleteDlg({ visible: false, from: "", to: "" })} style={{ borderRadius: 18 }}>
                    <Dialog.Title>Eliminar sección</Dialog.Title>
                    <Dialog.Content>
                        <Text style={{ color: tokens.colors.muted, marginBottom: 8 }}>
                            Mover todos los platos de “{deleteDlg.from || "Sin sección"}” a:
                        </Text>

                        <View style={{ borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, padding: 6 }}>
                            {secciones
                                .filter(([s]) => s !== deleteDlg.from)
                                .map(([s]) => (
                                    <TouchableOpacity
                                        key={s || "Sin-seccion"}
                                        onPress={() => setDeleteDlg((st) => ({ ...st, to: s }))}
                                        style={{ paddingVertical: 8, flexDirection: "row", justifyContent: "space-between" }}
                                    >
                                        <Text>{s || "Sin sección"}</Text>
                                        {deleteDlg.to === s && <Icon source="check" size={18} />}
                                    </TouchableOpacity>
                                ))}
                            {secciones.filter(([s]) => s !== deleteDlg.from).length === 0 && (
                                <Text style={{ color: tokens.colors.muted }}>No hay otras secciones disponibles.</Text>
                            )}
                        </View>

                        <Text style={{ marginTop: 8, color: tokens.colors.muted }}>
                            Esta acción moverá todos los platos y eliminará “{deleteDlg.from || "Sin sección"}” de la vista.
                        </Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setDeleteDlg({ visible: false, from: "", to: "" })}>Cancelar</Button>
                        <Button
                            mode="contained"
                            disabled={!deleteDlg.to}
                            onPress={async () => {
                                try {
                                    const from = deleteDlg.from || "";
                                    const to = deleteDlg.to;
                                    const ids = (platos || []).filter(p => (p.seccion || "") === from).map(p => p.id);
                                    await RestauranteAPI.movePlatosToSeccion(ids, to);
                                    setPlatos(prev => prev.map(p => (p.seccion === from ? { ...p, seccion: to } : p)));
                                    setDeleteDlg({ visible: false, from: "", to: "" });
                                    setSnack({ visible: true, text: `Sección eliminada. ${ids.length} plato(s) movidos a “${to}”.` });
                                } catch (e) {
                                    setSnack({ visible: true, text: e?.response?.data?.message || e?.message || "No se pudo eliminar la sección." });
                                }
                            }}
                        >
                            Confirmar
                        </Button>
                    </Dialog.Actions>
                </Dialog>

                {/* DLG Crear sección (multi-selección) */}
                <Dialog visible={createDlg.visible} onDismiss={() => setCreateDlg({ visible: false, name: "", selected: {}, submitting: false })} style={{ borderRadius: 18 }}>
                    <Dialog.Title>Crear nueva sección</Dialog.Title>
                    <Dialog.Content>
                        <TextInput
                            label="Nombre de la sección"
                            mode="outlined"
                            value={createDlg.name}
                            onChangeText={(v) => setCreateDlg((s) => ({ ...s, name: v }))}
                        />

                        <Text style={{ marginTop: 12, marginBottom: 6, fontWeight: "800" }}>Elige platos (≥ 1)</Text>
                        <ScrollView style={{ maxHeight: 260 }}>
                            {(platos || []).map((p) => {
                                const checked = !!createDlg.selected[p.id];
                                return (
                                    <TouchableOpacity
                                        key={p.id}
                                        onPress={() =>
                                            setCreateDlg((s) => ({ ...s, selected: { ...s.selected, [p.id]: !checked } }))
                                        }
                                        style={{ paddingVertical: 6, flexDirection: "row", alignItems: "center" }}
                                    >
                                        <Icon source={checked ? "checkbox-marked" : "checkbox-blank-outline"} size={20} />
                                        <Text style={{ marginLeft: 8, flex: 1 }}>{p.nombre}</Text>
                                        <Text style={{ color: tokens.colors.muted }}>{p.seccion || "Sin sección"}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setCreateDlg({ visible: false, name: "", selected: {}, submitting: false })}>
                            Cancelar
                        </Button>
                        <Button
                            mode="contained"
                            loading={createDlg.submitting}
                            onPress={doCreate}
                        >
                            Crear
                        </Button>
                    </Dialog.Actions>
                </Dialog>

                {/* DLG Mover platos (multi) */}
                <Dialog visible={moveDlg.visible} onDismiss={() => setMoveDlg({ visible: false, from: "", to: "", selected: {}, submitting: false })} style={{ borderRadius: 18 }}>
                    <Dialog.Title>Mover platos</Dialog.Title>
                    <Dialog.Content>
                        <Text style={{ color: tokens.colors.muted, marginBottom: 8 }}>
                            Sección origen: {moveDlg.from || "Sin sección"}
                        </Text>

                        <View style={{ borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, padding: 6, marginBottom: 10 }}>
                            {secciones.filter(([s]) => s !== moveDlg.from).map(([s]) => (
                                <TouchableOpacity key={s || "Sin-seccion"} onPress={() => setMoveDlg((st) => ({ ...st, to: s }))} style={{ paddingVertical: 8, flexDirection: "row", justifyContent: "space-between" }}>
                                    <Text>{s || "Sin sección"}</Text>
                                    {moveDlg.to === s && <Icon source="check" size={18} />}
                                </TouchableOpacity>
                            ))}
                            {secciones.filter(([s]) => s !== moveDlg.from).length === 0 && (
                                <Text style={{ color: tokens.colors.muted }}>No hay otras secciones disponibles.</Text>
                            )}
                        </View>

                        <Text style={{ fontWeight: "800", marginBottom: 6 }}>Elige platos</Text>
                        <ScrollView style={{ maxHeight: 260 }}>
                            {(platos || []).filter(p => (p.seccion || "") === (moveDlg.from || "")).map((p) => {
                                const checked = !!moveDlg.selected[p.id];
                                return (
                                    <TouchableOpacity
                                        key={p.id}
                                        onPress={() => setMoveDlg((s) => ({ ...s, selected: { ...s.selected, [p.id]: !checked } }))}
                                        style={{ paddingVertical: 6, flexDirection: "row", alignItems: "center" }}
                                    >
                                        <Icon source={checked ? "checkbox-marked" : "checkbox-blank-outline"} size={20} />
                                        <Text style={{ marginLeft: 8, flex: 1 }}>{p.nombre}</Text>
                                        <Text style={{ color: tokens.colors.muted }}>{p.seccion || "Sin sección"}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setMoveDlg({ visible: false, from: "", to: "", selected: {}, submitting: false })}>
                            Cancelar
                        </Button>
                        <Button
                            mode="contained"
                            loading={moveDlg.submitting}
                            disabled={!moveDlg.to}
                            onPress={async () => {
                                try {
                                    const ids = Object.entries(moveDlg.selected).filter(([, v]) => v).map(([k]) => Number(k));
                                    if (ids.length === 0) { setSnack({ visible: true, text: "Selecciona al menos un plato." }); return; }
                                    setMoveDlg((s) => ({ ...s, submitting: true }));
                                    await RestauranteAPI.movePlatosToSeccion(ids, moveDlg.to);
                                    setPlatos(prev => prev.map(p => (ids.includes(p.id) ? { ...p, seccion: moveDlg.to } : p)));
                                    setMoveDlg({ visible: false, from: "", to: "", selected: {}, submitting: false });
                                    setSnack({ visible: true, text: `Movidos ${ids.length} plato(s) a “${moveDlg.to}”.` });
                                } catch (e) {
                                    setSnack({ visible: true, text: e?.response?.data?.message || e?.message || "No se pudieron mover los platos." });
                                    setMoveDlg((s) => ({ ...s, submitting: false }));
                                }
                            }}
                        >
                            Mover
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
    container: { paddingHorizontal: tokens.spacing(3), paddingTop: tokens.spacing(2) },

    backRow: {
        flexDirection: "row", alignItems: "center", alignSelf: "flex-start",
        marginBottom: tokens.spacing(2),
    },
    backText: { marginLeft: 4, color: tokens.colors.muted, fontWeight: "700" },

    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: tokens.spacing(1),
    },
    title: { fontWeight: "800", flexShrink: 1, marginRight: 10 },

    sectionItem: {
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 14,
        padding: 12,
        marginBottom: 10,
        backgroundColor: "#FFF",

    },

    sectionInfo: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        marginBottom: 10,
    },

    actionsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 8,
        marginTop: 2,
    },

    actionBtn: {
        borderRadius: 999,
        marginRight: 6,
        marginBottom: 6,
    },
    btnContent: { paddingHorizontal: 12, height: 36 },
    btnLabel: { fontWeight: "800" },
    platosPreview: {
        marginTop: 6,
        color: "#64748B",     // gris legible
        fontSize: 12,         // discreto
        lineHeight: 16,
    },

});
