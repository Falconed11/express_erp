const { withTransaction } = require("../helpers/transaction.cjs");
const { pool } = require("./db.2.0.0.cjs");
const table = "pembayaranproyek";

const deleteRevenueJournal = async (conn, idJurnal) => {
  if (!idJurnal) return;
  await conn.execute("DELETE FROM transaksi WHERE id_jurnal = ?", [idJurnal]);
  await conn.execute("DELETE FROM jurnal WHERE id = ?", [idJurnal]);
};

const resolvePaymentCoa = async (conn, { id_metodepembayaran, id_coa }) => {
  if (id_coa) {
    const [[coa]] = await conn.execute(
      `SELECT c.id, cs.nama coa_subtype
       FROM coa c
       LEFT JOIN coa_subtype cs ON cs.id = c.id_coa_subtype
       WHERE c.id = ? AND c.aktif = 1`,
      [id_coa],
    );
    if (!coa)
      throw new Error("COA pembayaran tidak ditemukan atau tidak aktif.");
    if (
      String(coa.coa_subtype || "")
        .toLowerCase()
        .includes("bank")
    ) {
      throw new Error("COA Bank wajib menggunakan metode pembayaran.");
    }
    return coa.id;
  }

  if (id_metodepembayaran) {
    const [[paymentMethod]] = await conn.execute(
      "SELECT id_coa FROM metodepembayaran WHERE id = ?",
      [id_metodepembayaran],
    );
    if (!paymentMethod?.id_coa) {
      throw new Error("Metode pembayaran belum terhubung ke COA.");
    }
    return paymentMethod.id_coa;
  }

  throw new Error("Pilih COA Kas atau metode pembayaran Bank.");
};

const createRevenueJournal = async (
  conn,
  { id_proyek, nominal, id_metodepembayaran, id_coa, tanggal, created_by },
) => {
  const paymentCoaId = await resolvePaymentCoa(conn, {
    id_metodepembayaran,
    id_coa,
  });

  const [[project]] = await conn.execute(
    "SELECT id_perusahaan FROM proyek WHERE id = ?",
    [id_proyek],
  );
  const [[form]] = await conn.execute(
    "SELECT id FROM jurnal_form WHERE system_key = 'PENDAPATAN' AND aktif = 1",
  );
  const [[revenue]] = await conn.execute(
    "SELECT id FROM coa WHERE nama = 'Pendapatan' AND aktif = 1",
  );
  if (!form || !revenue)
    throw new Error("Seed jurnal Pendapatan belum diterapkan.");

  const [journalResult] = await conn.execute(
    `INSERT INTO jurnal
      (id_perusahaan, id_proyek, id_jurnal_form, tanggal, keterangan, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      project?.id_perusahaan ?? null,
      id_proyek,
      form.id,
      tanggal,
      "Pendapatan proyek",
      created_by ?? null,
      created_by ?? null,
    ],
  );
  const idJurnal = journalResult.insertId;
  await conn.execute(
    `INSERT INTO transaksi (id_jurnal, id_coa, tipe, amount, created_by, updated_by)
     VALUES (?, ?, 1, ?, ?, ?), (?, ?, 0, ?, ?, ?)`,
    [
      idJurnal,
      paymentCoaId,
      nominal,
      created_by ?? null,
      created_by ?? null,
      idJurnal,
      revenue.id,
      nominal,
      created_by ?? null,
      created_by ?? null,
    ],
  );
  return idJurnal;
};

const list = async ({
  id_proyek,
  id_metodepembayaran,
  monthyear,
  start,
  end,
  asc,
}) => {
  const sql = `Select ki.nama picInvoice, kk.nama picKwitansi, p.id id_proyek, p.nama, i.nama instansi, COALESCE(mp.nama, pc.nama) metodepembayaran, cs.nama coa_subtype, mp.norekening, mp.atasnama, b.nama nama_bank, pp.* from ${table} pp
  left join proyek p on pp.id_proyek=p.id 
  left join karyawan ki on pp.id_karyawaninvoice = ki.id
  left join karyawan kk on pp.id_karyawankwitansi = kk.id
  left join metodepembayaran mp on pp.id_metodepembayaran=mp.id
  left join coa pc on pc.id=pp.id_coa
  left join coa_subtype cs on cs.id=pc.id_coa_subtype
  left join bank b on mp.id_bank = b.id 
  left join instansi i on p.id_instansi=i.id where 1=1 ${
    id_proyek ? `and id_proyek=?` : ""
  } ${monthyear ? `and DATE_FORMAT(tanggal, '%m-%Y')=?` : ""} ${
    start ? `and pp.tanggal>=?` : ""
  } ${end ? `and pp.tanggal<=?` : ""} ${
    id_metodepembayaran ? "and id_metodepembayaran=?" : ""
  } order by pp.tanggal ${asc ? "asc" : "desc"}`;
  const values = [];
  if (id_proyek) values.push(id_proyek);
  if (monthyear) values.push(monthyear);
  if (start) values.push(start);
  if (end) values.push(end);
  if (id_metodepembayaran) values.push(id_metodepembayaran);
  const [results] = await pool.execute(sql, values);
  return results;
};

const total = async ({ id_proyek, monthyear }) => {
  const sql = `Select sum(nominal) total from ${table} where 1=1 ${
    id_proyek ? `and id_proyek=?` : ""
  } ${monthyear ? `and DATE_FORMAT(tanggal, '%m-%Y')=?` : ""}`;
  const values = [];
  if (id_proyek) values.push(id_proyek);
  if (monthyear) values.push(monthyear);
  const [results] = await pool.execute(sql, values);
  return results;
};

const create = async ({
  id_proyek,
  idproyek,
  nominal = 0,
  id_metodepembayaran = null,
  id_coa = null,
  id_karyawaninvoice = null,
  id_karyawankwitansi = null,
  pembayar = "",
  untukpembayaran = "",
  tanggal = "",
  keterangan = "",
  status = 0,
  created_by = null,
}) => {
  const { id_second } = await getNextPaymentId(
    new Date(tanggal).getFullYear(),
    pool,
  );
  const sql = `insert into ${table} (id_proyek, id_second, status, nominal, id_metodepembayaran, id_coa, id_karyawaninvoice, id_karyawankwitansi, pembayar, untukpembayaran, tanggal, keterangan) values (${idproyek ? `(select id from proyek where id_second=?)` : `?`}, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const values = [
    idproyek ?? id_proyek,
    id_second,
    status,
    nominal,
    id_metodepembayaran,
    id_coa,
    id_karyawaninvoice,
    id_karyawankwitansi,
    pembayar,
    untukpembayaran,
    tanggal,
    keterangan ?? "",
  ];
  console.log(values);
  return withTransaction(pool, async (conn) => {
    const [results] = await conn.execute(sql, values);
    if (+status) {
      const idJurnal = await createRevenueJournal(conn, {
        id_proyek: idproyek ?? id_proyek,
        nominal,
        id_metodepembayaran,
        id_coa,
        tanggal,
        created_by,
      });
      await conn.execute(`UPDATE ${table} SET id_jurnal = ? WHERE id = ?`, [
        idJurnal,
        results.insertId,
      ]);
    }
    return results;
  });
};

const getNextPaymentId = async (year, conn) => {
  const [rows] = await conn.query(
    `SELECT last_seq FROM kwitansi_sequences WHERE year = ? FOR UPDATE`,
    [year],
  );
  let nextSeq;
  if (rows.length) {
    nextSeq = rows[0].last_seq + 1;
    await conn.query(
      `UPDATE kwitansi_sequences SET last_seq = ? WHERE year = ?`,
      [nextSeq, year],
    );
  } else {
    nextSeq = 1;
    await conn.query(
      `INSERT INTO kwitansi_sequences (year, last_seq) VALUES (?, ?)`,
      [year, nextSeq],
    );
  }
  return {
    seq: nextSeq,
    id_second: `${year}-${String(nextSeq).padStart(4, "0")}`,
  };
};

const update = async ({ id, ...rest }) => {
  const { status, tanggal } = rest;
  if (!tanggal) throw new Error("Tanggal wajib diisi!");
  try {
    const result = await withTransaction(pool, async (conn) => {
      const [[current]] = await conn.execute(
        `SELECT * FROM ${table} WHERE id = ? FOR UPDATE`,
        [id],
      );
      if (!current) throw new Error("Payment not found");
      const nextStatus = status == null ? current.status : status;

      const year = new Date(tanggal).getFullYear();
      const currentYear = new Date(current.tanggal).getFullYear();
      let id_second = current.id_second;

      if (!id_second || currentYear !== year) {
        const { id_second: newId } = await getNextPaymentId(year, conn);
        id_second = newId;
      }

      const allowedFields = [
        "status",
        "nominal",
        "id_metodepembayaran",
        "id_coa",
        "id_karyawaninvoice",
        "id_karyawankwitansi",
        "pembayar",
        "untukpembayaran",
        "tanggal",
        "keterangan",
      ];

      const entries = Object.entries(rest).filter(
        ([k, v]) =>
          allowedFields.includes(k) &&
          (v != null || ["id_metodepembayaran", "id_coa"].includes(k)),
      );

      const fields = entries.map(([k]) => `${k}=?`);
      const values = entries.map(([, v]) => v);

      if (id_second !== current.id_second) {
        fields.push("id_second=?");
        values.push(id_second);
      }

      if (fields.length === 0)
        return { affectedRows: 0, message: "No fields to update" };

      const isChangingToUnpaid =
        Number(current.status) === 1 && Number(nextStatus) === 0;
      if (isChangingToUnpaid && current.id_jurnal) {
        await deleteRevenueJournal(conn, current.id_jurnal);
      }

      values.push(id);
      const sql = `UPDATE ${table} SET ${fields.join(", ")} WHERE id = ?`;
      const [result] = await conn.execute(sql, values);
      if (Number(nextStatus) === 1) {
        if (current.id_jurnal)
          await deleteRevenueJournal(conn, current.id_jurnal);
        const nextPaymentMethodId = Object.prototype.hasOwnProperty.call(
          rest,
          "id_metodepembayaran",
        )
          ? rest.id_metodepembayaran
          : current.id_metodepembayaran;
        const nextCoaId = Object.prototype.hasOwnProperty.call(rest, "id_coa")
          ? rest.id_coa
          : current.id_coa;
        const idJurnal = await createRevenueJournal(conn, {
          id_proyek: rest.id_proyek ?? current.id_proyek,
          nominal: rest.nominal ?? current.nominal,
          id_metodepembayaran: nextPaymentMethodId,
          id_coa: nextCoaId,
          tanggal: rest.tanggal ?? current.tanggal,
          created_by: rest.updated_by ?? rest.lastuser ?? null,
        });
        await conn.execute(`UPDATE ${table} SET id_jurnal = ? WHERE id = ?`, [
          idJurnal,
          id,
        ]);
      } else {
        await conn.execute(
          `UPDATE ${table} SET id_jurnal = NULL WHERE id = ?`,
          [id],
        );
      }
      return result;
    });
    return {
      affectedRows: result.affectedRows || 0,
      message: result.affectedRows ? "Payment updated" : "No fields to update",
    };
  } catch (err) {
    console.log(err);
    throw err;
  }
};

const destroy = async ({ id }) => {
  return withTransaction(pool, async (conn) => {
    const [[current]] = await conn.execute(
      `SELECT id_jurnal FROM ${table} WHERE id = ? FOR UPDATE`,
      [id],
    );
    if (current?.id_jurnal) await deleteRevenueJournal(conn, current.id_jurnal);
    const [results] = await conn.execute(`delete from ${table} where id = ?`, [
      id,
    ]);
    return results;
  });
};

module.exports = { list, create, update, destroy, total };
