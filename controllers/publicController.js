const moment = require('moment');
const NewsModel = require('../models/newsModel');
const AttachmentModel = require('../models/attachmentModel');
const { createSlug } = require('../utils/helpers');

exports.getHome = async (req, res) => {
    const categories = ['ข่าวสารประชาสัมพันธ์', 'ประชุมอบรม / สัมมนา', 'ประกาศรับสมัครงาน', 'ข่าวสารความรู้'];
    const currentCategory = req.query.category || categories[0];
    try {
        const newsList = await NewsModel.getPublicNews(currentCategory);
        res.render('index', { newsList, currentCategory, categories });
    } catch (err) {
        console.error("Error in getHome:", err);
        res.status(500).send('Error loading home');
    }
};

exports.getArchive = async (req, res) => {
    try {
        const newsList = await NewsModel.getArchivedNews();
        res.render('archive', { newsList });
    } catch (err) {
        res.status(500).send('Error loading archive.');
    }
};

exports.getNewsDetail = async (req, res) => {
    const newsId = req.params.id;
    const requestedSlug = req.params.slug;
    const viewKey = `viewed_news_${newsId}`;
    
    try {
        const news = await NewsModel.getNewsById(newsId);
        if (!news) return res.status(404).send('Not Found');
        
        const correctSlug = createSlug(news.title);
        if (requestedSlug !== correctSlug) return res.redirect(301, `/news/${newsId}/${correctSlug}`);
        
        const now = moment();
        const startDate = moment(news.start_date);
        
        if (!req.session.userId && now.isBefore(startDate)) return res.status(404).send('News not yet available.');

        if (!req.cookies[viewKey]) {
            await NewsModel.incrementViewCount(newsId);
            res.cookie(viewKey, 'true', { maxAge: 86400000, httpOnly: true }); 
        }

        const files = await AttachmentModel.getByNewsId(newsId);
        res.render('news_detail', { news: news, files: files });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error loading detail');
    }
};
