import { useKasookoo } from "../store/kasookoo"
import { Button, Field, Input } from "../components/ui"
import { fullName } from "../lib/format"

/** Collects the publishable key and calls `init()`. Shown until the SDK is ready. */
export function ConnectScreen() {
    const {
        auth,
        publishableKey,
        setPublishableKey,
        useCustomWindow,
        setUseCustomWindow,
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
