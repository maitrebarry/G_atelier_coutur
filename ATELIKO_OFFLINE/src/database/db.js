import SQLite from 'react-native-sqlite-storage';

SQLite.DEBUG(false);
SQLite.enablePromise(true);

let database;

export async function getDatabase() {
  if (!database) {
    database = await SQLite.openDatabase({
      name: 'ateliko_offline.db',
      location: 'default',
    });
  }
  return database;
}

export async function execute(sql, params = []) {
  const db = await getDatabase();
  const [result] = await db.executeSql(sql, params);
  return result;
}

export async function query(sql, params = []) {
  const result = await execute(sql, params);
  const rows = [];
  for (let i = 0; i < result.rows.length; i += 1) {
    rows.push(result.rows.item(i));
  }
  return rows;
}

export async function transaction(work) {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    db.transaction(
      tx => work(tx, resolve, reject),
      error => reject(error),
    );
  });
}
