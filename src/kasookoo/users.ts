import type {
    CreateUserParams,
    KasookooClient,
    UpdateUserParams,
    UserListResponse,
    UserQuery,
    UserRecord,
} from "@reverse-engineer/kasookoo-sdk"

export function listUsers(client: KasookooClient, query: UserQuery): Promise<UserListResponse> {
    return client.getUsers(query)
}

export function getUser(client: KasookooClient, userId: string): Promise<UserRecord> {
    return client.getUser(userId)
}

export function createUser(client: KasookooClient, params: CreateUserParams): Promise<UserRecord> {
    return client.createUser(params)
}

export function updateUser(client: KasookooClient, userId: string, params: UpdateUserParams): Promise<UserRecord> {
    return client.updateUser(userId, params)
}

export function deleteUser(client: KasookooClient, userId: string): Promise<void> {
    return client.deleteUser(userId)
}
