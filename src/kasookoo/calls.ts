import type { Call, KasookooClient } from "@reverse-engineer/kasookoo-sdk"

/** The fields an in-app call needs to know about each side. */
export interface CallParty {
    id: string
    name: string
    email: string
    phoneNumber: string | null
    role: string
}

/** Places an in-app call from `caller` to `callee`. */
export function placeCall(client: KasookooClient, caller: CallParty, callee: CallParty): Promise<Call> {
    return client.initCall({
        roomName: `room_${caller.id}_${callee.id}_${Date.now()}`,
        caller: { name: caller.name, email: caller.email, phoneNumber: caller.phoneNumber ?? "", type: caller.role },
        callee: { name: callee.name, email: callee.email, phoneNumber: callee.phoneNumber ?? "", type: callee.role },
    })
}

/** Places a call to an external phone number. */
export function placePhoneCall(
    client: KasookooClient,
    caller: { id: string; name: string },
    phoneNumber: string
): Promise<Call> {
    return client.initSipCall({
        phoneNumber,
        roomName: `sip_${caller.id}_${Date.now()}`,
        participantName: caller.name,
    })
}

export function answerCall(call: Call): Promise<void> {
    return call.accept()
}

export function declineCall(call: Call): void {
    call.reject()
}

export function endCall(call: Call): Promise<void> {
    return call.end()
}

export function setCallMuted(call: Call, muted: boolean): Promise<void> {
    return call.setMuted(muted)
}

/** The call currently connecting/connected, if any — the SDK allows only one. */
export function getActiveCall(client: KasookooClient): Call | null {
    return client.activeCall
}
