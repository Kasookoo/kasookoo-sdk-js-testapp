import type { CallWindowRenderer } from "kasookoo-sdk"

/**
 * Example custom call window — demonstrates the `CallWindowRenderer` contract
 * from kasookoo-sdk. Pass this to `KasookooClient.init({ callWindow: ... })`
 * to replace the SDK's built-in window entirely.
 *
 * Key rules this follows (see the SDK README's "Call window UI" section):
 *  - the renderer runs ONCE per call — it must react to `call.on("state", ...)`
 *    itself to move through "incoming" -> "connecting"/"connected" -> "ended"
 *  - `container` is already mounted and positioned by the SDK — just render into it
 *  - return a cleanup function to dispose timers/listeners on unmount
 *
 * ONE window serves both kinds of call. A phone call (`kind: "sip"`) is an
 * ordinary Call — same states, same controls — so nothing here branches on
 * `kind` for state handling. "connecting" means the same thing for both:
 * not yet connected. It just tends to last longer for a phone call, since
 * there's no accept step — it only moves to "connected" once the handset is
 * picked up. That's an internal timing difference, not a different surface
 * state, so it's rendered identically either way.
 *
 * The one place `kind` matters here is display-only: the avatar/name shown.
 * Phone calls never ring IN — they are always outgoing and always start at
 * "connecting" — so the accept/reject branch below is naturally unreachable
 * for them; no `kind` check needed, the state check already covers it.
 *
 * The timer starts at "connected", never at mount, for both kinds.
 *
 * `end()` covers every state for both kinds, so the hang-up button never has to
 * care which it is.
 *
 * Styled deliberately differently (dark theme) from the SDK's default window
 * so it's obvious which one is active when you toggle it on in the test app.
 */
export const customCallWindow: CallWindowRenderer = (container, call) => {
    const card = document.createElement("div")
    card.style.cssText = `
        width: 260px; border-radius: 14px; overflow: hidden;
        background: #1e1b2e; color: #fff; font-family: system-ui, -apple-system, sans-serif;
        box-shadow: 0 10px 30px rgba(0,0,0,.45); border: 1px solid #3a3560; user-select: none;
    `
    card.innerHTML = `
        <div class="ccw-header" style="padding:10px 14px; background:#2c2750; cursor:move;">
            <div class="ccw-status" style="font-size:11px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; color:#a99bff;"></div>
            <div class="ccw-timer" style="font-size:11px; color:#8b81b8; margin-top:2px;" hidden>0:00</div>
        </div>
        <div style="display:flex; align-items:center; gap:10px; padding:14px;">
            <div style="width:40px;height:40px;border-radius:50%;background:#4b3f8a;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;">
                ${call.kind === "sip" ? "☎" : escapeHtml(call.remote.name.charAt(0).toUpperCase())}
            </div>
            <div style="min-width:0;">
                <div style="font-size:14px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(call.remote.name)}</div>
                <div style="font-size:11px;color:#8b81b8;">${call.kind === "sip" ? "Phone" : call.direction === "outgoing" ? "Outgoing" : "Incoming"} · custom window</div>
            </div>
        </div>
        <div class="ccw-controls" style="display:flex; gap:8px; padding:12px 14px; background:#241f3d;"></div>
    `
    container.appendChild(card)

    const status = card.querySelector<HTMLElement>(".ccw-status")!
    const timer = card.querySelector<HTMLElement>(".ccw-timer")!
    const controls = card.querySelector<HTMLElement>(".ccw-controls")!
    const header = card.querySelector<HTMLElement>(".ccw-header")!

    let seconds = 0
    let interval: ReturnType<typeof setInterval> | null = null
    const startTimer = () => {
        timer.hidden = false
        interval = setInterval(() => {
            seconds += 1
            timer.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
        }, 1000)
    }

    const button = (label: string, bg: string, onClick: () => void): HTMLButtonElement => {
        const btn = document.createElement("button")
        btn.textContent = label
        btn.style.cssText = `flex:1; padding:8px; border:none; border-radius:8px; background:${bg}; color:#fff; font-weight:600; cursor:pointer; font-size:12px;`
        btn.addEventListener("click", onClick)
        return btn
    }

    const render = () => {
        // Same label for both kinds — "connecting" means not yet connected
        // either way, regardless of how long it takes to get there.
        status.textContent = call.state
        controls.innerHTML = ""

        // Unreachable for phone calls — they never ring in.
        if (call.state === "incoming") {
            controls.appendChild(button("Reject", "#e5484d", () => call.reject()))
            controls.appendChild(button("Accept", "#30a46c", () => void call.accept()))
            return
        }

        if (call.state === "connected") {
            controls.appendChild(
                button(call.muted ? "Unmute" : "Mute", "#4b3f8a", () => void call.setMuted(!call.muted).then(render))
            )
            if (!interval) startTimer()
        }

        controls.appendChild(button(call.state === "connected" ? "End" : "Cancel", "#e5484d", () => void call.end()))
    }

    render()
    const offState = call.on("state", render)

    // Draggable via the header, same convention as the SDK's own default window.
    let drag: { startX: number; startY: number; baseX: number; baseY: number } | null = null
    let offset = { x: 0, y: 0 }
    header.addEventListener("pointerdown", (e) => {
        drag = { startX: e.clientX, startY: e.clientY, baseX: offset.x, baseY: offset.y }
        header.setPointerCapture(e.pointerId)
    })
    header.addEventListener("pointermove", (e) => {
        if (!drag) return
        offset = { x: drag.baseX + e.clientX - drag.startX, y: drag.baseY + e.clientY - drag.startY }
        container.style.transform = `translate(${offset.x}px, ${offset.y}px)`
    })
    header.addEventListener("pointerup", () => (drag = null))

    return () => {
        offState()
        if (interval) clearInterval(interval)
    }
}

function escapeHtml(text: string): string {
    return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
}
