-- Migration to add authid field to AuditLog table
-- This adds user tracking to the audit log system

USE lagerbank;

-- Add authid column to AuditLog table
ALTER TABLE AuditLog ADD COLUMN authid VARCHAR(100) AFTER details;

-- Add index for better performance on authid queries
CREATE INDEX idx_auditlog_authid ON AuditLog(authid);

-- Update existing records to have a default authid
UPDATE AuditLog SET authid = 'system' WHERE authid IS NULL;

-- Add comment to document the change
ALTER TABLE AuditLog COMMENT = 'Audit log with user authentication tracking';
