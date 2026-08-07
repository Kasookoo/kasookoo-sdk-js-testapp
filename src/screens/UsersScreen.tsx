import { useCallback, useEffect, useState } from "react"
import type { UserRecord } from "kasookoo-sdk"
import { useKasookoo } from "../store/kasookoo"
import { createUser, deleteUser, getUser, listUsers, updateUser } from "../kasookoo"
import { Badge, Button, EmptyState, Field, Input, Pagination, Panel, Spinner } from "../components/ui"
import { describeError, fullName } from "../lib/format"

const LIMIT = 10
const th = "px-3 py-2 text-left text-xs font-medium text-foreground/50"
const td = "px-3 py-2 text-sm"

const emptyForm = {
    email: "",
    firstName: "",
    lastName: "",
    password: "",
    role: "",
    phoneNumber: "",
    callerId: "",
}

export function UsersScreen() {
    const { client, addLog } = useKasookoo()
    const [users, setUsers] = useState<UserRecord[]>([])
    const [total, setTotal] = useState(0)
    const [skip, setSkip] = useState(0)
    const [search, setSearch] = useState("")
    const [role, setRole] = useState("")
    const [busy, setBusy] = useState(false)

    const [form, setForm] = useState(emptyForm)
    const [saving, setSaving] = useState(false)
    const [editing, setEditing] = useState<UserRecord | null>(null)
    const [inspected, setInspected] = useState<UserRecord | null>(null)

    const fetchPage = useCallback(
        async (nextSkip: number) => {
            if (!client) return
            setBusy(true)
            try {
                const res = await listUsers(client, {
                    search: search.trim() || undefined,
                    role: role || undefined,
                    skip: nextSkip,
                    limit: LIMIT,
                })
                setUsers(res.items)
                setTotal(res.pagination.total)
                setSkip(nextSkip)
                addLog(`getUsers → ${res.items.length} of ${res.pagination.total}`, "ok")
            } catch (err) {
                addLog(`getUsers failed ${describeError(err)}`, "err")
            } finally {
                setBusy(false)
            }
        },
        [client, search, role, addLog]
    )

    useEffect(() => {
        void fetchPage(0)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [client, role])

    const create = async () => {
        if (!client) return
        setSaving(true)
        try {
            const created = await createUser(client, {
                email: form.email.trim(),
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
                password: form.password,
                role: form.role.trim() || undefined,
                phoneNumber: form.phoneNumber.trim() || undefined,
                callerId: form.callerId.trim() || undefined,
            })
            addLog(`createUser → ${created.id}`, "ok")
            setForm(emptyForm)
            await fetchPage(0)
        } catch (err) {
            addLog(`createUser failed ${describeError(err)}`, "err")
        } finally {
            setSaving(false)
        }
    }

    const update = async () => {
        if (!client || !editing) return
        setSaving(true)
        try {
            await updateUser(client, editing.id, {
                email: form.email.trim(),
                phoneNumber: form.phoneNumber.trim(),
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
                role: form.role.trim(),
                callerId: form.callerId.trim() || undefined,
            })
            addLog(`updateUser → ${editing.id}`, "ok")
            setEditing(null)
            setForm(emptyForm)
            await fetchPage(skip)
        } catch (err) {
            addLog(`updateUser failed ${describeError(err)}`, "err")
        } finally {
            setSaving(false)
        }
    }

    const remove = async (user: UserRecord) => {
        if (!client) return
        if (!confirm(`Delete ${fullName(user)}? This can't be undone.`)) return
        try {
            await deleteUser(client, user.id)
            addLog(`deleteUser → ${user.id}`, "ok")
            if (inspected?.id === user.id) setInspected(null)
            await fetchPage(skip)
        } catch (err) {
            addLog(`deleteUser failed ${describeError(err)}`, "err")
        }
    }

    const inspect = async (user: UserRecord) => {
        if (!client) return
        try {
            const fetched = await getUser(client, user.id)
            setInspected(fetched)
            addLog(`getUser → ${fetched.id}`, "ok")
        } catch (err) {
            addLog(`getUser failed ${describeError(err)}`, "err")
        }
    }

    const startEdit = (user: UserRecord) => {
        setEditing(user)
        setInspected(null)
        setForm({
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            password: "",
            role: user.role,
            phoneNumber: user.phone_number ?? "",
            callerId: user.caller_id ?? "",
        })
    }

    const cancelEdit = () => {
        setEditing(null)
        setForm(emptyForm)
    }

    const createReady = form.email.trim() && form.firstName.trim() && form.lastName.trim() && form.password
    const updateReady =
        form.email.trim() && form.firstName.trim() && form.lastName.trim() && form.phoneNumber.trim() && form.role.trim()

    return (
        <div className="flex flex-col gap-6">
            <header>
                <h1 className="text-xl font-semibold">Users</h1>
                <p className="text-sm text-foreground/60">The directory this organization's calls and messages are addressed to.</p>
            </header>

            <Panel
                title="Directory"
                actions={
                    <div className="flex flex-wrap gap-2">
                        <Input
                            placeholder="Search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && void fetchPage(0)}
                        />
                        <select
                            className="rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/15"
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                        >
                            <option value="">All roles</option>
                            <option value="customer">customer</option>
                            <option value="agent">agent</option>
                            <option value="driver">driver</option>
                        </select>
                        <Button variant="secondary" onClick={() => void fetchPage(0)} loading={busy}>
                            Search
                        </Button>
                    </div>
                }
            >
                {busy ? (
                    <Spinner label="Loading users…" />
                ) : users.length === 0 ? (
                    <EmptyState title="No users matched." />
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className={th}>Name</th>
                                        <th className={th}>Email</th>
                                        <th className={th}>Role</th>
                                        <th className={th}>Phone</th>
                                        <th className={th} />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {users.map((user) => (
                                        <tr key={user.id}>
                                            <td className={td}>{fullName(user)}</td>
                                            <td className={`${td} text-foreground/50`}>{user.email}</td>
                                            <td className={td}>
                                                <Badge>{user.role}</Badge>
                                            </td>
                                            <td className={`${td} text-foreground/50`}>{user.phone_number ?? "—"}</td>
                                            <td className={td}>
                                                <div className="flex gap-2">
                                                    <Button variant="ghost" onClick={() => void inspect(user)}>
                                                        View
                                                    </Button>
                                                    <Button variant="ghost" onClick={() => startEdit(user)}>
                                                        Edit
                                                    </Button>
                                                    <Button variant="ghost" onClick={() => void remove(user)}>
                                                        Delete
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pagination skip={skip} limit={LIMIT} total={total} busy={busy} onPage={(next) => void fetchPage(next)} />
                    </>
                )}
            </Panel>

            {inspected ? (
                <Panel
                    title={`getUser(${inspected.id})`}
                    description="Fetched individually — the same shape create and update return."
                    actions={
                        <Button variant="ghost" onClick={() => setInspected(null)}>
                            Close
                        </Button>
                    }
                >
                    <pre className="overflow-x-auto rounded-lg bg-surface-secondary p-3 text-xs">
                        {JSON.stringify(inspected, null, 2)}
                    </pre>
                </Panel>
            ) : null}

            <Panel
                title={editing ? `Edit ${fullName(editing)}` : "Create a user"}
                description={
                    editing
                        ? "Update expects the full set of fields — it isn't a partial update."
                        : "Only email, first name, last name and password are required."
                }
                actions={
                    editing ? (
                        <Button variant="ghost" onClick={cancelEdit}>
                            Cancel
                        </Button>
                    ) : undefined
                }
            >
                <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Email *">
                        <Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                    </Field>
                    <Field label="First name *">
                        <Input value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
                    </Field>
                    <Field label="Last name *">
                        <Input value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
                    </Field>
                    {!editing ? (
                        <Field label="Password *">
                            <Input
                                type="password"
                                value={form.password}
                                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                            />
                        </Field>
                    ) : null}
                    <Field label={editing ? "Role *" : "Role"} hint={editing ? undefined : "defaults to customer"}>
                        <Input
                            value={form.role}
                            placeholder="customer"
                            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                        />
                    </Field>
                    <Field label={editing ? "Phone *" : "Phone"}>
                        <Input value={form.phoneNumber} onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))} />
                    </Field>
                    <Field label="Caller ID">
                        <Input value={form.callerId} onChange={(e) => setForm((f) => ({ ...f, callerId: e.target.value }))} />
                    </Field>
                </div>

                <Button
                    variant="teal"
                    onClick={() => void (editing ? update() : create())}
                    loading={saving}
                    disabled={editing ? !updateReady : !createReady}
                >
                    {editing ? "Save changes" : "Create user"}
                </Button>
            </Panel>
        </div>
    )
}
