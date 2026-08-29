const reported = new Set<string>();

/**
 * Reports a one-time degradation of the HAR engine.
 * Every downgrade goes through this funnel so that it is greppable.
 */
export function degrade(code: string, message: string): void {
    if (reported.has(code)) {
        return;
    }

    reported.add(code);

    console.warn(`[@gravity-ui/playwright-tools] HAR engine degraded (${code}): ${message}`);
}

/** Test seam: forgets reported degradations so that warnings fire again. */
export function resetDegradations(): void {
    reported.clear();
}
