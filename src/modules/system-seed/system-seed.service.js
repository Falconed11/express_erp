import db from "../../config/knex.js";

const SYSTEM_KEYS = {
  OPERASIONAL_KANTOR: "OPERASIONAL_KANTOR",
  HPP: "HPP",
  PENDAPATAN: "PENDAPATAN",
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
  {
    key: SYSTEM_KEYS.PENDAPATAN,
    label: "Pendapatan",
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
  } else if (
    values.aktif !== undefined &&
    Number(row.aktif) !== Number(values.aktif)
  ) {
    await trx(table).where({ id: row.id }).update({ aktif: values.aktif });
    row = { ...row, aktif: values.aktif };
  }
  return row;
};

const findOrCreateExpression = async (trx, values) => {
  let row = await trx("jurnal_expression").where({ nama: values.nama }).first();
  if (!row) {
    await trx("jurnal_expression").insert({
      ...values,
      aktif: true,
      keterangan: "System default",
    });
    row = await trx("jurnal_expression").where({ nama: values.nama }).first();
  } else {
    await trx("jurnal_expression")
      .where({ id: row.id })
      .update({
        ...values,
        aktif: true,
      });
    row = { ...row, ...values, aktif: true };
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
  await findOrCreateByName(
    trx,
    "coa_subtype",
    "Kas",
    {
      id_coa_type: aktivaLancar.id,
      aktif: true,
      keterangan: "System default",
    },
    { id_coa_type: aktivaLancar.id },
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
  const aktivaLancar = await trx("coa_type")
    .where({ nama: "Aktiva Lancar", aktif: true })
    .first();
  if (!aktivaLancar)
    throw new Error("Aktiva Lancar COA type is required before HPP seed.");

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
  const kasExpression = await findOrCreateExpression(trx, {
    nama: "Kas",
    filter_type: "type",
    id_filter: aktivaLancar.id,
  });
  const hppExpression = await findOrCreateExpression(trx, {
    nama: "HPP",
    filter_type: "coa",
    id_filter: hppCoa.id,
  });
  await ensureFormExpression(trx, form.id, kasExpression.id, "kredit", 1);
  await ensureFormExpression(trx, form.id, hppExpression.id, "debit", 2);
};

const ensurePendapatan = async (trx) => {
  const aktivaLancar = await trx("coa_type")
    .where({ nama: "Aktiva Lancar", aktif: true })
    .first();
  if (!aktivaLancar)
    throw new Error(
      "Aktiva Lancar COA type is required before Pendapatan seed.",
    );

  const pendapatanType = await findOrCreateByName(
    trx,
    "coa_type",
    "Pendapatan",
    {
      normal_balance: 0,
      aktif: true,
      keterangan: "System default",
    },
  );
  const bankSubtype = await findOrCreateByName(
    trx,
    "coa_subtype",
    "Bank",
    {
      id_coa_type: aktivaLancar.id,
      aktif: true,
      keterangan: "System default",
    },
    { id_coa_type: aktivaLancar.id },
  );
  const pendapatanSubtype = await findOrCreateByName(
    trx,
    "coa_subtype",
    "Pendapatan",
    {
      id_coa_type: pendapatanType.id,
      aktif: true,
      keterangan: "System default",
    },
    { id_coa_type: pendapatanType.id },
  );
  const pendapatanCoa = await findOrCreateByName(trx, "coa", "Pendapatan", {
    id_coa_subtype: pendapatanSubtype.id,
    aktif: true,
    keterangan: "System default",
  });
  const form = await findOrCreateByName(trx, "jurnal_form", "Pendapatan", {
    system_key: SYSTEM_KEYS.PENDAPATAN,
    extra_fields: JSON.stringify([]),
    keterangan: "System default",
    aktif: true,
  });
  if (!form.system_key) {
    await trx("jurnal_form")
      .where({ id: form.id })
      .update({ system_key: SYSTEM_KEYS.PENDAPATAN });
  }
  const debitExpression = await findOrCreateExpression(trx, {
    nama: "Aktiva Lancar",
    filter_type: "type",
    id_filter: aktivaLancar.id,
  });
  const kreditExpression = await findOrCreateExpression(trx, {
    nama: "Pendapatan",
    filter_type: "coa",
    id_filter: pendapatanCoa.id,
  });
  await ensureFormExpression(trx, form.id, debitExpression.id, "debit", 1);
  await ensureFormExpression(trx, form.id, kreditExpression.id, "kredit", 2);
  return { bankSubtypeId: bankSubtype.id, pendapatanCoaId: pendapatanCoa.id };
};

const checkSeed = async (trx, definition) => {
  const form = await trx("jurnal_form")
    .where({ system_key: definition.key, aktif: true })
    .first();
  const details = [];
  const verified = [];
  if (!form) details.push("System journal form is missing or inactive.");
  else verified.push(`Form: ${form.nama}`);

  if (definition.key === SYSTEM_KEYS.OPERASIONAL_KANTOR) {
    const type = await trx("coa_type")
      .where({ nama: "Aktiva Lancar", aktif: true })
      .first();
    const kasSubtype = type
      ? await trx("coa_subtype")
          .where({ nama: "Kas", id_coa_type: type.id, aktif: true })
          .first()
      : null;
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
    else verified.push("COA type: Aktiva Lancar");
    if (type && type.normal_balance !== 1)
      details.push("Aktiva Lancar COA type has the wrong normal balance.");
    if (!kasSubtype) details.push("Kas COA subtype is missing.");
    else verified.push("COA subtype: Kas");
    if (!biayaType) details.push("Biaya Operasional COA type is missing.");
    else verified.push("COA type: Biaya Operasional");
    if (biayaType && biayaType.normal_balance !== 0)
      details.push("Biaya Operasional COA type has the wrong normal balance.");
    if (!subtype) details.push("Operasional Kantor COA subtype is missing.");
    else verified.push("COA subtype: Operasional Kantor");
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
      !kredit.expression.aktif ||
      kredit.expression.nama !== "Kas" ||
      kredit.expression.filter_type !== "type" ||
      kredit.expression.id_filter !== type?.id
    )
      details.push("Kredit expression is incorrect.");
    else verified.push("Expression (kredit): Kas -> Aktiva Lancar");
    if (
      !debit ||
      !debit.expression ||
      !debit.expression.aktif ||
      debit.expression.nama !== "Operasional Kantor" ||
      debit.expression.filter_type !== "subtype" ||
      debit.expression.id_filter !== subtype?.id
    )
      details.push("Debit expression is incorrect.");
    else verified.push("Expression (debit): Operasional Kantor");
  } else if (definition.key === SYSTEM_KEYS.HPP) {
    const type = await trx("coa_type")
      .where({ nama: "HPP", aktif: true })
      .first();
    const subtype = type
      ? await trx("coa_subtype")
          .where({ nama: "HPP", id_coa_type: type.id, aktif: true })
          .first()
      : null;
    const coa = subtype
      ? await trx("coa")
          .where({ nama: "HPP", id_coa_subtype: subtype.id, aktif: true })
          .first()
      : null;
    const expressions = form
      ? await trx("jurnal_form_expression").where({
          id_jurnal_form: form.id,
          aktif: true,
        })
      : [];
    if (!type) details.push("HPP COA type is missing.");
    if (type && type.normal_balance !== 0)
      details.push("HPP COA type has the wrong normal balance.");
    if (!subtype) details.push("HPP COA subtype is missing.");
    if (subtype && type && subtype.id_coa_type !== type.id)
      details.push("HPP subtype has the wrong parent type.");
    if (!coa) details.push("HPP COA is missing.");
    else verified.push("COA: HPP");
    if (type) verified.push("COA type: HPP");
    if (subtype) verified.push("COA subtype: HPP");
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
      !kredit.expression.aktif ||
      kredit.expression.nama !== "Kas" ||
      kredit.expression.filter_type !== "type" ||
      kredit.expression.id_filter !==
        (
          await trx("coa_type")
            .where({ nama: "Aktiva Lancar", aktif: true })
            .first()
        )?.id
    )
      details.push("Kredit expression is incorrect.");
    else verified.push("Expression (kredit): Kas -> Aktiva Lancar");
    if (
      !debit ||
      !debit.expression ||
      !debit.expression.aktif ||
      debit.expression.nama !== "HPP" ||
      debit.expression.filter_type !== "coa" ||
      debit.expression.id_filter !== coa?.id
    )
      details.push("Debit expression is incorrect.");
    else verified.push("Expression (debit): HPP");
  } else {
    const type = await trx("coa_type")
      .where({ nama: "Aktiva Lancar", aktif: true })
      .first();
    const bankSubtype = type
      ? await trx("coa_subtype")
          .where({ nama: "Bank", id_coa_type: type.id, aktif: true })
          .first()
      : null;
    const pendapatanType = await trx("coa_type")
      .where({ nama: "Pendapatan", aktif: true })
      .first();
    const pendapatanSubtype = pendapatanType
      ? await trx("coa_subtype")
          .where({
            nama: "Pendapatan",
            id_coa_type: pendapatanType.id,
            aktif: true,
          })
          .first()
      : null;
    const coa = pendapatanSubtype
      ? await trx("coa")
          .where({
            nama: "Pendapatan",
            id_coa_subtype: pendapatanSubtype.id,
            aktif: true,
          })
          .first()
      : null;
    if (!type) details.push("Aktiva Lancar COA type is missing.");
    else verified.push("COA type: Aktiva Lancar");
    if (type && type.normal_balance !== 1)
      details.push("Aktiva Lancar COA type has the wrong normal balance.");
    if (!bankSubtype) details.push("Bank COA subtype is missing.");
    else verified.push("COA subtype: Bank");
    if (!pendapatanType) details.push("Pendapatan COA type is missing.");
    else verified.push("COA type: Pendapatan");
    if (!pendapatanSubtype) details.push("Pendapatan COA subtype is missing.");
    else verified.push("COA subtype: Pendapatan");
    if (!coa) details.push("Pendapatan COA is missing.");
    else verified.push("COA: Pendapatan");
    if (pendapatanType && pendapatanType.normal_balance !== 0)
      details.push("Pendapatan COA type has the wrong normal balance.");
    if (
      pendapatanSubtype &&
      pendapatanType &&
      pendapatanSubtype.id_coa_type !== pendapatanType.id
    )
      details.push("Pendapatan subtype has the wrong parent type.");
    const expressions = form
      ? await trx("jurnal_form_expression").where({
          id_jurnal_form: form.id,
          aktif: true,
        })
      : [];
    const expressionRows = await Promise.all(
      expressions.map(async (row) => ({
        ...row,
        expression: await trx("jurnal_expression")
          .where({ id: row.id_jurnal_expression })
          .first(),
      })),
    );
    const debit = expressionRows.find((row) => row.input_type === "debit");
    const kredit = expressionRows.find((row) => row.input_type === "kredit");
    if (
      !debit ||
      !debit.expression ||
      !debit.expression.aktif ||
      debit.expression.nama !== "Aktiva Lancar" ||
      debit.expression.filter_type !== "type" ||
      debit.expression.id_filter !== type?.id
    )
      details.push("Debit expression is incorrect.");
    else verified.push("Expression (debit): Aktiva Lancar");
    if (
      !kredit ||
      !kredit.expression ||
      !kredit.expression.aktif ||
      kredit.expression.nama !== "Pendapatan" ||
      kredit.expression.filter_type !== "coa" ||
      kredit.expression.id_filter !== coa?.id
    )
      details.push("Kredit expression is incorrect.");
    else verified.push("Expression (kredit): Pendapatan");
  }

  return {
    key: definition.key,
    label: definition.label,
    status: details.length === 0 ? "correct" : "wrong",
    details,
    verified,
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
      await ensurePendapatan(trx);
      return {
        seeds: await Promise.all(
          seedDefinitions.map((definition) => checkSeed(trx, definition)),
        ),
      };
    });
  },
};

export default Service;
