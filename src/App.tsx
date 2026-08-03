import { AppShell } from "./components/AppShell"
import { ScopeGate, Spinner } from "./components/ui"
import { LoginScreen } from "./screens/LoginScreen"
import { ConnectScreen } from "./screens/ConnectScreen"
import { SessionScreen } from "./screens/SessionScreen"
import { CallsScreen } from "./screens/CallsScreen"
import { SipScreen } from "./screens/SipScreen"
import { MessagingScreen } from "./screens/MessagingScreen"
import { CdrScreen } from "./screens/CdrScreen"
import { UsersScreen } from "./screens/UsersScreen"
import { NumbersScreen } from "./screens/NumbersScreen"
import { SCREENS, type ScreenId } from "./screens/registry"
import { useKasookooStore } from "./store/kasookoo"

export default function App() {
    const auth = useKasookooStore.use.auth()
    const status = useKasookooStore.use.status()
    const isRestoring = useKasookooStore.use.isRestoring()
    const screen = useKasookooStore.use.screen()
    const navigate = useKasookooStore.use.navigate()

    if (!auth) return <LoginScreen />

    if (isRestoring) {
        return (
            <AppShell screen={screen} onNavigate={navigate}>
                <ScreenBody screen={screen} restoring />
            </AppShell>
        )
    }

    if (status !== "ready") return <ConnectScreen />

    return (
        <AppShell screen={screen} onNavigate={navigate}>
            <ScreenBody screen={screen} />
        </AppShell>
    )
}

function ScreenBody({ screen, restoring }: { screen: ScreenId; restoring?: boolean }) {
    const has = useKasookooStore.use.scopes()
    const hasScope = (scope: string) => has.includes(scope)
    const meta = SCREENS.find((item) => item.id === screen)

    if (restoring) {
        return (
            <div className="flex flex-col gap-6">
                <header>
                    <h1 className="text-xl font-semibold">{meta?.label ?? "Loading"}</h1>
                </header>
                <Spinner label="Restoring session…" />
            </div>
        )
    }

    // A locked screen never mounts its feature code — that's the point of gating.
    if (meta?.scope && !hasScope(meta.scope)) {
        return (
            <div className="flex flex-col gap-6">
                <header>
                    <h1 className="text-xl font-semibold">{meta.label}</h1>
                </header>
                <ScopeGate scope={meta.scope} has={hasScope}>
                    {null}
                </ScopeGate>
            </div>
        )
    }

    switch (screen) {
        case "calls":
            return <CallsScreen />
        case "sip":
            return <SipScreen />
        case "messaging":
            return <MessagingScreen />
        case "cdr":
            return <CdrScreen />
        case "users":
            return <UsersScreen />
        case "numbers":
            return <NumbersScreen />
        case "session":
        default:
            return <SessionScreen />
    }
}
