const db = require('../db');

async function testEncoding() {
    console.log('Testing DB Encoding...');
    const testTitle = 'ทดสอบภาษาไทย ' + Date.now();
    const testSlug = 'test-utf8-' + Date.now();
    
    try {
        const pool = db;
        
        // 1. Insert
        console.log(`Inserting: "${testTitle}"`);
        const [result] = await pool.query(
            'INSERT INTO news (title, slug, category, start_date, end_date) VALUES (?, ?, ?, NOW(), NOW())',
            [testTitle, testSlug, 'Test',]
        );
        console.log('Insert ID:', result.insertId);

        // 2. Select
        const [rows] = await pool.query('SELECT title FROM news WHERE id = ?', [result.insertId]);
        const fetchedTitle = rows[0].title;
        
        console.log(`Fetched:   "${fetchedTitle}"`);
        
        if (fetchedTitle === testTitle) {
            console.log('✅ Encoding Test PASSED: Strings match.');
        } else {
            console.log('❌ Encoding Test FAILED: Strings do NOT match.');
            console.log('Expected:', Buffer.from(testTitle).toString('hex'));
            console.log('Actual:  ', Buffer.from(fetchedTitle).toString('hex'));
        }

        // Cleanup
        await pool.query('DELETE FROM news WHERE id = ?', [result.insertId]);

    } catch (err) {
        console.error('Test Error:', err);
    } finally {
        // We can't easily close the pool if it's exported as promise pool without access to end(), 
        // but for a script it will exit eventually or we force exit.
        process.exit();
    }
}

testEncoding();
