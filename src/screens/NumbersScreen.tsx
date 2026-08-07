import { useCallback, useEffect, useState } from "react"
import type { AssociatedNumber, AssociatedNumberType } from "kasookoo-sdk"
import { useKasookoo } from "../store/kasookoo"
import {
    createAssociatedNumber,
    deleteAssociatedNumber,
    listAssociatedNumbers,
    updateAssociatedNumber,
} from "../kasookoo"
import { Badge, Button, EmptyState, Field, Input, Pagination, Panel, Spinner } from "../components/ui"
import { describeError } from "../lib/format"

const LIMIT = 20
const th = "px-3 py-2 text-left text-xs font-medium text-foreground/50"
const td = "px-3 py-2 text-sm"

const emptyForm = {
    associatedNumber: "",
    userId: "",
    numberType: "PSTN" as AssociatedNumberType,
    label: "",
    whatsappNumberId: "",
    country: "",
    city: "",
    prefix: "",
    isTollFree: false,
    isEnable: true,
    isPrimary: false,
}

export function NumbersScreen() {
    const { client, addLog, auth } = useKasookoo()
    const [numbers, setNumbers] = useState<AssociatedNumber[]>([])
    const [total, setTotal] = useState(0)
    const [skip, setSkip] = useState(0)
    const [filter, setFilter] = useState<"" | AssociatedNumberType>("")
    const [busy, setBusy] = useState(false)

    const [form, setForm] = useState(emptyForm)
    const [saving, setSaving] = useState(false)
    const [editing, setEditing] = useState<AssociatedNumber | null>(null)

    const fetchPage = useCallback(
        async (nextSkip: number) => {
            if (!client) return
            setBusy(true)
            try {
                const res = await listAssociatedNumbers(client, { numberType: filter || undefined, skip: nextSkip, limit: LIMIT })
                setNumbers(res.items)
                setTotal(res.pagination.total)
                setSkip(nextSkip)
                addLog(`getAssociatedNumbers → ${res.items.length} of ${res.pagination.total}`, "ok")
            } catch (err) {
                addLog(`getAssociatedNumbers failed ${describeError(err)}`, "err")
            } finally {
                setBusy(false)
            }
        },
        [client, filter, addLog]
    )

    useEffect(() => {
        void fetchPage(0)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [client, filter])

    const create = async () => {
        if (!client) return
        setSaving(true)
        try {
            const created = await createAssociatedNumber(client, {
                associatedNumber: form.associatedNumber.trim(),
                userId: form.userId.trim(),
                numberType: form.numberType,
                label: form.label.trim(),
                // Required for WHATSAPP, and rejected outright for PSTN — so only
                // ever send it for the WhatsApp case.
                ...(form.numberType === "WHATSAPP" ? { whatsappNumberId: form.whatsappNumberId.trim() } : {}),
                ...(form.country.trim() ? { country: form.country.trim() } : {}),
                ...(form.city.trim() ? { city: form.city.trim() } : {}),
                ...(form.prefix.trim() ? { prefix: form.prefix.trim() } : {}),
                isTollFree: form.isTollFree,
                isEnable: form.isEnable,
                isPrimary: form.isPrimary,
            })
            addLog(`createAssociatedNumber → ${created.id}`, "ok")
            setForm({ ...emptyForm, userId: form.userId })
            await fetchPage(0)
        } catch (err) {
            addLog(`createAssociatedNumber failed ${describeError(err)}`, "err")
        } finally {
            setSaving(false)
        }
    }

    const update = async () => {
        if (!client || !editing) return
        setSaving(true)
        try {
            await updateAssociatedNumber(client, editing, form)
            addLog(`updateAssociatedNumber → ${editing.id}`, "ok")
            cancelEdit()
            await fetchPage(skip)
        } catch (err) {
            addLog(`updateAssociatedNumber failed ${describeError(err)}`, "err")
        } finally {
            setSaving(false)
        }
    }

    const remove = async (number: AssociatedNumber) => {
        if (!client) return
        if (!confirm(`Delete ${number.associated_number ?? number.id}?`)) return
        try {
            await deleteAssociatedNumber(client, number.id)
            addLog(`deleteAssociatedNumber → ${number.id}`, "ok")
            await fetchPage(skip)
        } catch (err) {
            addLog(`deleteAssociatedNumber failed ${describeError(err)}`, "err")
        }
    }

    const startEdit = (number: AssociatedNumber) => {
        setEditing(number)
        setForm({
            associatedNumber: number.associated_number ?? "",
            userId: number.user_id ?? "",
            numberType: number.number_type,
            label: number.label ?? "",
            whatsappNumberId: number.whatsapp_number_id ?? "",
            country: number.country ?? "",
            city: number.city ?? "",
            prefix: number.prefix ?? "",
            isTollFree: number.is_toll_free,
            isEnable: number.is_enable,
            isPrimary: number.is_primary,
        })
    }

    const cancelEdit = () => {
        setEditing(null)
        setForm(emptyForm)
    }

    const createReady =
        form.associatedNumber.trim() &&
        form.userId.trim() &&
        form.label.trim() &&
        (form.numberType === "PSTN" || form.whatsappNumberId.trim())

    return (
        <div className="flex flex-col gap-6">
            <header>
                <h1 className="text-xl font-semibold">Numbers</h1>
                <p className="text-sm text-foreground/60">
                    The PSTN and WhatsApp numbers a user can send from. A <code>WHATSAPP</code> number here is a
                    prerequisite for sending WhatsApp messages — its id is the <code>associatedNumberId</code>.
                </p>
            </header>

            <Panel
                title="Numbers"
                actions={
                    <div className="flex gap-2">
                        <select
                            className="rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/15"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value as "" | AssociatedNumberType)}
                        >
                            <option value="">All types</option>
                            <option value="PSTN">PSTN</option>
                            <option value="WHATSAPP">WHATSAPP</option>
                        </select>
                        <Button variant="secondary" onClick={() => void fetchPage(0)} loading={busy}>
                            Reload
                        </Button>
                    </div>
                }
            >
                {busy ? (
                    <Spinner label="Loading numbers…" />
                ) : numbers.length === 0 ? (
                    <EmptyState title="No numbers yet." hint="Create one below to send from it." />
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className={th}>Number</th>
                                        <th className={th}>Type</th>
                                        <th className={th}>Label</th>
                                        <th className={th}>WhatsApp id</th>
                                        <th className={th}>Flags</th>
                                        <th className={th} />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {numbers.map((number) => (
                                        <tr key={number.id}>
                                            <td className={td}>{number.associated_number ?? "—"}</td>
                                            <td className={td}>
                                                <Badge tone={number.number_type === "WHATSAPP" ? "accent" : "neutral"}>
                                                    {number.number_type}
                                                </Badge>
                                            </td>
                                            <td className={`${td} text-foreground/50`}>{number.label || "—"}</td>
                                            <td className={`${td} text-foreground/50`}>
                                                <code>{number.whatsapp_number_id ?? "—"}</code>
                                            </td>
                                            <td className={td}>
                                                <div className="flex gap-1">
                                                    {number.is_primary ? <Badge tone="accent">primary</Badge> : null}
                                                    {number.is_enable ? (
                                                        <Badge tone="ok">enabled</Badge>
                                                    ) : (
                                                        <Badge tone="err">disabled</Badge>
                                                    )}
                                                </div>
                                            </td>
                                            <td className={td}>
                                                <div className="flex gap-2">
                                                    <Button variant="ghost" onClick={() => startEdit(number)}>
                                                        Edit
                                                    </Button>
                                                    <Button variant="ghost" onClick={() => void remove(number)}>
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

            <Panel
                title={editing ? `Edit ${editing.associated_number ?? editing.id}` : "Add a number"}
                description={
                    editing
                        ? "Only the fields you change are sent. Switching the type converts the number."
                        : "Number, user, type and label are required. WhatsApp numbers also need their WhatsApp Business id."
                }
                actions={
                    editing ? (
                        <Button variant="ghost" onClick={cancelEdit}>
                            Cancel
                        </Button>
                    ) : undefined
                }
            >
                <div className="flex w-fit gap-1 rounded-lg bg-surface-secondary p-1">
                    {(["PSTN", "WHATSAPP"] as const).map((option) => (
                        <button
                            key={option}
                            className={`rounded-md px-3 py-1 text-sm ${
                                form.numberType === option ? "bg-accent text-accent-foreground" : ""
                            }`}
                            onClick={() => setForm((f) => ({ ...f, numberType: option }))}
                        >
                            {option}
                        </button>
                    ))}
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Number *" hint="E.164, e.g. +15551234567">
                        <Input
                            value={form.associatedNumber}
                            onChange={(e) => setForm((f) => ({ ...f, associatedNumber: e.target.value }))}
                        />
                    </Field>
                    {!editing ? (
                        <Field label="User id *" hint={auth ? `yours: ${auth.user.id}` : undefined}>
                            <Input value={form.userId} onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))} />
                        </Field>
                    ) : null}
                    <Field label="Label *">
                        <Input
                            value={form.label}
                            placeholder="Support line"
                            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                        />
                    </Field>
                    {form.numberType === "WHATSAPP" ? (
                        <Field label="WhatsApp number id *" hint="From your WhatsApp Business setup.">
                            <Input
                                value={form.whatsappNumberId}
                                onChange={(e) => setForm((f) => ({ ...f, whatsappNumberId: e.target.value }))}
                            />
                        </Field>
                    ) : null}
                    <Field label="Country">
                        <Input value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} />
                    </Field>
                    <Field label="City">
                        <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
                    </Field>
                    <Field label="Prefix">
                        <Input
                            value={form.prefix}
                            placeholder="+1"
                            onChange={(e) => setForm((f) => ({ ...f, prefix: e.target.value }))}
                        />
                    </Field>
                </div>

                <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={form.isEnable}
                            onChange={(e) => setForm((f) => ({ ...f, isEnable: e.target.checked }))}
                        />
                        <span>Enabled</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={form.isPrimary}
                            onChange={(e) => setForm((f) => ({ ...f, isPrimary: e.target.checked }))}
                        />
                        <span>Primary</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={form.isTollFree}
                            onChange={(e) => setForm((f) => ({ ...f, isTollFree: e.target.checked }))}
                        />
                        <span>Toll-free</span>
                    </label>
                </div>

                <Button
                    variant="teal"
                    onClick={() => void (editing ? update() : create())}
                    loading={saving}
                    disabled={!editing && !createReady}
                >
                    {editing ? "Save changes" : "Create number"}
                </Button>
            </Panel>
        </div>
    )
}
