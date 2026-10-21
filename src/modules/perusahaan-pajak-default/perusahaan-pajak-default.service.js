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
  const tanggal_aktif = String(input.tanggal_aktif ?? "");
  const tanggal_kadaluarsa = String(input.tanggal_kadaluarsa ?? "");
  if (!Number.isInteger(persen) || persen < 0 || persen > 100) {
    throw new Error("Persentase pajak harus bilangan bulat antara 0 dan 100.");
  }
  if (!isValidDate(tanggal_aktif)) {
    throw new Error("Tanggal aktif tidak valid.");
  }
  if (!isValidDate(tanggal_kadaluarsa)) {
    throw new Error("Tanggal kadaluarsa tidak valid.");
  }
  if (tanggal_kadaluarsa < tanggal_aktif) {
    throw new Error("Tanggal kadaluarsa tidak boleh sebelum tanggal aktif.");
  }
  return { persen, tanggal_aktif, tanggal_kadaluarsa };
};

const Service = {
  async list(companyId) {
    if (!Number.isInteger(companyId) || companyId <= 0) return [];
    return db(TABLE)
      .where({ id_perusahaan: companyId })
      .orderBy("tanggal_aktif", "desc")
      .orderBy("id", "desc");
  },

  async getActive(companyId) {
    return (
      (await db(TABLE)
        .where({ id_perusahaan: companyId, aktif: true })
        .first()) ?? null
    );
  },

  async create(companyId, input, actorId) {
    if (!Number.isInteger(companyId) || companyId <= 0)
      throw new Error("Perusahaan tidak tersedia untuk pengguna ini.");
    const data = normalize(input);
    const [id] = await db(TABLE).insert({
      ...data,
      id_perusahaan: companyId,
      aktif: false,
      created_by: actorId,
      updated_by: actorId,
    });
    return db(TABLE).where({ id, id_perusahaan: companyId }).first();
  },

  async update(companyId, id, input, actorId) {
    if (!Number.isInteger(companyId) || companyId <= 0)
      throw new Error("Perusahaan tidak tersedia untuk pengguna ini.");
    const data = normalize(input);
    const affected = await db(TABLE)
      .where({ id, id_perusahaan: companyId })
      .update({ ...data, updated_by: actorId, updated_at: db.fn.now() });
    if (!affected) throw new Error("Default pajak tidak ditemukan.");
    return db(TABLE).where({ id, id_perusahaan: companyId }).first();
  },

  async setActive(companyId, id, actorId) {
    if (!Number.isInteger(companyId) || companyId <= 0)
      throw new Error("Perusahaan tidak tersedia untuk pengguna ini.");
    return db.transaction(async (trx) => {
      const company = await trx("perusahaan")
        .where({ id: companyId })
        .forUpdate()
        .first("id");
      if (!company) throw new Error("Perusahaan tidak ditemukan.");

      const target = await trx(TABLE)
        .where({ id, id_perusahaan: companyId })
        .first("id");
      if (!target) throw new Error("Default pajak tidak ditemukan.");

      await trx(TABLE)
        .where({ id_perusahaan: companyId })
        .update({
          aktif: false,
          updated_by: actorId,
          updated_at: trx.fn.now(),
        });
      await trx(TABLE)
        .where({ id, id_perusahaan: companyId })
        .update({ aktif: true, updated_by: actorId, updated_at: trx.fn.now() });

      return trx(TABLE).where({ id, id_perusahaan: companyId }).first();
    });
  },

  async deactivate(companyId, id, actorId) {
    if (!Number.isInteger(companyId) || companyId <= 0)
      throw new Error("Perusahaan tidak tersedia untuk pengguna ini.");
    const affected = await db(TABLE)
      .where({ id, id_perusahaan: companyId })
      .update({ aktif: false, updated_by: actorId, updated_at: db.fn.now() });
    if (!affected) throw new Error("Default pajak tidak ditemukan.");
    return db(TABLE).where({ id, id_perusahaan: companyId }).first();
  },

  async remove(companyId, id) {
    if (!Number.isInteger(companyId) || companyId <= 0)
      throw new Error("Perusahaan tidak tersedia untuk pengguna ini.");
    const affected = await db(TABLE)
      .where({ id, id_perusahaan: companyId })
      .del();
    if (!affected) throw new Error("Default pajak tidak ditemukan.");
    return { id: Number(id) };
  },
};

export default Service;
