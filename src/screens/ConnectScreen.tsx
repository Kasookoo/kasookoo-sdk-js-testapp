import type { LogLevel } from "kasookoo-sdk"
import { useKasookoo } from "../store/kasookoo"
import { Button, Field, Input } from "../components/ui"
import { fullName } from "../lib/format"

const LOG_LEVELS: LogLevel[] = ["debug", "info", "warn", "error"]

/** Collects the publishable key and calls `init()`. Shown until the SDK is ready. */
export function ConnectScreen() {
    const {
        auth,
        publishableKey,
        setPublishableKey,
        useCustomWindow,
        setUseCustomWindow,
        loggingEnabled,
        setLoggingEnabled,
        loggingLevels,
        setLoggingLevels,
        telemetryEnabled,
        setTelemetryEnabled,
        telemetryEndpoint,
        setTelemetryEndpoint,
        connect,
        status,
        error,
        signOut,
    } = useKasookoo()

    const connecting = status === "connecting"

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-border bg-surface p-6">
                <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-lg bg-accent font-bold text-accent-foreground">
                        K
                    </span>
                    <div>
                        <h1 className="text-lg font-semibold">Initialize the SDK</h1>
                        <p className="text-xs text-foreground/50">signed in as {fullName(auth?.user)}</p>
                    </div>
                </div>

                <p className="text-sm text-foreground/60">
                    <code>init()</code> asks for microphone, location and notification permissions, establishes a
                    session, and registers this browser for calls and messages. It stays connected across reloads
                    for the rest of this tab's session.
                </p>

                <Field label="Publishable key" hint="Stored for this tab only — you won't be asked again after a reload.">
                    <Input
                        value={publishableKey}
                        placeholder="pk_..."
                        onChange={(e) => setPublishableKey(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && publishableKey.trim() && void connect()}
                    />
                </Field>

                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={useCustomWindow}
                        onChange={(e) => setUseCustomWindow(e.target.checked)}
                    />
                    <span>
                        Use the custom call window
                        <span className="block text-xs text-foreground/50">the dark example in src/customCallWindow.ts</span>
                    </span>
                </label>

                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={loggingEnabled}
                        onChange={(e) => setLoggingEnabled(e.target.checked)}
                    />
                    <span>
                        Structured console logging
                        <span className="block text-xs text-foreground/50">
                            LiveKit-style JSON logs to the browser console — on by default
                        </span>
                    </span>
                </label>

                {loggingEnabled ? (
                    <Field
                        label="Log level(s)"
                        hint='Exact set, not a minimum — e.g. picking only "error" hides "warn" too. Defaults to info + warn + error.'
                    >
                        <div className="flex flex-wrap gap-3">
                            {LOG_LEVELS.map((level) => (
                                <label key={level} className="flex items-center gap-1.5 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={loggingLevels.includes(level)}
                                        onChange={(e) =>
                                            setLoggingLevels(
                                                e.target.checked
                                                    ? [...loggingLevels, level]
                                                    : loggingLevels.filter((l) => l !== level)
                                            )
                                        }
                                    />
                                    <span className="capitalize">{level}</span>
                                </label>
                            ))}
                        </div>
                    </Field>
                ) : null}

                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={telemetryEnabled}
                        onChange={(e) => setTelemetryEnabled(e.target.checked)}
                    />
                    <span>
                        OpenTelemetry trace export
                        <span className="block text-xs text-foreground/50">
                            requires the @opentelemetry/* peer packages — see the SDK README
                        </span>
                    </span>
                </label>

                {telemetryEnabled ? (
                    <Field
                        label="OTLP traces endpoint"
                        hint="Optional — leave blank to use the SDK's default dev/test collector."
                    >
                        <Input
                            value={telemetryEndpoint}
                            placeholder="https://monitoring-test.kasookoo.ai/v1/traces"
                            onChange={(e) => setTelemetryEndpoint(e.target.value)}
                        />
                    </Field>
                ) : null}

                {!loggingEnabled && telemetryEnabled ? (
                    <p className="rounded-lg border border-accent/30 bg-accent/10 p-2 text-xs text-foreground/70">
                        Console logging is off, but OTel export stays on — the two are independent switches. Every
                        log line (all levels) still reaches your OTLP collector; only the browser console is quiet.
                    </p>
                ) : null}

                {error ? <p className="text-sm text-danger">{error}</p> : null}

                <Button onClick={() => void connect()} loading={connecting} disabled={!publishableKey.trim()}>
                    {connecting ? "Initializing…" : "Initialize SDK"}
                </Button>

                <button className="text-xs text-foreground/50 underline" onClick={signOut}>
                    Sign out
                </button>
            </div>
        </div>
    )
}
