import type { ReactNode } from "react"
import { useKasookoo } from "../store/kasookoo"
import { fullName } from "../lib/format"
import { Badge, Button } from "./ui"
import { EventLog } from "./EventLog"
import { SCREENS, type ScreenId } from "../screens/registry"

export function AppShell({
    screen,
    onNavigate,
    children,
}: {
    screen: ScreenId
    onNavigate: (id: ScreenId) => void
    children: ReactNode
}) {
    const { auth, signOut, status, scopes, has, disconnect, incoming } = useKasookoo()

    return (
        <div className="flex h-screen flex-col bg-background text-foreground md:flex-row">
            <aside className="flex shrink-0 flex-col gap-3 border-b border-border bg-surface p-3 md:h-full md:w-60 md:gap-0 md:border-b-0 md:border-r md:p-4 md:overflow-y-auto">
                <div className="flex items-center gap-2 px-1 md:pb-4">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent font-bold text-accent-foreground">
                        K
                    </span>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">Kasookoo SDK</p>
                        <p className="text-xs text-foreground/50">test harness</p>
                    </div>
                </div>

                <nav className="flex gap-1 overflow-x-auto md:flex-1 md:flex-col md:overflow-visible">
                    {SCREENS.map((item) => {
                        const locked = item.scope ? !has(item.scope) : false
                        const active = item.id === screen
                        return (
                            <button
                                key={item.id}
                                onClick={() => onNavigate(item.id)}
                                title={locked ? `Requires the "${item.scope}" capability` : item.label}
                                className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm transition-colors md:shrink ${
                                    active ? "bg-accent text-accent-foreground" : "hover:bg-surface-hover"
                                } ${locked ? "opacity-50" : ""}`}
                            >
                                <span className="w-4 text-center">{item.icon}</span>
                                <span>{item.label}</span>
                                {item.id === "calls" && incoming.length > 0 ? (
                                    <Badge tone="err">{incoming.length}</Badge>
                                ) : null}
                                {locked ? <span className="text-[10px] text-foreground/40">locked</span> : null}
                            </button>
                        )
                    })}
                </nav>

                <div className="flex flex-wrap items-center gap-3 md:flex-col md:items-stretch md:border-t md:border-border md:pt-3">
                    <div className="flex items-center gap-2">
                        <Badge tone={status === "ready" ? "ok" : status === "error" ? "err" : "neutral"}>{status}</Badge>
                        {status === "ready" ? <span className="text-xs text-foreground/50">{scopes.length} scopes</span> : null}
                    </div>
                    {auth ? (
                        <div className="text-xs">
                            <p className="font-medium">{fullName(auth.user)}</p>
                            <p className="text-foreground/50">{auth.user.email}</p>
                        </div>
                    ) : null}
                    <div className="flex gap-2">
                        {status === "ready" ? (
                            <Button variant="ghost" onClick={disconnect}>
                                Close SDK
                            </Button>
                        ) : null}
                        <Button variant="ghost" onClick={signOut}>
                            Sign out
                        </Button>
                    </div>
                </div>
            </aside>

            <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
            <EventLog />
        </div>
    )
}
