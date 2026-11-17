import db from "../../config/knex.js";

export const createTargetSalesModel = (tableName, { isVisitTarget }) => {
  const buildQuery = ({ from, to, idKaryawan }) => {
    const query = db({ target: tableName })
      .join("karyawan as employee", "employee.id", "target.id_karyawan")
      .leftJoin("karyawan as creator", "creator.id", "target.created_by")
      .leftJoin("karyawan as updater", "updater.id", "target.updated_by")
      .where("target.aktif", true);

    if (from) query.where("target.tanggal", ">=", from);
    if (to) query.where("target.tanggal", "<=", to);
    if (idKaryawan) query.where("target.id_karyawan", idKaryawan);
    return query;
  };

  return {
    async list({ from, to, idKaryawan, page, pageSize }) {
      const query = buildQuery({ from, to, idKaryawan });
      const [rows, countRow] = await Promise.all([
        query
          .clone()
          .select(
            "target.id",
            db.raw("DATE_FORMAT(target.tanggal, '%Y-%m-%d') AS tanggal"),
            "target.id_karyawan",
            "employee.nama AS nama_karyawan",
            "target.jumlah",
            "target.aktif",
            "target.created_at",
            "target.created_by",
            "creator.nama AS created_by_name",
            "target.updated_at",
            "target.updated_by",
            "updater.nama AS updated_by_name",
          )
          .orderBy("target.tanggal", "desc")
          .orderBy("target.id", "desc")
          .limit(pageSize)
          .offset((page - 1) * pageSize),
        query.clone().count({ total: "target.id" }).first(),
      ]);
      return { data: rows, count: Number(countRow?.total ?? 0) };
    },

    async summarize({ from, to, idKaryawan }) {
      const achievementQuery = isVisitTarget
        ? db("aktivitassales as activity")
            .where("activity.aktif", true)
            .whereNotNull("activity.tanggalselesai")
            .modify((query) => {
              if (from) query.where("activity.tanggal", ">=", from);
              if (to) query.where("activity.tanggal", "<=", to);
              if (idKaryawan) query.where("activity.id_karyawan", idKaryawan);
            })
            .count({ achieved: "activity.id" })
            .first()
        : db("pembayaranproyek as payment")
            .join("proyek as project", "project.id", "payment.id_proyek")
            .modify((query) => {
              if (from) query.where("project.tanggal", ">=", from);
              if (to) query.where("project.tanggal", "<=", to);
              if (idKaryawan) query.where("project.id_karyawan", idKaryawan);
            })
            .sum({ achieved: "payment.nominal" })
            .first();
      const [row, achievementRow] = await Promise.all([
        buildQuery({ from, to, idKaryawan })
          .sum({ total: "target.jumlah" })
          .countDistinct({ employees: "target.id_karyawan" })
          .first(),
        achievementQuery,
      ]);
      return {
        total: Number(row?.total ?? 0),
        achieved: Number(achievementRow?.achieved ?? 0),
        employees: Number(row?.employees ?? 0),
      };
    },

    async createMany({ tanggal, jumlah, employeeIds, auditId }) {
      return db.transaction(async (trx) => {
        const employees = await trx("karyawan")
          .whereIn("id", employeeIds)
          .select("id");
        if (employees.length !== employeeIds.length) {
          const error = new Error("Satu atau beberapa karyawan tidak ditemukan.");
          error.statusCode = 400;
          throw error;
        }

        const rows = employeeIds.map((idKaryawan) => ({
          tanggal,
          id_karyawan: idKaryawan,
          jumlah,
          created_by: auditId,
          updated_by: auditId,
        }));
        await trx(tableName).insert(rows);
        return { created: rows.length };
      });
    },

    async deleteMany(ids) {
      return db.transaction(async (trx) => {
        const existingRows = await trx(tableName)
          .whereIn("id", ids)
          .select("id")
          .forUpdate();
        if (existingRows.length !== ids.length) {
          const error = new Error("Satu atau beberapa target tidak ditemukan.");
          error.statusCode = 404;
          throw error;
        }
        const deleted = await trx(tableName).whereIn("id", ids).delete();
        return { deleted: Number(deleted) };
      });
    },
  };
};
