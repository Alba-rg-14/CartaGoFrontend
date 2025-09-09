// app/restaurante/plato/nuevo.jsx
import React, { useEffect, useState, useCallback } from "react";
import { View, Image, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
    Text, Icon, ActivityIndicator, TextInput, Button, Chip, Snackbar, Portal, Dialog
} from "react-native-paper";
import * as ImagePicker from "expo-image-picker";

import { tokens } from "../../../theme";
import { RestauranteAPI } from "../../../lib/api/restaurante";
import { uploadImageToCloudinary } from "../../../lib/cloudinary";
import { getMe, getUser, getRestauranteByUsuario } from "../../../lib/auth";

export default function PlatoNuevo() {
    const router = useRouter();

    const [restauranteId, setRestauranteId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form
    const [nombre, setNombre] = useState("");
    const [descripcion, setDescripcion] = useState("");
    const [precioStr, setPrecioStr] = useState("");

    // Imagen (solo local hasta crear)
    const [localImage, setLocalImage] = useState(null); // {uri,name,mime}

    // Alérgenos
    const [allAlergenos, setAllAlergenos] = useState([]);
    const [selectedAlergenoIds, setSelectedAlergenoIds] = useState([]);

    // UI
    const [snack, setSnack] = useState({ visible: false, text: "" });
    const [confirmExit, setConfirmExit] = useState(false);

    // Resolver restauranteId del usuario y cargar alérgenos
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                setLoading(true);
                // restauranteId
                const u = await getUser().catch(() => null);
                let rid = u?.restauranteId ? Number(u.restauranteId) : null;
                if (!rid) {
                    const me = await getMe().catch(() => null);
                    const dto = me?.id ? await getRestauranteByUsuario(me.id).catch(() => null) : null;
                    rid = dto?.id ? Number(dto.id) : null;
                }
                if (alive) setRestauranteId(Number.isFinite(rid) && rid > 0 ? rid : null);

                const alergs = await RestauranteAPI.getAlergenos().catch(() => []);
                if (alive) setAllAlergenos(Array.isArray(alergs) ? alergs : []);
            } catch {
                setSnack({ visible: true, text: "No se pudo preparar el formulario." });
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, []);

    // Imagen: helpers
    const reqMedia = async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (perm.status !== "granted") { setSnack({ visible: true, text: "Permiso de galería denegado" }); return false; }
        return true;
    };
    const reqCamera = async () => {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (perm.status !== "granted") { setSnack({ visible: true, text: "Permiso de cámara denegado" }); return false; }
        return true;
    };
    const pickFromGallery = useCallback(async () => {
        if (!(await reqMedia())) return;
        const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.92 });
        if (res.canceled) return;
        const a = res.assets?.[0]; if (!a?.uri) return;
        setLocalImage({ uri: a.uri, name: a.fileName || `photo_${Date.now()}.jpg`, mime: a.mimeType || "image/jpeg" });
    }, []);
    const takePhoto = useCallback(async () => {
        if (!(await reqCamera())) return;
        const res = await ImagePicker.launchCameraAsync({ quality: 0.92 });
        if (res.canceled) return;
        const a = res.assets?.[0]; if (!a?.uri) return;
        setLocalImage({ uri: a.uri, name: a.fileName || `photo_${Date.now()}.jpg`, mime: a.mimeType || "image/jpeg" });
    }, []);
    const clearImage = () => setLocalImage(null);

    // Alérgenos
    const toggleAlergeno = (id) => {
        setSelectedAlergenoIds((curr) => curr.includes(id) ? curr.filter(x => x !== id) : [...curr, id]);
    };

    // Guardar (crear)
    const onSave = useCallback(async () => {
        try {
            setSaving(true);
            if (!restauranteId) { setSnack({ visible: true, text: "No se encontró restaurante." }); return; }

            const nombreTrim = (nombre || "").trim();
            if (!nombreTrim) { setSnack({ visible: true, text: "El nombre es obligatorio." }); return; }

            // precio: coma o punto
            const precioParsed = (precioStr || "").replace(",", ".");
            const precioNum = precioParsed === "" ? null : (Number.isNaN(Number(precioParsed)) ? null : Number(precioParsed));

            // 1) cartaId (VALIDADO)
            let cartaId;
            try {
                cartaId = await RestauranteAPI.getCartaId(Number(restauranteId));
            } catch (e) {
                setSnack({ visible: true, text: e?.message || "No se pudo obtener la carta del restaurante." });
                return;
            }
            if (!Number.isFinite(cartaId) || cartaId <= 0) {
                setSnack({ visible: true, text: "Id de carta inválido. Revisa que el restaurante tenga carta creada." });
                return;
            }

            // 2) crear plato (sin imagen aún)
            const req = {
                id: null,
                nombre: nombreTrim,
                descripcion: (descripcion || "").trim() || null,
                precio: precioNum,
                seccion: "General",
                orden: null,
                imagen: null,
                alergenosIds: selectedAlergenoIds.map(Number),
            };
            const creado = await RestauranteAPI.crearPlato(cartaId, req);

            // 3) imagen si la hay
            if (localImage?.uri) {
                const url = await uploadImageToCloudinary(localImage.uri, localImage.name, localImage.mime);
                await RestauranteAPI.setPlatoImagen(Number(creado.id), url);
            }

            setSnack({ visible: true, text: "Plato creado." });
            router.replace("/restaurante/visualizar-carta");
        } catch (e) {
            const msg = e?.response?.data?.message || e?.message || "No se pudo crear el plato.";
            setSnack({ visible: true, text: msg });
        } finally {
            setSaving(false);
        }
    }, [restauranteId, nombre, descripcion, precioStr, selectedAlergenoIds, localImage]);

    if (loading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: tokens.colors.surface }} edges={["top"]}>
                <View style={styles.loader}><ActivityIndicator /></View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: tokens.colors.surface }} edges={["top"]}>
            <ScrollView contentContainerStyle={[styles.container, { paddingBottom: 120 }]}>
                {/* Back */}
                <TouchableOpacity
                    onPress={() => router.replace("/restaurante/visualizar-carta")}
                    style={styles.backRow}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Icon source="chevron-left" size={22} color={tokens.colors.primary} />
                    <Text style={styles.backText}>Volver a la carta</Text>
                </TouchableOpacity>

                {/* Imagen */}
                {localImage?.uri ? (
                    <Image source={{ uri: localImage.uri }} style={styles.hero} resizeMode="cover" />
                ) : (
                    <View style={[styles.hero, styles.heroPlaceholder]}>
                        <Icon source="image-plus" size={28} color="#64748B" />
                        <Text style={{ marginTop: 6, color: "#475569", fontWeight: "800" }}>Añade una imagen</Text>
                        <Text style={{ color: "#64748B" }}>Sube desde galería o cámara</Text>
                    </View>
                )}

                <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
                    <Button mode="outlined" icon="image" onPress={pickFromGallery} disabled={saving}>Galería</Button>
                    <Button mode="outlined" icon="camera" onPress={takePhoto} disabled={saving}>Cámara</Button>
                    {localImage && (
                        <Button mode="text" icon="close" onPress={clearImage} disabled={saving}>Quitar</Button>
                    )}
                </View>

                {/* Nombre */}
                <TextInput
                    label="Nombre"
                    mode="outlined"
                    value={nombre}
                    onChangeText={setNombre}
                    style={{ marginTop: tokens.spacing(2) }}
                />

                {/* Descripción */}
                <TextInput
                    label="Descripción"
                    mode="outlined"
                    value={descripcion}
                    onChangeText={setDescripcion}
                    multiline
                    style={{ marginTop: tokens.spacing(2) }}
                />

                {/* Precio */}
                <TextInput
                    label="Precio (€)"
                    mode="outlined"
                    value={precioStr}
                    onChangeText={setPrecioStr}
                    keyboardType="decimal-pad"
                    style={{ marginTop: tokens.spacing(2) }}
                    placeholder="Ej. 9.90"
                />

                {/* Alérgenos */}
                <Text variant="titleMedium" style={styles.sectionTitle}>Alérgenos</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                    {allAlergenos.length === 0 ? (
                        <Text style={{ color: tokens.colors.muted }}>No hay alérgenos disponibles.</Text>
                    ) : (
                        allAlergenos.map((a) => {
                            const id = Number(a.id);
                            const selected = selectedAlergenoIds.includes(id);
                            return (
                                <Chip
                                    key={id}
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
                                        <Icon source="alert-circle-outline" size={size - 2} color={selected ? "#FFF" : "#6B7280"} />
                                    )}
                                    onPress={() =>
                                        setSelectedAlergenoIds((curr) =>
                                            curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id]
                                        )
                                    }
                                >
                                    {a.nombre}
                                </Chip>
                            );
                        })
                    )}
                </View>
            </ScrollView>

            {/* Botón guardar */}
            <View style={styles.bottomBar}>
                <Button
                    mode="contained"
                    icon={saving ? "progress-check" : "content-save"}
                    onPress={onSave}
                    disabled={saving}
                >
                    {saving ? "Creando..." : "Crear plato"}
                </Button>
            </View>

            <Portal>
                <Snackbar
                    visible={snack.visible}
                    onDismiss={() => setSnack({ visible: false, text: "" })}
                    duration={2300}
                >
                    <Text style={{ color: "#FFF" }}>{String(snack.text ?? "")}</Text>
                </Snackbar>
            </Portal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    loader: { flex: 1, alignItems: "center", justifyContent: "center" },
    container: { paddingHorizontal: tokens.spacing(3), paddingTop: tokens.spacing(3) },
    backRow: { flexDirection: "row", alignItems: "center", marginBottom: tokens.spacing(2) },
    backText: { marginLeft: 4, color: tokens.colors.muted, fontWeight: "700" },

    hero: {
        width: "100%",
        height: 220,
        borderRadius: 16,
        marginBottom: tokens.spacing(2),
        backgroundColor: "#EEE",
    },
    heroPlaceholder: {
        alignItems: "center", justifyContent: "center",
        borderWidth: 2, borderStyle: "dashed", borderColor: "#CBD5E1",
        backgroundColor: "#F8FAFC",
    },

    sectionTitle: { fontWeight: "800", marginTop: tokens.spacing(2), marginBottom: tokens.spacing(1) },

    bottomBar: {
        padding: tokens.spacing(3),
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
        backgroundColor: "#FFF",
    },
});
