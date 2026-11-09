export async function up(knex) {
  if (
    await knex.schema.hasColumn(
      "keranjangproyek_composite_item",
      "urutan",
    )
  ) {
    return;
  }

  await knex.schema.alterTable("keranjangproyek_composite_item", (table) => {
    table.integer("urutan").unsigned().nullable();
  });

  const components = await knex("keranjangproyek_composite_item")
    .select("id", "id_composite")
    .orderBy("id_composite")
    .orderBy("id");
  const orderByComposite = new Map();
  for (const component of components) {
    const urutan = orderByComposite.get(component.id_composite) || 0;
    await knex("keranjangproyek_composite_item")
      .where({ id: component.id })
      .update({ urutan });
    orderByComposite.set(component.id_composite, urutan + 1);
  }
}

export async function down(knex) {
  if (
    !(await knex.schema.hasColumn(
      "keranjangproyek_composite_item",
      "urutan",
    ))
  ) {
    return;
  }
  await knex.schema.alterTable("keranjangproyek_composite_item", (table) => {
    table.dropColumn("urutan");
  });
}
