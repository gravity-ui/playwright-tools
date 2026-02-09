import { TEST_WRAPPER_CLASS } from '../../component-tests/fixtures';
import { expect, test } from '../test';

import { ComplexComponent, TestComponent } from './components/TestComponent';

test.describe('Mount Fixture Integration Tests', () => {
    test('should mount a basic component', async ({ mount }) => {
        const component = await mount(<TestComponent />);
        await expect(component.getByTestId('test-component')).toContainText('Hello World');
    });

    test('should apply default wrapper styling', async ({ mount, page }) => {
        await mount(<TestComponent />);
        const wrapper = page.locator(`.${TEST_WRAPPER_CLASS}`);

        // Verify wrapper is visible
        await expect(wrapper).toBeVisible();

        // Verify default padding
        const padding = await wrapper.evaluate((el) => window.getComputedStyle(el).padding);
        expect(padding).toBe('20px');

        // Verify fit-content width is applied
        const width = await wrapper.evaluate((el) => window.getComputedStyle(el).width);
        expect(width).not.toBe('auto');

        // Verify height is fit-content
        const height = await wrapper.evaluate((el) => window.getComputedStyle(el).height);
        expect(height).not.toBe('auto');
    });

    test('should mount with custom width option', async ({ mount, page }) => {
        // Test with numeric width
        const component = await mount(<TestComponent />, { width: 500 });
        const wrapper = page.locator(`.${TEST_WRAPPER_CLASS}`);
        const width = await wrapper.evaluate((el) => window.getComputedStyle(el).width);
        expect(width).toBe('500px');

        // Verify content-box is applied when width is set
        const boxSizing = await wrapper.evaluate((el) => window.getComputedStyle(el).boxSizing);
        expect(boxSizing).toBe('content-box');

        // Unmount first component
        await component.unmount();

        // Test with string width
        await mount(<TestComponent />, { width: '300px' });
        const wrapper2 = page.locator(`.${TEST_WRAPPER_CLASS}`);
        const width2 = await wrapper2.evaluate((el) => window.getComputedStyle(el).width);
        expect(width2).toBe('300px');
    });

    test('should apply custom rootStyle', async ({ mount, page }) => {
        await mount(<TestComponent />, {
            rootStyle: { backgroundColor: 'rgb(255, 0, 0)', border: '2px solid rgb(0, 0, 255)' },
        });
        const wrapper = page.locator(`.${TEST_WRAPPER_CLASS}`);
        const bgColor = await wrapper.evaluate((el) => window.getComputedStyle(el).backgroundColor);
        const border = await wrapper.evaluate((el) => window.getComputedStyle(el).border);
        expect(bgColor).toBe('rgb(255, 0, 0)');
        expect(border).toContain('2px');
        expect(border).toContain('rgb(0, 0, 255)');
    });

    test('should inject CSS to disable transform animations', async ({ mount, page }) => {
        await mount(<TestComponent />);
        const wrapper = page.locator(`.${TEST_WRAPPER_CLASS}`);
        const styleElement = wrapper.locator('style');
        await expect(styleElement).toBeAttached();
        const styleContent = await styleElement.textContent();
        expect(styleContent).toContain('.g-button');
        expect(styleContent).toContain('transform: scale(1)');
    });

    test('should handle complex React components', async ({ mount }) => {
        const component = await mount(<ComplexComponent />);
        await expect(component.getByRole('heading')).toContainText('Title');
        await expect(component.getByRole('button')).toContainText('Click me');
        await expect(component.getByRole('listitem')).toHaveCount(2);
    });
});
