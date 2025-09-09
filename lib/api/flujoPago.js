// lib/api/flujoPago.js
import { api } from "../api";

const toSala = (d) => ({
    id: d?.salaId ?? d?.id ?? d?.sala?.id ?? null,
    codigo: d?.codigo ?? d?.code ?? d?.salaCodigo ?? null,
    estado: d?.estado ?? d?.status ?? null,
});

export const FlujoPagoAPI = {
    //Post /flujo-pago/{restauranteId}/sala-pago?clienteId={clienteId}
    createSala: async (restauranteId, clienteId) => {
        const rid = Number(restauranteId);
        const cid = Number(clienteId);
        const { data } = await api.post(
            `/flujo-pago/${rid}/sala-pago`,
            {},
            { params: { clienteId: cid } }
        );
        return toSala(data);
    },

    joinSala: async (restauranteId, codigo, clienteId) => {
        const { data } = await api.post(
            `/flujo-pago/${restauranteId}/sala-pago/join`,
            null,
            { params: { codigo, clienteId } }
        );
        return data;
    },

    // GET /flujo-pago/sala-pago/{salaId}  
    addPlato: async (salaId, body) => {
        const { data } = await api.post(`/flujo-pago/sala-pago/${salaId}/platos`, body);
        return data;
    },


    // GET /flujo-pago/sala-pago/{salaId}/resumen
    getResumen: async (salaId, clienteIds) => {
        const { data } = await api.get(`/flujo-pago/sala-pago/${salaId}/resumen`);
        return data; // { salaId, codigo, estado, restauranteId, fechaCreacion, comensales: [...], platos: [...], subtotal, ... }
    },

    // POST /flujo-pago/sala-pago/{salaId}/platos
    addPlato: async (salaId, { platoId, participantes }) => {
        const { data } = await api.post(
            `/flujo-pago/sala-pago/${salaId}/platos`,
            { platoId, participantes }
        );
        return data; // AddPlatoResponseDTO
    },

    // DELETE /flujo-pago/sala-pago/{salaId}/platos/{platoSalaId}
    deletePlato: async (salaId, platoSalaId) => {
        await api.delete(`/flujo-pago/sala-pago/${salaId}/platos/${platoSalaId}`);
    },

    // PUT /flujo-pago/sala-pago/{salaId}/platos/{platoSalaId}/participantes
    replaceParticipantes: async (salaId, platoSalaId, clienteIds) => {
        await api.put(
            `/flujo-pago/sala-pago/${salaId}/platos/${platoSalaId}/participantes`,
            { clienteIds } // ParticipantesRequestDTO
        );
    },

    // POST /flujo-pago/sala-pago/{salaId}/instrucciones-detalladas/email?modo={modo}
    generarInstrucciones: async (salaId, modo /* "igualitario" | "personalizado" */) => {
        await api.post(
            `/flujo-pago/sala-pago/${salaId}/instrucciones-detalladas/email`,
            null,
            { params: { modo } }
        );
    },

    // helper para traer solo comensales de la sala
    getComensales: async (salaId) => {
        const data = await (await api.get(`/flujo-pago/sala-pago/${salaId}/resumen`)).data;
        return Array.isArray(data?.comensales) ? data.comensales : [];
    },

    // GET /flujo-pago/sala-pago/{salaId}/instrucciones
    getInstrucciones: async (salaId) => {
        const { data } = await api.get(`/flujo-pago/sala-pago/${salaId}/instrucciones`);
        return data; // InstruccionesDTO
    }
};
