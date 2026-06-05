import 'dotenv/config';
import Model from './src/modules/akuntansi/laporan.model.js';
try {
  const rows = await Model.getById(1, { type: 'tree' });
  const counts = {};
  rows.forEach(r => { counts[r.id] = (counts[r.id] || 0) + 1; });
  const dups = Object.entries(counts).filter(([id,c]) => c > 1);
  console.log('rows', rows.length, 'dups', dups.length, JSON.stringify(dups.slice(0,20)));
  if (dups.length) console.log(JSON.stringify(rows.filter(r => dups.some(([id]) => id === String(r.id))).slice(0,50), null, 2));
} catch (e) {
  console.error(e.stack);
  process.exit(1);
}
