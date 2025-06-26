import { minimatch } from 'minimatch';

export function matchUrl(url: string, pattern: string | RegExp): boolean {
    if (pattern instanceof RegExp) {
        return pattern.test(url);
    } else {
        const expandedPattern = pattern.startsWith('/') ? `**${pattern}` : `**/${pattern}`;

        return minimatch(url, expandedPattern);
    }
}
