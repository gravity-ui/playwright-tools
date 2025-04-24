import { devices } from '@playwright/test';

type ProjectName = 'Chrome' | 'Safari' | 'Firefox';

export const projects = [
    {
        name: 'Chrome',
        use: {
            ...devices['Desktop Chrome'],
            projectName: 'Chrome' as ProjectName,
        },
    },
    {
        name: 'Safari',
        use: {
            ...devices['Desktop Safari'],
            projectName: 'Safari' as ProjectName,
        },
    },
    {
        name: 'Firefox',
        use: {
            ...devices['Desktop Firefox'],
            projectName: 'Firefox' as ProjectName,
        },
    },
];
export default projects;
