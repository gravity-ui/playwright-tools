export type HttpMethod =
    | 'GET'
    | 'HEAD'
    | 'POST'
    | 'PUT'
    | 'DELETE'
    | 'CONNECT'
    | 'OPTIONS'
    | 'TRACE';

export type QueryParams = Record<string, string | string[]>;

export type JsonPrimitive = string | number | boolean | null;
export type JsonArray = Json[];
export type JsonObject = { [key: string]: Json };
export type JsonComposite = JsonArray | JsonObject;
export type Json = JsonPrimitive | JsonComposite;

export type ExpectRequestFnMatcher = {
    method?: HttpMethod;
    query?: string | QueryParams;
    body?: Json;
};

export type ExpectRequestFnOptions = {
    timeout?: number;
    exact?: boolean;
};
