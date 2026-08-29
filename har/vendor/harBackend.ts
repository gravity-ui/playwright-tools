/**
 * Portions of this file are derived from Playwright
 * (https://github.com/microsoft/playwright), file
 * `packages/playwright-core/src/server/harBackend.ts` @ v1.62.1.
 *
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Modifications (c) YANDEX LLC / gravity-ui contributors:
 *  - ported to TypeScript and moved out of the Playwright process into this package;
 *  - ZIP access reimplemented on top of `node:zlib` (see `./zip`);
 *  - `harFile` exposed so that `addHarOpenTransform` can mutate it before any lookup.
 */

import { readFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';

import type { Entry, HARFile, Header, LocalUtilsHarLookupResult } from '../types';

import { readZipEntries } from './zip';

const REDIRECT_STATUS = [301, 302, 303, 307, 308];

type LoadableContent = {
    _file?: string;
    text?: string;
    encoding?: string;
};

function countMatchingHeaders(harHeaders: Header[], headers: Header[]) {
    const set = new Set(headers.map((header) => header.name.toLowerCase() + ':' + header.value));
    let matches = 0;

    for (const header of harHeaders) {
        if (set.has(header.name.toLowerCase() + ':' + header.value)) {
            ++matches;
        }
    }

    return matches;
}

function multipartBoundary(headers: Header[]) {
    const contentType = headers.find((header) => header.name.toLowerCase() === 'content-type');

    if (!contentType?.value.includes('multipart/form-data')) {
        return undefined;
    }

    const boundary = /boundary=(\S+)/.exec(contentType.value);

    return boundary?.[1];
}

/**
 * The method a recorded redirect is followed with: 301/302 downgrade a POST to a
 * GET, 303 downgrades everything but GET/HEAD. Any other method is kept as is.
 */
function redirectMethod(status: number, method: string) {
    if ((status === 301 || status === 302) && method === 'POST') {
        return 'GET';
    }

    if (status === 303 && !['GET', 'HEAD'].includes(method)) {
        return 'GET';
    }

    return method;
}

export class HarBackend {
    static async open(file: string): Promise<HarBackend> {
        if (file.endsWith('.zip')) {
            const entries = await readZipEntries(file);
            const harName = [...entries.keys()].find((name) => name.endsWith('.har'));
            const harContent = harName === undefined ? undefined : entries.get(harName);

            if (harContent === undefined) {
                throw new Error(`Specified archive does not have a .har file: ${file}`);
            }

            return new HarBackend(
                JSON.parse(harContent.toString('utf8')) as HARFile,
                undefined,
                entries,
            );
        }

        const content = await readFile(file, 'utf8');

        return new HarBackend(JSON.parse(content) as HARFile, dirname(file), undefined);
    }

    private readonly harFileValue: HARFile;
    private readonly baseDir: string | undefined;
    private readonly zipEntries: Map<string, Buffer> | undefined;

    private constructor(
        harFile: HARFile,
        baseDir: string | undefined,
        zipEntries: Map<string, Buffer> | undefined,
    ) {
        this.harFileValue = harFile;
        this.baseDir = baseDir;
        this.zipEntries = zipEntries;
    }

    /**
     * The parsed HAR file. Mutating it changes what subsequent lookups match against.
     */
    get harFile(): HARFile {
        return this.harFileValue;
    }

    async lookup(
        url: string,
        method: string,
        headers: Header[],
        postData: Buffer | undefined,
        isNavigationRequest: boolean,
    ): Promise<LocalUtilsHarLookupResult> {
        let entry: Entry | undefined;

        try {
            entry = await this.findResponse(url, method, headers, postData);
        } catch (error) {
            return { action: 'error', message: 'HAR error: ' + (error as Error).message };
        }

        if (!entry) {
            return { action: 'noentry' };
        }

        if (entry.request.url !== url && isNavigationRequest) {
            return { action: 'redirect', redirectURL: entry.request.url };
        }

        const response = entry.response;

        try {
            return {
                action: 'fulfill',
                status: response.status,
                headers: response.headers,
                body: await this.loadContent(response.content),
            };
        } catch (error) {
            return { action: 'error', message: (error as Error).message };
        }
    }

    private async loadContent(content: LoadableContent): Promise<Buffer> {
        const file = content._file;

        if (file) {
            if (this.zipEntries) {
                const buffer = this.zipEntries.get(file);

                if (!buffer) {
                    throw new Error(`${file} not found in the HAR archive`);
                }

                return buffer;
            }

            const baseDir = this.baseDir!;
            const resolved = resolve(baseDir, file);
            const relativePath = relative(baseDir, resolved);

            if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
                throw new Error(`HAR entry _file escapes base directory: ${file}`);
            }

            return await readFile(resolved);
        }

        return Buffer.from(content.text || '', content.encoding === 'base64' ? 'base64' : 'utf8');
    }

    private async findResponse(
        url: string,
        method: string,
        headers: Header[],
        postData: Buffer | undefined,
    ): Promise<Entry | undefined> {
        const harLog = this.harFileValue.log;
        const visited = new Set<Entry>();
        let currentUrl = url;
        let currentMethod = method;

        for (;;) {
            const entries: Entry[] = [];

            for (const candidate of harLog.entries) {
                if (
                    candidate.request.url !== currentUrl ||
                    candidate.request.method !== currentMethod
                ) {
                    continue;
                }

                if (currentMethod === 'POST' && postData && candidate.request.postData) {
                    const buffer = await this.loadContent(candidate.request.postData);

                    if (!buffer.equals(postData)) {
                        const boundary = multipartBoundary(headers);

                        if (!boundary) {
                            continue;
                        }

                        const candidateBoundary = multipartBoundary(candidate.request.headers);

                        if (!candidateBoundary) {
                            continue;
                        }

                        if (
                            postData.toString().replaceAll(boundary, '') !==
                            buffer.toString().replaceAll(candidateBoundary, '')
                        ) {
                            continue;
                        }
                    }
                }

                entries.push(candidate);
            }

            if (!entries.length) {
                return undefined;
            }

            let entry = entries[0]!;

            if (entries.length > 1) {
                const list = entries.map((candidate) => ({
                    candidate,
                    matchingHeaders: countMatchingHeaders(candidate.request.headers, headers),
                }));

                list.sort((a, b) => b.matchingHeaders - a.matchingHeaders);
                entry = list[0]!.candidate;
            }

            if (visited.has(entry)) {
                throw new Error(`Found redirect cycle for ${currentUrl}`);
            }

            visited.add(entry);

            const locationHeader = entry.response.headers.find(
                (header) => header.name.toLowerCase() === 'location',
            );

            if (REDIRECT_STATUS.includes(entry.response.status) && locationHeader) {
                currentUrl = new URL(locationHeader.value, currentUrl).toString();
                currentMethod = redirectMethod(entry.response.status, currentMethod);

                continue;
            }

            return entry;
        }
    }
}
