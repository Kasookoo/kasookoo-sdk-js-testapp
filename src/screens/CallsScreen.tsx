import { useCallback, useEffect, useState } from "react"
import type { UserRecord } from "@reverse-engineer/kasookoo-sdk"
import { useKasookoo } from "../store/kasookoo"
import { answerCall, declineCall, listUsers, placeCall } from "../kasookoo"
import { Badge, Button, EmptyState, Input, Panel, Spinner } from "../components/ui"
import { describeError, fullName } from "../lib/format"
import { ActiveCallBar } from "../components/ActiveCallBar"

export function CallsScreen() {
    const { client, has, addLog, auth, incoming } = useKasookoo()
    const [users, setUsers] = useState<UserRecord[]>([])
    const [busy, setBusy] = useState(false)
    const [search, setSearch] = useState("")
    const [role, setRole] = useState("")
    const canListUsers = has("user")

    const fetchUsers = useCallback(async () => {
        if (!client || !canListUsers) return
        setBusy(true)
        try {
            const res = await listUsers(client, { search: search.trim() || undefined, role: role || undefined, limit: 50 })
            setUsers(res.items)
            addLog(`getUsers → ${res.items.length} of ${res.pagination.total}`, "ok")
        } catch (err) {
            addLog(`getUsers failed ${describeError(err)}`, "err")
        } finally {
            setBusy(false)
        }
    }, [client, canListUsers, search, role, addLog])

    useEffect(() => {
        void fetchUsers()
        // Only on mount / role change — search is submitted explicitly.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [client, role])

    const call = async (target: UserRecord) => {
        if (!client || !auth) return
        const me = auth.user
        addLog(`initCall → ${fullName(target)}`)
        try {
            const placed = await placeCall(
                client,
                { id: me.id, name: fullName(me), email: me.email, phoneNumber: me.phone_number, role: me.role },
                { id: target.id, name: fullName(target), email: target.email, phoneNumber: target.phone_number, role: target.role }
            )
            placed.on("state", (state) => addLog(`call ${placed.roomName} → ${state}`, state === "connected" ? "ok" : "info"))
            placed.on("error", (err) => addLog(`call error ${describeError(err)}`, "err"))
        } catch (err) {
            addLog(`initCall failed ${describeError(err)}`, "err")
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <header>
                <h1 className="text-xl font-semibold">Calls</h1>
                <p className="text-sm text-foreground/60">
                    Place an in-app call to another user, and answer calls that arrive here.
                </p>
            </header>

            <ActiveCallBar />

            {incoming.length > 0 ? (
                <Panel title="Ringing" description="Delivered by push. Each declines itself after a minute.">
                    <div className="flex flex-col gap-2">
                        {incoming.map((call) => (
                            <div className="flex items-center gap-3 rounded-lg border border-border p-3" key={call.roomName}>
                                <div className="flex-1">
                                    <p className="text-sm font-medium">{call.remote.name}</p>
                                    <p className="text-xs text-foreground/50">incoming · {call.roomName}</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="teal" onClick={() => void answerCall(call)}>
                                        Answer
                                    </Button>
                                    <Button variant="danger" onClick={() => declineCall(call)}>
                                        Decline
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </Panel>
            ) : null}

            <Panel
                title="Contacts"
                description={
                    canListUsers
                        ? "Loaded with getUsers() — the same directory the Users screen manages."
                        : undefined
                }
                actions={
                    canListUsers ? (
                        <div className="flex flex-wrap gap-2">
                            <Input
                                placeholder="Search name or email"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && void fetchUsers()}
                            />
                            <select
                                className="rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/15"
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                            >
                                <option value="">All roles</option>
                                <option value="customer">Customers</option>
                                <option value="agent">Agents</option>
                                <option value="driver">Drivers</option>
                            </select>
                            <Button variant="secondary" onClick={() => void fetchUsers()} loading={busy}>
                                Search
                            </Button>
                        </div>
                    ) : undefined
                }
            >
                {!canListUsers ? (
                    <EmptyState
                        title="Contacts need the “user” capability"
                        hint="This session can place calls, but can't list the directory to pick someone. Enter a room and participants yourself, or provision the key with the user scope."
                    />
                ) : busy ? (
                    <Spinner label="Loading contacts…" />
                ) : users.length === 0 ? (
                    <EmptyState title="No users matched." />
                ) : (
                    <div className="flex flex-col gap-2">
                        {users.map((user) => (
                            <div className="flex items-center gap-3 rounded-lg border border-border p-3" key={user.id}>
                                <div className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-secondary text-sm font-semibold">
                                    {(user.first_name || user.email)[0]?.toUpperCase()}
                                </div>
                                <div className="flex-1">
                                    <p className="flex items-center gap-2 text-sm font-medium">
                                        {fullName(user)} <Badge>{user.role}</Badge>
                                    </p>
                                    <p className="text-xs text-foreground/50">{user.email}</p>
                                </div>
                                <Button variant="teal" onClick={() => void call(user)}>
                                    Call
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </Panel>
        </div>
    )
}
