import db from "../../config/knex.js";

const SYSTEM_KEYS = {
  OPERASIONAL_KANTOR: "OPERASIONAL_KANTOR",
  HPP: "HPP",
  PENDAPATAN: "PENDAPATAN",
};

const seedDefinitions = [
  { key: SYSTEM_KEYS.OPERASIONAL_KANTOR, label: "Operasional Kantor" },
  { key: SYSTEM_KEYS.HPP, label: "HPP" },
  { key: SYSTEM_KEYS.PENDAPATAN, label: "Pendapatan" },
];

/**
 * Upserts a record by table & name, ensuring all desired payload values match DB state.
 */
const syncByName = async (trx, table, name, values, matchValues = {}) => {
  const queryCondition = { nama: name, ...matchValues };
  let row = await trx(table).where(queryCondition).first();

  if (!row) {
    const [insertedId] = await trx(table).insert({ nama: name, ...values });
    row = await trx(table).where({ id: insertedId }).first();
  } else {
    // Collect fields that need updates if existing record has wrong values
    const updates = {};
    for (const [key, val] of Object.entries(values)) {
      if (val !== undefined && row[key] !== val) {
        updates[key] = val;
      }
    }

    if (Object.keys(updates).length > 0) {
      await trx(table).where({ id: row.id }).update(updates);
      row = { ...row, ...updates };
    }
  }

  return row;
};

/**
 * Ensures expression exists and strictly aligns with desired values (filter_type, id_filter, etc).
 */
const syncExpression = async (trx, values) => {
  let row = await trx("jurnal_expression").where({ nama: values.nama }).first();

  const payload = {
    ...values,
    aktif: true,
    keterangan: "System default",
  };

  if (!row) {
    const [insertedId] = await trx("jurnal_expression").insert(payload);
    row = await trx("jurnal_expression").where({ id: insertedId }).first();
  } else {
    const updates = {};
    for (const [key, val] of Object.entries(payload)) {
      if (val !== undefined && row[key] !== val) {
        updates[key] = val;
      }
    }

    if (Object.keys(updates).length > 0) {
      await trx("jurnal_expression").where({ id: row.id }).update(updates);
      row = { ...row, ...updates };
    }
  }

  return row;
};

/**
 * Maps form to expression and fixes input_type / sort_order / active state if wrong.
 */
const syncFormExpression = async (
  trx,
  idJurnalForm,
  idJurnalExpression,
  inputType,
  sortOrder,
) => {
  const row = await trx("jurnal_form_expression")
    .where({ id_jurnal_form: idJurnalForm, input_type: inputType })
    .first();

  const payload = {
    id_jurnal_form: idJurnalForm,
    id_jurnal_expression: idJurnalExpression,
    input_type: inputType,
    sort_order: sortOrder,
    aktif: true,
    keterangan: "System default",
  };

  if (row) {
    const updates = {};
    if (row.id_jurnal_expression !== idJurnalExpression)
      updates.id_jurnal_expression = idJurnalExpression;
    if (row.sort_order !== sortOrder) updates.sort_order = sortOrder;
    if (!row.aktif) updates.aktif = true;

    if (Object.keys(updates).length > 0) {
      await trx("jurnal_form_expression").where({ id: row.id }).update(updates);
    }
    return { ...row, ...updates };
  }

  const [insertedId] = await trx("jurnal_form_expression").insert(payload);
  return trx("jurnal_form_expression").where({ id: insertedId }).first();
};

/* ==========================================================================
   SEED GENERATORS (WITH AUTO-FIXING)
   ========================================================================== */

const ensureOperationalOffice = async (trx) => {
  const aktivaLancar = await syncByName(trx, "coa_type", "Aktiva Lancar", {
    normal_balance: 1,
    aktif: true,
    keterangan: "System default",
  });

  await syncByName(
    trx,
    "coa_subtype",
    "Kas",
    { id_coa_type: aktivaLancar.id, aktif: true, keterangan: "System default" },
    { id_coa_type: aktivaLancar.id },
  );

  const biayaOperasional = await syncByName(
    trx,
    "coa_type",
    "Biaya Operasional",
    {
      normal_balance: 0,
      aktif: true,
      keterangan: "System default",
    },
  );

  const operasionalSubtype = await syncByName(
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

  const form = await syncByName(trx, "jurnal_form", "Operasional Kantor", {
    system_key: SYSTEM_KEYS.OPERASIONAL_KANTOR,
    extra_fields: JSON.stringify([]),
    keterangan: "System default",
    aktif: true,
  });

  const kasExpression = await syncExpression(trx, {
    nama: "Kas",
    filter_type: "type",
    id_filter: aktivaLancar.id,
  });

  const debitExpression = await syncExpression(trx, {
    nama: "Operasional Kantor",
    filter_type: "subtype",
    id_filter: operasionalSubtype.id,
  });

  await syncFormExpression(trx, form.id, kasExpression.id, "kredit", 1);
  await syncFormExpression(trx, form.id, debitExpression.id, "debit", 2);
};

const ensureHpp = async (trx) => {
  const aktivaLancar = await syncByName(trx, "coa_type", "Aktiva Lancar", {
    normal_balance: 1,
    aktif: true,
    keterangan: "System default",
  });

  const hppType = await syncByName(trx, "coa_type", "HPP", {
    normal_balance: 0,
    aktif: true,
    keterangan: "System default",
  });

  const hppSubtype = await syncByName(
    trx,
    "coa_subtype",
    "HPP",
    { id_coa_type: hppType.id, aktif: true, keterangan: "System default" },
    { id_coa_type: hppType.id },
  );

  const hppCoa = await syncByName(trx, "coa", "HPP", {
    id_coa_subtype: hppSubtype.id,
    aktif: true,
    keterangan: "System default",
  });

  const form = await syncByName(trx, "jurnal_form", "HPP", {
    system_key: SYSTEM_KEYS.HPP,
    extra_fields: JSON.stringify([]),
    keterangan: "System default",
    aktif: true,
  });

  const kasExpression = await syncExpression(trx, {
    nama: "Kas",
    filter_type: "type",
    id_filter: aktivaLancar.id,
  });

  const hppExpression = await syncExpression(trx, {
    nama: "HPP",
    filter_type: "coa",
    id_filter: hppCoa.id,
  });

  await syncFormExpression(trx, form.id, kasExpression.id, "kredit", 1);
  await syncFormExpression(trx, form.id, hppExpression.id, "debit", 2);
};

const ensurePendapatan = async (trx) => {
  const aktivaLancar = await syncByName(trx, "coa_type", "Aktiva Lancar", {
    normal_balance: 1,
    aktif: true,
    keterangan: "System default",
  });

  const pendapatanType = await syncByName(trx, "coa_type", "Pendapatan", {
    normal_balance: 0,
    aktif: true,
    keterangan: "System default",
  });

  const bankSubtype = await syncByName(
    trx,
    "coa_subtype",
    "Bank",
    { id_coa_type: aktivaLancar.id, aktif: true, keterangan: "System default" },
    { id_coa_type: aktivaLancar.id },
  );

  const pendapatanSubtype = await syncByName(
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

  const pendapatanCoa = await syncByName(trx, "coa", "Pendapatan", {
    id_coa_subtype: pendapatanSubtype.id,
    aktif: true,
    keterangan: "System default",
  });

  const form = await syncByName(trx, "jurnal_form", "Pendapatan", {
    system_key: SYSTEM_KEYS.PENDAPATAN,
    extra_fields: JSON.stringify([]),
    keterangan: "System default",
    aktif: true,
  });

  const debitExpression = await syncExpression(trx, {
    nama: "Aktiva Lancar",
    filter_type: "type",
    id_filter: aktivaLancar.id,
  });

  const kreditExpression = await syncExpression(trx, {
    nama: "Pendapatan",
    filter_type: "coa",
    id_filter: pendapatanCoa.id,
  });

  await syncFormExpression(trx, form.id, debitExpression.id, "debit", 1);
  await syncFormExpression(trx, form.id, kreditExpression.id, "kredit", 2);

  return { bankSubtypeId: bankSubtype.id, pendapatanCoaId: pendapatanCoa.id };
};

/* ==========================================================================
   CHECK & VERIFICATION
   ========================================================================== */

const fetchFormExpressions = async (trx, formId) => {
  if (!formId) return [];
  return trx("jurnal_form_expression as jfe")
    .join("jurnal_expression as je", "jfe.id_jurnal_expression", "je.id")
    .where({ "jfe.id_jurnal_form": formId, "jfe.aktif": true })
    .select(
      "jfe.input_type",
      "je.id as expression_id",
      "je.nama",
      "je.filter_type",
      "je.id_filter",
      "je.aktif",
    );
};

const checkSeed = async (trx, definition) => {
  const form = await trx("jurnal_form")
    .where({ system_key: definition.key, aktif: true })
    .first();
  const details = [];
  const verified = [];

  if (!form) details.push("System journal form is missing or inactive.");
  else verified.push(`Form: ${form.nama}`);

  const expressions = await fetchFormExpressions(trx, form?.id);

  if (definition.key === SYSTEM_KEYS.OPERASIONAL_KANTOR) {
    const [type, biayaType] = await Promise.all([
      trx("coa_type").where({ nama: "Aktiva Lancar", aktif: true }).first(),
      trx("coa_type").where({ nama: "Biaya Operasional", aktif: true }).first(),
    ]);

    const kasSubtype = type
      ? await trx("coa_subtype")
          .where({ nama: "Kas", id_coa_type: type.id, aktif: true })
          .first()
      : null;

    const subtype = await trx("coa_subtype")
      .where({ nama: "Operasional Kantor", aktif: true })
      .first();

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

    const kredit = expressions.find((e) => e.input_type === "kredit");
    const debit = expressions.find((e) => e.input_type === "debit");

    if (
      !kredit ||
      !kredit.aktif ||
      kredit.nama !== "Kas" ||
      kredit.filter_type !== "type" ||
      kredit.id_filter !== type?.id
    ) {
      details.push("Kredit expression is incorrect.");
    } else verified.push("Expression (kredit): Kas -> Aktiva Lancar");

    if (
      !debit ||
      !debit.aktif ||
      debit.nama !== "Operasional Kantor" ||
      debit.filter_type !== "subtype" ||
      debit.id_filter !== subtype?.id
    ) {
      details.push("Debit expression is incorrect.");
    } else verified.push("Expression (debit): Operasional Kantor");
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
    const aktivaLancar = await trx("coa_type")
      .where({ nama: "Aktiva Lancar", aktif: true })
      .first();

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

    const kredit = expressions.find((e) => e.input_type === "kredit");
    const debit = expressions.find((e) => e.input_type === "debit");

    if (
      !kredit ||
      !kredit.aktif ||
      kredit.nama !== "Kas" ||
      kredit.filter_type !== "type" ||
      kredit.id_filter !== aktivaLancar?.id
    ) {
      details.push("Kredit expression is incorrect.");
    } else verified.push("Expression (kredit): Kas -> Aktiva Lancar");

    if (
      !debit ||
      !debit.aktif ||
      debit.nama !== "HPP" ||
      debit.filter_type !== "coa" ||
      debit.id_filter !== coa?.id
    ) {
      details.push("Debit expression is incorrect.");
    } else verified.push("Expression (debit): HPP");
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

    const debit = expressions.find((e) => e.input_type === "debit");
    const kredit = expressions.find((e) => e.input_type === "kredit");

    if (
      !debit ||
      !debit.aktif ||
      debit.nama !== "Aktiva Lancar" ||
      debit.filter_type !== "type" ||
      debit.id_filter !== type?.id
    ) {
      details.push("Debit expression is incorrect.");
    } else verified.push("Expression (debit): Aktiva Lancar");

    if (
      !kredit ||
      !kredit.aktif ||
      kredit.nama !== "Pendapatan" ||
      kredit.filter_type !== "coa" ||
      kredit.id_filter !== coa?.id
    ) {
      details.push("Kredit expression is incorrect.");
    } else verified.push("Expression (kredit): Pendapatan");
  }

  return {
    key: definition.key,
    label: definition.label,
    status: details.length === 0 ? "correct" : "wrong",
    details,
    verified,
  };
};

/* ==========================================================================
   SERVICE EXPORT
   ========================================================================== */

const Service = {
  async check() {
    return db.transaction(async (trx) => ({
      seeds: await Promise.all(
        seedDefinitions.map((def) => checkSeed(trx, def)),
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
          seedDefinitions.map((def) => checkSeed(trx, def)),
        ),
      };
    });
  },
};

export default Service;
