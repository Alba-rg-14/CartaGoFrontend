// app/restaurante/plato/[platoId]/editar.jsx
import React, { useEffect, useState, useCallback } from "react";
import { View, Image, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    Text, Icon, ActivityIndicator, TextInput, Button, Chip, Snackbar, Portal, Dialog
} from "react-native-paper";
import * as ImagePicker from "expo-image-picker";

import { tokens } from "../../../../theme";
import { RestauranteAPI } from "../../../../lib/api/restaurante";
import { uploadImageToCloudinary } from "../../../../lib/cloudinary";

export default function PlatoEditar() {
    const { platoId } = useLocalSearchParams();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form state
    const [nombre, setNombre] = useState("");
    const [descripcion, setDescripcion] = useState("");
    const [precioStr, setPrecioStr] = useState("");

    // Imagen
    const [currentImageUrl, setCurrentImageUrl] = useState("");
    const [localImage, setLocalImage] = useState(null); // {uri,name,mime}
    const [removeImage, setRemoveImage] = useState(false);

    // Alérgenos
    const [allAlergenos, setAllAlergenos] = useState([]); // [{id,nombre,imagen?}]
    const [selectedAlergenoIds, setSelectedAlergenoIds] = useState([]); // [id,...]

    // Campos ocultos (se envían pero no se editan aquí)
    const [seccionHidden, setSeccionHidden] = useState("");
    const [ordenHidden, setOrdenHidden] = useState(null);

    // UI
    const [snack, setSnack] = useState({ visible: false, text: "" });
    const [confirmExit, setConfirmExit] = useState(false);

    // -------- Cargar plato + alérgenos (precarga) --------
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                setLoading(true);
                const [p, alergs] = await Promise.all([
                    RestauranteAPI.getPlato(platoId),
                    RestauranteAPI.getAlergenos().catch(() => []),
                ]);
                if (!alive) return;

                setNombre(p?.nombre ?? "");
                setDescripcion(p?.descripcion ?? "");
                setPrecioStr(
                    p?.precio == null
                        ? ""
                        : typeof p.precio === "number"
                            ? String(p.precio)
                            : String(p.precio)
                );

                setSeccionHidden(p?.seccion ?? "");                 // se envía al guardar
                setOrdenHidden(p?.orden != null ? Number(p.orden) : null); // se reenvía tal cual

                setCurrentImageUrl(p?.imagen || p?.imagenUrl || "");
                setLocalImage(null);
                setRemoveImage(false);

                const ids = Array.isArray(p?.alergenos)
                    ? p.alergenos.map((a) => Number(a.id)).filter(Boolean)
                    : [];
                setSelectedAlergenoIds(ids);

                setAllAlergenos(Array.isArray(alergs) ? alergs : []);
            } catch (e) {
                setSnack({ visible: true, text: "No se pudieron cargar los datos del plato." });
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, [platoId]);

    // -------- Imagen: helpers --------
    const reqMedia = async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (perm.status !== "granted") {
            setSnack({ visible: true, text: "Permiso de galería denegado" });
            return false;
        }
        return true;
    };
    const reqCamera = async () => {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (perm.status !== "granted") {
            setSnack({ visible: true, text: "Permiso de cámara denegado" });
            return false;
        }
        return true;
    };

    const pickFromGallery = useCallback(async () => {
        if (!(await reqMedia())) return;
        const res = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.92,
        });
        if (res.canceled) return;
        const a = res.assets?.[0]; if (!a?.uri) return;
        setLocalImage({ uri: a.uri, name: a.fileName || `photo_${Date.now()}.jpg`, mime: a.mimeType || "image/jpeg" });
        setRemoveImage(false);
    }, []);

    const takePhoto = useCallback(async () => {
        if (!(await reqCamera())) return;
        const res = await ImagePicker.launchCameraAsync({ quality: 0.92 });
        if (res.canceled) return;
        const a = res.assets?.[0]; if (!a?.uri) return;
        setLocalImage({ uri: a.uri, name: a.fileName || `photo_${Date.now()}.jpg`, mime: a.mimeType || "image/jpeg" });
        setRemoveImage(false);
    }, []);

    const clearImage = () => {
        setLocalImage(null);
        if (currentImageUrl) setRemoveImage(true); // marcar para borrar en el back
    };

    const previewImageUri = localImage?.uri || (!removeImage ? currentImageUrl : null);
    const hasPreview = Boolean(previewImageUri);

    // -------- Alérgenos --------
    const toggleAlergeno = (id) => {
        setSelectedAlergenoIds((curr) =>
            curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id]
        );
    };

    // -------- Guardar --------
    const onSave = useCallback(async () => {
        try {
            setSaving(true);

            // Validación mínima
            const nombreTrim = (nombre || "").trim();
            if (!nombreTrim) { setSnack({ visible: true, text: "El nombre es obligatorio." }); return; }

            // Precio: acepta coma o punto
            const precioParsed = (precioStr || "").replace(",", ".");
            const precioNum = precioParsed === "" ? null : Number.isNaN(Number(precioParsed)) ? null : Number(precioParsed);

            // 1) Imagen (si hay cambios) usando endpoints dedicados
            if (removeImage) {
                await RestauranteAPI.deletePlatoImagen(Number(platoId));
            } else if (localImage?.uri) {
                const url = await uploadImageToCloudinary(localImage.uri, localImage.name, localImage.mime);
                await RestauranteAPI.setPlatoImagen(Number(platoId), url);
            }

            // 2) PUT del resto de campos (sección/orden ocultos para mantener compatibilidad)
            const req = {
                id: Number(platoId),
                nombre: nombreTrim,
                descripcion: (descripcion || "").trim() || null,
                precio: precioNum,                 // BigDecimal en back
                seccion: seccionHidden || "General", // obligatorio en back; usa la actual
                orden: ordenHidden,                // reenviamos el existente (o null)
                imagen: undefined,                 // imagen ya gestionada con endpoints específicos
                alergenosIds: selectedAlergenoIds.map(Number),
            };

            await RestauranteAPI.updatePlato(Number(platoId), req);

            setSnack({ visible: true, text: "Plato actualizado." });
            router.replace("/restaurante/visualizar-carta");
        } catch (e) {
            const msg = e?.response?.data?.message || e?.message || "No se pudo actualizar el plato.";
            setSnack({ visible: true, text: msg });
        } finally {
            setSaving(false);
        }
    }, [platoId, nombre, descripcion, precioStr, seccionHidden, ordenHidden, localImage, removeImage, selectedAlergenoIds]);

    if (loading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: tokens.colors.surface }} edges={["top"]}>
                <View style={styles.loader}><ActivityIndicator /></View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: tokens.colors.surface }} edges={["top"]}>
            {/* Scroll para que no se corte el contenido */}
            <ScrollView contentContainerStyle={[styles.container, { paddingBottom: 120 }]}>
                {/* Back */}
                <TouchableOpacity
                    onPress={() => setConfirmExit(true)}
                    style={styles.backRow}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Icon source="chevron-left" size={22} color={tokens.colors.primary} />
                    <Text style={styles.backText}>Volver a la carta</Text>
                </TouchableOpacity>

                {/* Imagen */}
                {hasPreview ? (
                    <Image source={{ uri: previewImageUri }} style={styles.hero} resizeMode="cover" />
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
                    {(localImage || currentImageUrl) && (
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

            {/* Botón guardar fijo abajo */}
            <View style={styles.bottomBar}>
                <Button
                    mode="contained"
                    icon={saving ? "progress-check" : "content-save"}
                    onPress={onSave}
                    disabled={saving}
                >
                    {saving ? "Guardando..." : "Guardar cambios"}
                </Button>
            </View>

            <Portal>
                {/* Confirmar salir sin guardar */}
                <Dialog visible={confirmExit} onDismiss={() => setConfirmExit(false)} style={{ borderRadius: 12 }}>
                    <Dialog.Title>Salir sin guardar</Dialog.Title>
                    <Dialog.Content>
                        <Text style={{ color: tokens.colors.muted }}>
                            Tienes cambios sin guardar. ¿Seguro que quieres volver a la carta?
                        </Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setConfirmExit(false)}>Cancelar</Button>
                        <Button mode="contained" onPress={() => router.replace("/restaurante/visualizar-carta")}>
                            Salir
                        </Button>
                    </Dialog.Actions>
                </Dialog>

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
