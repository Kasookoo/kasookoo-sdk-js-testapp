import { useState } from "react"
import { login } from "../api"
import { useKasookoo } from "../store/kasookoo"
import { Button, Field, Input } from "../components/ui"
import { describeError } from "../lib/format"

/**
 * Signs the tester in against the bot backend. This is the one thing the SDK
 * can't do — it takes an already-known end user (`subject`), so verifying
 * credentials stays the host app's job.
 */
export function LoginScreen() {
    const { signIn } = useKasookoo()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState("")

    const submit = async () => {
        if (!email.trim() || !password) return
        setBusy(true)
        setError("")
        try {
            signIn(await login(email.trim(), password))
        } catch (err) {
            setError(describeError(err))
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-border bg-surface p-6">
                <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-lg bg-accent font-bold text-accent-foreground">
                        K
                    </span>
                    <div>
                        <h1 className="text-lg font-semibold">Kasookoo SDK</h1>
                        <p className="text-xs text-foreground/50">test harness</p>
                    </div>
                </div>

                <p className="text-sm text-foreground/60">
                    Sign in as the end user you want to test as. Their email becomes the SDK's <code>subject</code>.
                </p>

                <Field label="Email">
                    <Input
                        type="email"
                        value={email}
                        autoComplete="username"
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && void submit()}
                    />
                </Field>
                <Field label="Password">
                    <Input
                        type="password"
                        value={password}
                        autoComplete="current-password"
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && void submit()}
                    />
                </Field>

                {error ? <p className="text-sm text-danger">{error}</p> : null}

                <Button onClick={() => void submit()} loading={busy} disabled={!email.trim() || !password}>
                    {busy ? "Signing in…" : "Sign in"}
                </Button>
            </div>
        </div>
    )
}
