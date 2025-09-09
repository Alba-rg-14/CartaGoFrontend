// app/restaurante/scan-carta.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Image, FlatList, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {
    ActivityIndicator,
    Text,
    Button,
    IconButton,
    Snackbar,
    Card,
    Text as PText,
} from "react-native-paper";

import { tokens } from "../../theme";
import { getMe, getUser, getRestauranteByUsuario } from "../../lib/auth";
import { uploadImageToCloudinary } from "../../lib/cloudinary";
import { OcrAPI } from "../../lib/api/ocr";

export default function EscanearCarta() {
    const router = useRouter();

    const [restauranteId, setRestauranteId] = useState(null);
    const [loadingId, setLoadingId] = useState(true);

    const [assets, setAssets] = useState([]); // [{ uri, name?, mime? , remoteUrl? }]
    const [busy, setBusy] = useState(false);
    const [snack, setSnack] = useState({ visible: false, text: "" });

    // --- resolver restauranteId como en editar ---
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
                if (alive) setLoadingId(false);
            }
        })();
        return () => { alive = false; };
    }, []);

    const show = (text) => setSnack({ visible: true, text });

    // --- pickers ---
    const requestMediaPerm = async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (perm.status !== "granted") { show("Permiso de galería denegado"); return false; }
        return true;
    };
    const requestCameraPerm = async () => {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (perm.status !== "granted") { show("Permiso de cámara denegado"); return false; }
        return true;
    };

    const addFromGallery = useCallback(async () => {
        if (!(await requestMediaPerm())) return;

        const res = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.92,
            allowsMultipleSelection: true,
            selectionLimit: 10,
        });
        if (res.canceled) return;

        const picked = (res.assets || [])
            .filter(a => a?.uri)
            .map(a => ({
                uri: a.uri,
                name: a.fileName || `photo_${Date.now()}.jpg`,
                mime: a.mimeType || "image/jpeg",
            }));
        setAssets(prev => [...prev, ...picked]);
    }, []);

    const addFromCamera = useCallback(async () => {
        if (!(await requestCameraPerm())) return;

        const res = await ImagePicker.launchCameraAsync({ quality: 0.92 });
        if (res.canceled) return;

        const a = res.assets?.[0];
        if (!a?.uri) return;

        setAssets(prev => [
            ...prev,
            { uri: a.uri, name: a.fileName || `photo_${Date.now()}.jpg`, mime: a.mimeType || "image/jpeg" },
        ]);
    }, []);

    const removeAt = (idx) => setAssets(prev => prev.filter((_, i) => i !== idx));
    const clearAll = () => setAssets([]);

    const canGenerate = useMemo(() => assets.length > 0 && !busy && !!restauranteId, [assets, busy, restauranteId]);

    // --- generar carta ---
    const onGenerate = useCallback(async () => {
        if (!restauranteId) { show("No encuentro tu restaurante"); return; }
        if (!assets.length) { show("Añade al menos una imagen"); return; }

        try {
            setBusy(true);

            // subir a cloudinary las que falten
            const uploadedUrls = [];
            for (let i = 0; i < assets.length; i++) {
                const a = assets[i];
                if (a.remoteUrl) {
                    uploadedUrls.push(a.remoteUrl);
                    continue;
                }
                const url = await uploadImageToCloudinary(a.uri, a.name, a.mime);
                uploadedUrls.push(url);
                assets[i].remoteUrl = url; // guarda para no re-subir si reintentas
            }
            setAssets([...assets]);

            // llamar OCR scan replace
            await OcrAPI.scan(restauranteId, uploadedUrls, "replace");

            // navegar a la carta
            router.replace("/restaurante/visualizar-carta?scanned=1");
        } catch (e) {
            const msg = e?.response?.data?.message || e?.message || "No se pudo generar la carta.";
            show(msg);
        } finally {
            setBusy(false);
        }
    }, [assets, restauranteId]);

    if (loadingId) {
        return (
            <SafeAreaView style={styles.center}>
                <ActivityIndicator />
            </SafeAreaView>
        );
    }
    if (!restauranteId) {
        return (
            <SafeAreaView style={styles.center}>
                <PText style={{ fontWeight: "800", marginBottom: 6 }}>No encuentro tu restaurante</PText>
                <Button onPress={() => router.replace("/restaurante")}>Volver</Button>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.root} edges={["top"]}>
            <View style={styles.backBar}>
                <IconButton icon="arrow-left" size={22} onPress={() => router.replace("/restaurante")} />
                <Text style={styles.backText}>Volver al restaurante</Text>
                <View style={{ width: 48 }} />
            </View>

            <View style={styles.header}>
                <PText variant="titleMedium" style={{ fontWeight: "800" }}>
                    Escanear carta
                </PText>
                <PText style={{ color: tokens.colors.muted }}>
                    Sube fotos claras de tu carta. Podrás añadir varias y eliminar las que no quieras.
                </PText>
            </View>

            {/* Acciones */}
            <View style={styles.actionsRow}>
                <Button mode="outlined" icon="image" onPress={addFromGallery} disabled={busy}>Galería</Button>
                <Button mode="outlined" icon="camera" onPress={addFromCamera} disabled={busy}>Cámara</Button>
                {assets.length > 0 && (
                    <Button mode="text" icon="delete" onPress={clearAll} disabled={busy}>Vaciar</Button>
                )}
            </View>

            {/* Grid de previews */}
            {assets.length === 0 ? (
                <Card mode="outlined" style={styles.placeholder}>
                    <Card.Content style={{ alignItems: "center" }}>
                        <PText style={{ fontWeight: "800", marginBottom: 6 }}>Añade imágenes</PText>
                        <PText style={{ color: tokens.colors.muted, textAlign: "center" }}>
                            Desde galería o cámara. Cuando termines, pulsa “Generar carta”.
                        </PText>
                    </Card.Content>
                </Card>
            ) : (
                <FlatList
                    data={assets}
                    keyExtractor={(_, i) => String(i)}
                    numColumns={2}
                    contentContainerStyle={{ paddingHorizontal: tokens.spacing(2) }}
                    columnWrapperStyle={{ gap: 10 }}
                    style={{ flex: 1 }}
                    renderItem={({ item, index }) => (
                        <View style={styles.thumbWrap}>
                            <Image source={{ uri: item.uri }} style={styles.thumb} resizeMode="cover" />
                            <TouchableOpacity style={styles.removeBtn} onPress={() => removeAt(index)} disabled={busy}>
                                <IconButton icon="close" size={16} selected />
                            </TouchableOpacity>
                        </View>
                    )}
                />
            )}

            {/* Botón inferior (igual que antes) */}
            <View style={styles.bottomBar}>
                <Button
                    mode="contained"
                    icon={busy ? "progress-check" : "magic-staff"}
                    onPress={onGenerate}
                    disabled={!canGenerate}
                >
                    {busy ? "Generando..." : "Generar carta"}
                </Button>
            </View>

            <Snackbar
                visible={snack.visible}
                onDismiss={() => setSnack({ visible: false, text: "" })}
                duration={2400}
                style={{ borderRadius: 6 }}
            >
                <Text style={{ color: "#FFF" }}>{String(snack.text ?? "")}</Text>
            </Snackbar>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: "#FFF" },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },

    // barra superior de volver (nuevo)
    backBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: tokens.spacing(2),
        paddingVertical: tokens.spacing(1),
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    backText: { fontWeight: "800", fontSize: 16 },

    header: { paddingHorizontal: tokens.spacing(3), paddingTop: tokens.spacing(2), paddingBottom: tokens.spacing(1) },
    actionsRow: { flexDirection: "row", gap: 10, paddingHorizontal: tokens.spacing(3), marginBottom: 10 },
    placeholder: {
        marginHorizontal: tokens.spacing(3),
        marginTop: tokens.spacing(2),
        borderRadius: 12,
        backgroundColor: "#F9FAFB",
    },
    thumbWrap: {
        flex: 1,
        aspectRatio: 1,
        marginBottom: 10,
        borderRadius: 12,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        position: "relative",
    },
    thumb: { width: "100%", height: "100%" },
    removeBtn: {
        position: "absolute",
        top: 4,
        right: 4,
        backgroundColor: "#00000066",
        borderRadius: 14,
    },
    bottomBar: {
        padding: tokens.spacing(3),
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
        backgroundColor: "#FFF",
    },
});
