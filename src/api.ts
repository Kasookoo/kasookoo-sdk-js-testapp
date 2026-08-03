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


