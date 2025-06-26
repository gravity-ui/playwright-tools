// Types from https://github.com/microsoft/playwright/blob/main/packages/trace/src/har.ts
export type HARFile = {
    log: Log;
};

export type Log = {
    version: string;
    creator: Creator;
    browser?: Browser;
    pages?: Page[];
    entries: Entry[];
    comment?: string;
};

export type Creator = {
    name: string;
    version: string;
    comment?: string;
};

export type Browser = {
    name: string;
    version: string;
    comment?: string;
};

export type Page = {
    startedDateTime: Date;
    id: string;
    title: string;
    pageTimings: PageTimings;
    comment?: string;
};

export type PageTimings = {
    onContentLoad?: number;
    onLoad?: number;
    comment?: string;
};

export type Entry = {
    pageref?: string;
    startedDateTime: Date;
    time: number;
    request: Request;
    response: Response;
    cache: Cache;
    timings: Timings;
    serverIPAddress?: string;
    connection?: string;
    _frameref?: string;
    _monotonicTime?: number;
    _serverPort?: number;
    _securityDetails?: SecurityDetails;
};

export type Request = {
    method: string;
    url: string;
    httpVersion: string;
    cookies: Cookie[];
    headers: Header[];
    queryString: QueryParameter[];
    postData?: PostData;
    headersSize: number;
    bodySize: number;
    comment?: string;
};

export type Response = {
    status: number;
    statusText: string;
    httpVersion: string;
    cookies: Cookie[];
    headers: Header[];
    content: Content;
    redirectURL: string;
    headersSize: number;
    bodySize: number;
    comment?: string;
    _transferSize?: number;
    _failureText?: string;
};

export type Cookie = {
    name: string;
    value: string;
    path?: string;
    domain?: string;
    expires?: Date;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: string;
    comment?: string;
};

export type Header = {
    name: string;
    value: string;
    comment?: string;
};

export type QueryParameter = {
    name: string;
    value: string;
    comment?: string;
};

export type PostData = {
    mimeType: string;
    params: Param[];
    text: string;
    comment?: string;
    _sha1?: string;
    _file?: string;
};

export type Param = {
    name: string;
    value?: string;
    fileName?: string;
    contentType?: string;
    comment?: string;
};

export type Content = {
    size: number;
    compression?: number;
    mimeType: string;
    text?: string;
    encoding?: string;
    comment?: string;
    _sha1?: string;
    _file?: string;
};

export type Cache = {
    beforeRequest?: CacheState | null;
    afterRequest?: CacheState | null;
    comment?: string;
};

export type CacheState = {
    expires?: string;
    lastAccess: string;
    eTag: string;
    hitCount: number;
    comment?: string;
};

export type Timings = {
    blocked?: number;
    dns?: number;
    connect?: number;
    send: number;
    wait: number;
    receive: number;
    ssl?: number;
    comment?: string;
};

export type SecurityDetails = {
    protocol?: string;
    subjectName?: string;
    issuer?: string;
    validFrom?: number;
    validTo?: number;
};
// End of har types

// Types from https://github.com/microsoft/playwright/blob/main/packages/protocol/src/channels.ts

export type Metadata = {
    location?: {
        file: string;
        line?: number;
        column?: number;
    };
    apiName?: string;
    internal?: boolean;
    wallTime?: number;
};

export type LocalUtilsHarLookupParams = {
    harId: string;
    url: string;
    method: string;
    headers: Header[];
    postData?: Buffer;
    isNavigationRequest: boolean;
};

export type LocalUtilsHarLookupResult = {
    action: 'error' | 'redirect' | 'fulfill' | 'noentry';
    message?: string;
    redirectURL?: string;
    status?: number;
    headers?: Header[];
    body?: Buffer;
};

// End of channels types
