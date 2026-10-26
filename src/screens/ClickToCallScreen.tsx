import { useEffect, useRef, useState } from "react"
import { useKasookoo } from "../store/kasookoo"
import { initClickToCall } from "../kasookoo/clickToCall"
import { Badge, Button, Field, Input, Panel } from "../components/ui"
import { describeError } from "../lib/format"

interface StaticNumber {
    id: string
    number: string
    label: string
}

const STORAGE_KEY = "kasookoo.clickToCall.numbers"

function loadNumbers(): StaticNumber[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        return raw ? (JSON.parse(raw) as StaticNumber[]) : []
    } catch {
        return []
    }
}

function saveNumbers(numbers: StaticNumber[]) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(numbers))
    } catch {
        /* the list just won't survive a reload */
    }
}

/** Logs the events a `<kasookoo-dialer>` emits. */
function useDialerLogging(ref: React.RefObject<HTMLElement | null>, name: string) {
    const { addLog } = useKasookoo()
    useEffect(() => {
        const el = ref.current
        if (!el) return
        const onState = (e: Event) => {
            const d = (e as CustomEvent<{ state: string; phoneNumber: string }>).detail
            addLog(`widget(${name}) call → ${d.state} · ${d.phoneNumber}`, d.state === "connected" ? "ok" : "info")
        }
        const onError = (e: Event) => {
            const d = (e as CustomEvent<{ code: string; message: string }>).detail
            addLog(`widget(${name}) error ${d.code}: ${d.message}`, "err")
        }
        el.addEventListener("call-state", onState)
        el.addEventListener("call-error", onError)
        return () => {
            el.removeEventListener("call-state", onState)
            el.removeEventListener("call-error", onError)
        }
    })
}

function DynamicDialer() {
    const ref = useRef<HTMLElement>(null)
    useDialerLogging(ref, "dial pad")
    return <kasookoo-dialer ref={ref} />
}

function StaticDialer({ item, onRemove }: { item: StaticNumber; onRemove: () => void }) {
    const ref = useRef<HTMLElement>(null)
    useDialerLogging(ref, item.label || item.number)
    return (
        <div className="flex items-center gap-2 rounded-lg border border-border p-2">
            <kasookoo-dialer ref={ref} fixed-number={item.number} label={item.label || undefined} />
            <button
                aria-label={`Remove ${item.label || item.number}`}
                title="Remove"
                className="grid size-6 place-items-center rounded-full text-foreground/50 hover:bg-surface-hover hover:text-foreground"
                onClick={onRemove}
            >
                ×
            </button>
        </div>
    )
}

export function ClickToCallScreen() {
    const { auth, publishableKey, addLog } = useKasookoo()
    const [ready, setReady] = useState(false)
    const [error, setError] = useState("")
    const [numbers, setNumbers] = useState<StaticNumber[]>(loadNumbers)
    const [adding, setAdding] = useState(false)
    const [newNumber, setNewNumber] = useState("")
    const [newLabel, setNewLabel] = useState("")

    const key = publishableKey.trim()

    useEffect(() => {
        if (!auth || !key) return
        let cancelled = false
        setReady(false)
        setError("")
        initClickToCall(auth, key)
            .then(() => {
                if (cancelled) return
                setReady(true)
                addLog("click-to-call widget ready", "ok")
            })
            .catch((err) => {
                if (cancelled) return
                setError(describeError(err))
                addLog(`click-to-call init failed ${describeError(err)}`, "err")
            })
        return () => {
            cancelled = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [auth, key])

    const update = (next: StaticNumber[]) => {
        setNumbers(next)
        saveNumbers(next)
    }

    const add = () => {
        const number = newNumber.trim()
        if (!number) return
        update([...numbers, { id: crypto.randomUUID(), number, label: newLabel.trim() }])
        setNewNumber("")
        setNewLabel("")
        setAdding(false)
    }

    return (
        <div className="flex flex-col gap-6">
            <header>
                <h1 className="text-xl font-semibold">Click to call</h1>
                <p className="text-sm text-foreground/60">
                    The <code>kasookoo-click-to-call-widget</code> package. Calls are preceded by a POST to the call-intents
                    endpoint, authenticated with your login token.
                </p>
            </header>

            {!key ? (
                <Panel title="Publishable key needed">
                    <p className="text-sm text-foreground/60">Enter a publishable key on the Session screen first.</p>
                </Panel>
            ) : error ? (
                <Panel title="Widget failed to initialise">
                    <p className="text-sm text-danger">{error}</p>
                </Panel>
            ) : !ready ? (
                <p className="text-sm text-foreground/60">Starting widget…</p>
            ) : (
                <>
                    {/* Dial pad: pinned bottom-right, opposite the event log. */}
                    <div className="fixed bottom-6 right-6 z-40">
                        <DynamicDialer />
                    </div>

                    <Panel
                        title="Static numbers"
                        description="One-click buttons for fixed numbers. Use + to add your own."
                        actions={
                            <Button variant="secondary" onClick={() => setAdding((v) => !v)}>
                                + Add number
                            </Button>
                        }
                    >
                        {adding ? (
                            <div className="flex max-w-xs flex-col gap-3 rounded-lg border border-border p-3">
                                <Field label="Number" hint="E.164, e.g. +447783021617">
                                    <Input
                                        autoFocus
                                        value={newNumber}
                                        placeholder="+447783021617"
                                        onChange={(e) => setNewNumber(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && add()}
                                    />
                                </Field>
                                <Field label="Label (optional)">
                                    <Input
                                        value={newLabel}
                                        placeholder="Talk to Sales"
                                        onChange={(e) => setNewLabel(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && add()}
                                    />
                                </Field>
                                <div className="flex gap-2">
                                    <Button onClick={add} disabled={!newNumber.trim()}>
                                        Save
                                    </Button>
                                    <Button variant="ghost" onClick={() => setAdding(false)}>
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        ) : null}

                        {numbers.length === 0 ? (
                            <p className="text-sm text-foreground/50">No numbers yet — add one with the + button.</p>
                        ) : (
                            <div className="flex flex-wrap gap-3">
                                {numbers.map((item) => (
                                    <StaticDialer
                                        key={item.id}
                                        item={item}
                                        onRemove={() => update(numbers.filter((n) => n.id !== item.id))}
                                    />
                                ))}
                            </div>
                        )}
                    </Panel>
                </>
            )}
        </div>
    )
}
