-- Create Database
CREATE DATABASE IF NOT EXISTS hospital_news CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hospital_news;
-- Table: users
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Table: news
CREATE TABLE IF NOT EXISTS news (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    youtube_link VARCHAR(500) DEFAULT NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    view_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_start_date (start_date),
    INDEX idx_end_date (end_date)
);
-- Table: attachments
CREATE TABLE IF NOT EXISTS attachments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    news_id INT NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    file_type ENUM('image', 'pdf') NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (news_id) REFERENCES news(id) ON DELETE CASCADE
);
-- Insert Default Admin User (username: admin, password: password123)
-- SHA256('password123') = ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f
INSERT INTO users (username, password_hash, email) 
VALUES ('user', 'password before sha256', '@gmail.com')
ON DUPLICATE KEY UPDATE id=id;


# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASS=
DB_NAME=hospital_news

# Server Configuration
PORT=3000
SESSION_SECRET=

# Email Configuration (Nodemailer)
# Service examples: 'gmail', 'hotmail', etc.
EMAIL_SERVICE=gmail
EMAIL_USER=@gmail.com
EMAIL_PASS=tsfi tpfj dxby eawu
