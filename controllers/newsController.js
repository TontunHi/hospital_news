const path = require('path');
const fs = require('fs');
const moment = require('moment');
const NewsModel = require('../models/newsModel');
const AttachmentModel = require('../models/attachmentModel');
const { createSlug } = require('../utils/helpers');

function getSuccessMessage(type) {
    if (type === 'upload') return 'เพิ่มข่าวสารใหม่เรียบร้อยแล้ว';
    if (type === 'update') return 'บันทึกการแก้ไขเรียบร้อยแล้ว';
    if (type === 'delete') return 'ลบข่าวสารเรียบร้อยแล้ว';
    return 'ดำเนินการสำเร็จ';
}

exports.getNewsList = async (req, res) => {
    try {
        const newsList = await NewsModel.getAllNews();
        res.render('admin/news_manage', { 
            newsList: newsList,
            message: req.query.success ? getSuccessMessage(req.query.success) : null
        });
    } catch (err) {
        res.status(500).send("Error loading news.");
    }
};

exports.getUpload = (req, res) => {
    res.render('admin/upload', { success: req.query.success });
};

exports.postUpload = async (req, res) => {
    const { title, category, youtube_link, start_date, end_date } = req.body;
    const imageFiles = req.files.images || [];
    const pdfFiles = req.files.pdf_file || [];
    const allFiles = [...imageFiles, ...pdfFiles];

    if (!title || !start_date || !end_date) return res.status(400).send('Missing fields.');
    const slug = createSlug(title);

    try {
        await NewsModel.beginTransaction();
        const newsId = await NewsModel.createNews({ title, slug, category, youtube_link, start_date, end_date });

        if (allFiles.length > 0) {
            const fileValues = allFiles.map(f => {
                const type = f.mimetype.includes('pdf') ? 'pdf' : 'image';
                const dbPath = path.relative(path.join(__dirname, '..', 'uploads'), f.path).replace(/\\/g, '/');
                return [newsId, path.join('uploads', dbPath), type, f.originalname];
            });
            await AttachmentModel.addAttachments(fileValues);
        }
        await NewsModel.commit();
        res.redirect('/admin/news?success=upload');
    } catch (err) {
        await NewsModel.rollback();
        console.error(err);
        allFiles.forEach(f => fs.unlink(f.path, () => {}));
        res.status(500).send("Error uploading: " + err.message);
    }
};

exports.getEdit = async (req, res) => {
    try {
        const news = await NewsModel.getNewsById(req.params.id);
        if (!news) return res.status(404).send('Not Found');
        const files = await AttachmentModel.getByNewsId(req.params.id);
        news.start_date_local = moment(news.start_date).format('YYYY-MM-DD HH:mm');
        news.end_date_local = moment(news.end_date).format('YYYY-MM-DD HH:mm');
        res.render('admin/edit', { news: news, files: files });
    } catch (err) {
        res.status(500).send('Error loading edit page');
    }
};

exports.postUpdate = async (req, res) => {
    const newsId = req.params.id;
    const { title, category, youtube_link, start_date, end_date, files_to_delete } = req.body;
    const imageFiles = req.files.images || [];
    const pdfFiles = req.files.pdf_file || [];
    const allNewFiles = [...imageFiles, ...pdfFiles];
    const slug = createSlug(title);

    try {
        await NewsModel.beginTransaction();
        await NewsModel.updateNews(newsId, { title, slug, category, youtube_link, start_date, end_date });

        if (files_to_delete) {
            const idsToDelete = Array.isArray(files_to_delete) ? files_to_delete : [files_to_delete];
            const oldFiles = await AttachmentModel.getByIds(idsToDelete);
            await AttachmentModel.deleteByIds(idsToDelete);
            
            oldFiles.forEach(f => {
                const fullPath = path.join(__dirname, '..', f.file_path);
                if (fs.existsSync(fullPath)) fs.unlink(fullPath, () => {});
            });
        }

        if (allNewFiles.length > 0) {
            const fileValues = allNewFiles.map(f => {
                const type = f.mimetype.includes('pdf') ? 'pdf' : 'image';
                const dbPath = path.relative(path.join(__dirname, '..', 'uploads'), f.path).replace(/\\/g, '/');
                return [newsId, path.join('uploads', dbPath), type, f.originalname];
            });
            await AttachmentModel.addAttachments(fileValues);
        }
        await NewsModel.commit();
        res.redirect('/admin/news?success=update');
    } catch (err) {
        await NewsModel.rollback();
        console.error(err);
        allNewFiles.forEach(f => fs.unlink(f.path, () => {}));
        res.status(500).send("Error updating: " + err.message);
    }
};

exports.deleteNews = async (req, res) => {
    const newsId = req.params.id;
    try {
        const files = await AttachmentModel.getByNewsId(newsId);
        await NewsModel.deleteNews(newsId); // Cascade delete? Assuming no foreign key cascade for files in DB based on code manually deleting files.
        // But the original code deleted files from DB via cascade? No, it did manual delete.
        // Wait, original code:
        /*
        const [files] = await db.query('SELECT file_path FROM attachments WHERE news_id = ?', [newsId]);
        await db.query('DELETE FROM news WHERE id = ?', [newsId]);
        files.forEach(...)
        */
        // If the DB has ON DELETE CASCADE, the attachments in DB are gone when news is deleted.
        // But we still need to delete files from disk.
        
        files.forEach(f => {
            const fullPath = path.join(__dirname, '..', f.file_path);
            if (fs.existsSync(fullPath)) fs.unlink(fullPath, () => {});
        });
        
        // If manual delete from DB is needed (no cascade):
        // await AttachmentModel.deleteByNewsId(newsId);
        // But assuming the original code `DELETE FROM news` was sufficient, maybe it has cascade or it doesn't matter if orphan records exist? 
        // Actually original code didn't delete attachments explicitly from DB. It just deleted news.
        // If there is a foreign key constraint without cascade, `DELETE FROM news` would fail.
        // So I assume there is ON DELETE CASCADE or no FK.
        
        res.redirect('/admin/news?success=delete');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error deleting news');
    }
};
