import { useEffect, useState } from "react"
import type { Call, CallState } from "@reverse-engineer/kasookoo-sdk"
import { useKasookoo } from "../store/kasookoo"
import { endCall, getActiveCall, setCallMuted } from "../kasookoo"
import { Badge, Button } from "./ui"
import { formatClock } from "../lib/format"

/**
 * Mirrors whatever call is currently live. The SDK renders its own call window;
 * this exists to show that the host app can track the same `Call` handle and
 * drive it from its own UI.
 */
export function ActiveCallBar() {
    const { client, addLog } = useKasookoo()
    const [call, setCall] = useState<Call | null>(null)
    const [state, setState] = useState<CallState | null>(null)
    const [muted, setMuted] = useState(false)
    const [seconds, setSeconds] = useState(0)

    // The SDK owns the call; poll for the active one rather than duplicating its bookkeeping.
    useEffect(() => {
        if (!client) return
        const timer = setInterval(() => {
            const active = getActiveCall(client)
            setCall((prev) => (prev === active ? prev : active))
        }, 400)
        return () => clearInterval(timer)
    }, [client])

    useEffect(() => {
        if (!call) {
            setState(null)
            setMuted(false)
            setSeconds(0)
            return
        }
        setState(call.state)
        setMuted(call.muted)
        const off = call.on("state", setState)
        return off
    }, [call])

    // Count only from pickup, never from mount — a SIP call can ring for a while.
    useEffect(() => {
        if (state !== "connected") return
        setSeconds(0)
        const timer = setInterval(() => setSeconds((value) => value + 1), 1000)
        return () => clearInterval(timer)
    }, [state])

    if (!call || !state || state === "ended") return null

    return (
        <div className="flex items-center gap-4 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3">
            <div className="flex items-center gap-3">
                <span className="size-2 animate-pulse rounded-full bg-accent" />
                <div>
                    <p className="text-sm font-medium">{call.remote.name}</p>
                    <p className="text-xs text-foreground/60">
                        {call.kind === "sip" ? "phone" : "in-app"} · {state}
                    </p>
                </div>
            </div>

            {state === "connected" ? <Badge tone="ok">{formatClock(seconds)}</Badge> : null}

            <div className="ml-auto flex gap-2">
                {state === "connected" ? (
                    <Button
                        variant="secondary"
                        onClick={async () => {
                            const next = !muted
                            await setCallMuted(call, next)
                            setMuted(next)
                            addLog(`call ${next ? "muted" : "unmuted"}`)
                        }}
                    >
                        {muted ? "Unmute" : "Mute"}
                    </Button>
                ) : null}
                <Button
                    variant="danger"
                    onClick={() => {
                        addLog("call end()")
                        void endCall(call)
                    }}
                >
                    End call
                </Button>
            </div>
        </div>
    )
}
