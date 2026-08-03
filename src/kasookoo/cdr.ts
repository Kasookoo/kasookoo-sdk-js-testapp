import type { CdrExportParams, CdrQuery, CdrResponse, KasookooClient } from "@reverse-engineer/kasookoo-sdk"

export function listCdr(client: KasookooClient, query: CdrQuery): Promise<CdrResponse> {
    return client.getCdr(query)
}

/** Fetches the CDR export file and hands it to the browser's downloads. */
export function downloadCdr(client: KasookooClient, params?: CdrExportParams): Promise<void> {
    return client.downloadCdr(params)
}
