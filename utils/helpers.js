const createSlug = (title) => {
    if (!title) return '';
    let slug = title.trim();
    slug = slug.replace(/[\s\/\(\)\?]+/g, '-');
    slug = slug.replace(/^-+|-+$/g, '');
    return slug;
};

module.exports = { createSlug };
