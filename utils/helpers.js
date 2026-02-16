const createSlug = (title) => {
    if (!title) return '';
    let slug = title.trim();
    // Replace all non-alphanumeric chars (except Thai) with -
    slug = slug.replace(/[^\u0E00-\u0E7Fa-zA-Z0-9]+/g, '-');
    slug = slug.replace(/-+/g, '-');
    slug = slug.replace(/^-+|-+$/g, '');
    return slug;
};

module.exports = { createSlug };
