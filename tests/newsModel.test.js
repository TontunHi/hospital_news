// Mock db module
jest.mock('../db', () => ({
    query: jest.fn(),
    getConnection: jest.fn(),
}));

const db = require('../db');
const NewsModel = require('../models/newsModel');

describe('NewsModel', () => {
    afterEach(() => jest.clearAllMocks());

    describe('getAllNews', () => {
        test('should return all news ordered by start_date DESC', async () => {
            const mockRows = [{ id: 1, title: 'News 1' }, { id: 2, title: 'News 2' }];
            db.query.mockResolvedValue([mockRows]);

            const result = await NewsModel.getAllNews();
            expect(result).toEqual(mockRows);
            expect(db.query).toHaveBeenCalledWith('SELECT * FROM news ORDER BY start_date DESC');
        });
    });

    describe('getNewsById', () => {
        test('should return a single news item by id', async () => {
            const mockNews = { id: 1, title: 'Test News' };
            db.query.mockResolvedValue([[mockNews]]);

            const result = await NewsModel.getNewsById(1);
            expect(result).toEqual(mockNews);
            expect(db.query).toHaveBeenCalledWith('SELECT * FROM news WHERE id = ?', [1]);
        });

        test('should return undefined if news not found', async () => {
            db.query.mockResolvedValue([[]]);
            const result = await NewsModel.getNewsById(999);
            expect(result).toBeUndefined();
        });
    });

    describe('createNews', () => {
        test('should insert news and return insertId', async () => {
            db.query.mockResolvedValue([{ insertId: 42 }]);
            const data = {
                title: 'New News', slug: 'new-news', category: 'ข่าวสาร',
                youtube_link: '', start_date: '2024-01-01', end_date: '2024-12-31'
            };

            const id = await NewsModel.createNews(data);
            expect(id).toBe(42);
            expect(db.query).toHaveBeenCalledWith(
                'INSERT INTO news (title, slug, category, youtube_link, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)',
                ['New News', 'new-news', 'ข่าวสาร', '', '2024-01-01', '2024-12-31']
            );
        });

        test('should use provided connection for transactions', async () => {
            const mockConn = { query: jest.fn().mockResolvedValue([{ insertId: 99 }]) };
            const data = {
                title: 'TX News', slug: 'tx-news', category: 'test',
                youtube_link: '', start_date: '2024-01-01', end_date: '2024-12-31'
            };

            const id = await NewsModel.createNews(data, mockConn);
            expect(id).toBe(99);
            expect(mockConn.query).toHaveBeenCalled();
            expect(db.query).not.toHaveBeenCalled();
        });
    });

    describe('updateNews', () => {
        test('should update news by id', async () => {
            db.query.mockResolvedValue([{ affectedRows: 1 }]);
            const data = {
                title: 'Updated', slug: 'updated', category: 'ข่าวสาร',
                youtube_link: '', start_date: '2024-01-01', end_date: '2024-12-31'
            };

            await NewsModel.updateNews(1, data);
            expect(db.query).toHaveBeenCalledWith(
                'UPDATE news SET title = ?, slug = ?, category = ?, youtube_link = ?, start_date = ?, end_date = ? WHERE id = ?',
                ['Updated', 'updated', 'ข่าวสาร', '', '2024-01-01', '2024-12-31', 1]
            );
        });
    });

    describe('deleteNews', () => {
        test('should delete news by id', async () => {
            db.query.mockResolvedValue([{ affectedRows: 1 }]);
            await NewsModel.deleteNews(5);
            expect(db.query).toHaveBeenCalledWith('DELETE FROM news WHERE id = ?', [5]);
        });
    });

    describe('incrementViewCount', () => {
        test('should increment view count', async () => {
            db.query.mockResolvedValue([{ affectedRows: 1 }]);
            await NewsModel.incrementViewCount(3);
            expect(db.query).toHaveBeenCalledWith('UPDATE news SET view_count = view_count + 1 WHERE id = ?', [3]);
        });
    });

    describe('getPublicNews', () => {
        test('should return public news by category with valid date range', async () => {
            const mockRows = [{ id: 1, title: 'Active News' }];
            db.query.mockResolvedValue([mockRows]);

            const result = await NewsModel.getPublicNews('ข่าวสารประชาสัมพันธ์');
            expect(result).toEqual(mockRows);
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE category = ?'),
                ['ข่าวสารประชาสัมพันธ์']
            );
        });
    });

    describe('getArchivedNews', () => {
        test('should return archived news (ended)', async () => {
            const mockRows = [{ id: 1, title: 'Old News' }];
            db.query.mockResolvedValue([mockRows]);

            const result = await NewsModel.getArchivedNews();
            expect(result).toEqual(mockRows);
            expect(db.query).toHaveBeenCalledWith(expect.stringContaining('WHERE end_date < NOW()'));
        });
    });
});
