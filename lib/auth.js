// lib/auth.js
import { api } from "./api";
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "jwt";
const ROLE_KEY = "role";
const USER_ID_KEY = "userId";

/* =======================
 *    Helpers de storage
 * =======================*/
export async function getStoredToken() {
    return SecureStore.getItemAsync(TOKEN_KEY);
}
export async function getStoredRole() {
    return SecureStore.getItemAsync(ROLE_KEY);
}
export async function getStoredUserId() {
    const v = await SecureStore.getItemAsync(USER_ID_KEY);
    return v ? Number(v) : null;
}
export async function isAuthenticated() {
    const t = await getStoredToken();
    return !!t;
}
async function persistSession({ token, role, userId }) {
    if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
    if (role) await SecureStore.setItemAsync(ROLE_KEY, String(role));
    if (userId != null)
        await SecureStore.setItemAsync(USER_ID_KEY, String(userId));
}
export async function clearSession() {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(ROLE_KEY);
    await SecureStore.deleteItemAsync(USER_ID_KEY);
}

/* =========================
 * Auth principal
 * =======================*/
// POST /auth/login  -> { token, type, expiresIn, userId, role }
export async function login(email, password) {
    const { data } = await api.post("/auth/login", { email, password });
    await persistSession({
        token: data.token,
        role: data.role,
        userId: data.userId,
    });
    return { token: data.token, role: data.role, userId: data.userId };
}

// POST /auth/register -> body { email, password, rol, nombre } -> { id, email, rol }
export async function register(email, password, rol, nombre) {
    const { data } = await api.post("/auth/register", {
        email,
        password,
        rol,
        nombre,
    });
    return data;
}

// GET /auth/me -> { id, email, role }
export async function getMe() {
    const { data } = await api.get("/auth/me");
    return data;
}

// Logout local (JWT stateless): borrar storage
export async function logout() {
    await clearSession();
}

/* =========================
 * Cambio de contraseña (autenticado)
 * =======================*/
// POST /auth/change-password  body: { currentPassword, newPassword }  -> 204
export async function changePassword(currentPassword, newPassword) {
    await api.post("/auth/change-password", { currentPassword, newPassword });
}

/* =========================
 * Reset de contraseña (no autenticado)
 * =======================*/
// POST /auth/reset-password/request  body: { email }  -> 204 siempre
export async function requestPasswordReset(email) {
    await api.post("/auth/reset-password/request", { email });
    return true;
}

// POST /auth/reset-password/confirm  body: { token, newPassword } -> 204
export async function confirmPasswordReset(token, newPassword) {
    await api.post("/auth/reset-password/confirm", { token, newPassword });
    return true;
}

/* =========================
 * Utilidades opcionales
 * =======================*/
// Devuelve { token, role, userId } si hay sesión guardada
export async function getStoredSession() {
    const [token, role, userId] = await Promise.all([
        getStoredToken(),
        getStoredRole(),
        getStoredUserId(),
    ]);
    return { token, role, userId };
}
