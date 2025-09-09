// app/cliente/restaurants/[id]/index.jsx
import React, { useEffect, useState, useMemo } from "react";
import { View, Image, ScrollView, StyleSheet, TouchableOpacity, Linking, Platform } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ActivityIndicator, Text, Button, useTheme, Icon } from "react-native-paper";
import { tokens } from "../../../../theme";
import { RestauranteAPI } from "../../../../lib/api/restaurante";

// ---- helpers horario tolerantes ----
const DAYS_ORDER = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const DAY_ES = {
  MONDAY: "Lunes", TUESDAY: "Martes", WEDNESDAY: "Miércoles",
  THURSDAY: "Jueves", FRIDAY: "Viernes", SATURDAY: "Sábado", SUNDAY: "Domingo",
};
const DAY_MAP = {
  MONDAY: "MONDAY", TUESDAY: "TUESDAY", WEDNESDAY: "WEDNESDAY", THURSDAY: "THURSDAY", FRIDAY: "FRIDAY", SATURDAY: "SATURDAY", SUNDAY: "SUNDAY",
  LUNES: "MONDAY", MARTES: "TUESDAY", MIERCOLES: "WEDNESDAY", "MIÉRCOLES": "WEDNESDAY",
  JUEVES: "THURSDAY", VIERNES: "FRIDAY", SABADO: "SATURDAY", "SÁBADO": "SATURDAY", DOMINGO: "SUNDAY",
};
const hhmm = (t) => String(t ?? "").slice(0, 5);
const normDayKey = (d) =>
  DAY_MAP[String(d || "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toUpperCase()] || null;

const fmtDay = (slots = []) => {
  if (!slots.length) return "Cerrado";
  const parts = slots.map(({ start, end }) =>
    (start === "00:00" && end === "23:59") ? "Abierto 24h" : `${start}–${end}`
  );
  return parts.join(" | ");
};

export default function RestaurantInfoScreen() {
  const { id } = useLocalSearchParams();
  const theme = useTheme();
  const router = useRouter();

  const [data, setData] = useState({});
  const [horarios, setHorarios] = useState(null);   // null = cargando horarios
  const [loading, setLoading] = useState(true);     // loader global

  // Carga datos + horarios
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const info = await RestauranteAPI.getInfo(id);
        if (alive) setData(info || {});
      } catch {
        if (alive) setData({});
      }
      try {
        const hs = await RestauranteAPI.getHorarios?.(id);
        if (alive) setHorarios(hs || []);
      } catch {
        if (alive) setHorarios([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  // ✅ SIEMPRE antes de cualquier return
  const horariosPorDia = useMemo(() => {
    const map = {}; DAYS_ORDER.forEach(d => (map[d] = []));
    (horarios || []).forEach(h => {
      const key = normDayKey(h.dia || h.day || h.diaSemana || h.weekday);
      const start = hhmm(h.hora_inicio ?? h.horaInicio ?? h.apertura ?? h.horaApertura);
      const end = hhmm(h.hora_fin ?? h.horaFin ?? h.cierre ?? h.horaCierre);
      if (key && start && end) map[key].push({ start, end });
    });
    return map;
  }, [horarios]);

  const isOpen = String(data?.estado || "").toLowerCase() === "abierto";

  // Loader (DESPUÉS de declarar todos los hooks)
  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator />
      </View>
    );
  }

  const openInMaps = () => {
    const lat = Number(data?.lat), lon = Number(data?.lon);
    if (!lat || !lon) return;
    const label = encodeURIComponent(data?.nombre || "Restaurante");
    const url = Platform.select({
      ios: `http://maps.apple.com/?ll=${lat},${lon}&q=${label}`,
      android: `geo:${lat},${lon}?q=${lat},${lon}(${label})`,
      default: `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`,
    });
    Linking.openURL(url).catch(() => { });
  };


  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.colors.surface }} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Back to list */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backRow}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon source="chevron-left" size={22} color={tokens.colors.primary} />
          <Text style={styles.backText}>Volver al listado de restaurantes</Text>
        </TouchableOpacity>

        {/* Imagen principal */}
        <Image
          source={{ uri: data?.imagen || "https://via.placeholder.com/1200x800?text=Restaurante" }}
          style={[styles.hero, { marginTop: tokens.spacing(2) }]}
          resizeMode="cover"
        />

        {/* Header: título + pill estado */}
        <View style={styles.headerRow}>
          <Text variant="headlineLarge" style={styles.title} numberOfLines={2}>
            {data?.nombre || "Restaurante"}
          </Text>
          <View style={[styles.statePill, { backgroundColor: isOpen ? tokens.colors.primary : "#9CA3AF" }]}>
            <Icon source={isOpen ? "check-circle" : "close-circle"} size={18} color="#FFF" />
            <Text style={styles.statePillText}>{isOpen ? "Abierto" : "Cerrado"}</Text>
          </View>
        </View>

        {/* Descripción */}
        {data?.descripcion ? (
          <Text style={styles.subtitle} variant="titleSmall">
            {data.descripcion}
          </Text>
        ) : null}

        {/* Horario */}
        <Text variant="titleMedium" style={styles.sectionTitle}>Horario:</Text>
        {horarios === null ? (
          <ActivityIndicator />
        ) : (
          <View style={{ marginBottom: tokens.spacing(3) }}>
            {DAYS_ORDER.map((d) => (
              <Text key={d} style={styles.scheduleLine}>
                <Text style={{ fontWeight: "700" }}>{DAY_ES[d]}: </Text>
                {fmtDay(horariosPorDia[d])}
              </Text>
            ))}
          </View>
        )}

        {/* Ubicación */}
        <Text variant="titleMedium" style={styles.sectionTitle}>Estamos aquí:</Text>
        {data?.lat && data?.lon ? (
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: Number(data.lat),
              longitude: Number(data.lon),
              latitudeDelta: 0.004,      // zoom de calle
              longitudeDelta: 0.004,
            }}
            onPress={openInMaps}          // tocar el mapa abre la app de mapas
          >
            <Marker
              coordinate={{ latitude: Number(data.lat), longitude: Number(data.lon) }}
              title={data?.nombre || "Restaurante"}
              description={data?.direccion || ""}
            />
          </MapView>
        ) : (
          <View style={styles.mapPlaceholder}>
            <Text style={{ fontSize: 14, color: tokens.colors.muted }}>Sin ubicación disponible</Text>
          </View>
        )}
        {data?.direccion ? <Text style={styles.address}>{data.direccion}</Text> : null}

        {/* CTA */}
        <Button
          mode="contained"
          onPress={() => router.push(`/cliente/restaurants/${id}/carta`)}
          contentStyle={{ height: 52 }}
          style={styles.cta}
          labelStyle={{ fontWeight: "800", fontSize: 18 }}
        >
          Ver carta
        </Button>
      </ScrollView>
    </SafeAreaView >
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { paddingHorizontal: tokens.spacing(3), paddingBottom: tokens.spacing(3) },
  hero: {
    width: "100%",
    height: 220,
    borderRadius: 18,
    marginBottom: tokens.spacing(2),
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: tokens.spacing(1),
  },
  title: { fontWeight: "800", flex: 1, marginRight: tokens.spacing(2) },
  statePill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  statePillText: { color: "#FFF", fontWeight: "800", marginLeft: 6 },
  subtitle: { color: tokens.colors.muted, marginBottom: tokens.spacing(3) },
  sectionTitle: { fontWeight: "800", marginTop: tokens.spacing(2), marginBottom: tokens.spacing(1) },
  scheduleLine: { marginBottom: 4, color: "#333" },
  mapPlaceholder: {
    height: 140, borderRadius: 16, backgroundColor: "#EEF2F7",
    alignItems: "center", justifyContent: "center", marginBottom: tokens.spacing(1.5),
  },
  address: { color: tokens.colors.muted, marginBottom: tokens.spacing(4) },
  cta: { borderRadius: 999, alignSelf: "stretch" },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: tokens.spacing(1),
    marginBottom: tokens.spacing(1),
  },
  backText: {
    marginLeft: 4,
    color: tokens.colors.muted,
    fontWeight: "700",
  },
  mapPlaceholder: {
    height: 140, borderRadius: 16, backgroundColor: "#EEF2F7",
    alignItems: "center", justifyContent: "center", marginBottom: tokens.spacing(1.5),
  },
  map: {
    height: 160,
    borderRadius: 16,
    marginBottom: tokens.spacing(1.5),
    overflow: "hidden", // para que respete el borde redondeado
  },


});
