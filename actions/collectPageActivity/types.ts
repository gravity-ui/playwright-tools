export type ResponseFailure = {
    status: number;
    url: string;
    originalUrl?: string;
    requestId?: string;
};

export type ExpectedMessage = {
    type: string;
    text: string | RegExp;
};

export type ExpectedResponse = {
    status: number;
    url: string;
};

export type Config = {
    /** Url where app is available */
    baseUrl: string;
    expectedMessages?: ExpectedMessage[];
    ignoredMessageTypes?: string[];
    expectedResponses?: ExpectedResponse[];
    ignoredResponseStatuses?: number[];
    requestIdHeader?: string;
};
