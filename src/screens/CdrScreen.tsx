import { useCallback, useEffect, useState } from "react"
import type { CdrEntry } from "@reverse-engineer/kasookoo-sdk"
import { useKasookoo } from "../store/kasookoo"
import { downloadCdr as downloadCdrFile, listCdr } from "../kasookoo"
import { Badge, Button, EmptyState, Field, Input, Pagination, Panel, Spinner } from "../components/ui"
import { describeError, formatDateTime, formatDuration } from "../lib/format"

const LIMIT = 10
const th = "px-3 py-2 text-left text-xs font-medium text-foreground/50"
const td = "px-3 py-2 text-sm"

export function CdrScreen() {
    const { client, addLog } = useKasookoo()
    const [entries, setEntries] = useState<CdrEntry[]>([])
    const [total, setTotal] = useState(0)
    const [skip, setSkip] = useState(0)
    const [search, setSearch] = useState("")
    const [busy, setBusy] = useState(false)
    const [maxRows, setMaxRows] = useState("1000")
    const [downloading, setDownloading] = useState(false)

    const fetchPage = useCallback(
        async (nextSkip: number) => {
            if (!client) return
            setBusy(true)
            try {
                const res = await listCdr(client, { search: search.trim() || undefined, skip: nextSkip, limit: LIMIT })
                setEntries(res.items)
                setTotal(res.pagination.total)
                setSkip(nextSkip)
                addLog(`getCdr → ${res.items.length} of ${res.pagination.total}`, "ok")
            } catch (err) {
                addLog(`getCdr failed ${describeError(err)}`, "err")
            } finally {
                setBusy(false)
            }
        },
        [client, search, addLog]
    )

    useEffect(() => {
        void fetchPage(0)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [client])

    const download = async () => {
        if (!client) return
        setDownloading(true)
        addLog("downloadCdr() …")
        try {
            const parsed = Number(maxRows)
            await downloadCdrFile(client, Number.isFinite(parsed) && parsed > 0 ? { maxRows: parsed } : undefined)
            addLog("downloadCdr → file saved", "ok")
        } catch (err) {
            addLog(`downloadCdr failed ${describeError(err)}`, "err")
        } finally {
            setDownloading(false)
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <header>
                <h1 className="text-xl font-semibold">Call records</h1>
                <p className="text-sm text-foreground/60">Read-only history. Nothing is cached — every search re-fetches.</p>
            </header>

            <Panel
                title="Search"
                actions={
                    <div className="flex gap-2">
                        <Input
                            placeholder="Name, number, email…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && void fetchPage(0)}
                        />
                        <Button variant="secondary" onClick={() => void fetchPage(0)} loading={busy}>
                            Search
                        </Button>
                    </div>
                }
            >
                {busy ? (
                    <Spinner label="Loading records…" />
                ) : entries.length === 0 ? (
                    <EmptyState title="No records found." />
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className={th}>Caller</th>
                                        <th className={th}>Callee</th>
                                        <th className={th}>Direction</th>
                                        <th className={th}>Status</th>
                                        <th className={th}>Duration</th>
                                        <th className={th}>Started</th>
                                        <th className={th} />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {entries.map((entry) => (
                                        <tr key={entry.id}>
                                            <td className={td}>{entry.caller?.name ?? "—"}</td>
                                            <td className={td}>{entry.callee?.name ?? "—"}</td>
                                            <td className={td}>{entry.direction ?? "—"}</td>
                                            <td className={td}>
                                                <Badge tone={entry.status === "ended" ? "neutral" : "warn"}>{entry.status}</Badge>
                                            </td>
                                            <td className={td}>{formatDuration(entry.duration_seconds)}</td>
                                            <td className={`${td} text-foreground/50`}>{formatDateTime(entry.started_at)}</td>
                                            <td className={td}>
                                                {entry.recording_download_url ? (
                                                    <a
                                                        className="text-accent underline"
                                                        href={entry.recording_download_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                    >
                                                        Recording
                                                    </a>
                                                ) : null}
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
                title="Export"
                description="Fetches the file with your session's auth and hands it to the browser's downloads."
            >
                <div className="flex items-end gap-3">
                    <Field label="Max rows" hint="Optional — a platform default applies if left blank.">
                        <Input value={maxRows} onChange={(e) => setMaxRows(e.target.value)} inputMode="numeric" />
                    </Field>
                    <Button variant="teal" onClick={() => void download()} loading={downloading}>
                        Download export
                    </Button>
                </div>
            </Panel>
        </div>
    )
}
