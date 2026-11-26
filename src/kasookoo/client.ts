import { KasookooClient, type LogLevel } from "kasookoo-sdk"
import { customCallWindow } from "../customCallWindow"
import { subscribeToKasookooEvents, type KasookooEventHandlers } from "./events"

/**
 * The entire lifecycle of talking to the Kasookoo SDK, start to finish:
 * initialize, subscribe to every event, hand back the ready client. This is
 * the ONLY place `KasookooClient.init()` is called in this app.
 *
 * `email` becomes the SDK's `subject` — it must be an existing user's email;
 * `init()` resolves it to that user and registers this browser for their
 * calls and messages internally.
 */
export async function initKasookoo(
    email: string,
    publishableKey: string,
    options: {
        useCustomWindow?: boolean
        /** Sign the user out of their other devices on a new sign-in (the SDK's `singleSession`). */
        singleSession?: boolean
        loggingEnabled?: boolean
        /**
         * Which level(s) of the SDK's `log` event to print to the console (see
         * the SDK README's "Logs"). The SDK itself no longer prints anything;
         * this app does, from the event. Defaults to `["info", "warn", "error"]`.
         */
        loggingLevels?: LogLevel[]
        /**
         * Optional — an *additional* collector of your own. Kasookoo's own
         * monitoring collector always receives traces/logs (telemetry has no
         * on/off switch — it runs because the @opentelemetry/* packages are
         * installed), regardless of this value.
         */
        telemetryEndpoint?: string
        handlers: KasookooEventHandlers
    }
): Promise<KasookooClient> {
    const client = await KasookooClient.init({
        publishableKey,
        subject: email,
        singleSession: options.singleSession,
        callWindow: options.useCustomWindow ? customCallWindow : undefined,
        telemetry: { endpoint: options.telemetryEndpoint || undefined, serviceName: "kasookoo-sdk-test-app", environment: "test" },
    })
    // The SDK never prints to the console: it emits `log` lines (those from
    // init() are replayed here) and the app decides what to show.
    if (options.loggingEnabled ?? true) {
        const shown = options.loggingLevels?.length ? options.loggingLevels : (["info", "warn", "error"] as LogLevel[])
        client.on("log", (entry) => {
            if (shown.includes(entry.level)) console[entry.level](JSON.stringify(entry))
        })
    }
    subscribeToKasookooEvents(client, options.handlers)
    return client
}

/** Tears down a client — closes the session, stops listening for pushes. */
export function closeKasookoo(client: KasookooClient | null): void {
    client?.close()
}
