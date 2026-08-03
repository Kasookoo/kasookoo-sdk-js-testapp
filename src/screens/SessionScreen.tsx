import type { ReactNode } from "react"
import { useKasookoo } from "../store/kasookoo"
import { Badge, Panel } from "../components/ui"
import { SCREENS } from "./registry"
import { formatDateTime, fullName } from "../lib/format"

const FEATURE_SCOPES = SCREENS.filter((screen) => screen.scope).map((screen) => screen.scope!)

function Kv({ items }: { items: [string, ReactNode][] }) {
    return (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            {items.map(([label, value], i) => (
                <div className="contents" key={i}>
                    <dt className="text-foreground/50">{label}</dt>
                    <dd>{value}</dd>
                </div>
            ))}
        </dl>
    )
}

export function SessionScreen() {
    const { client, scopes, has, auth, useCustomWindow } = useKasookoo()
    const session = client?.session ?? null

    // Scopes the key grants that this SDK has no feature for — informational.
    const unused = scopes.filter((scope) => !FEATURE_SCOPES.includes(scope))

    return (
        <div className="flex flex-col gap-6">
            <header>
                <h1 className="text-xl font-semibold">Session</h1>
                <p className="text-sm text-foreground/60">What this session is and what it's allowed to do.</p>
            </header>

            <Panel title="Signed in as">
                <Kv
                    items={[
                        ["User", fullName(auth?.user)],
                        [
                            "Email — the SDK's subject",
                            <code key="email">{auth?.user.email}</code>,
                        ],
                        ["Role", auth?.user.role ?? "—"],
                    ]}
                />
            </Panel>

            <Panel title="SDK session" description="Created and refreshed automatically — nothing to manage yourself.">
                <Kv
                    items={[
                        ["Session id", <code key="sid">{session?.sessionId ?? "—"}</code>],
                        ["Organization", <code key="org">{session?.organizationId ?? "—"}</code>],
                        ["Expires", session ? formatDateTime(new Date(session.expiresAt).toISOString()) : "—"],
                        ["Call window", useCustomWindow ? "custom (example renderer)" : "SDK built-in"],
                        ["Device", "registered for calls and messages by init()"],
                    ]}
                />
            </Panel>

            <Panel
                title="Capabilities"
                description="Each feature is gated on its capability. Locked screens would throw if called."
            >
                <div className="flex flex-col divide-y divide-border">
                    {SCREENS.filter((screen) => screen.scope).map((screen) => (
                        <div key={screen.id} className="flex items-center gap-3 py-2 text-sm">
                            <span className="w-4 text-center">{screen.icon}</span>
                            <span className="flex-1">{screen.label}</span>
                            <code className="text-xs text-foreground/50">{screen.scope}</code>
                            {has(screen.scope!) ? <Badge tone="ok">granted</Badge> : <Badge tone="err">missing</Badge>}
                        </div>
                    ))}
                </div>

                {unused.length > 0 ? (
                    <p className="pt-2 text-xs text-foreground/50">
                        Also granted, with no web-SDK feature behind them:{" "}
                        {unused.map((scope) => (
                            <code key={scope} className="mr-1 rounded bg-surface-secondary px-1">
                                {scope}
                            </code>
                        ))}
                    </p>
                ) : null}
            </Panel>
        </div>
    )
}
