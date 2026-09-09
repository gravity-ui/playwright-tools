/**
 * Portions of this file are derived from Playwright
 * (https://github.com/microsoft/playwright), file
 * `packages/playwright-core/src/server/har/harRecorder.ts` @ v1.58.1.
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
 *  - ported to TypeScript;
 *  - pinned to the 1.58.1 layout on purpose, so that re-recording a dump with a
 *    different Playwright version does not produce a formatting-only diff.
 */

function innerJsonStringify(
    object: unknown,
    tokens: string[],
    indent: string,
    flat: boolean,
    parentKey: string | undefined,
): void {
    if (typeof object !== 'object' || object === null) {
        tokens.push(JSON.stringify(object));

        return;
    }

    const isArray = Array.isArray(object);

    if (!isArray && object.constructor.name !== 'Object') {
        tokens.push(JSON.stringify(object));

        return;
    }

    const entries: unknown[] = isArray
        ? object
        : Object.entries(object).filter((entry) => entry[1] !== undefined);

    if (!entries.length) {
        tokens.push(isArray ? '[]' : '{}');

        return;
    }

    const childIndent = `${indent}  `;
    let brackets: { open: string; close: string };

    if (isArray) {
        brackets = flat
            ? { open: '[', close: ']' }
            : { open: `[\n${childIndent}`, close: `\n${indent}]` };
    } else {
        brackets = flat
            ? { open: '{ ', close: ' }' }
            : { open: `{\n${childIndent}`, close: `\n${indent}}` };
    }

    tokens.push(brackets.open);

    for (let i = 0; i < entries.length; ++i) {
        const entry = entries[i];

        if (i) {
            tokens.push(flat ? `, ` : `,\n${childIndent}`);
        }

        if (!isArray) {
            tokens.push(`${JSON.stringify((entry as [string, unknown])[0])}: `);
        }

        const key = isArray ? undefined : (entry as [string, unknown])[0];
        const flatten = flat || key === 'timings' || parentKey === 'headers';

        innerJsonStringify(
            isArray ? entry : (entry as [string, unknown])[1],
            tokens,
            childIndent,
            flatten,
            key,
        );
    }

    tokens.push(brackets.close);
}

/**
 * Serializes a HAR file exactly the way Playwright's own HAR recorder does,
 * so that post-processing a dump does not reformat it.
 */
export function harJsonStringify(object: unknown): string {
    const tokens: string[] = [];

    innerJsonStringify(object, tokens, '', false, undefined);

    return tokens.join('');
}
