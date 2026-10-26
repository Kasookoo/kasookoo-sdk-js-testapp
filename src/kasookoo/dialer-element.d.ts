import type { DetailedHTMLProps, HTMLAttributes } from "react"

declare module "react" {
    namespace JSX {
        interface IntrinsicElements {
            "kasookoo-dialer": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
                "fixed-number"?: string
                label?: string
                "confirm-before-call"?: string
                "show-call-icon-on-hover"?: string
            }
        }
    }
}
