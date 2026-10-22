import db from "../../config/knex.js";

const TABLE = "perusahaan_pajak_default";
const isValidDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
};

const normalize = (input) => {
  const persen = Number(input.persen);
  const tanggal_aktif = input.tanggal_aktif
    ? String(input.tanggal_aktif)
    : null;
  const tanggal_kadaluarsa = input.tanggal_kadaluarsa
    ? String(input.tanggal_kadaluarsa)
    : null;
  if (!Number.isInteger(persen) || persen < 0 || persen > 100) {
    throw new Error("Persentase pajak harus bilangan bulat antara 0 dan 100.");
  }
  if (tanggal_aktif !== null && !isValidDate(tanggal_aktif)) {
    throw new Error("Tanggal aktif tidak valid.");
  }
  if (tanggal_kadaluarsa !== null && !isValidDate(tanggal_kadaluarsa)) {
    throw new Error("Tanggal kadaluarsa tidak valid.");
  }
  if (
    tanggal_aktif !== null &&
    tanggal_kadaluarsa !== null &&
    tanggal_kadaluarsa < tanggal_aktif
  ) {
    throw new Error("Tanggal kadaluarsa tidak boleh sebelum tanggal aktif.");
  }
  return { persen, tanggal_aktif, tanggal_kadaluarsa };
};

const withActiveStatus = (row, idPajak) =>
  row
    ? {
        ...row,
        aktif: idPajak != null && Number(idPajak) === Number(row.id) ? 1 : 0,
      }
    : null;

const Service = {
  async list(companyId) {
    if (!Number.isInteger(companyId) || companyId <= 0) return [];
    const company = await db("perusahaan")
      .select("id_pajak")
      .where({ id: companyId })
      .first();
    const rows = await db(TABLE)
      .where({ id_perusahaan: companyId })
      .orderBy("tanggal_aktif", "desc")
      .orderBy("id", "desc");
    return rows.map((row) => withActiveStatus(row, company?.id_pajak));
  },

  async getActive(companyId) {
    const company = await db("perusahaan")
      .select("id_pajak")
      .where({ id: companyId })
      .first();
    if (company?.id_pajak == null) return null;
    const row = await db(TABLE)
      .where({ id: company.id_pajak, id_perusahaan: companyId })
      .first();
    return withActiveStatus(row, company.id_pajak);
  },

  async create(companyId, input, actorId) {
    if (!Number.isInteger(companyId) || companyId <= 0)
      throw new Error("Perusahaan tidak tersedia untuk pengguna ini.");
    const data = normalize(input);
    const [id] = await db(TABLE).insert({
      ...data,
      id_perusahaan: companyId,
      created_by: actorId,
      updated_by: actorId,
    });
    const row = await db(TABLE).where({ id, id_perusahaan: companyId }).first();
    return withActiveStatus(row, null);
  },

  async update(companyId, id, input, actorId) {
    if (!Number.isInteger(companyId) || companyId <= 0)
      throw new Error("Perusahaan tidak tersedia untuk pengguna ini.");
    const data = normalize(input);
    const affected = await db(TABLE)
      .where({ id, id_perusahaan: companyId })
      .update({ ...data, updated_by: actorId, updated_at: db.fn.now() });
    if (!affected) throw new Error("Default pajak tidak ditemukan.");
    const row = await db(TABLE).where({ id, id_perusahaan: companyId }).first();
    const company = await db("perusahaan")
      .select("id_pajak")
      .where({ id: companyId })
      .first();
    return withActiveStatus(row, company?.id_pajak);
  },

  async setActive(companyId, id) {
    if (!Number.isInteger(companyId) || companyId <= 0)
      throw new Error("Perusahaan tidak tersedia untuk pengguna ini.");
    return db.transaction(async (trx) => {
      const company = await trx("perusahaan")
        .where({ id: companyId })
        .forUpdate()
        .first("id", "id_pajak");
      if (!company) throw new Error("Perusahaan tidak ditemukan.");

      const target = await trx(TABLE)
        .where({ id, id_perusahaan: companyId })
        .first("id");
      if (!target) throw new Error("Default pajak tidak ditemukan.");

      await trx("perusahaan")
        .where({ id: companyId })
        .update({ id_pajak: target.id });

      const row = await trx(TABLE)
        .where({ id: target.id, id_perusahaan: companyId })
        .first();
      return withActiveStatus(row, target.id);
    });
  },

  async deactivate(companyId, id) {
    if (!Number.isInteger(companyId) || companyId <= 0)
      throw new Error("Perusahaan tidak tersedia untuk pengguna ini.");
    return db.transaction(async (trx) => {
      const company = await trx("perusahaan")
        .where({ id: companyId })
        .forUpdate()
        .first("id", "id_pajak");
      if (!company) throw new Error("Perusahaan tidak ditemukan.");

      const row = await trx(TABLE)
        .where({ id, id_perusahaan: companyId })
        .first();
      if (!row) throw new Error("Default pajak tidak ditemukan.");

      if (Number(company.id_pajak) === Number(row.id)) {
        await trx("perusahaan")
          .where({ id: companyId })
          .update({ id_pajak: null });
        company.id_pajak = null;
      }

      return withActiveStatus(row, company.id_pajak);
    });
  },

  async remove(companyId, id) {
    if (!Number.isInteger(companyId) || companyId <= 0)
      throw new Error("Perusahaan tidak tersedia untuk pengguna ini.");
    return db.transaction(async (trx) => {
      const company = await trx("perusahaan")
        .where({ id: companyId })
        .forUpdate()
        .first("id", "id_pajak");
      if (!company) throw new Error("Perusahaan tidak ditemukan.");

      const row = await trx(TABLE)
        .where({ id, id_perusahaan: companyId })
        .first("id");
      if (!row) throw new Error("Default pajak tidak ditemukan.");
      if (Number(company.id_pajak) === Number(row.id)) {
        const error = new Error(
          "Default pajak yang dipilih tidak dapat dihapus.",
        );
        error.status = 409;
        throw error;
      }

      await trx(TABLE).where({ id: row.id, id_perusahaan: companyId }).del();
      return { id: Number(row.id) };
    });
  },
};

export default Service;
