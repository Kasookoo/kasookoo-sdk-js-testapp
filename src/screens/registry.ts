/** Single source of truth for the nav: id, label, and the capability it needs. */

export type ScreenId =
    | "session"
    | "calls"
    | "sip"
    | "messaging"
    | "cdr"
    | "users"
    | "numbers"

export interface ScreenMeta {
    id: ScreenId
    label: string
    icon: string
    /** Capability required — the nav marks the entry locked without it. */
    scope?: string
}

export const SCREENS: ScreenMeta[] = [
    { id: "session", label: "Session", icon: "◈" },
    { id: "calls", label: "Calls", icon: "☏", scope: "in_app_calling" },
    { id: "sip", label: "Phone (SIP)", icon: "⌗", scope: "sip_calling" },
    { id: "messaging", label: "Messaging", icon: "✉", scope: "in_app_messaging" },
    { id: "cdr", label: "Call records", icon: "▤", scope: "cdr" },
    { id: "users", label: "Users", icon: "⚇", scope: "user" },
    { id: "numbers", label: "Numbers", icon: "#", scope: "associated_number" },
]

export function isScreenId(value: unknown): value is ScreenId {
    return typeof value === "string" && SCREENS.some((screen) => screen.id === value)
}
