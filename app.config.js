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
        ios: { supportsTablet: true },
        android: {},
        web: { bundler: "metro" }
    }
};
