import { useCallback, useEffect, useState } from "react"
import type { ChatMessage, Conversation } from "@reverse-engineer/kasookoo-sdk"
import { useKasookoo } from "../store/kasookoo"
import * as kasookoo from "../kasookoo"
import { Badge, Button, EmptyState, Field, Input, Panel, Spinner } from "../components/ui"
import { describeError, formatTime, parseLocation } from "../lib/format"

const PAGE = 30

export function MessagingScreen() {
    const { client, addLog, auth } = useKasookoo()

    const [conversations, setConversations] = useState<Conversation[]>([])
    const [convBusy, setConvBusy] = useState(false)
    const [unread, setUnread] = useState<number | null>(null)

    const [selected, setSelected] = useState<Conversation | null>(null)
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [msgBusy, setMsgBusy] = useState(false)
    const [draft, setDraft] = useState("")
    const [sending, setSending] = useState(false)
    const [convUnread, setConvUnread] = useState<number | null>(null)

    const [composeOpen, setComposeOpen] = useState(false)

    const loadUnread = useCallback(async () => {
        if (!client) return
        try {
            const res = await kasookoo.loadUnreadCount(client)
            setUnread(res.unread_count)
        } catch (err) {
            addLog(`getUnreadCount failed ${describeError(err)}`, "err")
        }
    }, [client, addLog])

    const loadConversations = useCallback(async () => {
        if (!client) return
        setConvBusy(true)
        try {
            const res = await kasookoo.loadConversations(client, 50)
            setConversations(res.items)
            addLog(`getConversations → ${res.items.length} of ${res.pagination.total}`, "ok")
        } catch (err) {
            addLog(`getConversations failed ${describeError(err)}`, "err")
        } finally {
            setConvBusy(false)
        }
    }, [client, addLog])

    useEffect(() => {
        void loadConversations()
        void loadUnread()
    }, [loadConversations, loadUnread])

    const openConversation = async (conv: Conversation) => {
        if (!client) return
        setSelected(conv)
        setMessages([])
        setConvUnread(null)
        setMsgBusy(true)
        try {
            const res = await kasookoo.loadMessages(client, conv.conversation_id, PAGE)
            setMessages(res.items)
            addLog(`getMessages → ${res.items.length} of ${res.pagination.total}`, "ok")

            // Scoped unread count — proves the conversationId filter works.
            const scoped = await kasookoo.loadUnreadCount(client, conv.conversation_id)
            setConvUnread(scoped.unread_count)

            const unreadIds = kasookoo.unreadMessageIds(res.items, auth?.user.id)
            if (unreadIds.length > 0) {
                await kasookoo.markMessagesRead(client, conv.conversation_id, unreadIds)
                addLog(`markRead → ${unreadIds.length} message(s) in ${conv.conversation_id}`, "ok")
                setConversations((prev) =>
                    prev.map((c) =>
                        c.conversation_id === conv.conversation_id
                            ? { ...c, unread_count: Math.max(0, c.unread_count - unreadIds.length) }
                            : c
                    )
                )
                setConvUnread((prev) => Math.max(0, (prev ?? 0) - unreadIds.length))
                void loadUnread()
            }
        } catch (err) {
            addLog(`getMessages failed ${describeError(err)}`, "err")
        } finally {
            setMsgBusy(false)
        }
    }

    const refreshThread = async () => {
        if (!client || !selected) return
        const res = await kasookoo.loadMessages(client, selected.conversation_id, PAGE)
        setMessages(res.items)
    }

    const send = async () => {
        if (!client || !auth || !selected || !draft.trim()) return
        setSending(true)
        try {
            await kasookoo.sendMessage(client, {
                senderUserId: auth.user.id,
                receiverUserId: selected.participant_user_id,
                roomName: selected.room_name,
                message: draft.trim(),
            })
            addLog(`sendMessage → ${selected.room_name}`, "ok")
            setDraft("")
            await refreshThread()
        } catch (err) {
            addLog(`sendMessage failed ${describeError(err)}`, "err")
        } finally {
            setSending(false)
        }
    }

    const shareLocation = async () => {
        if (!client || !auth || !selected) return
        setSending(true)
        addLog("sendLocation() — reading position from the browser…")
        try {
            await kasookoo.sendLocation(client, {
                senderUserId: auth.user.id,
                receiverUserId: selected.participant_user_id,
                roomName: selected.room_name,
            })
            addLog("sendLocation → sent", "ok")
            await refreshThread()
        } catch (err) {
            addLog(`sendLocation failed ${describeError(err)}`, "err")
        } finally {
            setSending(false)
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-xl font-semibold">Messaging</h1>
                    <p className="text-sm text-foreground/60">
                        In-app and WhatsApp threads, history, unread counts and read receipts.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {unread != null ? <Badge tone={unread > 0 ? "err" : "ok"}>{unread} unread</Badge> : null}
                    <Button variant="secondary" onClick={() => void loadUnread()}>
                        Refresh count
                    </Button>
                    <Button variant="secondary" onClick={() => setComposeOpen((v) => !v)}>
                        {composeOpen ? "Hide compose" : "New message"}
                    </Button>
                </div>
            </header>

            {composeOpen ? <ComposePanel onSent={() => void loadConversations()} /> : null}

            <div className="grid gap-4 md:grid-cols-2">
                <Panel
                    title="Conversations"
                    actions={
                        <Button variant="ghost" onClick={() => void loadConversations()} loading={convBusy}>
                            Reload
                        </Button>
                    }
                >
                    {convBusy ? (
                        <Spinner label="Loading…" />
                    ) : conversations.length === 0 ? (
                        <EmptyState title="No conversations yet." hint="Send a message to start one." />
                    ) : (
                        <div className="flex flex-col gap-1">
                            {conversations.map((conv) => (
                                <button
                                    key={conv.conversation_id}
                                    onClick={() => void openConversation(conv)}
                                    className={`flex items-center gap-3 rounded-lg p-2 text-left ${
                                        selected?.conversation_id === conv.conversation_id
                                            ? "bg-accent/10"
                                            : "hover:bg-surface-hover"
                                    }`}
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="flex items-center gap-2 truncate text-sm font-medium">
                                            {conv.participant_name ?? conv.participant_user_id}
                                            {conv.channel !== "normal" ? <Badge tone="accent">{conv.channel}</Badge> : null}
                                        </p>
                                        <p className="truncate text-xs text-foreground/50">{conv.last_message}</p>
                                    </div>
                                    <div className="flex shrink-0 flex-col items-end gap-1">
                                        <span className="text-xs text-foreground/40">{formatTime(conv.last_message_at)}</span>
                                        {conv.unread_count > 0 ? <Badge tone="err">{conv.unread_count}</Badge> : null}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </Panel>

                <Panel
                    title={selected ? (selected.participant_name ?? selected.participant_user_id) : "Thread"}
                    description={selected ? selected.room_name : "Pick a conversation to read it."}
                    actions={
                        selected && convUnread != null ? <Badge>{convUnread} unread here</Badge> : undefined
                    }
                >
                    {!selected ? (
                        <EmptyState title="Nothing selected." />
                    ) : msgBusy ? (
                        <Spinner label="Loading messages…" />
                    ) : (
                        <>
                            <div className="flex max-h-96 flex-col gap-2 overflow-y-auto">
                                {messages.length === 0 ? (
                                    <EmptyState title="No messages in this thread." />
                                ) : (
                                    [...messages]
                                        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                                        .map((msg) => <MessageBubble key={msg.id} message={msg} meId={auth?.user.id} />)
                                )}
                            </div>

                            <div className="flex gap-2 pt-3">
                                <Input
                                    placeholder="Write a message…"
                                    value={draft}
                                    onChange={(e) => setDraft(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && void send()}
                                />
                                <Button onClick={() => void send()} loading={sending} disabled={!draft.trim()}>
                                    Send
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() => void shareLocation()}
                                    disabled={sending}
                                >
                                    Location
                                </Button>
                            </div>
                        </>
                    )}
                </Panel>
            </div>
        </div>
    )
}

function MessageBubble({ message, meId }: { message: ChatMessage; meId?: string }) {
    const mine = message.sender_user_id === meId
    const coords = parseLocation(message.message)
    return (
        <div className={`flex flex-col gap-1 rounded-xl px-3 py-2 text-sm ${
            mine ? "ml-auto bg-accent text-accent-foreground" : "mr-auto bg-surface-secondary"
        } max-w-[80%]`}>
            <div>
                {coords ? (
                    <a
                        className="underline"
                        href={`https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lng}#map=15/${coords.lat}/${coords.lng}`}
                        target="_blank"
                        rel="noreferrer"
                    >
                        📍 {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                    </a>
                ) : (
                    message.message
                )}
            </div>
            <div className="text-[10px] opacity-70">
                {message.channel !== "normal" ? `${message.channel} · ` : ""}
                {formatTime(message.created_at)}
                {mine && message.read_at ? " · read" : ""}
            </div>
        </div>
    )
}

/** Sending to an arbitrary user/room, including the WhatsApp channel. */
function ComposePanel({ onSent }: { onSent: () => void }) {
    const { client, addLog, auth } = useKasookoo()
    const [channel, setChannel] = useState<"normal" | "whatsapp">("normal")
    const [receiver, setReceiver] = useState("")
    const [room, setRoom] = useState("")
    const [numberId, setNumberId] = useState("")
    const [text, setText] = useState("")
    const [busy, setBusy] = useState(false)

    const send = async () => {
        if (!client || !auth) return
        setBusy(true)
        try {
            if (channel === "whatsapp") {
                await kasookoo.sendWhatsAppMessage(client, {
                    senderUserId: auth.user.id,
                    receiverUserId: receiver.trim(),
                    roomName: room.trim(),
                    associatedNumberId: numberId.trim(),
                    message: text.trim(),
                })
                addLog("sendWhatsAppMessage → sent", "ok")
            } else {
                await kasookoo.sendMessage(client, {
                    senderUserId: auth.user.id,
                    receiverUserId: receiver.trim(),
                    roomName: room.trim(),
                    message: text.trim(),
                })
                addLog("sendMessage → sent", "ok")
            }
            setText("")
            onSent()
        } catch (err) {
            addLog(`send failed ${describeError(err)}`, "err")
        } finally {
            setBusy(false)
        }
    }

    const ready = receiver.trim() && room.trim() && text.trim() && (channel === "normal" || numberId.trim())

    return (
        <Panel
            title="New message"
            description="The first message to a room creates the conversation — reuse the room name to stay in it."
        >
            <div className="flex gap-1 rounded-lg bg-surface-secondary p-1 w-fit">
                {(["normal", "whatsapp"] as const).map((option) => (
                    <button
                        key={option}
                        onClick={() => setChannel(option)}
                        className={`rounded-md px-3 py-1 text-sm ${
                            channel === option ? "bg-accent text-accent-foreground" : ""
                        }`}
                    >
                        {option === "normal" ? "In-app" : "WhatsApp"}
                    </button>
                ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Receiver user id">
                    <Input value={receiver} onChange={(e) => setReceiver(e.target.value)} />
                </Field>
                <Field label="Room name">
                    <Input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="chat_a_b" />
                </Field>
                {channel === "whatsapp" ? (
                    <Field label="Associated number id" hint="A WHATSAPP number from the Numbers screen.">
                        <Input value={numberId} onChange={(e) => setNumberId(e.target.value)} />
                    </Field>
                ) : null}
                <Field label="Message">
                    <Input value={text} onChange={(e) => setText(e.target.value)} />
                </Field>
            </div>

            <Button onClick={() => void send()} loading={busy} disabled={!ready}>
                Send {channel === "whatsapp" ? "on WhatsApp" : "in-app"}
            </Button>
        </Panel>
    )
}
