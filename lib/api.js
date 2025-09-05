// lib/api.js
import axios from "axios";
import * as SecureStore from "expo-secure-store";

// URL del backend pro.
export const BASE_URL = "https://cartagobackend-production.up.railway.app";
console.log("API BASE_URL =", BASE_URL);

export const api = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
});

// Adjuntar JWT en cada request
api.interceptors.request.use(async (config) => {
    const token = await SecureStore.getItemAsync("jwt");
    if (token) {
        const h = config.headers;
        // axios v1 puede tener AxiosHeaders con .set()
        if (h && typeof h.set === "function") {
            h.set("Authorization", `Bearer ${token}`);
        } else {
            config.headers = {
                ...(config.headers || {}),
                Authorization: `Bearer ${token}`,
            };
        }
    }
    return config;
});

// Si backend responde 401, limpiamos token
api.interceptors.response.use(
    (res) => res,
    async (error) => {
        if (error && error.response && error.response.status === 401) {
            await SecureStore.deleteItemAsync("jwt");
        }
        return Promise.reject(error);
    }
);
