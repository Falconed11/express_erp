const SYSTEM_KEY = "OPERASIONAL_KANTOR";

async function findOrCreateByName(
  trx,
  table,
  name,
  values = {},
  matchValues = {},
) {
  const existing = await trx(table)
    .where({ nama: name, ...matchValues })
    .first();
  if (existing) return existing;

  await trx(table).insert({ nama: name, ...values });
  return trx(table).where({ nama: name }).first();
}

async function findOrCreateExpression(trx, { name, filterType, filterId }) {
  const existing = await trx("jurnal_expression")
    .where({ nama: name, filter_type: filterType, id_filter: filterId })
    .first();
  if (existing) return existing;

  await trx("jurnal_expression").insert({
    nama: name,
    filter_type: filterType,
    id_filter: filterId,
    aktif: true,
    keterangan: "System default",
  });
  return trx("jurnal_expression")
    .where({ nama: name, filter_type: filterType, id_filter: filterId })
    .first();
}

async function ensureFormExpression(
  trx,
  formId,
  expressionId,
  inputType,
  sortOrder,
) {
  const existing = await trx("jurnal_form_expression")
    .where({
      id_jurnal_form: formId,
      input_type: inputType,
    })
    .first();
  if (existing) return existing;

  await trx("jurnal_form_expression").insert({
    id_jurnal_form: formId,
    id_jurnal_expression: expressionId,
    input_type: inputType,
    sort_order: sortOrder,
    aktif: true,
    keterangan: "System default",
  });
  return trx("jurnal_form_expression")
    .where({ id_jurnal_form: formId, input_type: inputType })
    .first();
}

export async function up(knex) {
  await knex.transaction(async (trx) => {
    const aktivaLancar = await findOrCreateByName(
      trx,
      "coa_type",
      "Aktiva Lancar",
      { normal_balance: 1, aktif: true, keterangan: "System default" },
    );
    const biayaOperasional = await findOrCreateByName(
      trx,
      "coa_type",
      "Biaya Operasional",
      { normal_balance: 0, aktif: true, keterangan: "System default" },
    );
    const operasionalSubtype = await findOrCreateByName(
      trx,
      "coa_subtype",
      "Operasional Kantor",
      {
        id_coa_type: biayaOperasional.id,
        aktif: true,
        keterangan: "System default",
      },
      { id_coa_type: biayaOperasional.id },
    );

    const kreditExpression = await findOrCreateExpression(trx, {
      name: "Kas",
      filterType: "type",
      filterId: aktivaLancar.id,
    });
    const debitExpression = await findOrCreateExpression(trx, {
      name: "Operasional Kantor",
      filterType: "subtype",
      filterId: operasionalSubtype.id,
    });
    const form = await trx("jurnal_form")
      .where({ system_key: SYSTEM_KEY })
      .first();

    if (!form) {
      throw new Error(`System form ${SYSTEM_KEY} was not found`);
    }

    await ensureFormExpression(trx, form.id, kreditExpression.id, "kredit", 1);
    await ensureFormExpression(trx, form.id, debitExpression.id, "debit", 2);
  });
}

export async function down() {
  // Keep system defaults intact during rollback; they may already be used by data.
}
