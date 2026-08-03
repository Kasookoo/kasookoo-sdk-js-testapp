import type {
    ChatMessage,
    ConversationsResponse,
    KasookooClient,
    MessagesResponse,
    SendMessageResponse,
    UnreadCountResponse,
} from "@reverse-engineer/kasookoo-sdk"

export function loadConversations(client: KasookooClient, limit = 50): Promise<ConversationsResponse> {
    return client.getConversations({ limit })
}

export function loadMessages(client: KasookooClient, conversationId: string, limit = 30): Promise<MessagesResponse> {
    return client.getMessages(conversationId, { limit })
}

export function loadUnreadCount(client: KasookooClient, conversationId?: string): Promise<UnreadCountResponse> {
    return client.getUnreadCount(conversationId ? { conversationId } : undefined)
}

/** Ids of messages `meId` has received but not yet read — what `markMessagesRead` needs. */
export function unreadMessageIds(messages: ChatMessage[], meId: string | undefined): string[] {
    return messages.filter((m) => m.sender_user_id !== meId && !m.read_at).map((m) => m.id)
}

export function markMessagesRead(client: KasookooClient, conversationId: string, messageIds: string[]): Promise<void> {
    return client.markRead({ conversationId, messageIds })
}

export function sendMessage(
    client: KasookooClient,
    params: { senderUserId: string; receiverUserId: string; roomName: string; message: string }
): Promise<SendMessageResponse> {
    return client.sendMessage(params)
}

export function sendWhatsAppMessage(
    client: KasookooClient,
    params: {
        senderUserId: string
        receiverUserId: string
        roomName: string
        associatedNumberId: string
        message: string
    }
): Promise<SendMessageResponse> {
    return client.sendWhatsAppMessage(params)
}

/** Shares the sender's current browser location as a message — no text needed. */
export function sendLocation(
    client: KasookooClient,
    params: { senderUserId: string; receiverUserId: string; roomName: string }
): Promise<SendMessageResponse> {
    return client.sendLocation(params)
}
