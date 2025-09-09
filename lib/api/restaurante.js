import { api } from "../api";

// Map a preview mínimo por si algún endpoint devuelve DTO completo
const toPreview = (r) => ({
    id: r.id,
    nombre: r.nombre,
    imagen: r.imagen ?? r.imagenUrl ?? null,
});

// Normaliza strings (quita acentos y pone minúsculas) para fallback local
const norm = (s = "") => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export const RestauranteAPI = {
    // ----- PREVIEWS -----
    async getAllPreview() {
        try {
            const { data } = await api.get("/restaurante/preview");
            return data;
        } catch (e) {
            if (e?.response?.status === 404) {
                const { data } = await api.get("/restaurante");
                return data.map(toPreview);
            }
            console.log("getAllPreview ERR ->", e?.response?.status, e?.message);
            throw e;
        }
    },

    async getAbiertosPreview() {
        try {
            const { data } = await api.get("/restaurante/preview/abiertos");
            return data;
        } catch (e) {
            if (e?.response?.status === 404) {
                const { data } = await api.get("/restaurante");
                return data.map(toPreview);
            }
            console.log("getAbiertosPreview ERR ->", e?.response?.status, e?.message);
            throw e;
        }
    },

    async getPreviewByNombre(nombre) {
        if (!nombre?.trim()) return null;
        try {
            const { data } = await api.get(`/restaurante/preview/${encodeURIComponent(nombre)}`);
            return data; // objeto único
        } catch (e) {
            if (e?.response?.status === 404) return null;
            console.log("getPreviewByNombre ERR ->", e?.response?.status, e?.message);
            throw e;
        }
    },

    async searchByNombre(q) {
        const term = (q || "").trim();
        if (!term) return [];
        const { data } = await api.get(`/restaurante/preview/${encodeURIComponent(term)}`);
        return Array.isArray(data) ? data : (data ? [data] : []);
    },

    // ----- CERCANOS -----
    async getCercanos(lat, lon, radioKm = 1) {
        const { data } = await api.get("/restaurante/cerca", { params: { lat, lon, radioKm } });
        return data; // RestauranteDTO completo
    },

    // ----- INFO COMPLETA (¡esta es la que debes usar!) -----
    async getInfo(id) {
        const { data } = await api.get(`/restaurante/${id}/info`, { params: { t: Date.now() } });
        return data; // RestauranteDTO con descripcion, direccion, lat, lon, estado, horarios
    },

    // ----- HORARIOS -----
    async getHorarios(id) {
        const { data } = await api.get(`/restaurante/${id}/horarios`, { params: { t: Date.now() } });
        return data; // [{ dia, apertura, cierre }]
    },

    // ----- CARTA -----
    async getCarta(id) {
        const { data } = await api.get(`/restaurante/${id}/carta`);
        return data;
    },

    async deleteCarta(restauranteId) {
        await api.delete(`/restaurante/${restauranteId}/carta`);
    },

    async updatePlato(platoId, req) {
        const { data } = await api.put(`/platos/${platoId}`, req);
        return data;
    },

    async deletePlato(platoId) {
        await api.delete(`/platos/${platoId}`);
    },

    async renameSeccion(cartaId, from, to) {
        const body = { from, to };
        const { data } = await api.put(`/carta/${cartaId}/seccion/rename`, body);
        return data; // { cartaId, from, to, actualizados }
    },

    async setPlatoSeccion(platoId, nuevaSeccion) {
        // reusa tu updatePlato: solo cambiamos la sección
        const { data } = await api.put(`/platos/${platoId}`, { seccion: nuevaSeccion });
        return data;
    },

    async setPlatoSeccion(platoId, nuevaSeccion) {
        return (await api.put(`/platos/${platoId}`, { seccion: nuevaSeccion })).data;
    },

    // mover varios platos (fallback por bucle)
    async movePlatosToSeccion(platoIds = [], nuevaSeccion) {
        for (const id of platoIds) {
            await api.put(`/platos/${id}`, { seccion: nuevaSeccion });
        }
        return { moved: platoIds.length, to: nuevaSeccion };
    },

    // Plato por id (si lo usas)
    async getPlato(platoId) {
        const { data } = await api.get(`/platos/${platoId}`);
        return data;
    },

    // ----- Otros -----
    async update(id, payload) {
        const { data } = await api.put(`/restaurante/${id}`, payload, {
            headers: { "Cache-Control": "no-cache" },
        });
        return data;
    },

    async setUbicacion(id, direccion) {
        await api.put(`/restaurante/${id}/ubicacion`, null, {
            params: { direccion, t: Date.now() },
            headers: { "Cache-Control": "no-cache" },
        });
    },

    async setImagen(id, url) {
        await api.put(`/restaurante/${id}/imagen`, url, {
            headers: { "Content-Type": "text/plain" },
            params: { t: Date.now() },
        });
        return url;
    },

    async putHorariosSemanal(restauranteId, req) {
        // req = { tramos: [{ dia: "MONDAY", apertura: "HH:mm", cierre: "HH:mm" }, ...] }
        const { data } = await api.put(`/restaurante/${restauranteId}/horarios`, req, {
            headers: { "Cache-Control": "no-cache" },
            params: { t: Date.now() },
        });
        return data;
    },

    async setPlatoImagen(platoId, url) {
        const { data } = await api.put(`/platos/${platoId}/imagen`, url, {
            headers: { "Content-Type": "text/plain" },
        });
        return data;
    },

    async deletePlatoImagen(platoId) {
        await api.delete(`/platos/${platoId}/imagen`);
    },

    async getAlergenos() {
        const { data } = await api.get(`/alergenos`);
        return Array.isArray(data) ? data : [];
    },

    async crearPlato(cartaId, req) {
        const { data } = await api.post(`/carta/${cartaId}/platos`, req);
        return data; // PlatoDTO creado
    },

    async getCartaId(restauranteId) {
        const { data } = await api.get(`/restaurante/${restauranteId}/carta/id`, {
            params: { t: Date.now() },
        });
        // data es un número (p.ej. 12)
        const id = Number(data);
        if (!Number.isFinite(id) || id <= 0) {
            throw new Error("Carta no encontrada.");
        }
        return id;
    },


};

export default RestauranteAPI;
