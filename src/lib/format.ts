/** Small display helpers shared by the screens. */

export function formatDateTime(iso: string | null | undefined): string {
    if (!iso) return "—"
    const date = new Date(iso)
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString()
}

export function formatTime(iso: string | null | undefined): string {
    if (!iso) return "—"
    const date = new Date(iso)
    return Number.isNaN(date.getTime())
        ? "—"
        : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
}

export function formatDuration(seconds: number | null | undefined): string {
    if (seconds == null) return "—"
    const total = Math.round(seconds)
    const mins = Math.floor(total / 60)
    const secs = total % 60
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
}

export function formatClock(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
}

export function fullName(user: { first_name?: string; last_name?: string } | null | undefined): string {
    if (!user) return "—"
    const name = [user.first_name, user.last_name].filter((part) => part && part.trim()).join(" ")
    return name || "—"
}

/** Pulls `code` and `message` off an unknown thrown value for logging. */
export function describeError(err: unknown): string {
    const e = err as { code?: string; message?: string }
    const code = e?.code ? `[${e.code}] ` : ""
    return `${code}${e?.message ?? String(err)}`
}

/** `"32.21,74.19"` → coordinates, or `null` if the message isn't a location. */
export function parseLocation(message: string): { lat: number; lng: number } | null {
    if (!message || typeof message !== "string") return null
    const match = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/.exec(message)
    if (!match) return null
    const lat = Number(match[1])
    const lng = Number(match[2])
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
    return { lat, lng }
}
