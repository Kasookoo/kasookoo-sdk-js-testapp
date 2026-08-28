import { create } from "zustand"
import type { Call, KasookooClient, LogLevel } from "kasookoo-sdk"
import { createSelectors } from "../lib/createSelectors"
import { closeKasookoo, initKasookoo } from "../kasookoo"
import { storage } from "../lib/storage"
import { describeError } from "../lib/format"
import type { LoginResult } from "../api"
import { isScreenId, type ScreenId } from "../screens/registry"

export type SdkStatus = "idle" | "connecting" | "ready" | "error"

export interface LogEntry {
    id: number
    at: Date
    text: string
    kind: "info" | "ok" | "err"
}

interface KasookooState {
    auth: LoginResult | null
    publishableKey: string
    useCustomWindow: boolean
    loggingEnabled: boolean
    loggingLevels: LogLevel[]
    telemetryEnabled: boolean
    telemetryEndpoint: string
    client: KasookooClient | null
    status: SdkStatus
    isRestoring: boolean
    error: string
    scopes: string[]
    incoming: Call[]
    log: LogEntry[]
    screen: ScreenId

    signIn: (auth: LoginResult) => void
    signOut: () => void
    setPublishableKey: (value: string) => void
    setUseCustomWindow: (value: boolean) => void
    setLoggingEnabled: (value: boolean) => void
    setLoggingLevels: (value: LogLevel[]) => void
    setTelemetryEnabled: (value: boolean) => void
    setTelemetryEndpoint: (value: string) => void
    connect: () => Promise<void>
    disconnect: () => void
    addLog: (text: string, kind?: LogEntry["kind"]) => void
    clearLog: () => void
    navigate: (screen: ScreenId) => void
}

let clientRef: KasookooClient | null = null
let logId = 0

const savedScreen = storage.getScreen()

export const useKasookooStore = createSelectors(
    create<KasookooState>((set, get) => {
        const addLog: KasookooState["addLog"] = (text, kind = "info") =>
            set((s) => ({ log: [...s.log.slice(-299), { id: logId++, at: new Date(), text, kind }] }))

        const teardown = () => {
            closeKasookoo(clientRef)
            clientRef = null
            storage.setConnected(false)
            set({ client: null, status: "idle", scopes: [], incoming: [] })
        }

        /** Shared by the manual Connect button and the silent reload restore. */
        const connectWith = async (
            account: LoginResult,
            key: string,
            custom: boolean,
            loggingEnabled: boolean,
            loggingLevels: LogLevel[],
            telemetryEnabled: boolean,
            telemetryEndpoint: string
        ) => {
            if (clientRef) return
            set({ status: "connecting", error: "" })
            addLog("KasookooClient.init() …")

            try {
                const created = await initKasookoo(account.user.email, key, {
                    useCustomWindow: custom,
                    loggingEnabled,
                    loggingLevels,
                    telemetryEnabled,
                    telemetryEndpoint,
                    handlers: {
                        onSessionCreated: (info) =>
                            addLog(`session:created ${info.sessionId} · org ${info.organizationId}`, "ok"),
                        onSessionRefreshed: (info) =>
                            addLog(
                                `session:refreshed — valid until ${info.expiresAt ? new Date(info.expiresAt).toLocaleTimeString() : "?"}`,
                                "ok"
                            ),
                        onSessionExpired: (reason) => {
                            addLog(`session:expired — ${reason}`, "err")
                            teardown()
                        },
                        onIncomingCall: (call) => {
                            addLog(`call:incoming from ${call.remote.name}`, "ok")
                            set((s) => ({ incoming: [...s.incoming, call] }))
                        },
                        onCallStateChange: (call, state) => addLog(`call ${call.roomName} → ${state}`),
                        onCallEnded: (call) => set((s) => ({ incoming: s.incoming.filter((c) => c !== call) })),
                        onNotification: (data) => addLog(`notification:message ${JSON.stringify(data)}`),
                        onTrace: (info) =>
                            addLog(
                                `trace:request ${info.method} ${new URL(info.url).pathname} → ${info.status ?? "?"} ` +
                                    `(request_id=${info.requestId.slice(0, 8)}…${info.callTraceId ? ` call_trace_id=${info.callTraceId.slice(0, 8)}…` : ""})`,
                                info.ok === false ? "err" : "info"
                            ),
                        onError: (err) => addLog(`error ${describeError(err)}`, "err"),
                    },
                })
                clientRef = created

                const granted = created.getScopes()
                storage.setConnected(true)
                set({ client: created, status: "ready", scopes: granted })
                addLog(`SDK ready · this device is registered for calls and messages`, "ok")
                addLog(`scopes: ${granted.join(", ")}`, "ok")
                if (custom) addLog("Using the custom call window (src/customCallWindow.ts)", "ok")
                addLog(
                    `structured logging: ${loggingEnabled ? `on (${loggingLevels.join(", ")})` : "off"}`,
                    "ok"
                )
                if (telemetryEnabled) {
                    addLog(
                        `OpenTelemetry export: on${telemetryEndpoint ? ` → ${telemetryEndpoint}` : " (default endpoint)"}`,
                        "ok"
                    )
                    if (!loggingEnabled) {
                        addLog(
                            "logging.enabled and telemetry.enabled are independent — console is silent but OTel still receives every log line",
                            "ok"
                        )
                    }
                }
            } catch (err) {
                clientRef = null
                storage.setConnected(false)
                set({ client: null, status: "error", error: describeError(err) })
                addLog(`init failed ${describeError(err)}`, "err")
            } finally {
                set({ isRestoring: false })
            }
        }

        return {
            auth: storage.getAuth<LoginResult>(),
            publishableKey: storage.getPublishableKey(),
            useCustomWindow: storage.getCustomWindow(),
            loggingEnabled: storage.getLoggingEnabled(),
            loggingLevels: storage.getLoggingLevels() as LogLevel[],
            telemetryEnabled: storage.getTelemetryEnabled(),
            telemetryEndpoint: storage.getTelemetryEndpoint(),
            client: null,
            status: "idle",
            isRestoring: !!(storage.getAuth<LoginResult>() && storage.getPublishableKey() && storage.isConnected()),
            error: "",
            scopes: [],
            incoming: [],
            log: [],
            screen: isScreenId(savedScreen) ? savedScreen : "session",

            signIn: (auth) => {
                storage.setAuth(auth)
                set({ auth })
            },
            signOut: () => {
                teardown()
                storage.clearAll()
                set({ auth: null, publishableKey: "" })
            },
            setPublishableKey: (value) => {
                storage.setPublishableKey(value)
                set({ publishableKey: value })
            },
            setUseCustomWindow: (value) => {
                storage.setCustomWindow(value)
                set({ useCustomWindow: value })
            },
            setLoggingEnabled: (value) => {
                storage.setLoggingEnabled(value)
                set({ loggingEnabled: value })
            },
            setLoggingLevels: (value) => {
                storage.setLoggingLevels(value)
                set({ loggingLevels: value })
            },
            setTelemetryEnabled: (value) => {
                storage.setTelemetryEnabled(value)
                set({ telemetryEnabled: value })
            },
            setTelemetryEndpoint: (value) => {
                storage.setTelemetryEndpoint(value)
                set({ telemetryEndpoint: value })
            },
            connect: async () => {
                const {
                    auth,
                    publishableKey,
                    useCustomWindow,
                    loggingEnabled,
                    loggingLevels,
                    telemetryEnabled,
                    telemetryEndpoint,
                } = get()
                if (!auth || !publishableKey.trim()) return
                await connectWith(
                    auth,
                    publishableKey.trim(),
                    useCustomWindow,
                    loggingEnabled,
                    loggingLevels,
                    telemetryEnabled,
                    telemetryEndpoint.trim()
                )
            },
            disconnect: () => {
                teardown()
                addLog("SDK closed", "ok")
            },
            addLog,
            clearLog: () => set({ log: [] }),
            navigate: (screen) => {
                storage.setScreen(screen)
                set({ screen })
            },
        }
    })
)

// Silently restore a session that was already connected before this reload —
// reuses the SDK's own session cookie, so this costs no extra network call.
const initial = useKasookooStore.getState()
if (initial.isRestoring && initial.auth) {
    void useKasookooStore
        .getState()
        .connect()
        .catch(() => undefined)
}

/** Convenience aggregate for screens that read several fields at once. */
export function useKasookoo() {
    return {
        auth: useKasookooStore.use.auth(),
        signIn: useKasookooStore.use.signIn(),
        signOut: useKasookooStore.use.signOut(),
        client: useKasookooStore.use.client(),
        status: useKasookooStore.use.status(),
        isRestoring: useKasookooStore.use.isRestoring(),
        error: useKasookooStore.use.error(),
        scopes: useKasookooStore.use.scopes(),
        has: (scope: string) => useKasookooStore.getState().scopes.includes(scope),
        publishableKey: useKasookooStore.use.publishableKey(),
        setPublishableKey: useKasookooStore.use.setPublishableKey(),
        useCustomWindow: useKasookooStore.use.useCustomWindow(),
        setUseCustomWindow: useKasookooStore.use.setUseCustomWindow(),
        loggingEnabled: useKasookooStore.use.loggingEnabled(),
        setLoggingEnabled: useKasookooStore.use.setLoggingEnabled(),
        loggingLevels: useKasookooStore.use.loggingLevels(),
        setLoggingLevels: useKasookooStore.use.setLoggingLevels(),
        telemetryEnabled: useKasookooStore.use.telemetryEnabled(),
        setTelemetryEnabled: useKasookooStore.use.setTelemetryEnabled(),
        telemetryEndpoint: useKasookooStore.use.telemetryEndpoint(),
        setTelemetryEndpoint: useKasookooStore.use.setTelemetryEndpoint(),
        connect: useKasookooStore.use.connect(),
        disconnect: useKasookooStore.use.disconnect(),
        log: useKasookooStore.use.log(),
        addLog: useKasookooStore.use.addLog(),
        clearLog: useKasookooStore.use.clearLog(),
        incoming: useKasookooStore.use.incoming(),
    }
}
