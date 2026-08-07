/**
 * Test-app persistence. Uses sessionStorage deliberately: it survives reloads
 * but dies with the tab — the same lifetime as the SDK's own session cookie,
 * so the two can't disagree about whether a session is still live.
 */

const KEYS = {
    auth: "kasookoo.auth",
    publishableKey: "kasookoo.pk",
    connected: "kasookoo.connected",
    customWindow: "kasookoo.customWindow",
    screen: "kasookoo.screen",
    loggingEnabled: "kasookoo.loggingEnabled",
    telemetryEnabled: "kasookoo.telemetryEnabled",
    telemetryEndpoint: "kasookoo.telemetryEndpoint",
} as const

function read<T>(key: string): T | null {
    try {
        const raw = sessionStorage.getItem(key)
        return raw ? (JSON.parse(raw) as T) : null
    } catch {
        return null
    }
}

function write(key: string, value: unknown): void {
    try {
        sessionStorage.setItem(key, JSON.stringify(value))
    } catch {
        // Private-mode / quota — the app still works, it just won't survive a reload.
    }
}

function clear(key: string): void {
    try {
        sessionStorage.removeItem(key)
    } catch {
        /* ignore */
    }
}

export const storage = {
    getAuth: <T>() => read<T>(KEYS.auth),
    setAuth: (value: unknown) => write(KEYS.auth, value),
    clearAuth: () => clear(KEYS.auth),

    getPublishableKey: () => read<string>(KEYS.publishableKey) ?? "",
    setPublishableKey: (value: string) => write(KEYS.publishableKey, value),

    /** True once `init()` has succeeded, so a reload can reconnect without asking again. */
    isConnected: () => read<boolean>(KEYS.connected) === true,
    setConnected: (value: boolean) => (value ? write(KEYS.connected, true) : clear(KEYS.connected)),

    getCustomWindow: () => read<boolean>(KEYS.customWindow) === true,
    setCustomWindow: (value: boolean) => write(KEYS.customWindow, value),

    /** Structured console logging — on by default, same as the SDK's own default. */
    getLoggingEnabled: () => read<boolean>(KEYS.loggingEnabled) ?? true,
    setLoggingEnabled: (value: boolean) => write(KEYS.loggingEnabled, value),

    getTelemetryEnabled: () => read<boolean>(KEYS.telemetryEnabled) === true,
    setTelemetryEnabled: (value: boolean) => write(KEYS.telemetryEnabled, value),

    getTelemetryEndpoint: () => read<string>(KEYS.telemetryEndpoint) ?? "",
    setTelemetryEndpoint: (value: string) => write(KEYS.telemetryEndpoint, value),

    getScreen: () => read<string>(KEYS.screen),
    setScreen: (value: string) => write(KEYS.screen, value),

    clearAll: () => Object.values(KEYS).forEach(clear),
}
