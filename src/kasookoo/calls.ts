import type { Call, KasookooClient } from "kasookoo-sdk"


export interface CallParty {
    id: string
    name: string
    email: string
    phoneNumber: string | null
    role: string
}

export function placeCall(client: KasookooClient, caller: CallParty, callee: CallParty): Promise<Call> {
    return client.initCall({
        roomName: `room_${caller.id}_${callee.id}_${Date.now()}`,
        caller: { name: caller.name, email: caller.email, phoneNumber: caller.phoneNumber ?? "", type: caller.role },
        callee: { name: callee.name, email: callee.email, phoneNumber: callee.phoneNumber ?? "", type: callee.role },
    })
}

/** Places a call to an external phone number. Requires a call intent obtained beforehand — see `createCallIntent` in `../api`. */
export function placePhoneCall(
    client: KasookooClient,
    caller: { name: string },
    phoneNumber: string,
    intentId: string,
    clientSecret: string
): Promise<Call> {
    return client.initSipCall({
        phoneNumber,
        intentId,
        clientSecret,
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


export function getActiveCall(client: KasookooClient): Call | null {
    return client.activeCall
}
