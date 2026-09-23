export async function up(knex) {
  await knex.transaction(async (trx) => {
    const payments = await trx("pembayaranproyek")
      .select("id", "tanggal")
      .whereNull("id_second")
      .orderBy("id");

    for (const payment of payments) {
      const year = new Date(payment.tanggal).getFullYear();
      const sequence = await trx("kwitansi_sequences")
        .where({ year })
        .forUpdate()
        .first();
      const nextSeq = (sequence?.last_seq || 0) + 1;

      if (sequence) {
        await trx("kwitansi_sequences")
          .where({ year })
          .update({ last_seq: nextSeq });
      } else {
        await trx("kwitansi_sequences").insert({
          year,
          last_seq: nextSeq,
        });
      }

      await trx("pembayaranproyek")
        .where({ id: payment.id })
        .update({
          id_second: `${year}-${String(nextSeq).padStart(4, "0")}`,
        });
    }
  });
}

export async function down() {}
