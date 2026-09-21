const FORM_NAME = "HPP";
const SYSTEM_KEY = "HPP";

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
  return trx(table)
    .where({ nama: name, ...matchValues })
    .first();
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
    .where({ id_jurnal_form: formId, input_type: inputType })
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
    const hppType = await findOrCreateByName(trx, "coa_type", "HPP", {
      normal_balance: 0,
      aktif: true,
      keterangan: "System default",
    });
    const hppSubtype = await findOrCreateByName(
      trx,
      "coa_subtype",
      "HPP",
      {
        id_coa_type: hppType.id,
        aktif: true,
        keterangan: "System default",
      },
      { id_coa_type: hppType.id },
    );
    const hppCoa = await findOrCreateByName(trx, "coa", "HPP", {
      id_coa_subtype: hppSubtype.id,
      aktif: true,
      keterangan: "System default",
    });

    const form = await findOrCreateByName(trx, "jurnal_form", FORM_NAME, {
      system_key: SYSTEM_KEY,
      extra_fields: JSON.stringify([]),
      keterangan: "System default",
      aktif: true,
    });
    const kasExpression = await trx("jurnal_expression")
      .where({ nama: "Kas" })
      .first();
    if (!kasExpression) throw new Error("System expression Kas was not found");

    const hppExpression = await findOrCreateExpression(trx, {
      name: "HPP",
      filterType: "coa",
      filterId: hppCoa.id,
    });

    await ensureFormExpression(trx, form.id, kasExpression.id, "kredit", 1);
    await ensureFormExpression(trx, form.id, hppExpression.id, "debit", 2);
  });
}

export async function down() {
  // Keep system defaults intact during rollback; they may already be used by data.
}
