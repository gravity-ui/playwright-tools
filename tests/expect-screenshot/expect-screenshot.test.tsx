import { test } from '../test';

import { ScreenshotTestComponent } from './components/ScreenshotTestComponent';

test.describe('Expect Screenshot Fixture Integration Tests', () => {
    test('should take screenshot of component', async ({ mount, expectScreenshot }) => {
        await mount(<ScreenshotTestComponent />);

        // Take screenshot using the expectScreenshot fixture
        await expectScreenshot();
    });
});
