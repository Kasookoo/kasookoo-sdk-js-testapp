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
        loggingEnabled?: boolean
        /**
         * Which level(s) to show — an exact set, not a minimum threshold (see
         * the SDK README's "Console logging"). Defaults to the SDK's own
         * default (`["info", "warn", "error"]`) when omitted.
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
        callWindow: options.useCustomWindow ? customCallWindow : undefined,
        logging: {
            enabled: options.loggingEnabled ?? true,
            level: options.loggingLevels?.length ? options.loggingLevels : undefined,
            service: "kasookoo-sdk-test-app",
        },
        telemetry: { endpoint: options.telemetryEndpoint || undefined, serviceName: "kasookoo-sdk-test-app" },
    })
    subscribeToKasookooEvents(client, options.handlers)
    return client
}

/** Tears down a client — closes the session, stops listening for pushes. */
export function closeKasookoo(client: KasookooClient | null): void {
    client?.close()
}
