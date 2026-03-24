const fs = require('fs');
const db = require('./db.json');

let sql = '-- Supabase Schema and Data Migration\n\n';

for (const tableName of Object.keys(db)) {
  const records = db[tableName];
  if (!records || records.length === 0) {
    // Also create table if empty but we can't infer schema easily. 
    // We will skip empty tables for now.
    continue;
  }

  const formattedTableName = tableName.replace(/-/g, '_');
  
  // Find all unique keys across all records to ensure no missing columns
  const allKeys = new Set();
  records.forEach(r => Object.keys(r).forEach(k => allKeys.add(k)));
  
  // Drop table if exists to make it rerunnable easily
  sql += `DROP TABLE IF EXISTS public."${formattedTableName}";\n`;
  sql += `CREATE TABLE public."${formattedTableName}" (\n`;
  const columns = [];
  
  for (const key of allKeys) {
    // Infer type from first non-null occurrence
    let type = 'TEXT';
    let val = null;
    for (const r of records) {
      if (r[key] !== null && r[key] !== undefined) {
        val = r[key];
        break;
      }
    }
    
    if (typeof val === 'number') type = 'NUMERIC';
    else if (typeof val === 'boolean') type = 'BOOLEAN';
    else if (Array.isArray(val) || typeof val === 'object') type = 'JSONB';
    
    let colDef = `  "${key}" ${type}`;
    if (key === 'id') colDef += ` PRIMARY KEY`;
    columns.push(colDef);
  }
  
  sql += columns.join(',\n') + '\n);\n\n';

  // Insert data
  for (const record of records) {
    const keys = [];
    const values = [];
    
    for (const key of allKeys) {
      if (record[key] !== undefined && record[key] !== null) {
        keys.push(`"${key}"`);
        let val = record[key];
        if (typeof val === 'object') {
          // Escape single quotes
          val = JSON.stringify(val).replace(/'/g, "''");
          values.push(`'${val}'::jsonb`);
        } else if (typeof val === 'string') {
          val = val.replace(/'/g, "''");
          values.push(`'${val}'`);
        } else {
          values.push(val);
        }
      }
    }
    
    if (keys.length > 0) {
      sql += `INSERT INTO public."${formattedTableName}" (${keys.join(', ')}) VALUES (${values.join(', ')});\n`;
    }
  }
  sql += '\n';
}

fs.writeFileSync('init_schema.sql', sql);
console.log('init_schema.sql generated successfully.');
