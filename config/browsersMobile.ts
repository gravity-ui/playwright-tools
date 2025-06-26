import { devices } from '@playwright/test';

type ProjectName = 'Android' | 'iPhone';

export const projects = [
    {
        name: 'Android',
        use: {
            ...devices['Pixel 5'],
            projectName: 'Android' as ProjectName,
        },
    },
    {
        name: 'iPhone',
        use: {
            ...devices['iPhone 12'],
            projectName: 'iPhone' as ProjectName,
        },
    },
];
export default projects;
