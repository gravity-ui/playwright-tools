import type { TestInfo } from '@playwright/test';

import { extractTestSlug } from '../utils';

export function defaultDumpsFilePathBuilder({
    testInfo,
    zip,
}: {
    testInfo: TestInfo;
    zip: boolean;
}) {
    const filePath = testInfo.snapshotPath(
        testInfo.titlePath
            .slice(1)
            .join('-')
            .replace(/ /g, '-')
            .replace(/[^a-zA-Z0-9\-_]/g, ''), // Removing characters which are not supported as filename
    );

    return zip ? `${filePath}.zip` : `${filePath}.har`;
}

// previous implementation, includes slug in the path
export function dumpsPathBuldeWithSlugBuilder({
    testInfo,
    zip,
}: {
    testInfo: TestInfo;
    zip: boolean;
}) {
    const slug = extractTestSlug(testInfo.title, true);

    const filePath = testInfo.snapshotPath('').replace(/-snapshots\/[^/]+$/, '-data/' + slug);

    return zip ? `${filePath}.zip` : `${filePath}.har`;
}
