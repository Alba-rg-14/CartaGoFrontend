// lib/api.js
import axios from "axios";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// URL del backend pro.
export const BASE_URL = "https://cartagobackend-production.up.railway.app";
console.log("API BASE_URL =", BASE_URL);

export const api = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
});

const TOKEN_KEY = "jwt";

async function getToken() {
    try {
        if (Platform.OS === "web") {
            return typeof window !== "undefined" && window.localStorage
                ? window.localStorage.getItem(TOKEN_KEY)
                : null;
        }
        if (SecureStore?.getItemAsync) {
            return await SecureStore.getItemAsync(TOKEN_KEY);
        }
    } catch { }
    return null;
}

async function clearToken() {
    try {
        if (Platform.OS === "web") {
            if (typeof window !== "undefined" && window.localStorage) {
                window.localStorage.removeItem(TOKEN_KEY);
            }
        } else if (SecureStore?.deleteItemAsync) {
            await SecureStore.deleteItemAsync(TOKEN_KEY);
        }
    } catch { }
}

// Adjunta JWT en cada request (si existe)
api.interceptors.request.use(async (config) => {
    const token = await getToken();
    if (token) {
        const h = config.headers;
        if (h && typeof h.set === "function") {
            h.set("Authorization", `Bearer ${token}`);
        } else {
            config.headers = { ...(config.headers || {}), Authorization: `Bearer ${token}` };
        }
    }
    return config;
});
api.interceptors.response.use(
    (res) => res,
    async (error) => {
        if (error && error.response && error.response.status === 401) {
            await clearToken();
        }
        return Promise.reject(error);
    }
);

// Logs de red en dev (útil)
if (__DEV__) {
    api.interceptors.response.use(
        (res) => {
            const m = res.config?.method?.toUpperCase();
            console.log("HTTP OK:", m, res.config?.url, res.status);
            return res;
        },
        (err) => {
            const m = err?.config?.method?.toUpperCase();
            console.log("HTTP ERR:", m, err?.config?.url, err?.response?.status, err?.response?.data || err?.message);
            return Promise.reject(err);
        }
    );
}