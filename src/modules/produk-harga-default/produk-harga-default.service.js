import currency from "currency.js";
import db from "../../config/knex.js";
import priceDefaultRepository from "../../../repositories/produk-price-default.repository.cjs";
import priceDefaultUtil from "../../../repositories/produk-price-default.util.cjs";

const { calculatePrice, findProductDefault } = priceDefaultUtil;

const SCOPES = new Set(["global", "kategori", "vendor", "vendor_kategori"]);
const PRICE_FIELDS = [
  ["hargajual", "hargajual_custom", "persen_hargajual"],
  ["hargabatas", "hargabatas_custom", "persen_hargabatas"],
];

const normalizeDefault = (input) => {
  const scope = String(input.scope ?? "");
  if (!SCOPES.has(scope)) throw new Error("Scope default harga tidak valid.");
  const id_vendor = input.id_vendor ? Number(input.id_vendor) : null;
  const id_kategori = input.id_kategori ? Number(input.id_kategori) : null;
  const expectsVendor = ["vendor", "vendor_kategori"].includes(scope);
  const expectsCategory = ["kategori", "vendor_kategori"].includes(scope);
  if (
    expectsVendor !== Number.isInteger(id_vendor) ||
    (expectsVendor && id_vendor <= 0)
  )
    throw new Error("Vendor wajib dipilih sesuai scope default.");
  if (
    expectsCategory !== Number.isInteger(id_kategori) ||
    (expectsCategory && id_kategori <= 0)
  )
    throw new Error("Kategori wajib dipilih sesuai scope default.");
  if (
    input.persen_hargajual === undefined ||
    input.persen_hargajual === null ||
    String(input.persen_hargajual).trim() === "" ||
    input.persen_hargabatas === undefined ||
    input.persen_hargabatas === null ||
    String(input.persen_hargabatas).trim() === ""
  )
    throw new Error("Persentase harga jual dan harga batas wajib diisi.");
  const normalizePercent = (value) => {
    const text = String(value).trim();
    if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return null;

    const normalized = currency(text, { precision: 2 });
    if (!Number.isFinite(normalized.value)) return null;
    if (normalized.value < 0 || normalized.value > 255) return null;
    return normalized.value;
  };

  const persen_hargajual = normalizePercent(input.persen_hargajual);
  const persen_hargabatas = normalizePercent(input.persen_hargabatas);
  for (const value of [persen_hargajual, persen_hargabatas]) {
    if (value === null)
      throw new Error(
        "Persentase harus berupa angka desimal maksimal 2 tempat antara 0 dan 255.",
      );
  }
  const scope_key =
    scope === "global"
      ? "global"
      : scope === "kategori"
        ? `kategori:${id_kategori}`
        : scope === "vendor"
          ? `vendor:${id_vendor}`
          : `vendor_kategori:${id_vendor}:${id_kategori}`;
  return {
    scope,
    scope_key,
    id_vendor,
    id_kategori,
    persen_hargajual,
    persen_hargabatas,
  };
};

const validateMainVendor = async (trx, id_vendor) => {
  if (!id_vendor) return;
  const vendor = await trx("vendor")
    .select("is_main")
    .where({ id: id_vendor })
    .first();
  if (!vendor) throw new Error("Vendor tidak ditemukan.");
  if (!vendor.is_main)
    throw new Error("Default harga vendor hanya tersedia untuk vendor utama.");
};

const recalculateAffectedProducts = async (trx, beforeDefaults, actorId) => {
  const afterDefaults = await priceDefaultRepository.getDefaults(trx);
  const products = await trx("produk")
    .where("aktif", 1)
    .select(
      "id",
      "id_kategori",
      "main_vendor",
      "hargamodal",
      "hargajual",
      "hargajual_custom",
      "hargabatas",
      "hargabatas_custom",
    );
  const auditEntries = [];
  let updated = 0;

  for (const product of products) {
    const previousRule = findProductDefault(beforeDefaults, product);
    const nextRule = findProductDefault(afterDefaults, product);
    const changes = {};
    for (const [priceField, customField, percentField] of PRICE_FIELDS) {
      if (product[customField] === true || Number(product[customField]) === 1)
        continue;
      const previousPercent = previousRule?.[percentField] ?? null;
      const nextPercent = nextRule?.[percentField] ?? null;
      if (previousPercent === nextPercent || nextPercent === null) continue;
      const modalPrice = Number(product.hargamodal);
      if (!Number.isFinite(modalPrice)) continue;
      const nextPrice = calculatePrice(modalPrice, nextPercent);
      if (Number(product[priceField]) === nextPrice) continue;
      changes[priceField] = { before: product[priceField], after: nextPrice };
      product[priceField] = nextPrice;
    }
    const fields = Object.keys(changes);
    if (!fields.length) continue;
    await trx("produk")
      .where({ id: product.id })
      .update({
        ...Object.fromEntries(fields.map((field) => [field, product[field]])),
        updated_by: actorId,
      });
    auditEntries.push({
      table_name: "produk",
      record_id: product.id,
      action: "update",
      changes: JSON.stringify(changes),
      changed_by: actorId,
      changed_at: trx.fn.now(),
    });
    updated += 1;
  }

  if (auditEntries.length) await trx("audit_log").insert(auditEntries);
  return updated;
};

const withDefaultMutation = async (mutate, actorId) =>
  db.transaction(async (trx) => {
    const beforeDefaults = await priceDefaultRepository.getDefaults(trx);
    const result = await mutate(trx);
    const updatedProducts = await recalculateAffectedProducts(
      trx,
      beforeDefaults,
      actorId,
    );
    return { ...result, updatedProducts };
  });

const Service = {
  async list() {
    return db("produk_harga_default as d")
      .leftJoin("vendor as v", "v.id", "d.id_vendor")
      .leftJoin("kategoriproduk as k", "k.id", "d.id_kategori")
      .where("d.aktif", 1)
      .andWhere((query) =>
        query
          .whereIn("d.scope", ["global", "kategori"])
          .orWhere("v.is_main", 1),
      )
      .select("d.*", "v.nama as vendor", "k.nama as kategori")
      .orderByRaw(
        "FIELD(d.scope, 'global', 'kategori', 'vendor', 'vendor_kategori')",
      )
      .orderBy("vendor")
      .orderBy("kategori");
  },
  async create(input, actorId) {
    const data = normalizeDefault(input);
    return withDefaultMutation(async (trx) => {
      if (data.scope === "global") {
        const existing = await trx("produk_harga_default")
          .where({ scope_key: "global" })
          .first("id");
        if (existing)
          throw new Error(
            "Default global sudah tersedia. Edit nilai yang ada.",
          );
      }
      await validateMainVendor(trx, data.id_vendor);
      if (data.id_kategori) {
        const category = await trx("kategoriproduk")
          .where({ id: data.id_kategori })
          .first("id");
        if (!category) throw new Error("Kategori tidak ditemukan.");
      }
      const [id] = await trx("produk_harga_default").insert({
        ...data,
        created_by: actorId,
        updated_by: actorId,
      });
      return trx("produk_harga_default").where({ id }).first();
    }, actorId);
  },
  async update(id, input, actorId) {
    const data = normalizeDefault(input);
    return withDefaultMutation(async (trx) => {
      const current = await trx("produk_harga_default").where({ id }).first();
      if (!current) throw new Error("Default harga tidak ditemukan.");
      if ((current.scope === "global") !== (data.scope === "global")) {
        throw new Error("Scope default global tidak dapat diubah.");
      }
      await validateMainVendor(trx, data.id_vendor);
      if (data.id_kategori) {
        const category = await trx("kategoriproduk")
          .where({ id: data.id_kategori })
          .first("id");
        if (!category) throw new Error("Kategori tidak ditemukan.");
      }
      await trx("produk_harga_default")
        .where({ id })
        .update({
          ...data,
          updated_by: actorId,
          updated_at: trx.fn.now(),
        });
      return trx("produk_harga_default").where({ id }).first();
    }, actorId);
  },
  async delete(id, actorId) {
    return withDefaultMutation(async (trx) => {
      const current = await trx("produk_harga_default").where({ id }).first();
      if (!current) throw new Error("Default harga tidak ditemukan.");
      if (current.scope === "global")
        throw new Error("Default global tidak dapat dihapus.");
      await trx("produk_harga_default").where({ id }).del();
      return { deleted: true };
    }, actorId);
  },
};

export default Service;
