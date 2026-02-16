jest.mock('../models/newsModel');
jest.mock('../models/attachmentModel');
jest.mock('../db', () => ({
    query: jest.fn(),
    getConnection: jest.fn(),
}));

const NewsModel = require('../models/newsModel');
const AttachmentModel = require('../models/attachmentModel');
const publicController = require('../controllers/publicController');

function mockReqRes(overrides = {}) {
    const req = {
        body: {},
        session: {},
        cookies: {},
        query: {},
        params: {},
        ...overrides,
    };
    const res = {
        render: jest.fn(),
        redirect: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
        cookie: jest.fn(),
    };
    return { req, res };
}

describe('Public Controller', () => {
    afterEach(() => jest.clearAllMocks());

    describe('getHome', () => {
        test('should render index with news list and default category', async () => {
            const mockNews = [{ id: 1, title: 'News' }];
            NewsModel.getPublicNews.mockResolvedValue(mockNews);
            const { req, res } = mockReqRes();

            await publicController.getHome(req, res);
            expect(NewsModel.getPublicNews).toHaveBeenCalledWith('ข่าวสารประชาสัมพันธ์');
            expect(res.render).toHaveBeenCalledWith('index', expect.objectContaining({
                newsList: mockNews,
                currentCategory: 'ข่าวสารประชาสัมพันธ์',
            }));
        });

        test('should use query param category if provided', async () => {
            NewsModel.getPublicNews.mockResolvedValue([]);
            const { req, res } = mockReqRes({ query: { category: 'ข่าวสารความรู้' } });

            await publicController.getHome(req, res);
            expect(NewsModel.getPublicNews).toHaveBeenCalledWith('ข่าวสารความรู้');
        });

        test('should return 500 on error', async () => {
            NewsModel.getPublicNews.mockRejectedValue(new Error('DB Error'));
            const { req, res } = mockReqRes();

            await publicController.getHome(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('getArchive', () => {
        test('should render archive with expired news', async () => {
            const mockNews = [{ id: 1, title: 'Archived' }];
            NewsModel.getArchivedNews.mockResolvedValue(mockNews);
            const { req, res } = mockReqRes();

            await publicController.getArchive(req, res);
            expect(res.render).toHaveBeenCalledWith('archive', { newsList: mockNews });
        });

        test('should return 500 on error', async () => {
            NewsModel.getArchivedNews.mockRejectedValue(new Error('DB Error'));
            const { req, res } = mockReqRes();

            await publicController.getArchive(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('getNewsDetail', () => {
        test('should return 404 if news not found', async () => {
            NewsModel.getNewsById.mockResolvedValue(null);
            const { req, res } = mockReqRes({ params: { id: '999', slug: 'test' } });

            await publicController.getNewsDetail(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('should redirect 301 if slug is incorrect', async () => {
            NewsModel.getNewsById.mockResolvedValue({
                id: 1, title: 'Hello World',
                start_date: '2020-01-01', end_date: '2099-12-31'
            });
            const { req, res } = mockReqRes({ params: { id: '1', slug: 'wrong-slug' } });

            await publicController.getNewsDetail(req, res);
            expect(res.redirect).toHaveBeenCalledWith(301, '/news/1/Hello-World');
        });

        test('should increment view count and render detail', async () => {
            NewsModel.getNewsById.mockResolvedValue({
                id: 1, title: 'Hello World',
                start_date: '2020-01-01', end_date: '2099-12-31'
            });
            NewsModel.incrementViewCount.mockResolvedValue();
            AttachmentModel.getByNewsId.mockResolvedValue([]);
            const { req, res } = mockReqRes({
                params: { id: '1', slug: 'Hello-World' },
                cookies: {},
            });

            await publicController.getNewsDetail(req, res);
            expect(NewsModel.incrementViewCount).toHaveBeenCalledWith('1');
            expect(res.cookie).toHaveBeenCalledWith('viewed_news_1', 'true', expect.any(Object));
            expect(res.render).toHaveBeenCalledWith('news_detail', expect.objectContaining({
                news: expect.any(Object),
                files: [],
            }));
        });

        test('should NOT increment view count if already viewed (cookie exists)', async () => {
            NewsModel.getNewsById.mockResolvedValue({
                id: 1, title: 'Hello World',
                start_date: '2020-01-01', end_date: '2099-12-31'
            });
            AttachmentModel.getByNewsId.mockResolvedValue([]);
            const { req, res } = mockReqRes({
                params: { id: '1', slug: 'Hello-World' },
                cookies: { viewed_news_1: 'true' },
            });

            await publicController.getNewsDetail(req, res);
            expect(NewsModel.incrementViewCount).not.toHaveBeenCalled();
            expect(res.render).toHaveBeenCalledWith('news_detail', expect.any(Object));
        });

        test('should return 500 on error', async () => {
            NewsModel.getNewsById.mockRejectedValue(new Error('DB Error'));
            const { req, res } = mockReqRes({ params: { id: '1', slug: 'test' } });

            await publicController.getNewsDetail(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});
