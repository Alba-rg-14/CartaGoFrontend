// lib/auth.js
import { api } from "./api";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const TOKEN_KEY = "auth.jwt";
const AUTH_HEADER_KEY = "auth.Authorization";
const USER_KEY = "auth.user";

async function readUserObj() {
    const raw = await getItem(USER_KEY);
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}
async function writeUserObj(obj) {
    await setItem(USER_KEY, JSON.stringify(obj ?? {}));
    return obj;
}

async function setItem(key, value) {
    if (Platform.OS === "web") { try { window?.localStorage?.setItem(key, value); } catch { } }
    else { await SecureStore.setItemAsync(key, value); }
}
async function getItem(key) {
    if (Platform.OS === "web") { try { return window?.localStorage?.getItem(key) ?? null; } catch { return null; } }
    try { return await SecureStore.getItemAsync(key); } catch { return null; }
}
async function removeItem(key) {
    if (Platform.OS === "web") { try { window?.localStorage?.removeItem(key); } catch { } }
    else { try { await SecureStore.deleteItemAsync(key); } catch { } }
}

export async function login(email, password) {
    const { data } = await api.post("/auth/login", { email, password });
    const accessToken = data?.accessToken;
    const tokenType = data?.tokenType || "Bearer";
    if (!accessToken) throw new Error("No token in response");

    const authHeader = `${tokenType} ${accessToken}`;
    await setItem(TOKEN_KEY, accessToken);
    await setItem(AUTH_HEADER_KEY, authHeader);
    await setItem(USER_KEY, JSON.stringify({ id: data.userId, role: data.role }));

    api.defaults.headers.common.Authorization = authHeader;

    try {
        const userObj = await readUserObj();
        if (data.role === "CLIENTE") {
            const cli = await getClienteByUsuario(data.userId).catch(() => null);
            if (cli?.id) userObj.clienteId = cli.id;
        } else if (data.role === "RESTAURANTE") {
            const res = await getRestauranteByUsuario(data.userId).catch(() => null);
            if (res?.id) {
                userObj.restauranteId = res.id;
                await setItem("restauranteId", String(res.id));
            }
        }
        await writeUserObj(userObj);
    } catch { }

    return {
        token: accessToken,
        authHeader,
        role: data.role,
        userId: data.userId,
        tokenType,
        expiresIn: data.expiresIn,
    };
}

export async function getClienteByUsuario(usuarioId) {
    const { data } = await api.get(`/auth/${usuarioId}/cliente`);
    return data; // { id, nombre, imagen, usuarioId } (según tu DTO)
}
export async function getRestauranteByUsuario(usuarioId) {
    const { data } = await api.get(`/auth/${usuarioId}/restaurante`);
    return data; // { id, nombre, imagen, usuarioId } (según tu DTO)
}
export async function register(email, password, rol, nombre) {
    const { data } = await api.post("/auth/register", { email, password, rol, nombre });
    return data;
}
export async function getMe() { const { data } = await api.get("/auth/me"); return data; }

export async function logout() {
    await removeItem(TOKEN_KEY);
    await removeItem(AUTH_HEADER_KEY);
    await removeItem(USER_KEY);               // <- limpiar usuario
    delete api.defaults.headers.common.Authorization;
}

export async function bootstrapAuth() {
    const authHeader = await getItem(AUTH_HEADER_KEY);
    if (authHeader) {
        api.defaults.headers.common.Authorization = authHeader;
        return true;
    }
    return false;
}

// helpers
export async function getAuthHeader() { return (await getItem(AUTH_HEADER_KEY)) || null; }
export async function getToken() { return (await getItem(TOKEN_KEY)) || null; }
export async function isLoggedIn() { return !!(await getItem(AUTH_HEADER_KEY)); }
export async function getUser() {
    const raw = await getItem(USER_KEY);
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}
export async function getRole() {
    const u = await getUser();
    return u?.role || null;
}

export async function sendResetCode(email) {
    // POST 204 aunque el email no exista (para no filtrar usuarios)
    return api.post(`/auth/password-reset/code`, { email });
}

export async function confirmResetCode({ email, code, newPassword }) {
    // POST 204 si OK; 400/401 si código inválido/caducado
    return api.post(`/auth/password-reset/confirm`, {
        email,
        code,
        newPassword,
    });
}
