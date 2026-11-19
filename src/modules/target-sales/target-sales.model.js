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
  const buildAchievementQuery = ({ from, to, idKaryawan }) => {
    const dateColumn = isVisitTarget ? "activity.tanggal" : "project.tanggal";
    const employeeColumn = isVisitTarget
      ? "activity.id_karyawan"
      : "project.id_karyawan";
    const query = isVisitTarget
      ? db("aktivitassales as activity")
          .join("karyawan as employee", "employee.id", "activity.id_karyawan")
          .where("activity.aktif", true)
          .whereNotNull("activity.tanggalselesai")
      : db("pembayaranproyek as payment")
          .join("proyek as project", "project.id", "payment.id_proyek")
          .join("karyawan as employee", "employee.id", "project.id_karyawan");

    return query.modify((builder) => {
      if (from) builder.where(dateColumn, ">=", from);
      if (to) builder.where(dateColumn, "<=", to);
      if (idKaryawan) builder.where(employeeColumn, idKaryawan);
    });
  };
  const buildPeriodStartExpression = (dateColumn, groupBy) =>
    groupBy === "week"
      ? db.raw(
          "DATE_FORMAT(DATE_SUB(??, INTERVAL WEEKDAY(??) DAY), '%Y-%m-%d') AS period_start",
          [dateColumn, dateColumn],
        )
      : db.raw("DATE_FORMAT(??, '%Y-%m-01') AS period_start", [dateColumn]);
  const getPeriodEnd = (periodStart, groupBy) => {
    const periodEndDate = new Date(`${periodStart}T00:00:00.000Z`);
    if (groupBy === "week") {
      periodEndDate.setUTCDate(periodEndDate.getUTCDate() + 6);
    } else {
      periodEndDate.setUTCMonth(periodEndDate.getUTCMonth() + 1, 0);
    }
    return periodEndDate.toISOString().slice(0, 10);
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
      const achievementQuery = buildAchievementQuery({
        from,
        to,
        idKaryawan,
      });
      const achievementAggregate = isVisitTarget
        ? achievementQuery.clone().count({ achieved: "activity.id" }).first()
        : achievementQuery.clone().sum({ achieved: "payment.nominal" }).first();
      const [row, achievementRow] = await Promise.all([
        buildQuery({ from, to, idKaryawan })
          .sum({ total: "target.jumlah" })
          .countDistinct({ employees: "target.id_karyawan" })
          .first(),
        achievementAggregate,
      ]);
      return {
        total: Number(row?.total ?? 0),
        achieved: Number(achievementRow?.achieved ?? 0),
        employees: Number(row?.employees ?? 0),
      };
    },

    async summarizeByEmployee({ from, to, idKaryawan, groupPeriod }) {
      const targetGroupingColumns = ["target.id_karyawan", "employee.nama"];
      const achievementIdColumn = isVisitTarget
        ? "activity.id_karyawan"
        : "project.id_karyawan";
      const achievementGroupingColumns = [
        achievementIdColumn,
        "employee.nama",
      ];
      const targetQuery = buildQuery({ from, to, idKaryawan })
        .select("target.id_karyawan", "employee.nama AS nama_karyawan");
      if (groupPeriod) {
        targetQuery.select(
          buildPeriodStartExpression("target.tanggal", groupPeriod),
        );
        targetGroupingColumns.push("period_start");
      }
      targetQuery
        .sum({ total: "target.jumlah" })
        .groupBy(...targetGroupingColumns);
      const achievementQuery = buildAchievementQuery({
        from,
        to,
        idKaryawan,
      }).select(achievementIdColumn, "employee.nama AS nama_karyawan");
      if (groupPeriod) {
        achievementQuery.select(
          buildPeriodStartExpression(
            isVisitTarget ? "activity.tanggal" : "project.tanggal",
            groupPeriod,
          ),
        );
        achievementGroupingColumns.push("period_start");
      }
      const groupedAchievements = isVisitTarget
        ? achievementQuery
            .count({ achieved: "activity.id" })
            .groupBy(...achievementGroupingColumns)
        : achievementQuery
            .sum({ achieved: "payment.nominal" })
            .groupBy(...achievementGroupingColumns);
      const [targetRows, achievementRows] = await Promise.all([
        targetQuery,
        groupedAchievements,
      ]);
      const groupsByEmployee = new Map();
      const getEmployeeGroup = (row) => {
        const key = groupPeriod
          ? `${row.id_karyawan}:${row.period_start}`
          : String(row.id_karyawan);
        if (!groupsByEmployee.has(key)) {
          groupsByEmployee.set(key, {
            id_karyawan: row.id_karyawan,
            nama_karyawan: row.nama_karyawan,
            ...(groupPeriod ? { period_start: row.period_start } : {}),
            total: 0,
            achieved: 0,
          });
        }
        return groupsByEmployee.get(key);
      };

      for (const row of targetRows) {
        getEmployeeGroup(row).total = Number(row.total ?? 0);
      }
      for (const row of achievementRows) {
        getEmployeeGroup(row).achieved = Number(row.achieved ?? 0);
      }

      const groups = Array.from(groupsByEmployee.values()).map((group) => ({
        ...group,
        ...(groupPeriod
          ? { period_end: getPeriodEnd(group.period_start, groupPeriod) }
          : {}),
        remaining: Math.max(group.total - group.achieved, 0),
      }));
      groups.sort((left, right) => {
        if (groupPeriod && left.period_start !== right.period_start) {
          return left.period_start.localeCompare(right.period_start);
        }
        return left.nama_karyawan.localeCompare(right.nama_karyawan, "id-ID");
      });
      const total = groups.reduce((sum, group) => sum + group.total, 0);
      const achieved = groups.reduce((sum, group) => sum + group.achieved, 0);
      const employees = new Set(
        targetRows.map((row) => String(row.id_karyawan)),
      ).size;
      return {
        total,
        achieved,
        remaining: Math.max(total - achieved, 0),
        employees,
        groups,
      };
    },

    async summarizeByPeriod({ from, to, idKaryawan, groupBy }) {
      const achievementDateColumn = isVisitTarget
        ? "activity.tanggal"
        : "project.tanggal";
      const targetQuery = buildQuery({ from, to, idKaryawan })
        .select(buildPeriodStartExpression("target.tanggal", groupBy))
        .sum({ total: "target.jumlah" })
        .groupBy("period_start")
        .orderBy("period_start");
      const achievementQuery = buildAchievementQuery({
        from,
        to,
        idKaryawan,
      })
        .select(buildPeriodStartExpression(achievementDateColumn, groupBy))
        .groupBy("period_start")
        .orderBy("period_start");
      const groupedAchievements = isVisitTarget
        ? achievementQuery.count({ achieved: "activity.id" })
        : achievementQuery.sum({ achieved: "payment.nominal" });
      const [targetRows, achievementRows, employeeCountRow] =
        await Promise.all([
          targetQuery,
          groupedAchievements,
          buildQuery({ from, to, idKaryawan })
            .countDistinct({ employees: "target.id_karyawan" })
            .first(),
        ]);
      const groupsByPeriod = new Map();
      const getPeriodGroup = (row) => {
        const key = row.period_start;
        if (!groupsByPeriod.has(key)) {
          groupsByPeriod.set(key, {
            period_start: key,
            total: 0,
            achieved: 0,
          });
        }
        return groupsByPeriod.get(key);
      };

      for (const row of targetRows) {
        getPeriodGroup(row).total = Number(row.total ?? 0);
      }
      for (const row of achievementRows) {
        getPeriodGroup(row).achieved = Number(row.achieved ?? 0);
      }

      const groups = Array.from(groupsByPeriod.values())
        .sort((left, right) =>
          left.period_start.localeCompare(right.period_start),
        )
        .map((group) => ({
          ...group,
          period_end: getPeriodEnd(group.period_start, groupBy),
          remaining: Math.max(group.total - group.achieved, 0),
        }));
      const total = groups.reduce((sum, group) => sum + group.total, 0);
      const achieved = groups.reduce((sum, group) => sum + group.achieved, 0);
      return {
        total,
        achieved,
        remaining: Math.max(total - achieved, 0),
        employees: Number(employeeCountRow?.employees ?? 0),
        groups,
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

    async updateOne({ id, tanggal, jumlah, idKaryawan, auditId }) {
      return db.transaction(async (trx) => {
        const target = await trx(tableName)
          .where({ id, aktif: true })
          .first("id");
        if (!target) {
          const error = new Error("Target tidak ditemukan.");
          error.statusCode = 404;
          throw error;
        }

        await trx(tableName)
          .where({ id, aktif: true })
          .update({
            tanggal,
            jumlah,
            id_karyawan: idKaryawan,
            updated_by: auditId,
          });
        return { affectedRows: 1 };
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
