import { KasookooClickToCall } from "kasookoo-click-to-call-widget"
import { BOT_BASE } from "../api"
import { storage } from "../lib/storage"
import type { LoginResult } from "../api"

/**
 * The click-to-call widget is a singleton with its own session, separate from
 * `KasookooClient`. Its `subject` must equal the `subject` the call-intent
 * endpoint is created with — the intent endpoint below sends the same value.
 */
let instance: Promise<KasookooClickToCall> | null = null
let initKey = ""

export function initClickToCall(auth: LoginResult, publishableKey: string): Promise<KasookooClickToCall> {
    const key = `${auth.user.email}|${publishableKey}`
    if (instance && key === initKey) return instance
    closeClickToCall()
    initKey = key
    const subject = auth.user.email
    const created = KasookooClickToCall.init({
        publishableKey,
        subject,
        intentEndpoint: {
            url: `${BOT_BASE}/v1/bot/sdk/call-intents`,
            // Read at call time so a re-login is picked up.
            headers: () => ({ Authorization: `Bearer ${storage.getAuth<LoginResult>()?.access_token ?? auth.access_token}` }),
            body: (phoneNumber) => ({ phone_number: phoneNumber, subject, max_duration_seconds: 300 }),
        },
    })
    instance = created
    created.catch(() => {
        if (instance === created) {
            instance = null
            initKey = ""
        }
    })
    return created
}

export function closeClickToCall(): void {
    const previous = instance
    instance = null
    initKey = ""
    void previous?.then((widget) => widget.close()).catch(() => {})
}
