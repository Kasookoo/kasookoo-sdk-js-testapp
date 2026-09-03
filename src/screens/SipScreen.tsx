import { useState } from "react"
import { useKasookoo } from "../store/kasookoo"
import { placePhoneCall } from "../kasookoo"
import { createCallIntent } from "../api"
import { Button, Field, Input, Panel } from "../components/ui"
import { describeError, fullName } from "../lib/format"
import { ActiveCallBar } from "../components/ActiveCallBar"

const DIAL_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"]

export function SipScreen() {
    const { client, addLog, auth } = useKasookoo()
    const [number, setNumber] = useState("")
    const [busy, setBusy] = useState(false)

    const dial = async () => {
        if (!client || !auth) return
        const phoneNumber = number.trim()
        if (!phoneNumber) return
        setBusy(true)
        try {
            // 1. Stand-in for the integrator's own backend: get a call intent
            // before dialing. The SDK never creates intents itself.
            addLog(`call-intents → ${phoneNumber}`)
            const intent = await createCallIntent(auth.access_token, {
                phoneNumber,
                subject: auth.user.email,
            })
            addLog(`call intent ${intent.intent_id} (expires in ${intent.expires_in}s)`, "ok")

            // 2. Dial with the intent.
            addLog(`initSipCall → ${phoneNumber}`)
            const call = await placePhoneCall(
                client,
                { name: fullName(auth.user) },
                phoneNumber,
                intent.intent_id,
                intent.client_secret
            )
            addLog(`sip call is ${call.kind} → ${call.remote.name}`, "ok")
            call.on("state", (state) => addLog(`sip call → ${state}`, state === "connected" ? "ok" : "info"))
            call.on("error", (err) => addLog(`sip call error ${describeError(err)}`, "err"))
        } catch (err) {
            addLog(`dial failed ${describeError(err)}`, "err")
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <header>
                <h1 className="text-xl font-semibold">Phone (SIP)</h1>
                <p className="text-sm text-foreground/60">
                    Call an external number. The SDK ships no dialer — this one belongs to the host app.
                </p>
            </header>

            <ActiveCallBar />

            <Panel
                title="Dial"
                description="Once placed, a phone call is an ordinary Call — same states, same window, same controls."
            >
                <div className="flex max-w-xs flex-col gap-4">
                    <Field label="Destination number" hint="E.164 format, e.g. +447783021617">
                        <Input
                            value={number}
                            placeholder="+447783021617"
                            onChange={(e) => setNumber(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && void dial()}
                        />
                    </Field>

                    <div className="grid grid-cols-3 gap-2">
                        {DIAL_KEYS.map((key) => (
                            <button
                                key={key}
                                className="rounded-lg border border-border py-3 text-lg font-medium hover:bg-surface-hover"
                                onClick={() => setNumber((v) => v + key)}
                            >
                                {key}
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => setNumber("")} disabled={!number}>
                            Clear
                        </Button>
                        <Button variant="teal" onClick={() => void dial()} loading={busy} disabled={!number.trim()}>
                            Call
                        </Button>
                    </div>
                </div>
            </Panel>
        </div>
    )
}
