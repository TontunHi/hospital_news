const db = require('../db');

async function fixEncoding() {
    try {
        console.log("Fixing Database Encoding...");
        
        // Disable FK checks to prevent constraint errors during conversion
        await db.query('SET FOREIGN_KEY_CHECKS=0');

        // 1. Fix Database Default
        try {
            await db.query(`ALTER DATABASE ${process.env.DB_NAME} CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci`);
            console.log("Database default charset updated.");
        } catch (e) {
            console.log("⚠️  Skipping ALTER DATABASE:", e.message);
        }

        // 2. Fix Tables
        const tables = ['users', 'news', 'attachments'];
        for (const table of tables) {
            try {
                await db.query(`ALTER TABLE ${table} CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
                console.log(`✅ Table '${table}' converted to utf8mb4.`);
            } catch (e) {
                console.error(`❌ Failed to convert table '${table}':`, e.message);
            }
        }

        // Re-enable FK checks
        await db.query('SET FOREIGN_KEY_CHECKS=1');
        console.log("Encoding fix procedure completed.");
    } catch (err) {
        console.error("Fatal Error:", err);
    } finally {
        process.exit();
    }
}

fixEncoding();
