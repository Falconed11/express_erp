import db from "../../config/knex.js";

export const createReportGradesModel = (database = db) => ({
  async listAll() {
    return database("report_grade_rule")
      .select("panel", "threshold", "message")
      .orderBy("panel")
      .orderBy("threshold");
  },

  async replacePanel(panel, grades) {
    await database.transaction(async (trx) => {
      await trx("report_grade_rule").where({ panel }).del();
      if (grades.length > 0) {
        await trx("report_grade_rule").insert(
          grades.map(({ threshold, message }) => ({
            panel,
            threshold,
            message,
          })),
        );
      }
    });
  },
});
