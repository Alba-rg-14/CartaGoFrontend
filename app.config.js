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
        android: {},
        web: { bundler: "metro" }
    }
};
