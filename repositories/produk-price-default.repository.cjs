const getDefaults = async (connection) => {
  if (typeof connection === "function") {
    return connection("produk_harga_default as d")
      .leftJoin("vendor as v", "v.id", "d.id_vendor")
      .where("d.aktif", 1)
      .andWhere((query) =>
        query
          .whereIn("d.scope", ["global", "kategori"])
          .orWhere("v.is_main", 1),
      )
      .select(
        "d.id",
        "d.scope",
        "d.scope_key",
        "d.id_vendor",
        "d.id_kategori",
        "d.persen_hargajual",
        "d.persen_hargabatas",
      );
  }
  const [rows] = await connection.execute(
    `SELECT d.id, d.scope, d.scope_key, d.id_vendor, d.id_kategori,
        d.persen_hargajual, d.persen_hargabatas
     FROM produk_harga_default d
     LEFT JOIN vendor v ON v.id = d.id_vendor
     WHERE d.aktif = 1
       AND (d.scope IN ('global', 'kategori') OR v.is_main = 1)`,
  );
  return rows;
};

const resolveProductPricesForConnection = async (
  connection,
  product,
  existing = null,
) => {
  const defaults = await getDefaults(connection);
  const { resolveProductPrices } = require("./produk-price-default.util.cjs");
  return resolveProductPrices(product, defaults, existing);
};

module.exports = { getDefaults, resolveProductPricesForConnection };
