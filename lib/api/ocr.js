// lib/api/ocr.js
import { api } from "../api";

export const OcrAPI = {
    /**
     * POST /ocr/restaurante/{restauranteId}/scan?mode=replace
     * body: { imageUrls: string[], mode: "replace" }
     */
    async scan(restauranteId, imageUrls, mode = "replace") {
        const url = `/ocr/restaurante/${restauranteId}/scan?mode=${encodeURIComponent(mode)}`;
        const { data } = await api.post(url, { imageUrls, mode });
        return data; // OcrScanResponseDTO
    },
};
