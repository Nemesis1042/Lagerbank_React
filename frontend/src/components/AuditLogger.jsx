import { AuditLog } from '@/api/entities';

class AuditLogger {
  static async log(action, entityType, entityId = null, details = {}, campId = null) {
    try {
      console.log('[AuditLogger] Starting audit log creation:', {
        action,
        entityType,
        entityId,
        details,
        campId
      });
      
      // Sammle Browser-Informationen
      const userAgent = navigator.userAgent;
      const ipAddress = 'unknown'; // IP kann nicht direkt vom Browser abgerufen werden
      
      const auditData = {
        action,
        entity_type: entityType,
        entity_id: entityId,
        details: JSON.stringify(details),
        camp_id: campId,
        ip_address: ipAddress,
        user_agent: userAgent
      };
      
      console.log('[AuditLogger] Sending audit data to API:', auditData);
      
      const result = await AuditLog.create(auditData);
      
      console.log('[AuditLogger] Audit log created successfully:', result);
    } catch (error) {
      console.error('[AuditLogger] Fehler beim Audit-Logging:', error);
      console.error('[AuditLogger] Error details:', error.message, error.stack);
      // Fehler beim Logging sollten die App nicht blockieren
    }
  }

  // Convenience-Methoden für häufige Aktionen
  static async logTransaction(transactionId, participantName, productName, amount, campId) {
    console.log('[AuditLogger] logTransaction called with:', {
      transactionId,
      participantName,
      productName,
      amount,
      campId
    });
    
    await this.log('transaction_created', 'Transaction', transactionId, {
      participant_name: participantName,
      product_name: productName,
      amount: amount
    }, campId);
  }

  static async logParticipantCreated(participantId, participantName, campId) {
    await this.log('participant_created', 'Participant', participantId, {
      participant_name: participantName
    }, campId);
  }

  static async logBalanceTopUp(participantId, participantName, amount, campId) {
    await this.log('balance_topped_up', 'Participant', participantId, {
      participant_name: participantName,
      amount: amount
    }, campId);
  }

  static async logProductCreated(productId, productName) {
    await this.log('product_created', 'Product', productId, {
      product_name: productName
    });
  }

  static async logLogin(campId = null) {
    await this.log('admin_login', 'System', null, {}, campId);
  }

  static async logDataExport(exportType, campId) {
    await this.log('data_exported', 'System', null, {
      export_type: exportType
    }, campId);
  }
}

export default AuditLogger;
