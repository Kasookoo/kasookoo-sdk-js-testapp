import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import { useKasookoo } from "../store/kasookoo"
import { Button, Badge } from "./ui"

/** Collapsible, draggable event log, docked bottom-left by default and available on every screen. */
export function EventLog() {
    const { log, clearLog } = useKasookoo()
    const [open, setOpen] = useState(false)
    const bodyRef = useRef<HTMLDivElement>(null)
    const panelRef = useRef<HTMLDivElement>(null)
    const lastSeen = useRef(0)
    const [unseen, setUnseen] = useState(0)

    // Drag state lives in refs, not React state — dragging shouldn't re-render.
    const drag = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null)
    const offset = useRef({ x: 0, y: 0 })
    const dragged = useRef(false)

    const onHeaderPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
        drag.current = { startX: e.clientX, startY: e.clientY, baseX: offset.current.x, baseY: offset.current.y }
        dragged.current = false
        e.currentTarget.setPointerCapture(e.pointerId)
    }
    const onHeaderPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
        if (!drag.current) return
        const dx = e.clientX - drag.current.startX
        const dy = e.clientY - drag.current.startY
        // A few pixels of jitter shouldn't count as a drag — keeps the toggle clickable.
        if (!dragged.current && Math.hypot(dx, dy) > 4) dragged.current = true
        offset.current = { x: drag.current.baseX + dx, y: drag.current.baseY + dy }
        if (panelRef.current) panelRef.current.style.transform = `translate(${offset.current.x}px, ${offset.current.y}px)`
    }
    const onHeaderPointerUp = () => {
        drag.current = null
    }
    const onHeaderClick = () => {
        if (dragged.current) {
            dragged.current = false
            return
        }
        setOpen((v) => !v)
    }

    useEffect(() => {
        if (open) {
            lastSeen.current = log.length
            setUnseen(0)
            bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight })
        } else {
            setUnseen(log.length - lastSeen.current)
        }
    }, [log, open])

    const errors = log.filter((entry) => entry.kind === "err").length

    return (
        <div
            ref={panelRef}
            className="fixed bottom-4 left-4 right-4 z-20 overflow-hidden rounded-xl border border-border bg-surface shadow-surface md:right-auto md:w-80"
        >
            <button
                className="flex w-full cursor-move touch-none select-none items-center gap-2 px-3 py-2 text-sm font-medium"
                onPointerDown={onHeaderPointerDown}
                onPointerMove={onHeaderPointerMove}
                onPointerUp={onHeaderPointerUp}
                onClick={onHeaderClick}
            >
                <span className="flex-1 text-left">Event log</span>
                {errors > 0 ? <Badge tone="err">{errors}</Badge> : null}
                {!open && unseen > 0 ? <Badge tone="accent">{unseen} new</Badge> : null}
                <span>{open ? "▾" : "▴"}</span>
            </button>

            {open ? (
                <>
                    <div ref={bodyRef} className="max-h-64 overflow-y-auto border-t border-border px-3 py-2 text-xs">
                        {log.length === 0 ? (
                            <p className="py-4 text-center text-foreground/40">Nothing logged yet.</p>
                        ) : (
                            log.map((entry) => (
                                <div
                                    key={entry.id}
                                    className={`flex gap-2 py-0.5 ${
                                        entry.kind === "err"
                                            ? "text-danger"
                                            : entry.kind === "ok"
                                              ? "text-success"
                                              : "text-foreground/70"
                                    }`}
                                >
                                    <span className="shrink-0 text-foreground/40">
                                        {entry.at.toLocaleTimeString([], { hour12: false })}
                                    </span>
                                    <span className="break-all">{entry.text}</span>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs">
                        <span className="text-foreground/50">{log.length} entries</span>
                        <Button variant="ghost" onClick={clearLog}>
                            Clear
                        </Button>
                    </div>
                </>
            ) : null}
        </div>
    )
}
