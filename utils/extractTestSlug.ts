/**
 * Retrieves a test ID for use in the test artifact path.
 *
 * It is assumed that the identifier is written at the end of the test name in square brackets:
 * `'My test title [my-test]'`
 * Otherwise, it is formed from the name, excluding all special characters, for example:
 * `'My test title 1 @test @tag'` -> `'my-test-title-1-test-tag'`
 *
 * @param title test name
 * @param allowToUseTitle Requires the slug to be specified in a specific way in the title (otherwise the title itself will be used)
 */
export function extractTestSlug(title: string, allowToUseTitle = true) {
    const matches = /\[([^[\]]+)\]$/.exec(title);

    if (matches) {
        return matches[1]!;
    }

    if (allowToUseTitle) {
        return title.match(/\w+/g)?.join('-').toLocaleLowerCase() || '';
    }

    return '';
}
