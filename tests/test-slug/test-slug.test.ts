import { expect, test } from '../test';

test.describe('Test Slug Fixture Integration Tests', () => {
    test('should extract slug from test title with square brackets [custom-slug]', async ({
        testSlug,
    }) => {
        expect(testSlug).toBe('custom-slug');
    });

    test('should generate slug from title without explicit slug marker', async ({ testSlug }) => {
        // Title: "should generate slug from title without explicit slug marker"
        // Expected: "should-generate-slug-from-title-without-explicit-slug-marker"
        expect(testSlug).toBe('should-generate-slug-from-title-without-explicit-slug-marker');
    });

    test('should handle test with special characters @#$ in title', async ({ testSlug }) => {
        // Special characters should be excluded, only word characters joined with dashes
        expect(testSlug).toBe('should-handle-test-with-special-characters-in-title');
    });
});
