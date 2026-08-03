import type {
    AssociatedNumber,
    AssociatedNumberQuery,
    AssociatedNumberType,
    AssociatedNumbersResponse,
    CreateAssociatedNumberParams,
    KasookooClient,
} from "@reverse-engineer/kasookoo-sdk"

export function listAssociatedNumbers(client: KasookooClient, query: AssociatedNumberQuery): Promise<AssociatedNumbersResponse> {
    return client.getAssociatedNumbers(query)
}

export function createAssociatedNumber(client: KasookooClient, params: CreateAssociatedNumberParams): Promise<AssociatedNumber> {
    return client.createAssociatedNumber(params)
}

export function deleteAssociatedNumber(client: KasookooClient, id: string): Promise<void> {
    return client.deleteAssociatedNumber(id)
}

export interface AssociatedNumberEdit {
    associatedNumber: string
    label: string
    country: string
    city: string
    prefix: string
    isTollFree: boolean
    isEnable: boolean
    isPrimary: boolean
    numberType: AssociatedNumberType
    whatsappNumberId: string
}


export function updateAssociatedNumber(
    client: KasookooClient,
    existing: AssociatedNumber,
    edit: AssociatedNumberEdit
): Promise<AssociatedNumber> {
    const changingType = edit.numberType !== existing.number_type
    return client.updateAssociatedNumber(existing.id, {
        associatedNumber: edit.associatedNumber.trim() || undefined,
        label: edit.label.trim() || undefined,
        country: edit.country.trim() || undefined,
        city: edit.city.trim() || undefined,
        prefix: edit.prefix.trim() || undefined,
        isTollFree: edit.isTollFree,
        isEnable: edit.isEnable,
        isPrimary: edit.isPrimary,
        ...(changingType ? {
                  numberType: edit.numberType,
                  ...(edit.numberType === "WHATSAPP" ? { whatsappNumberId: edit.whatsappNumberId.trim() } : {}),
              }
            : edit.numberType === "WHATSAPP" && edit.whatsappNumberId.trim() !== (existing.whatsapp_number_id ?? "")
              ? { whatsappNumberId: edit.whatsappNumberId.trim() }
              : {}),
    })
}
