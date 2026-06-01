import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  setDoc, 
  deleteDoc, 
  serverTimestamp, 
  addDoc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AuditService } from './AuditService';

export interface BackupRecord {
  backupId: string;
  timestamp: string; // ISO String
  createdBy: string;
  type: 'manual' | 'auto';
  summary: {
    usersCount: number;
    storesCount: number;
    dreCount: number;
    cmvCount: number;
    submissionsCount: number;
    plansCount: number;
  };
  payload: {
    users: any[];
    stores: any[];
    subcollections: {
      [storeId: string]: {
        dre_periods: any[];
        cmv_periods: any[];
        checklist_submissions: any[];
        checklists: {
          templates?: any;
          action_plans?: any;
        };
      };
    };
  };
}

export const BackupService = {
  /**
   * Helper to clean undef objects before saving to firestore
   */
  sanitizeData(val: any): any {
    if (val === undefined) return null;
    if (val === null) return null;
    if (Array.isArray(val)) {
      return val.map(v => this.sanitizeData(v));
    }
    if (typeof val === 'object') {
      const cleaned: any = {};
      for (const [k, v] of Object.entries(val)) {
        cleaned[k] = this.sanitizeData(v);
      }
      return cleaned;
    }
    return val;
  },

  /**
   * Performs a full backup of all core database collections in Firestore
   */
  async createBackup(username: string, type: 'manual' | 'auto' = 'manual'): Promise<BackupRecord> {
    try {
      console.log(`Starting ${type} backup process initiated by ${username}...`);
      
      // 1. Fetch all users
      const usersSnap = await getDocs(collection(db, 'users'));
      const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // 2. Fetch all stores
      const storesSnap = await getDocs(collection(db, 'stores'));
      const stores = storesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Store IDs to iterate over
      const storeIds = ['1', '2', '3', 'admin-global'];
      const subcollections: BackupRecord['payload']['subcollections'] = {};

      let dreCount = 0;
      let cmvCount = 0;
      let submissionsCount = 0;
      let plansCount = 0;

      // 3. Drill down into store subcollections
      for (const storeId of storeIds) {
        // Fetch dre_periods
        const dreSnap = await getDocs(collection(db, 'stores', storeId, 'dre_periods'));
        const dre_periods = dreSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        dreCount += dre_periods.length;

        // Fetch cmv_periods
        const cmvSnap = await getDocs(collection(db, 'stores', storeId, 'cmv_periods'));
        const cmv_periods = cmvSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        cmvCount += cmv_periods.length;

        // Fetch checklist_submissions
        const subSnap = await getDocs(collection(db, 'stores', storeId, 'checklist_submissions'));
        const checklist_submissions = subSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        submissionsCount += checklist_submissions.length;

        // Fetch any templates or action plans in checklists parent doc
        const checklists: any = {};
        try {
          const templatesSnap = await getDoc(doc(db, 'stores', storeId, 'checklists', 'templates'));
          if (templatesSnap.exists()) {
            checklists.templates = templatesSnap.data();
          }
          const plansSnap = await getDoc(doc(db, 'stores', storeId, 'checklists', 'action_plans'));
          if (plansSnap.exists()) {
            checklists.action_plans = plansSnap.data();
            plansCount += (plansSnap.data().data || []).length;
          }
        } catch (e) {
          console.warn(`Could not read checklist configurations for store ${storeId}:`, e);
        }

        subcollections[storeId] = {
          dre_periods,
          cmv_periods,
          checklist_submissions,
          checklists
        };
      }

      const backupId = `bkp_${Date.now()}`;
      const timestamp = new Date().toISOString();

      const backup: BackupRecord = {
        backupId,
        timestamp,
        createdBy: username,
        type,
        summary: {
          usersCount: users.length,
          storesCount: stores.length,
          dreCount,
          cmvCount,
          submissionsCount,
          plansCount
        },
        payload: {
          users,
          stores,
          subcollections
        }
      };

      // 4. Save to /backups/{backupId} in Firestore
      const backupRef = doc(db, 'backups', backupId);
      // We sanitize undefined fields in the backup tree so Firestore setDoc does not throw
      await setDoc(backupRef, this.sanitizeData(backup));

      // 5. Log activity in Audit Logs
      await AuditService.logAction({
        userId: 'system',
        userName: username,
        userRole: 'ADMIN',
        action: type === 'auto' ? 'SYSTEM_AUTO_BACKUP' : 'SYSTEM_MANUAL_BACKUP',
        description: `Realizou backup de segurança da base do Firestore (${users.length} usuários, ${stores.length} unidades, ${dreCount} DREs, ${cmvCount} CMVs, ${submissionsCount} Checklists). ID: ${backupId}.`,
        storeCode: 'ROOT',
        storeName: 'Central de Segurança'
      }).catch(e => console.error("Error logging backup event:", e));

      // Executa a limpeza preventiva de backups automáticos antigos
      try {
        await BackupService.cleanupOldAutoBackups(username);
      } catch (cleanupErr) {
        console.warn("Falha não-bloqueante ao executar limpeza dos backups automáticos antigos:", cleanupErr);
      }

      return backup;
    } catch (err) {
      console.error("Critical error producing backup file:", err);
      throw err;
    }
  },

  /**
   * Cleans up automatic backups older than 7 days
   */
  async cleanupOldAutoBackups(username: string): Promise<number> {
    try {
      console.log("Iniciando varredura preventiva de backups automáticos consolidados > 7 dias...");
      const backupsSnap = await getDocs(collection(db, 'backups'));
      const now = Date.now();
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
      let deletedCount = 0;

      for (const docSnap of backupsSnap.docs) {
        const data = docSnap.data();
        if (data.type === 'auto' && data.timestamp) {
          const timestampTime = new Date(data.timestamp).getTime();
          if (now - timestampTime > SEVEN_DAYS_MS) {
            console.log(`Purgando backup automático legado expirado (ID: ${docSnap.id}) de data ${data.timestamp}`);
            await deleteDoc(docSnap.ref);
            deletedCount++;
          }
        }
      }

      if (deletedCount > 0) {
        await AuditService.logAction({
          userId: 'system',
          userName: username,
          userRole: 'ADMIN',
          action: 'BACKUP_DELETE',
          description: `Rotina de Limpeza: Excluiu permanentemente ${deletedCount} backup(s) automático(s) que superaram a janela de retenção de 7 dias para economia de espaço e custos no Firestore.`,
          storeCode: 'ROOT',
          storeName: 'Central de Segurança'
        }).catch(e => console.error("Erro ao auditar deleção na rotina:", e));
      }

      return deletedCount;
    } catch (err) {
      console.error("Falha crítica no descarte de backups antigos:", err);
      throw err;
    }
  },

  /**
   * Fetches the inventory of backups stored in the Firestore `/backups` collection
   */
  async fetchBackupsList(): Promise<Omit<BackupRecord, 'payload'>[]> {
    try {
      const backupsSnap = await getDocs(collection(db, 'backups'));
      const list = backupsSnap.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          backupId: data.backupId,
          timestamp: data.timestamp,
          createdBy: data.createdBy,
          type: data.type || 'manual',
          summary: data.summary || {
            usersCount: 0,
            storesCount: 0,
            dreCount: 0,
            cmvCount: 0,
            submissionsCount: 0,
            plansCount: 0
          }
        };
      });

      // Sort by newest first
      return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (err) {
      console.error("Error loading backups registry:", err);
      return [];
    }
  },

  /**
   * Loads a specific backup from the Firestore collection
   */
  async getBackupById(backupId: string): Promise<BackupRecord | null> {
    try {
      const docSnap = await getDoc(doc(db, 'backups', backupId));
      if (docSnap.exists()) {
        return docSnap.data() as BackupRecord;
      }
      return null;
    } catch (err) {
      console.error("Error fetching backup detail:", err);
      return null;
    }
  },

  /**
   * Deletes a backup record
   */
  async deleteBackup(backupId: string, username: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'backups', backupId));
      await AuditService.logAction({
        userId: 'system',
        userName: username,
        userRole: 'ADMIN',
        action: 'BACKUP_DELETE',
        description: `Excluiu o registro de backup de segurança '${backupId}' do Firestore.`,
        storeCode: 'ROOT',
        storeName: 'Central de Segurança'
      }).catch(e => console.error(e));
    } catch (err) {
      console.error("Error deleting backup:", err);
      throw err;
    }
  },

  /**
   * Restores a backup payload into the live Firestore database
   */
  async restoreBackup(backup: BackupRecord, username: string): Promise<void> {
    try {
      console.log(`Starting database restoration checkpoint: ${backup.backupId} by ${username}...`);
      
      const payload = backup.payload;

      // 1. Restore Users
      if (payload.users && Array.isArray(payload.users)) {
        for (const user of payload.users) {
          if (!user.id) continue;
          const userRef = doc(db, 'users', user.id);
          const { id, ...data } = user;
          await setDoc(userRef, this.sanitizeData(data));
        }
      }

      // 2. Restore Stores
      if (payload.stores && Array.isArray(payload.stores)) {
        for (const store of payload.stores) {
          if (!store.id) continue;
          const storeRef = doc(db, 'stores', store.id);
          const { id, ...data } = store;
          await setDoc(storeRef, this.sanitizeData(data));
        }
      }

      // 3. Restore Store Subcollections
      if (payload.subcollections) {
        for (const [storeId, collections] of Object.entries(payload.subcollections)) {
          // A. Restore dre_periods
          if (collections.dre_periods && Array.isArray(collections.dre_periods)) {
            for (const dre of collections.dre_periods) {
              if (!dre.id) continue;
              const dreRef = doc(db, 'stores', storeId, 'dre_periods', dre.id);
              const { id, ...data } = dre;
              await setDoc(dreRef, this.sanitizeData(data));
            }
          }

          // B. Restore cmv_periods
          if (collections.cmv_periods && Array.isArray(collections.cmv_periods)) {
            for (const cmv of collections.cmv_periods) {
              if (!cmv.id) continue;
              const cmvRef = doc(db, 'stores', storeId, 'cmv_periods', cmv.id);
              const { id, ...data } = cmv;
              await setDoc(cmvRef, this.sanitizeData(data));
            }
          }

          // C. Restore checklist_submissions
          if (collections.checklist_submissions && Array.isArray(collections.checklist_submissions)) {
            for (const sub of collections.checklist_submissions) {
              if (!sub.id) continue;
              const subRef = doc(db, 'stores', storeId, 'checklist_submissions', sub.id);
              const { id, ...data } = sub;
              await setDoc(subRef, this.sanitizeData(data));
            }
          }

          // D. Restore checklists (templates and action plans)
          if (collections.checklists) {
            if (collections.checklists.templates) {
              const templatesRef = doc(db, 'stores', storeId, 'checklists', 'templates');
              await setDoc(templatesRef, this.sanitizeData(collections.checklists.templates));
            }
            if (collections.checklists.action_plans) {
              const plansRef = doc(db, 'stores', storeId, 'checklists', 'action_plans');
              await setDoc(plansRef, this.sanitizeData(collections.checklists.action_plans));
            }
          }
        }
      }

      // 4. Log event to Audit log
      await AuditService.logAction({
        userId: 'system',
        userName: username,
        userRole: 'ADMIN',
        action: 'SYSTEM_RESTORE',
        description: `RESTAURAÇÃO COMPLETA DE DADOS REALIZADA! A base foi restaurada com sucesso a partir do ponto de backup do dia ${new Date(backup.timestamp).toLocaleString('pt-BR')} criado por ${backup.createdBy}. ID: ${backup.backupId}.`,
        storeCode: 'ROOT',
        storeName: 'Central de Segurança'
      }).catch(e => console.error("Error logging restore event:", e));

    } catch (err) {
      console.error("Failed to restore backup:", err);
      throw err;
    }
  }
};
