export function landingForRole(role) {
    if (!role) return "/auth/welcome";
    return role === "RESTAURANTE" ? "/restaurante" : "/cliente";
}