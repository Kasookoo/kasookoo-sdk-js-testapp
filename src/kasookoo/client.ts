import { KasookooClient } from "@reverse-engineer/kasookoo-sdk"
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
    options: { useCustomWindow?: boolean; handlers: KasookooEventHandlers }
): Promise<KasookooClient> {
    const client = await KasookooClient.init({
        publishableKey,
        subject: email,
        callWindow: options.useCustomWindow ? customCallWindow : undefined,
    })
    subscribeToKasookooEvents(client, options.handlers)
    return client
}

/** Tears down a client — closes the session, stops listening for pushes. */
export function closeKasookoo(client: KasookooClient | null): void {
    client?.close()
}
