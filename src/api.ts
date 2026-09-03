// Bot backend (same API the existing webapp uses) — ONLY for login. The SDK
// has no concept of authenticating an end user by email/password; it expects
// the host app to already know who the user is (the `subject` passed to
// `KasookooClient.init()`). Everything else goes through kasookoo-sdk.

const BOT_BASE = "https://webrtc-test.kasookoo.ai/api"

export interface BotUser {
    id: string
    email: string
    /** May be absent for some accounts. */
    phone_number: string | null
    first_name: string
    last_name: string
    /** Free-form — `customer`, `agent`, `driver`, … */
    role: string
}

export interface LoginResult {
    user: BotUser
    access_token: string
}

export class BotApiError extends Error {
    constructor(message: string, readonly status: number) {
        super(message)
    }
}

async function botRequest<T>(path: string, options: { method?: string; token?: string; body?: unknown } = {}): Promise<T> {
    const res = await fetch(`${BOT_BASE}${path}`, {
        method: options.method ?? "GET",
        headers: {
            Accept: "application/json",
            ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
            ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        },
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    })
    const data = await res.json().catch(() => undefined)
    if (!res.ok) {
        const detail = (data as { detail?: unknown })?.detail
        throw new BotApiError(typeof detail === "string" ? detail : `Request failed (${res.status})`, res.status)
    }
    return data as T
}

/** Same client-side SHA-256 hashing convention as the existing webapp. */
export async function hashPassword(plainText: string): Promise<string> {
    const data = new TextEncoder().encode(plainText)
    const hashBuffer = await crypto.subtle.digest("SHA-256", data)
    return Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
}

export async function login(email: string, password: string): Promise<LoginResult> {
    return botRequest<LoginResult>("/v1/bot/users/login", {
        method: "POST",
        body: { email, password: await hashPassword(password) },
    })
}

// Call intents — this stands in for the integrator's own backend. In the new
// dial flow the SDK no longer creates call intents itself: the host app's
// backend calls its own version of this endpoint first, then hands the SDK
// `intent_id` / `client_secret` to dial with. The real per-integrator SDK
// hits the same underlying API; this test app just calls it directly since
// it has no backend of its own.

export interface CallIntent {
    intent_id: string
    client_secret: string
    subject: string
    phone_number: string
    expires_in: number
    max_duration_seconds: number
    status: string
}

export interface CreateCallIntentParams {
    phoneNumber: string
    subject: string
    maxDurationSeconds?: number
}

export function createCallIntent(token: string, params: CreateCallIntentParams): Promise<CallIntent> {
    return botRequest<CallIntent>("/sdk/call-intents", {
        method: "POST",
        token,
        body: {
            phone_number: params.phoneNumber,
            subject: params.subject,
            max_duration_seconds: params.maxDurationSeconds ?? 300,
        },
    })
}


