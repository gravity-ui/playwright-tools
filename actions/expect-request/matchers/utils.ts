export function isObject(entry: unknown): entry is object {
    const entryType = typeof entry;

    return (
        entry !== null &&
        !Array.isArray(entry) &&
        (entryType === 'object' || entryType === 'function')
    );
}
