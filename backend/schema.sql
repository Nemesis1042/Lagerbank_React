-- ======================================================
-- Lagerbank Datenbank Dump
-- Version: 1.0
-- Erstellt: 2025-08-29
-- ======================================================

DROP DATABASE IF EXISTS lagerbank;
CREATE DATABASE lagerbank CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE lagerbank;

-- ======================================================
-- Tabelle: Participant
-- ======================================================
DROP TABLE IF EXISTS Participant;
CREATE TABLE Participant (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tn_id VARCHAR(50),
    name VARCHAR(100),
    barcode_id VARCHAR(100),
    balance DECIMAL(10,2) DEFAULT 0,
    initial_balance DECIMAL(10,2) DEFAULT 0,
    is_staff BOOLEAN DEFAULT 0,
    is_checked_in BOOLEAN DEFAULT 0,
    camp_id INT,
    camp_name VARCHAR(100)
);

-- ======================================================
-- Tabelle: Product
-- ======================================================
DROP TABLE IF EXISTS Product;
CREATE TABLE Product (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    icon VARCHAR(50),
    stock INT DEFAULT 0,
    barcode VARCHAR(100)
);

-- ======================================================
-- Tabelle: Camp
-- ======================================================
DROP TABLE IF EXISTS Camp;
CREATE TABLE Camp (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    start_date DATE,
    end_date DATE,
    location VARCHAR(200),
    is_active BOOLEAN DEFAULT 0,
    year INT,
    description TEXT,
    require_positive_balance BOOLEAN DEFAULT 0
);

-- ======================================================
-- Tabelle: Transaction
-- ======================================================
DROP TABLE IF EXISTS Transaction;
CREATE TABLE Transaction (
    id INT AUTO_INCREMENT PRIMARY KEY,
    participant_id INT,
    product_id INT,
    camp_id INT,
    quantity INT NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    participant_name VARCHAR(100),
    product_name VARCHAR(100),
    camp_name VARCHAR(100),
    is_storno BOOLEAN DEFAULT 0,
    is_cancelled BOOLEAN DEFAULT 0,
    original_transaction_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (participant_id) REFERENCES Participant(id),
    FOREIGN KEY (product_id) REFERENCES Product(id),
    FOREIGN KEY (camp_id) REFERENCES Camp(id)
);

-- ======================================================
-- Tabelle: AppSettings
-- ======================================================
DROP TABLE IF EXISTS AppSettings;
CREATE TABLE AppSettings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    camp_name VARCHAR(100),
    currency_symbol VARCHAR(10),
    admin_password VARCHAR(255),
    active_camp_id INT,
    active_camp_name VARCHAR(100),
    FOREIGN KEY (active_camp_id) REFERENCES Camp(id)
);

-- ======================================================
-- Tabelle: AuditLog
-- ======================================================
DROP TABLE IF EXISTS AuditLog;
CREATE TABLE AuditLog (
    id INT AUTO_INCREMENT PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(50),
    details TEXT,
    camp_id INT,
    ip_address VARCHAR(50),
    user_agent VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (camp_id) REFERENCES Camp(id)
);

-- ======================================================
-- Fertig 🎉
-- Importieren mit:
--   mysql -u <user> -p lagerbank < lagerbank.sql
-- ======================================================
