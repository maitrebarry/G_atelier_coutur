import {PermissionsAndroid, Platform} from 'react-native';
import RNFS from 'react-native-fs';
import DocumentPicker from 'react-native-document-picker';
import {getDatabase, query} from '../database/db';

const BACKUP_DIR_NAME = 'Ateliko_Base_De_Donnees';
const DOWNLOAD_BACKUP_DIR = `${RNFS.DownloadDirectoryPath}/${BACKUP_DIR_NAME}`;
const INTERNAL_BACKUP_DIR = `${RNFS.DocumentDirectoryPath}/${BACKUP_DIR_NAME}`;

async function requestStoragePermission() {
  if (Platform.OS !== 'android') return true;

  if (Platform.Version >= 29) {
    return true;
  }

  const permissions = [PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE];
  permissions.push(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);

  const result = await PermissionsAndroid.requestMultiple(permissions);
  return Object.values(result).every(status => status === PermissionsAndroid.RESULTS.GRANTED);
}

export function getBackupDirectory() {
  if (Platform.OS === 'android') {
    return DOWNLOAD_BACKUP_DIR;
  }
  return INTERNAL_BACKUP_DIR;
}

async function getEffectiveBackupDirectory() {
  if (Platform.OS !== 'android') {
    return ensureDirectory(INTERNAL_BACKUP_DIR);
  }

  if (await requestStoragePermission()) {
    try {
      return await ensureDirectory(DOWNLOAD_BACKUP_DIR);
    } catch (error) {
      console.warn('Impossible de créer le dossier dans Téléchargements :', error);
    }
  }

  return ensureDirectory(INTERNAL_BACKUP_DIR);
}

async function ensureDirectory(path) {
  const exists = await RNFS.exists(path);
  if (!exists) {
    await RNFS.mkdir(path);
  }
  return path;
}

async function runSqlTransaction(callback) {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    db.transaction(
      tx => {
        try {
          callback(tx);
        } catch (err) {
          reject(err);
        }
      },
      reject,
      resolve,
    );
  });
}

function quoteIdentifier(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export async function exportDatabaseToDownloads() {
  const backupDir = await getEffectiveBackupDirectory();

  const tables = await query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
  const payload = { metadata: { exportedAt: new Date().toISOString(), platform: Platform.OS }, tables: {} };

  for (const table of tables) {
    const name = table.name;
    const rows = await query(`SELECT * FROM ${quoteIdentifier(name)}`);
    payload.tables[name] = rows;
  }

  const filename = `ateliko_db_export_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const filePath = `${backupDir}/${filename}`;
  await RNFS.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');
  return filePath;
}

export async function listBackupFiles() {
  const backupDir = await getEffectiveBackupDirectory();
  const exists = await RNFS.exists(backupDir);
  if (!exists) return [];
  const files = await RNFS.readDir(backupDir);
  return files
    .filter(file => file.isFile() && file.name.endsWith('.json'))
    .sort((a, b) => {
      const aTime = a.mtime ? new Date(a.mtime).getTime() : 0;
      const bTime = b.mtime ? new Date(b.mtime).getTime() : 0;
      return bTime - aTime;
    });
}

export async function importDatabaseFromDownloads() {
  let fileUri;
  let fileName;

  try {
    const res = await DocumentPicker.pickSingle({
      type: [DocumentPicker.types.allFiles],
    });
    fileUri = res.uri;
    fileName = res.name;
  } catch (err) {
    if (DocumentPicker.isCancel(err)) {
      throw new Error('Importation annulée.');
    }
    throw new Error('Impossible de sélectionner le fichier.');
  }

  const text = await RNFS.readFile(fileUri, 'utf8');
  let backup;
  try {
    backup = JSON.parse(text);
  } catch (e) {
    throw new Error('Le fichier sélectionné n\'est pas un fichier de sauvegarde valide.');
  }

  if (!backup || !backup.tables) {
    throw new Error('Fichier de sauvegarde invalide (structure incorrecte).');
  }

  await runSqlTransaction(tx => {
    tx.executeSql('PRAGMA foreign_keys = OFF');
    for (const tableName of Object.keys(backup.tables)) {
      const rows = backup.tables[tableName] || [];
      const tableIdentifier = quoteIdentifier(tableName);
      tx.executeSql(`DELETE FROM ${tableIdentifier}`);
      if (!rows.length) continue;

      const columns = Object.keys(rows[0]).map(quoteIdentifier).join(', ');
      const placeholders = Object.keys(rows[0]).map(() => '?').join(', ');
      const insertSql = `INSERT INTO ${tableIdentifier} (${columns}) VALUES (${placeholders})`;
      rows.forEach(row => {
        const values = Object.keys(row).map(key => row[key]);
        tx.executeSql(insertSql, values);
      });
    }
    tx.executeSql('PRAGMA foreign_keys = ON');
  });

  return fileName;
}
