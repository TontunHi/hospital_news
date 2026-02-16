jest.mock('../db', () => ({
    query: jest.fn(),
}));

const db = require('../db');
const UserModel = require('../models/userModel');

describe('UserModel', () => {
    afterEach(() => jest.clearAllMocks());

    describe('findByUsername', () => {
        test('should return user when found', async () => {
            const mockUser = { id: 1, username: 'admin', password_hash: '$2b$10$hash', email: 'test@test.com' };
            db.query.mockResolvedValue([[mockUser]]);

            const result = await UserModel.findByUsername('admin');
            expect(result).toEqual(mockUser);
            expect(db.query).toHaveBeenCalledWith('SELECT * FROM users WHERE username = ?', ['admin']);
        });

        test('should return undefined when user not found', async () => {
            db.query.mockResolvedValue([[]]);
            const result = await UserModel.findByUsername('nonexistent');
            expect(result).toBeUndefined();
        });
    });
});
