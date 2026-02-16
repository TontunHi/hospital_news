const { createSlug } = require('../utils/helpers');

describe('Helper Functions', () => {
    describe('createSlug', () => {
        test('should convert string to slug', () => {
            expect(createSlug('Hello World')).toBe('Hello-World');
        });

        test('should handle special characters', () => {
            // "Hello @ World!" -> "Hello-World"
            expect(createSlug('Hello @ World!')).toBe('Hello-World');
        });

        test('should handle multiple spaces', () => {
            expect(createSlug('Hello   World')).toBe('Hello-World');
        });

        test('should trim dashes from start and end', () => {
            expect(createSlug('-Hello-World-')).toBe('Hello-World');
        });

        test('should return empty string for null/undefined', () => {
            expect(createSlug(null)).toBe('');
            expect(createSlug(undefined)).toBe('');
        });

        test('should handle Thai characters', () => {
            expect(createSlug('สวัสดี ชาวโลก')).toBe('สวัสดี-ชาวโลก');
        });
    });
});
