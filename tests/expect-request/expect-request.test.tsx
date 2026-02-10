import { test } from '../test';

import { RequestTestComponent } from './components/RequestTestComponent';

test.describe('Expect Request Fixture Integration Tests', () => {
    test('should track GET request with query parameters', async ({ mount, expectRequest }) => {
        const component = await mount(<RequestTestComponent />);

        // Click button to trigger GET request
        await component.getByTestId('get-button').click();

        // Verify request was made with correct query parameters
        await expectRequest('/api/users', {
            method: 'GET',
            query: {
                page: '1',
                limit: '10',
            },
        });
    });

    test('should track POST request with body', async ({ mount, expectRequest }) => {
        const component = await mount(<RequestTestComponent />);

        // Click button to trigger POST request
        await component.getByTestId('post-button').click();

        // Verify request was made with correct method and body
        await expectRequest('/api/users', {
            method: 'POST',
            body: {
                name: 'John Doe',
                email: 'john@example.com',
            },
        });
    });
});
