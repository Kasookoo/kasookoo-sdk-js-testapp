import type { Call, CallState, KasookooClient, KasookooError, SessionInfo } from "@reverse-engineer/kasookoo-sdk"

/**
 * One callback per event the SDK can emit. Every field is optional — wire up
 * only the ones a given screen cares about.
 */
export interface KasookooEventHandlers {
    onSessionCreated?: (info: SessionInfo) => void
    onSessionRefreshed?: (info: SessionInfo) => void
    onSessionExpired?: (reason: string) => void
    /** A call is ringing in. */
    onIncomingCall?: (call: Call) => void
    /** Fires for every state change of a ringing call, incoming state included. */
    onCallStateChange?: (call: Call, state: CallState) => void
    onCallEnded?: (call: Call) => void
    onNotification?: (data: Record<string, string>) => void
    onError?: (error: KasookooError) => void
}

/**
 * Wires every event `KasookooClient` can emit to plain callbacks. This is the
 * complete list of events the SDK exposes — nothing framework-specific here,
 * just `client.on(...)`.
 */
export function subscribeToKasookooEvents(client: KasookooClient, handlers: KasookooEventHandlers): void {
    client.on("session:created", (info) => handlers.onSessionCreated?.(info))
    client.on("session:refreshed", (info) => handlers.onSessionRefreshed?.(info))
    client.on("session:expired", ({ reason }) => handlers.onSessionExpired?.(reason))
    client.on("call:incoming", (call) => {
        handlers.onIncomingCall?.(call)
        call.on("state", (state) => {
            handlers.onCallStateChange?.(call, state)
            if (state === "ended") handlers.onCallEnded?.(call)
        })
    })
    client.on("notification:message", (data) => handlers.onNotification?.(data))
    client.on("error", (err) => handlers.onError?.(err))
}
