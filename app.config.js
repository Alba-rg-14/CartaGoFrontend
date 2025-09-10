export default {
    expo: {
        name: "CartaGo",
        slug: "cartago-app",
        scheme: "cartago",
        version: "1.0.0",
        orientation: "portrait",
        userInterfaceStyle: "automatic",
        assetBundlePatterns: ["**/*"],
        plugins: ["expo-router"],
        extra: { router: { origin: false } },
        ios: {
            supportsTablet: true, "infoPlist": {
                "NSCameraUsageDescription": "Necesitamos usar la cámara para tomar fotos del restaurante.",
                "NSPhotoLibraryUsageDescription": "Necesitamos acceder a tus fotos para subir una imagen del restaurante."
            }
        },
        android: {
            "package": "com.albaruiz.cartago",
            "permissions": ["CAMERA", "READ_EXTERNAL_STORAGE", "WRITE_EXTERNAL_STORAGE"],
            "softwareKeyboardLayoutMode": "resize",
            "config": {
                "googleMaps": { "apiKey": "AIzaSyDufMjUxWdpDsAk-OTqapD7oHz_WTP4SHI" }
            },

        },
        web: { bundler: "metro" },
    },
};
