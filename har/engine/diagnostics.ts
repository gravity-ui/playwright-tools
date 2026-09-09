const STRICT_ENV = 'PLAYWRIGHT_TOOLS_HAR_STRICT';

const reported = new Set<string>();

function isStrict(): boolean {
    const value = process.env[STRICT_ENV];

    return value !== undefined && value !== '' && value !== '0' && value !== 'false';
}

/**
 * Reports a one-time degradation of the HAR engine.
 * Every downgrade goes through this funnel so that it is greppable.
 *
 * With `PLAYWRIGHT_TOOLS_HAR_STRICT=1` every degradation throws instead, so that
 * a CI run cannot go green on a silently downgraded engine.
 */
export function degrade(code: string, message: string): void {
    const text = `[@gravity-ui/playwright-tools] HAR engine degraded (${code}): ${message}`;

    if (isStrict()) {
        throw new Error(text);
    }

    if (reported.has(code)) {
        return;
    }

    reported.add(code);

    console.warn(text);
}

/** Test seam: forgets reported degradations so that warnings fire again. */
export function resetDegradations(): void {
    reported.clear();
}
