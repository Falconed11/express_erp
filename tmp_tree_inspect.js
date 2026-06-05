import 'dotenv/config';
import Model from './src/modules/akuntansi/laporan.model.js';
try {
  const rows = await Model.getById(1, { type: 'tree' });
  console.log('rows', rows.length);
  rows.forEach((r, i) => {
    console.log(i+1, JSON.stringify({id:r.id,id_parent:r.id_parent,nama:r.nama,level:r.level,node_type:r.node_type,source_id:r.source_id,id_coa_subtype:r.id_coa_subtype,id_coa_type:r.id_coa_type,total_balance:r.total_balance}, null, 0));
  });
} catch (e) {
  console.error(e.stack);
  process.exit(1);
}
