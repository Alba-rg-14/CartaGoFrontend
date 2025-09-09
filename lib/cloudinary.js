// lib/cloudinary.js
const CLOUD_NAME = "dgqogcian";            // <- tu cloud
const UNSIGNED_PRESET = "cartaGO_unsigned"; // <- tu upload preset (unsigned)

// (opcional) si quieres forzar carpeta en Cloudinary, pon algo; si tu preset ya fija carpeta, déjalo vacío
const FOLDER = ""; // p.ej. "restaurants"

function guessName(uri, fallback = "photo.jpg") {
    try {
        const path = uri.split("?")[0];
        const name = path.split("/").pop();
        return name || fallback;
    } catch {
        return fallback;
    }
}
function guessMime(uri, fallback = "image/jpeg") {
    const lower = String(uri || "").toLowerCase();
    if (lower.endsWith(".png")) return "image/png";
    if (lower.endsWith(".webp")) return "image/webp";
    if (lower.endsWith(".heic") || lower.endsWith(".heif")) return "image/heic";
    if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
    return fallback;
}

/**
 * Sube una imagen a Cloudinary (unsigned). Devuelve secure_url.
 * @param {string} uri - file:// uri (ImagePicker)
 * @param {string} [fileName] - opcional
 * @param {string} [mime] - opcional
 */
export async function uploadImageToCloudinary(uri, fileName, mime) {
    if (!CLOUD_NAME || !UNSIGNED_PRESET) throw new Error("Cloudinary no configurado");
    const name = fileName || guessName(uri);
    const type = mime || guessMime(uri);

    const form = new FormData();
    form.append("file", { uri, name, type });
    form.append("upload_preset", UNSIGNED_PRESET);
    if (FOLDER) form.append("folder", FOLDER);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: form,
        headers: { Accept: "application/json" }, // no pongas Content-Type manualmente
    });

    const data = await res.json();
    if (!res.ok || !data?.secure_url) {
        console.log("Cloudinary upload error:", data);
        throw new Error(data?.error?.message || "Falló la subida a Cloudinary");
    }
    return data.secure_url;
}
