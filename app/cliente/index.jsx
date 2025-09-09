// app/cliente/index.jsx
import React, { useEffect, useState, useCallback } from "react";
import { View, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Location from "expo-location"; // ← se usa solo para el filtro "cerca" en la LISTA
import {
    Text,
    TextInput,
    Chip,
    ActivityIndicator,
    useTheme,
} from "react-native-paper";
import { tokens } from "../../theme";
import RestaurantPreviewCard from "../../components/ui/RestaurantPreviewCard";
import { RestauranteAPI } from "../../lib/api/restaurante";

export default function ClientHomeScreen() {
    const theme = useTheme();
    const router = useRouter();

    // Carouseles (modo "Todos" sin búsqueda)
    const [recomendados, setRecomendados] = useState([]);
    const [abiertosCarousel, setAbiertosCarousel] = useState([]);

    // Listado dinámico (cuando hay filtro ≠ todos o búsqueda)
    const [listData, setListData] = useState([]);
    const [listLoading, setListLoading] = useState(false);

    // Estado general
    const [bootLoading, setBootLoading] = useState(true);
    const [query, setQuery] = useState("");
    const [filter, setFilter] = useState("todos"); // "todos" | "abiertos" | "cerca"

    // ----- Carga inicial: carouseles -----
    const loadCarousels = useCallback(async () => {
        setBootLoading(true);

        // Recomendados
        try {
            const allPrev = await RestauranteAPI.getAllPreview();
            setRecomendados(allPrev);
        } catch (e) {
            console.log("Home: getAllPreview failed ->", e?.response?.status, e?.message);
            setRecomendados([]);
        }

        // ⚡ Abiertos ahora (sustituye al carrusel de 'Cerca de ti')
        try {
            const opened = await RestauranteAPI.getAbiertosPreview();
            setAbiertosCarousel(opened);
        } catch (e) {
            console.log("Home: getAbiertosPreview failed ->", e?.response?.status, e?.message);
            setAbiertosCarousel([]);
        }

        setBootLoading(false);
    }, []);

    useEffect(() => { loadCarousels(); }, [loadCarousels]);

    // Mostrar carouseles (solo si Todos + sin búsqueda)
    const showList = !!query.trim() || (filter && filter !== "todos");

    // ----- Recarga listado (sin navegar) -----
    const reloadList = useCallback(async () => {
        if (!showList) {
            setListData([]);
            return;
        }
        setListLoading(true);
        try {
            const q = query.trim();
            if (q.length > 0) {
                const results = await RestauranteAPI.searchByNombre(q);
                setListData(results);
            } else if (filter === "abiertos") {
                const opened = await RestauranteAPI.getAbiertosPreview();
                setListData(opened);
            } else if (filter === "cerca") {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === "granted") {
                    const loc = await Location.getCurrentPositionAsync({});
                    const near = await RestauranteAPI.getCercanos(loc.coords.latitude, loc.coords.longitude, 1);
                    setListData(near.map((r) => ({ id: r.id, nombre: r.nombre, imagen: r.imagen ?? r.imagenUrl ?? null })));
                } else {
                    setListData([]);
                }
            } else {
                const allPrev = await RestauranteAPI.getAllPreview();
                setListData(allPrev);
            }
        } catch (e) {
            console.log("Home: reloadList ERR ->", e?.response?.status, e?.message);
            setListData([]);
        } finally {
            setListLoading(false);
        }
    }, [filter, query, showList]);

    useEffect(() => { reloadList(); }, [reloadList]);

    // ----- Handlers -----
    const goInfo = (id) => router.push(`/cliente/restaurants/${id}`);
    const onSubmitSearch = () => {
        // si hay búsqueda, forzamos modo lista (filtro puede quedarse en "todos")
        reloadList();
    };

    if (bootLoading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: tokens.colors.surface, alignItems: "center", justifyContent: "center" }}>
                <ActivityIndicator />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: tokens.colors.surface }}>
            <View style={{ padding: tokens.spacing(3) }}>
                {/* Título */}
                <Text
                    variant="headlineMedium"
                    style={{
                        color: tokens.colors.primary,
                        fontWeight: "800",
                        marginBottom: tokens.spacing(2),
                    }}
                >
                    Busca un restaurante
                </Text>

                {/* Buscador */}
                <TextInput
                    mode="outlined"
                    placeholder="Buscar por nombre del restaurante"
                    value={query}
                    onChangeText={(t) => {
                        setQuery(t);
                        if (t.trim().length > 0) setFilter(null);
                    }}
                    onSubmitEditing={onSubmitSearch}
                    left={<TextInput.Icon icon="magnify" />}
                    style={{ marginBottom: tokens.spacing(2) }}
                    contentStyle={{ height: 44 }}
                    outlineStyle={{ borderRadius: 24 }}
                />

                {/* Filtros (píldoras) */}
                <View style={{ flexDirection: "row", marginBottom: tokens.spacing(2) }}>
                    {[
                        { key: "todos", label: "Todos" },
                        { key: "abiertos", label: "Abierto ahora" },
                        { key: "cerca", label: "Cerca de mí" },
                    ].map((f) => (
                        <Chip
                            key={f.key}
                            selected={filter === f.key}
                            onPress={() => {
                                setQuery("");
                                setFilter(f.key);
                            }}
                            style={{ marginRight: tokens.spacing(1) }}
                            mode={filter === f.key ? "flat" : "outlined"}
                            selectedColor={tokens.colors.onPrimary}
                            textStyle={{
                                fontWeight: "700",
                                color: filter === f.key ? tokens.colors.onPrimary : tokens.colors.primary,
                            }}
                            compact
                        >
                            {f.label}
                        </Chip>
                    ))}
                </View>

                {/* ----- CAROUSELES (Todos + sin búsqueda) ----- */}
                {!showList && (
                    <>
                        <Text
                            variant="titleLarge"
                            style={{ color: tokens.colors.primary, fontWeight: "800", marginTop: tokens.spacing(1) }}
                        >
                            Te recomendamos
                        </Text>
                        <FlatList
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            data={recomendados}
                            keyExtractor={(it) => String(it.id)}
                            contentContainerStyle={{ paddingVertical: tokens.spacing(2) }}
                            ItemSeparatorComponent={() => <View style={{ width: tokens.spacing(1.5) }} />}
                            renderItem={({ item }) => (
                                <RestaurantPreviewCard item={item} onPress={() => goInfo(item.id)} size="md" overlay />
                            )}
                        />

                        <Text
                            variant="titleLarge"
                            style={{ color: tokens.colors.primary, fontWeight: "800", marginTop: tokens.spacing(1) }}
                        >
                            Abiertos ahora
                        </Text>
                        <FlatList
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            data={abiertosCarousel}
                            keyExtractor={(it) => String(it.id)}
                            contentContainerStyle={{ paddingVertical: tokens.spacing(2) }}
                            ItemSeparatorComponent={() => <View style={{ width: tokens.spacing(1.5) }} />}
                            renderItem={({ item }) => (
                                <RestaurantPreviewCard item={item} onPress={() => goInfo(item.id)} size="md" overlay />)}
                            ListEmptyComponent={
                                <Text style={{ color: tokens.colors.muted, marginTop: tokens.spacing(2), textAlign: "center" }}>
                                    {query.trim().length > 0
                                        ? "Vaya, parece que no hay restaurantes que se adapten a tu búsqueda. Prueba otra cosa."
                                        : "Sin resultados."}
                                </Text>
                            }
                        />
                    </>
                )}

                {/* ----- LISTA (filtro ≠ todos o hay búsqueda) ----- */}
                {showList && (
                    <>
                        <Text
                            variant="titleLarge"
                            style={{
                                color: tokens.colors.primary,
                                fontWeight: "800",
                                marginTop: tokens.spacing(1),
                                marginBottom: tokens.spacing(1),
                            }}
                        >
                            Resultados
                        </Text>

                        {listLoading ? (
                            <ActivityIndicator />
                        ) : (
                            <FlatList
                                numColumns={2}
                                columnWrapperStyle={{
                                    justifyContent: "space-between",
                                    marginBottom: tokens.spacing(2),
                                }}
                                data={listData}
                                keyExtractor={(it) => String(it.id)}
                                renderItem={({ item }) => (
                                    <RestaurantPreviewCard item={item} onPress={() => goInfo(item.id)} size="sm" />
                                )}
                                ListEmptyComponent={
                                    <Text style={{ color: tokens.colors.muted, marginTop: tokens.spacing(2) }}>
                                        Sin resultados.
                                    </Text>
                                }
                            />
                        )}
                    </>
                )}
            </View>
        </SafeAreaView>
    );
}
