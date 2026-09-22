import db from "../../config/knex.js";

const SYSTEM_KEYS = {
  OPERASIONAL_KANTOR: "OPERASIONAL_KANTOR",
  HPP: "HPP",
};

const seedDefinitions = [
  {
    key: SYSTEM_KEYS.OPERASIONAL_KANTOR,
    label: "Operasional Kantor",
  },
  {
    key: SYSTEM_KEYS.HPP,
    label: "HPP",
  },
];

const findOrCreateByName = async (
  trx,
  table,
  name,
  values,
  matchValues = {},
) => {
  let row = await trx(table)
    .where({ nama: name, ...matchValues })
    .first();
  if (!row) {
    await trx(table).insert({ nama: name, ...values });
    row = await trx(table)
      .where({ nama: name, ...matchValues })
      .first();
  }
  return row;
};

const findOrCreateExpression = async (trx, values) => {
  let row = await trx("jurnal_expression").where(values).first();
  if (!row) {
    await trx("jurnal_expression").insert({
      ...values,
      aktif: true,
      keterangan: "System default",
    });
    row = await trx("jurnal_expression").where(values).first();
  }
  return row;
};

const ensureFormExpression = async (
  trx,
  idJurnalForm,
  idJurnalExpression,
  inputType,
  sortOrder,
) => {
  let row = await trx("jurnal_form_expression")
    .where({ id_jurnal_form: idJurnalForm, input_type: inputType })
    .first();
  if (row) {
    await trx("jurnal_form_expression").where({ id: row.id }).update({
      id_jurnal_expression: idJurnalExpression,
      sort_order: sortOrder,
      aktif: true,
    });
  } else {
    await trx("jurnal_form_expression").insert({
      id_jurnal_form: idJurnalForm,
      id_jurnal_expression: idJurnalExpression,
      input_type: inputType,
      sort_order: sortOrder,
      aktif: true,
      keterangan: "System default",
    });
    row = await trx("jurnal_form_expression")
      .where({ id_jurnal_form: idJurnalForm, input_type: inputType })
      .first();
  }
  return row;
};

const ensureOperationalOffice = async (trx) => {
  const aktivaLancar = await findOrCreateByName(
    trx,
    "coa_type",
    "Aktiva Lancar",
    {
      normal_balance: 1,
      aktif: true,
      keterangan: "System default",
    },
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
  const form = await findOrCreateByName(
    trx,
    "jurnal_form",
    "Operasional Kantor",
    {
      system_key: SYSTEM_KEYS.OPERASIONAL_KANTOR,
      extra_fields: JSON.stringify([]),
      keterangan: "System default",
      aktif: true,
    },
  );
  if (!form.system_key) {
    await trx("jurnal_form")
      .where({ id: form.id })
      .update({ system_key: SYSTEM_KEYS.OPERASIONAL_KANTOR });
  }
  const kasExpression = await findOrCreateExpression(trx, {
    nama: "Kas",
    filter_type: "type",
    id_filter: aktivaLancar.id,
  });
  const debitExpression = await findOrCreateExpression(trx, {
    nama: "Operasional Kantor",
    filter_type: "subtype",
    id_filter: operasionalSubtype.id,
  });
  await ensureFormExpression(trx, form.id, kasExpression.id, "kredit", 1);
  await ensureFormExpression(trx, form.id, debitExpression.id, "debit", 2);
};

const ensureHpp = async (trx) => {
  const hppType = await findOrCreateByName(trx, "coa_type", "HPP", {
    normal_balance: 0,
    aktif: true,
    keterangan: "System default",
  });
  const hppSubtype = await findOrCreateByName(
    trx,
    "coa_subtype",
    "HPP",
    { id_coa_type: hppType.id, aktif: true, keterangan: "System default" },
    { id_coa_type: hppType.id },
  );
  const hppCoa = await findOrCreateByName(trx, "coa", "HPP", {
    id_coa_subtype: hppSubtype.id,
    aktif: true,
    keterangan: "System default",
  });
  const form = await findOrCreateByName(trx, "jurnal_form", "HPP", {
    system_key: SYSTEM_KEYS.HPP,
    extra_fields: JSON.stringify([]),
    keterangan: "System default",
    aktif: true,
  });
  if (!form.system_key) {
    await trx("jurnal_form")
      .where({ id: form.id })
      .update({ system_key: SYSTEM_KEYS.HPP });
  }
  const kasExpression = await findOrCreateExpression(trx, { nama: "Kas" });
  const hppExpression = await findOrCreateExpression(trx, {
    nama: "HPP",
    filter_type: "coa",
    id_filter: hppCoa.id,
  });
  await ensureFormExpression(trx, form.id, kasExpression.id, "kredit", 1);
  await ensureFormExpression(trx, form.id, hppExpression.id, "debit", 2);
};

const checkSeed = async (trx, definition) => {
  const form = await trx("jurnal_form")
    .where({ system_key: definition.key, aktif: true })
    .first();
  const details = [];
  if (!form) details.push("System journal form is missing or inactive.");

  if (definition.key === SYSTEM_KEYS.OPERASIONAL_KANTOR) {
    const type = await trx("coa_type")
      .where({ nama: "Aktiva Lancar", aktif: true })
      .first();
    const biayaType = await trx("coa_type")
      .where({ nama: "Biaya Operasional", aktif: true })
      .first();
    const subtype = await trx("coa_subtype")
      .where({ nama: "Operasional Kantor", aktif: true })
      .first();
    const expressions = form
      ? await trx("jurnal_form_expression").where({
          id_jurnal_form: form.id,
          aktif: true,
        })
      : [];
    if (!type) details.push("Aktiva Lancar COA type is missing.");
    if (!biayaType) details.push("Biaya Operasional COA type is missing.");
    if (!subtype) details.push("Operasional Kantor COA subtype is missing.");
    if (subtype && biayaType && subtype.id_coa_type !== biayaType.id)
      details.push("Operasional Kantor subtype has the wrong parent type.");
    const expressionRows = await Promise.all(
      expressions.map(async (row) => ({
        ...row,
        expression: await trx("jurnal_expression")
          .where({ id: row.id_jurnal_expression })
          .first(),
      })),
    );
    const kredit = expressionRows.find((row) => row.input_type === "kredit");
    const debit = expressionRows.find((row) => row.input_type === "debit");
    if (
      !kredit ||
      !kredit.expression ||
      kredit.expression.nama !== "Kas" ||
      kredit.expression.filter_type !== "type" ||
      kredit.expression.id_filter !== type?.id
    )
      details.push("Kredit expression is incorrect.");
    if (
      !debit ||
      !debit.expression ||
      debit.expression.nama !== "Operasional Kantor" ||
      debit.expression.filter_type !== "subtype" ||
      debit.expression.id_filter !== subtype?.id
    )
      details.push("Debit expression is incorrect.");
  } else {
    const coa = await trx("coa").where({ nama: "HPP", aktif: true }).first();
    const expressions = form
      ? await trx("jurnal_form_expression").where({
          id_jurnal_form: form.id,
          aktif: true,
        })
      : [];
    if (!coa) details.push("HPP COA is missing.");
    const expressionRows = await Promise.all(
      expressions.map(async (row) => ({
        ...row,
        expression: await trx("jurnal_expression")
          .where({ id: row.id_jurnal_expression })
          .first(),
      })),
    );
    const kredit = expressionRows.find((row) => row.input_type === "kredit");
    const debit = expressionRows.find((row) => row.input_type === "debit");
    if (!kredit || !kredit.expression || kredit.expression.nama !== "Kas")
      details.push("Kredit expression is incorrect.");
    if (
      !debit ||
      !debit.expression ||
      debit.expression.nama !== "HPP" ||
      debit.expression.filter_type !== "coa" ||
      debit.expression.id_filter !== coa?.id
    )
      details.push("Debit expression is incorrect.");
  }

  return {
    key: definition.key,
    label: definition.label,
    status: details.length === 0 ? "correct" : "wrong",
    details,
  };
};

const Service = {
  async check() {
    return db.transaction(async (trx) => ({
      seeds: await Promise.all(
        seedDefinitions.map((definition) => checkSeed(trx, definition)),
      ),
    }));
  },

  async apply() {
    return db.transaction(async (trx) => {
      await ensureOperationalOffice(trx);
      await ensureHpp(trx);
      return {
        seeds: await Promise.all(
          seedDefinitions.map((definition) => checkSeed(trx, definition)),
        ),
      };
    });
  },
};

export default Service;
