-- ======================================================
-- Rollback Database Improvements
-- Version: 1.0
-- Created: 2025-01-03
-- ======================================================

USE lagerbank;

-- ======================================================
-- Disable Event Scheduler and Drop Events
-- ======================================================
SET GLOBAL event_scheduler = OFF;
DROP EVENT IF EXISTS cleanup_old_logs;

-- ======================================================
-- Drop Views
-- ======================================================
DROP VIEW IF EXISTS ActiveParticipants;
DROP VIEW IF EXISTS TransactionSummary;

-- ======================================================
-- Drop Triggers
-- ======================================================
DROP TRIGGER IF EXISTS participant_audit_insert;
DROP TRIGGER IF EXISTS participant_audit_update;
DROP TRIGGER IF EXISTS transaction_audit_insert;

-- ======================================================
-- Drop Stored Procedures
-- ======================================================
DROP PROCEDURE IF EXISTS GetParticipantBalance;
DROP PROCEDURE IF EXISTS GetCampStatistics;
DROP PROCEDURE IF EXISTS CleanupExpiredCache;

-- ======================================================
-- Drop New Tables
-- ======================================================
DROP TABLE IF EXISTS CacheEntries;
DROP TABLE IF EXISTS PerformanceMetrics;
DROP TABLE IF EXISTS ErrorLog;

-- ======================================================
-- Drop Indexes
-- ======================================================

-- Participant table indexes
DROP INDEX IF EXISTS idx_participant_camp_id ON Participant;
DROP INDEX IF EXISTS idx_participant_barcode ON Participant;
DROP INDEX IF EXISTS idx_participant_staff ON Participant;
DROP INDEX IF EXISTS idx_participant_checked_in ON Participant;
DROP INDEX IF EXISTS idx_participant_name ON Participant;
DROP INDEX IF EXISTS idx_participant_tn_id ON Participant;

-- Product table indexes
DROP INDEX IF EXISTS idx_product_name ON Product;
DROP INDEX IF EXISTS idx_product_barcode ON Product;
DROP INDEX IF EXISTS idx_product_price ON Product;

-- Transaction table indexes (skip foreign key constraint indexes)
-- DROP INDEX IF EXISTS idx_transaction_participant ON Transaction; -- Skip: needed for FK
-- DROP INDEX IF EXISTS idx_transaction_product ON Transaction; -- Skip: needed for FK
-- DROP INDEX IF EXISTS idx_transaction_camp ON Transaction; -- Skip: needed for FK
DROP INDEX IF EXISTS idx_transaction_created ON Transaction;
DROP INDEX IF EXISTS idx_transaction_storno ON Transaction;
DROP INDEX IF EXISTS idx_transaction_cancelled ON Transaction;
-- DROP INDEX IF EXISTS idx_transaction_participant_camp ON Transaction; -- Skip: composite FK index
DROP INDEX IF EXISTS idx_transaction_created_camp ON Transaction;

-- Camp table indexes
DROP INDEX IF EXISTS idx_camp_active ON Camp;
DROP INDEX IF EXISTS idx_camp_year ON Camp;
DROP INDEX IF EXISTS idx_camp_dates ON Camp;

-- AuditLog table indexes
DROP INDEX IF EXISTS idx_audit_action ON AuditLog;
DROP INDEX IF EXISTS idx_audit_entity ON AuditLog;
-- DROP INDEX IF EXISTS idx_audit_camp ON AuditLog; -- Skip: needed for FK
DROP INDEX IF EXISTS idx_audit_created ON AuditLog;

-- ======================================================
-- Reset MySQL Settings to Default
-- ======================================================
SET GLOBAL query_cache_type = 0;
SET GLOBAL slow_query_log = 0;

-- ======================================================
-- Completion Message
-- ======================================================
SELECT 'Database improvements rolled back successfully! ↩️' as status;
