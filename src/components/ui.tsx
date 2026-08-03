import type { InputHTMLAttributes, ReactNode } from "react"
import { Button as HButton, Card, Chip, EmptyState as HEmptyState, Spinner as HSpinner } from "@heroui/react"

type Variant = "primary" | "secondary" | "teal" | "danger" | "ghost"

const VARIANT_MAP: Record<Variant, "primary" | "secondary" | "danger" | "ghost"> = {
    primary: "primary",
    secondary: "secondary",
    teal: "primary",
    danger: "danger",
    ghost: "ghost",
}

export function Button({
    variant = "primary",
    loading = false,
    disabled,
    children,
    className = "",
    onClick,
}: {
    variant?: Variant
    loading?: boolean
    disabled?: boolean
    children?: ReactNode
    className?: string
    onClick?: () => void
}) {
    return (
        <HButton variant={VARIANT_MAP[variant]} isDisabled={disabled || loading} onPress={onClick} className={className}>
            {loading ? <HSpinner size="sm" /> : null}
            {children}
        </HButton>
    )
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
    return (
        <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground/80">{label}</span>
            {children}
            {hint ? <span className="text-xs text-foreground/50">{hint}</span> : null}
        </label>
    )
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            {...props}
            className="w-full rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
        />
    )
}

export function Panel({
    title,
    description,
    actions,
    children,
}: {
    title?: string
    description?: string
    actions?: ReactNode
    children: ReactNode
}) {
    return (
        <Card className="flex flex-col gap-4 p-5">
            {title ? (
                <header className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h2 className="text-base font-semibold">{title}</h2>
                        {description ? <p className="text-sm text-foreground/60">{description}</p> : null}
                    </div>
                    {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
                </header>
            ) : null}
            {children}
        </Card>
    )
}

const TONE_MAP = { neutral: "default", ok: "success", err: "danger", warn: "warning", accent: "accent" } as const

export function Badge({
    children,
    tone = "neutral",
}: {
    children: ReactNode
    tone?: "neutral" | "ok" | "err" | "warn" | "accent"
}) {
    return (
        <Chip color={TONE_MAP[tone]} size="sm" variant="soft">
            {children}
        </Chip>
    )
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
    return (
        <HEmptyState className="gap-1 py-8 text-center">
            <p className="text-sm font-medium">{title}</p>
            {hint ? <p className="text-xs text-foreground/50">{hint}</p> : null}
        </HEmptyState>
    )
}

export function Spinner({ label }: { label?: string }) {
    return (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-foreground/60">
            <HSpinner size="md" />
            {label ? <span>{label}</span> : null}
        </div>
    )
}

export function Pagination({
    skip,
    limit,
    total,
    busy,
    onPage,
}: {
    skip: number
    limit: number
    total: number
    busy?: boolean
    onPage: (skip: number) => void
}) {
    const from = total === 0 ? 0 : skip + 1
    const to = Math.min(skip + limit, total)
    return (
        <div className="flex items-center justify-between gap-3 pt-2">
            <span className="text-xs text-foreground/60">{total > 0 ? `${from}–${to} of ${total}` : "No results"}</span>
            <div className="flex gap-2">
                <Button variant="secondary" disabled={busy || skip === 0} onClick={() => onPage(Math.max(0, skip - limit))}>
                    Previous
                </Button>
                <Button variant="secondary" disabled={busy || skip + limit >= total} onClick={() => onPage(skip + limit)}>
                    Next
                </Button>
            </div>
        </div>
    )
}

/** Renders children only when the session holds `scope`, else explains why not. */
export function ScopeGate({
    scope,
    has,
    children,
}: {
    scope: string
    has: (scope: string) => boolean
    children: ReactNode
}) {
    if (has(scope)) return <>{children}</>
    return (
        <Panel title="Capability not granted">
            <EmptyState
                title={`This session doesn't have the "${scope}" capability.`}
                hint="The SDK gates each feature on its capability — calling these methods would throw. Provision the key with this scope to try it."
            />
        </Panel>
    )
}
