import React, { useEffect, useState, useMemo, useCallback } from "react";
import { View, Image, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import {
    ActivityIndicator, Text, Button, Icon, TextInput, Snackbar, Dialog, Portal,
} from "react-native-paper";
import * as ImagePicker from "expo-image-picker";

import { tokens } from "../../theme";
import { RestauranteAPI } from "../../lib/api/restaurante";
import { getMe, getUser, getRestauranteByUsuario } from "../../lib/auth";
import BottomActionBar from "../../components/ui/BottomActionBar";
import { uploadImageToCloudinary } from "../../lib/cloudinary";

const DAYS_ORDER = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const DAY_ES = { MONDAY: "Lunes", TUESDAY: "Martes", WEDNESDAY: "Miércoles", THURSDAY: "Jueves", FRIDAY: "Viernes", SATURDAY: "Sábado", SUNDAY: "Domingo" };
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export default function EditarRestaurante() {
    const router = useRouter();

    const [restauranteId, setRestauranteId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [snack, setSnack] = useState({ visible: false, text: "" });

    // form fields
    const [nombre, setNombre] = useState("");
    const [descripcion, setDescripcion] = useState("");
    const [direccion, setDireccion] = useState("");
    const [imagenUrl, setImagenUrl] = useState("");      // URL actual guardada
    const [localImage, setLocalImage] = useState(null);  // { uri, name, mime }
    const [hideCurrentImage, setHideCurrentImage] = useState(false);

    // horarios en edición (por días)
    const emptySlots = useMemo(() => ({
        MONDAY: [], TUESDAY: [], WEDNESDAY: [], THURSDAY: [], FRIDAY: [], SATURDAY: [], SUNDAY: [],
    }), []);
    const [slots, setSlots] = useState(emptySlots);
    const [orig, setOrig] = useState({ nombre: "", descripcion: "", direccion: "" });
    const [origTramosJSON, setOrigTramosJSON] = useState("[]"); // para detectar cambios

    // Modal de añadir/editar tramo
    const [modalOpen, setModalOpen] = useState(false);
    const [modalDay, setModalDay] = useState("MONDAY");
    const [start, setStart] = useState("");
    const [end, setEnd] = useState("");
    const [editIndex, setEditIndex] = useState(null); // null=añadir, number=editar

    // 1) Resolver restauranteId desde el usuario (una sola vez)
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
                if (alive && (!Number.isFinite(rid) || rid <= 0)) setLoading(false);
            } finally { }
        })();
        return () => { alive = false; };
    }, []);

    // 2) Recargar datos del restaurante
    const reload = useCallback(async () => {
        if (!restauranteId) return;
        const [info, hs] = await Promise.all([
            RestauranteAPI.getInfo(restauranteId),
            RestauranteAPI.getHorarios(restauranteId),
        ]);

        setNombre(info?.nombre ?? "");
        setDescripcion(info?.descripcion ?? "");
        setDireccion(info?.direccion ?? "");
        setImagenUrl(info?.imagen ?? "");
        setHideCurrentImage(false);
        setLocalImage(null);
        setOrig({
            nombre: info?.nombre ?? "",
            descripcion: info?.descripcion ?? "",
            direccion: info?.direccion ?? "",
        });

        // precargar slots por día
        const initial = {
            MONDAY: [], TUESDAY: [], WEDNESDAY: [], THURSDAY: [], FRIDAY: [], SATURDAY: [], SUNDAY: []
        };
        (hs || []).forEach(h => {
            const d = String(h?.dia || "").toUpperCase();
            if (initial[d]) initial[d].push({ apertura: h.apertura, cierre: h.cierre });
        });
        // ordenar cada día por apertura
        DAYS_ORDER.forEach(d => initial[d].sort((a, b) => a.apertura.localeCompare(b.apertura)));
        setSlots(initial);

        // baseline para detectar cambios
        const tramosOld = [];
        DAYS_ORDER.forEach(d => (initial[d] || []).forEach(s => tramosOld.push({ dia: d, apertura: s.apertura, cierre: s.cierre })));
        setOrigTramosJSON(JSON.stringify(tramosOld));
    }, [restauranteId]);

    // 3) Cargar datos cuando tengamos restauranteId
    useEffect(() => {
        if (!restauranteId) return;
        let alive = true;
        (async () => {
            try {
                setLoading(true);
                await reload();
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, [restauranteId, reload]);

    // 4) Refrescar al volver a enfocar
    useFocusEffect(useCallback(() => { reload(); }, [reload]));

    // ------- Imagen -------
    const pickFromLibrary = async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (perm.status !== "granted") { setSnack({ visible: true, text: "Permiso de galería denegado" }); return; }
        const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.9 });
        if (res.canceled) return;
        const a = res.assets?.[0]; if (!a?.uri) return;
        setLocalImage({ uri: a.uri, name: a.fileName || "photo.jpg", mime: a.mimeType || "image/jpeg" });
    };
    const takePhoto = async () => {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (perm.status !== "granted") { setSnack({ visible: true, text: "Permiso de cámara denegado" }); return; }
        const res = await ImagePicker.launchCameraAsync({ quality: 0.9 });
        if (res.canceled) return;
        const a = res.assets?.[0]; if (!a?.uri) return;
        setLocalImage({ uri: a.uri, name: a.fileName || "photo.jpg", mime: a.mimeType || "image/jpeg" });
    };

    // ------- Horarios (UI y lógica) -------
    const openAddSlot = (day) => {
        setModalDay(day);
        setStart("");
        setEnd("");
        setEditIndex(null);
        setModalOpen(true);
    };
    const openEditSlot = (day, idx) => {
        const s = slots[day][idx];
        setModalDay(day);
        setStart(s.apertura);
        setEnd(s.cierre);
        setEditIndex(idx);
        setModalOpen(true);
    };

    const validateAndUpsertSlot = () => {
        const s = (start || "").trim();
        const e = (end || "").trim();
        if (!HHMM.test(s) || !HHMM.test(e)) {
            setSnack({ visible: true, text: "Formato HH:mm inválido" });
            return;
        }
        if (s >= e) {
            setSnack({ visible: true, text: "La apertura debe ser anterior al cierre" });
            return;
        }
        const dayList = slots[modalDay] || [];
        const conflict = dayList.some((it, i) => {
            if (editIndex !== null && i === editIndex) return false;
            return (s < it.cierre) && (e > it.apertura);
        });
        if (conflict) {
            setSnack({ visible: true, text: "Ese tramo solapa con otro" });
            return;
        }
        // upsert
        let nextDay = [...dayList];
        if (editIndex === null) nextDay.push({ apertura: s, cierre: e });
        else nextDay[editIndex] = { apertura: s, cierre: e };
        nextDay.sort((a, b) => a.apertura.localeCompare(b.apertura));
        setSlots(prev => ({ ...prev, [modalDay]: nextDay }));
        setModalOpen(false);
    };
    const removeSlot = (day, idx) => {
        setSlots(prev => ({ ...prev, [day]: prev[day].filter((_, i) => i !== idx) }));
    };

    // ------- Guardar -------
    const cancel = () => router.replace("/restaurante");

    const save = async () => {
        if (!restauranteId) return;
        try {
            setSaving(true);

            // 1) texto básico
            const nombreTrim = (nombre ?? "").trim();
            const descTrim = (descripcion ?? "").trim();
            const dirTrim = (direccion ?? "").trim();

            const patch = {};
            if (nombreTrim !== (orig.nombre ?? "")) patch.nombre = nombreTrim;
            if (descTrim !== (orig.descripcion ?? "")) patch.descripcion = descTrim;
            if (Object.keys(patch).length) await RestauranteAPI.update(restauranteId, patch);

            // 2) dirección (geocodifica si cambió)
            if (dirTrim !== (orig.direccion ?? "")) {
                await RestauranteAPI.setUbicacion(restauranteId, dirTrim);
            }

            // 3) imagen (si hay nueva)
            if (localImage?.uri) {
                const cloudUrl = await uploadImageToCloudinary(localImage.uri, localImage.name, localImage.mime);
                await RestauranteAPI.setImagen(restauranteId, cloudUrl);
            }

            // 4) horarios: enviar TODO el semanal (mantiene lo que estaba si no cambiamos)
            const tramos = [];
            DAYS_ORDER.forEach(d => (slots[d] || []).forEach(s => tramos.push({ dia: d, apertura: s.apertura, cierre: s.cierre })));
            const newJSON = JSON.stringify(tramos);
            if (newJSON !== origTramosJSON) {
                await RestauranteAPI.putHorariosSemanal(restauranteId, { tramos });
            }
            // Nota: si prefieres SIEMPRE enviarlo, elimina la comparación y deja solo:
            // await RestauranteAPI.putHorariosSemanal(restauranteId, { tramos });

            setSnack({ visible: true, text: "Información guardada." });
            router.replace("/restaurante");
        } catch (e) {
            const msg = e?.response?.data?.message || e?.message || "No se pudo guardar.";
            setSnack({ visible: true, text: msg });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.center}>
                <ActivityIndicator />
            </SafeAreaView>
        );
    }
    if (!restauranteId) {
        return (
            <SafeAreaView style={styles.center}>
                <Text style={{ fontWeight: "800", marginBottom: 6 }}>No encuentro tu restaurante</Text>
                <Button onPress={() => router.replace("/restaurante")}>Volver</Button>
            </SafeAreaView>
        );
    }

    const previewUri = localImage?.uri || (!hideCurrentImage ? imagenUrl : null);
    const hasPreview = Boolean(previewUri);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }} edges={["top"]}>
            <ScrollView contentContainerStyle={styles.container}>
                {/* Imagen */}
                <View style={{ marginTop: tokens.spacing(2) }}>
                    {hasPreview ? (
                        <Image source={{ uri: previewUri }} style={styles.hero} resizeMode="cover" />
                    ) : (
                        <View style={styles.heroPlaceholder}>
                            <Icon source="image-plus" size={28} color="#64748B" />
                            <Text style={{ marginTop: 6, color: "#475569", fontWeight: "800" }}>Añade una imagen</Text>
                            <Text style={{ color: "#64748B" }}>Sube desde galería o cámara</Text>
                        </View>
                    )}

                    <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                        <Button mode="outlined" icon="image" onPress={pickFromLibrary}>Galería</Button>
                        <Button mode="outlined" icon="camera" onPress={() => takePhoto()}>Cámara</Button>

                        {localImage?.uri ? (
                            <Button mode="text" onPress={() => setLocalImage(null)} icon="close">Quitar</Button>
                        ) : imagenUrl ? (
                            <>
                                <Button mode="text" onPress={() => setHideCurrentImage(true)} icon="close">Quitar</Button>
                                {hideCurrentImage && (
                                    <Button mode="text" onPress={() => setHideCurrentImage(false)} icon="backup-restore">
                                        Restaurar
                                    </Button>
                                )}
                            </>
                        ) : null}
                    </View>
                </View>

                {/* Nombre */}
                <TextInput
                    label="Nombre del restaurante"
                    value={nombre}
                    onChangeText={setNombre}
                    mode="outlined"
                    style={{ marginTop: tokens.spacing(2) }}
                />

                {/* Descripción */}
                <TextInput
                    label="Descripción"
                    value={descripcion}
                    onChangeText={setDescripcion}
                    mode="outlined"
                    multiline
                    style={{ marginTop: tokens.spacing(2) }}
                />

                {/* Dirección */}
                <TextInput
                    label="Dirección (calle, nº, ciudad...)"
                    value={direccion}
                    onChangeText={setDireccion}
                    mode="outlined"
                    style={{ marginTop: tokens.spacing(2) }}
                />

                {/* Horarios inline */}
                <Text variant="titleMedium" style={styles.sectionTitle}>Horario (por día):</Text>

                {DAYS_ORDER.map((d) => (
                    <View key={d} style={styles.dayCard}>
                        <View style={styles.dayHeader}>
                            <Text style={{ fontWeight: "800" }}>{DAY_ES[d]}</Text>
                            <Button mode="text" icon="plus" onPress={() => openAddSlot(d)}>
                                Añadir
                            </Button>
                        </View>

                        {(slots[d] || []).length === 0 ? (
                            <Text style={{ color: tokens.colors.muted }}>Cerrado</Text>
                        ) : (
                            (slots[d] || []).map((s, idx) => (
                                <View key={`${d}-${idx}`} style={styles.slotRow}>
                                    <Icon source="clock-outline" size={18} color="#6B7280" />
                                    <Text style={{ marginLeft: 6, fontWeight: "700" }}>{s.apertura} – {s.cierre}</Text>
                                    <View style={{ flex: 1 }} />
                                    <Button compact mode="text" icon="pencil" onPress={() => openEditSlot(d, idx)}>
                                        Editar
                                    </Button>
                                    <Button compact mode="text" icon="delete" onPress={() => removeSlot(d, idx)}>
                                        Quitar
                                    </Button>
                                </View>
                            ))
                        )}
                    </View>
                ))}

                <View style={{ height: 80 }} />
            </ScrollView>

            <BottomActionBar
                items={[
                    { icon: "arrow-left", label: "Cancelar", onPress: () => router.replace("/restaurante"), disabled: saving },
                    { icon: saving ? "progress-check" : "content-save", label: saving ? "Guardando..." : "Guardar cambios", onPress: save, disabled: saving },
                ]}
            />

            <Portal>
                <Dialog visible={modalOpen} onDismiss={() => setModalOpen(false)} style={{ borderRadius: 12 }}>
                    <Dialog.Title>{editIndex === null ? "Añadir tramo" : "Editar tramo"} – {DAY_ES[modalDay]}</Dialog.Title>
                    <Dialog.Content>
                        <TextInput
                            label="Apertura (HH:mm)"
                            value={start}
                            onChangeText={setStart}
                            keyboardType="numbers-and-punctuation"
                            autoCapitalize="none"
                            mode="outlined"
                            style={{ marginBottom: 8 }}
                            placeholder="09:00"
                        />
                        <TextInput
                            label="Cierre (HH:mm)"
                            value={end}
                            onChangeText={setEnd}
                            keyboardType="numbers-and-punctuation"
                            autoCapitalize="none"
                            mode="outlined"
                            placeholder="13:30"
                        />
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setModalOpen(false)}>Cancelar</Button>
                        <Button onPress={validateAndUpsertSlot} mode="contained">
                            {editIndex === null ? "Añadir" : "Guardar"}
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            <Snackbar
                visible={snack.visible}
                onDismiss={() => setSnack({ visible: false, text: "" })}
                duration={2300}
                style={{ borderRadius: 6 }}
            >
                <Text style={{ color: "#FFF" }}>{String(snack.text ?? "")}</Text>
            </Snackbar>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    container: { paddingHorizontal: tokens.spacing(3), paddingBottom: 120 },
    hero: { width: "100%", height: 220, borderRadius: 18, marginBottom: tokens.spacing(3) },
    heroPlaceholder: {
        width: "100%", height: 220, borderRadius: 18,
        borderWidth: 2, borderStyle: "dashed", borderColor: "#CBD5E1",
        backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center",
        marginBottom: tokens.spacing(3),
    },
    sectionTitle: { fontWeight: "800", marginTop: tokens.spacing(2), marginBottom: tokens.spacing(1) },
    dayCard: {
        backgroundColor: "#F9FAFB",
        borderWidth: 1, borderColor: "#E5E7EB",
        borderRadius: 12, padding: 12,
        marginBottom: 10,
    },
    dayHeader: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
    slotRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
});
