const { pool } = require("./db.2.0.0.cjs");
const { withTransaction } = require("../helpers/transaction.cjs");
const {
  invalidateApproval,
} = require("../src/modules/project-approval/project-approval-invalidation.cjs");
const { recalculateRecapTax } = require("./rekapitulasiproyek-pajak.cjs");

const groupTable = "keranjangproyek_composite";
const itemTable = "keranjangproyek_composite_item";
const basketTable = "keranjangproyek";
const maxBasketQuantity = 999999999999.999;

const normalizeScope = ({ id_proyek, versi, instalasi }) => {
  const projectId = Number(id_proyek);
  const version = Number(versi);
  const installation = Number(instalasi);
  if (
    !Number.isInteger(projectId) ||
    projectId <= 0 ||
    !Number.isInteger(version) ||
    version <= 0 ||
    ![0, 1].includes(installation)
  ) {
    throw new Error("Data proyek, versi, atau bagian penawaran tidak valid.");
  }
  return { id_proyek: projectId, versi: version, instalasi: installation };
};

const normalizeQuantity = (value) => {
  const quantity = Number(value);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("Jumlah gabungan harus lebih besar dari nol.");
  }
  return quantity;
};

const normalizeReplacementSelections = (selections) => {
  if (!Array.isArray(selections) || selections.length < 2) {
    throw new Error("Pilih minimal dua baris untuk membuat gabungan.");
  }
  const normalized = selections.map((selection) => ({
    type: selection?.type,
    id: Number(selection?.id),
  }));
  if (
    normalized.some(
      ({ type, id }) =>
        !["item", "composite"].includes(type) ||
        !Number.isInteger(id) ||
        id <= 0,
    )
  ) {
    throw new Error("Pilihan produk gabungan tidak valid.");
  }
  const keys = normalized.map(({ type, id }) => `${type}:${id}`);
  if (new Set(keys).size !== keys.length) {
    throw new Error("Pilihan produk gabungan tidak boleh berulang.");
  }
  if (!normalized.some(({ type }) => type === "composite")) {
    throw new Error("Pilih gabungan yang akan digantikan.");
  }
  return normalized;
};

const expandReplacementComponents = (
  selections,
  compositeRows,
  itemRows,
  compositeComponentRows,
) => {
  const compositesById = new Map(
    compositeRows.map((row) => [Number(row.id), row]),
  );
  const itemsById = new Map(itemRows.map((row) => [Number(row.id), row]));
  const componentsByCompositeId = new Map();
  for (const component of compositeComponentRows) {
    const compositeId = Number(component.id_composite);
    const components = componentsByCompositeId.get(compositeId) || [];
    components.push(component);
    componentsByCompositeId.set(compositeId, components);
  }

  const expanded = [];
  const seenItemIds = new Set();
  for (const selection of selections) {
    if (selection.type === "item") {
      const item = itemsById.get(selection.id);
      if (!item) throw new Error("Produk yang dipilih tidak ditemukan.");
      const quantity = Number(item.jumlah);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new Error("Jumlah produk yang dipilih tidak valid.");
      }
      if (seenItemIds.has(selection.id)) {
        throw new Error("Produk gabungan tidak boleh berulang.");
      }
      seenItemIds.add(selection.id);
      expanded.push({
        id_keranjangproyek: selection.id,
        jumlah: quantity,
        id_subproyek: item.id_subproyek ?? null,
      });
      continue;
    }

    const composite = compositesById.get(selection.id);
    if (!composite) throw new Error("Gabungan yang dipilih tidak ditemukan.");
    const groupQuantity = Number(composite.jumlah);
    if (!Number.isFinite(groupQuantity) || groupQuantity <= 0) {
      throw new Error("Jumlah gabungan yang dipilih tidak valid.");
    }
    const components = componentsByCompositeId.get(selection.id) || [];
    if (components.length === 0) {
      throw new Error("Gabungan yang dipilih tidak memiliki produk.");
    }
    for (const component of components) {
      const itemId = Number(component.id_keranjangproyek);
      const componentQuantity = Number(component.jumlah);
      if (
        !Number.isInteger(itemId) ||
        itemId <= 0 ||
        !Number.isFinite(componentQuantity) ||
        componentQuantity <= 0 ||
        componentQuantity > maxBasketQuantity
      ) {
        throw new Error("Jumlah produk dalam gabungan tidak valid.");
      }
      if (seenItemIds.has(itemId)) {
        throw new Error("Produk gabungan tidak boleh berulang.");
      }
      seenItemIds.add(itemId);
      expanded.push({
        id_keranjangproyek: itemId,
        jumlah: componentQuantity,
        id_subproyek: component.id_subproyek ?? null,
      });
    }
  }
  if (expanded.length < 2) {
    throw new Error("Gabungan baru harus memiliki minimal dua produk.");
  }
  return expanded;
};

const assertCompositeEditor = async (conn, idProyek, user) => {
  const [rows] = await conn.execute(
    `SELECT proyek.id_karyawan, statusproyek.progress
     FROM proyek
     JOIN statusproyek ON statusproyek.id = proyek.id_statusproyek
     WHERE proyek.id = ?`,
    [idProyek],
  );
  const project = rows[0];
  if (!project) throw new Error("Proyek tidak ditemukan.");
  const rank = Number(user?.rank);
  const isHighRole =
    user?.rank != null && Number.isFinite(rank) && rank <= 20;
  const isAssigned = project.id_karyawan == null ||
    Number(project.id_karyawan) === Number(user?.id_karyawan);
  if (!isHighRole && !isAssigned) {
    const error = new Error("Anda tidak berhak mengubah penawaran proyek ini.");
    error.statusCode = 403;
    throw error;
  }
  const progress = Number(project.progress);
  if (!Number.isFinite(progress) || progress < 10 || progress >= 100) {
    const error = new Error("Penawaran tidak dapat diubah pada status proyek ini.");
    error.statusCode = 403;
    throw error;
  }
};

const validateSubProject = async (conn, idProyek, idSubProject) => {
  if (idSubProject == null || idSubProject === "") return null;
  const id = Number(idSubProject);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Sub proyek tidak valid.");
  }
  const [rows] = await conn.execute(
    "SELECT id FROM subproyek WHERE id = ? AND id_proyek = ?",
    [id, idProyek],
  );
  if (!rows.length) throw new Error("Sub proyek tidak ditemukan.");
  return id;
};

const listEntities = async (
  conn,
  { id_proyek, versi, instalasi, id_subproyek },
) => {
  const [rows] = await conn.execute(
    `SELECT entity_type, entity_id, sort_order FROM (
       SELECT 'item' AS entity_type, kp.id AS entity_id,
              COALESCE(kp.urutan, kp.id) AS sort_order
       FROM ${basketTable} kp
       LEFT JOIN ${itemTable} ci ON ci.id_keranjangproyek = kp.id
       WHERE kp.id_proyek = ? AND kp.versi = ? AND kp.instalasi = ?
         AND kp.id_subproyek <=> ? AND ci.id IS NULL
       UNION ALL
       SELECT 'composite' AS entity_type, cg.id AS entity_id,
              COALESCE(cg.urutan, cg.id) AS sort_order
       FROM ${groupTable} cg
       WHERE cg.id_proyek = ? AND cg.versi = ? AND cg.instalasi = ?
         AND cg.id_subproyek <=> ?
     ) entities
     ORDER BY sort_order, entity_type, entity_id`,
    [
      id_proyek,
      versi,
      instalasi,
      id_subproyek,
      id_proyek,
      versi,
      instalasi,
      id_subproyek,
    ],
  );
  return rows;
};

const saveEntityOrder = async (conn, entities) => {
  for (const [urutan, entity] of entities.entries()) {
    const table = entity.type === "composite" ? groupTable : basketTable;
    await conn.execute(`UPDATE ${table} SET urutan = ? WHERE id = ?`, [
      urutan,
      entity.id,
    ]);
  }
};

const normalizeSubProjectOrder = async (conn, scope) => {
  const entities = await listEntities(conn, scope);
  await saveEntityOrder(
    conn,
    entities.map((entity) => ({
      type: entity.entity_type,
      id: entity.entity_id,
    })),
  );
};

const list = async ({ id_proyek, versi, instalasi }) => {
  const scope = normalizeScope({ id_proyek, versi, instalasi });
  const [rows] = await pool.execute(
    `SELECT cg.id AS id_composite, cg.id_proyek, cg.versi, cg.instalasi,
            cg.id_subproyek, sp.nama AS subproyek, cg.nama AS composite_nama,
            cg.jumlah AS composite_jumlah, cg.satuan AS composite_satuan,
            cg.urutan AS composite_urutan,
            kp.id AS id_keranjangproyek, kp.id_subproyek AS component_id_subproyek,
            kp.jumlah, ci.urutan AS component_urutan,
            kp.hargamodal AS temphargamodal, kp.harga,
            kp.hargakustom, kp.keterangan, kp.showmerek, kp.showtipe,
            p.id AS id_produk, p.nama, p.tipe, p.satuan AS product_satuan,
            p.hargamodal, p.hargajual, p.hargabatas, p.stok,
            m.nama AS nmerek
     FROM ${groupTable} cg
     LEFT JOIN subproyek sp ON sp.id = cg.id_subproyek
     LEFT JOIN ${itemTable} ci ON ci.id_composite = cg.id
     LEFT JOIN ${basketTable} kp ON kp.id = ci.id_keranjangproyek
     LEFT JOIN produk p ON p.id = kp.id_produk
     LEFT JOIN merek m ON m.id = p.id_merek
     WHERE cg.id_proyek = ? AND cg.versi = ? AND cg.instalasi = ?
     ORDER BY COALESCE(cg.urutan, cg.id), cg.id,
              COALESCE(ci.urutan, ci.id), ci.id`,
    [scope.id_proyek, scope.versi, scope.instalasi],
  );
  const groups = new Map();
  for (const row of rows) {
    let group = groups.get(row.id_composite);
    if (!group) {
      group = {
        id_composite: row.id_composite,
        id_proyek: row.id_proyek,
        versi: row.versi,
        instalasi: row.instalasi,
        id_subproyek: row.id_subproyek,
        subproyek: row.subproyek,
        nama: row.composite_nama,
        jumlah: Number(row.composite_jumlah),
        satuan: row.composite_satuan,
        urutan: row.composite_urutan,
        components: [],
      };
      groups.set(row.id_composite, group);
    }
    if (row.id_keranjangproyek == null) continue;
    group.components.push({
      id_keranjangproyek: row.id_keranjangproyek,
      id_subproyek: row.component_id_subproyek,
      urutan: row.component_urutan,
      jumlah: Number(row.jumlah),
      temphargamodal: row.temphargamodal,
      harga: row.harga,
      hargakustom: row.hargakustom,
      keterangan: row.keterangan,
      showmerek: row.showmerek,
      showtipe: row.showtipe,
      id_produk: row.id_produk,
      nama: row.nama,
      tipe: row.tipe,
      satuan: row.product_satuan,
      hargamodal: row.hargamodal,
      hargajual: row.hargajual,
      hargabatas: row.hargabatas,
      stok: row.stok,
      nmerek: row.nmerek,
    });
  }
  return [...groups.values()];
};

const create = async (form) => {
  const scope = normalizeScope(form);
  const quantity = normalizeQuantity(form.jumlah);
  const name = String(form.nama ?? "").trim();
  const unit = String(form.satuan ?? "").trim();
  const ids = Array.isArray(form.ids)
    ? form.ids.map(Number)
    : [];
  if (!name) throw new Error("Nama gabungan wajib diisi.");
  if (ids.length < 2 || ids.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw new Error("Pilih minimal dua produk untuk digabungkan.");
  }
  if (new Set(ids).size !== ids.length) {
    throw new Error("Produk gabungan tidak boleh berulang.");
  }

  return withTransaction(pool, async (conn) => {
    await assertCompositeEditor(conn, scope.id_proyek, form.user);
    await invalidateApproval(conn, scope.id_proyek, scope.versi, form.updated_by);
    const idSubProject = await validateSubProject(
      conn,
      scope.id_proyek,
      form.id_subproyek,
    );
    const placeholders = ids.map(() => "?").join(", ");
    const [rows] = await conn.execute(
      `SELECT id, id_proyek, versi, instalasi, id_subproyek,
              COALESCE(urutan, id) AS sort_order
       FROM ${basketTable}
       WHERE id IN (${placeholders})
       FOR UPDATE`,
      ids,
    );
    if (rows.length !== ids.length) {
      throw new Error("Sebagian produk yang dipilih tidak ditemukan.");
    }
    const sameScope = rows.every(
      (row) =>
        Number(row.id_proyek) === scope.id_proyek &&
        Number(row.versi) === scope.versi &&
        Number(row.instalasi) === scope.instalasi,
    );
    if (!sameScope) {
      throw new Error(
        "Produk gabungan harus berasal dari proyek, versi, dan bagian penawaran yang sama.",
      );
    }
    const [alreadyGrouped] = await conn.execute(
      `SELECT id_keranjangproyek FROM ${itemTable}
       WHERE id_keranjangproyek IN (${placeholders})`,
      ids,
    );
    if (alreadyGrouped.length) {
      throw new Error("Produk yang dipilih sudah menjadi bagian gabungan.");
    }

    const targetRows = rows.filter(
      (row) => (row.id_subproyek ?? null) === idSubProject,
    );
    const targetEntities = await listEntities(conn, {
      ...scope,
      id_subproyek: idSubProject,
    });
    const order =
      targetRows.length > 0
        ? Math.min(...targetRows.map((row) => Number(row.sort_order)))
        : targetEntities.length > 0
          ? Number(targetEntities.at(-1).sort_order) + 1
          : 0;
    const [result] = await conn.execute(
      `INSERT INTO ${groupTable}
         (id_proyek, versi, instalasi, id_subproyek, nama, jumlah, satuan,
          urutan, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        scope.id_proyek,
        scope.versi,
        scope.instalasi,
        idSubProject,
        name,
        quantity,
        unit,
        order,
        form.updated_by ?? null,
        form.updated_by ?? null,
      ],
    );
    const compositeId = result.insertId;
    for (const [urutan, id] of ids.entries()) {
      await conn.execute(
        `INSERT INTO ${itemTable} (id_composite, id_keranjangproyek, urutan)
         VALUES (?, ?, ?)`,
        [compositeId, id, urutan],
      );
    }

    const sourceSubProjects = new Set(
      rows.map((row) => row.id_subproyek ?? null),
    );
    sourceSubProjects.add(idSubProject);
    for (const id of sourceSubProjects) {
      await normalizeSubProjectOrder(conn, {
        ...scope,
        id_subproyek: id,
      });
    }
    await recalculateRecapTax(conn, scope.id_proyek, scope.versi);
    return { insertId: compositeId };
  });
};

const replace = async (form, transactionPool = pool) => {
  const scope = normalizeScope(form);
  const quantity = normalizeQuantity(form.jumlah);
  const name = String(form.nama ?? "").trim();
  const unit = String(form.satuan ?? "").trim();
  const selections = normalizeReplacementSelections(form.selections);
  if (!name) throw new Error("Nama gabungan wajib diisi.");

  const compositeIds = selections
    .filter(({ type }) => type === "composite")
    .map(({ id }) => id);
  const itemIds = selections
    .filter(({ type }) => type === "item")
    .map(({ id }) => id);

  return withTransaction(transactionPool, async (conn) => {
    await assertCompositeEditor(conn, scope.id_proyek, form.user);
    await invalidateApproval(
      conn,
      scope.id_proyek,
      scope.versi,
      form.updated_by,
    );
    const idSubProject = await validateSubProject(
      conn,
      scope.id_proyek,
      form.id_subproyek,
    );

    const compositePlaceholders = compositeIds.map(() => "?").join(", ");
    const [compositeRows] = await conn.execute(
      `SELECT id, id_proyek, versi, instalasi, id_subproyek, jumlah,
              COALESCE(urutan, id) AS sort_order
       FROM ${groupTable}
       WHERE id IN (${compositePlaceholders})
       FOR UPDATE`,
      compositeIds,
    );
    if (
      compositeRows.length !== compositeIds.length ||
      compositeRows.some(
        (row) =>
          Number(row.id_proyek) !== scope.id_proyek ||
          Number(row.versi) !== scope.versi ||
          Number(row.instalasi) !== scope.instalasi,
      )
    ) {
      throw new Error(
        "Gabungan harus berasal dari proyek, versi, dan bagian penawaran yang sama.",
      );
    }

    let itemRows = [];
    if (itemIds.length > 0) {
      const itemPlaceholders = itemIds.map(() => "?").join(", ");
      [itemRows] = await conn.execute(
        `SELECT id, id_proyek, versi, instalasi, id_subproyek, jumlah,
                COALESCE(urutan, id) AS sort_order
         FROM ${basketTable}
         WHERE id IN (${itemPlaceholders})
         FOR UPDATE`,
        itemIds,
      );
      if (
        itemRows.length !== itemIds.length ||
        itemRows.some(
          (row) =>
            Number(row.id_proyek) !== scope.id_proyek ||
            Number(row.versi) !== scope.versi ||
            Number(row.instalasi) !== scope.instalasi,
        )
      ) {
        throw new Error(
          "Produk harus berasal dari proyek, versi, dan bagian penawaran yang sama.",
        );
      }
      const [existingLinks] = await conn.execute(
        `SELECT id_keranjangproyek FROM ${itemTable}
         WHERE id_keranjangproyek IN (${itemPlaceholders})`,
        itemIds,
      );
      if (existingLinks.length > 0) {
        throw new Error("Produk yang dipilih sudah menjadi bagian gabungan.");
      }
    }

    const [compositeComponentRows] = await conn.execute(
      `SELECT ci.id_composite, ci.id_keranjangproyek,
              COALESCE(ci.urutan, ci.id) AS component_order,
              kp.id_proyek, kp.versi, kp.instalasi,
              kp.jumlah, kp.id_subproyek
       FROM ${itemTable} ci
       JOIN ${basketTable} kp ON kp.id = ci.id_keranjangproyek
       WHERE ci.id_composite IN (${compositePlaceholders})
       ORDER BY ci.id_composite, component_order, ci.id
       FOR UPDATE`,
      compositeIds,
    );
    if (
      compositeComponentRows.some(
        (component) =>
          Number(component.id_proyek) !== scope.id_proyek ||
          Number(component.versi) !== scope.versi ||
          Number(component.instalasi) !== scope.instalasi,
      )
    ) {
      throw new Error(
        "Produk dalam gabungan tidak cocok dengan proyek, versi, atau bagian penawaran.",
      );
    }
    const components = expandReplacementComponents(
      selections,
      compositeRows,
      itemRows,
      compositeComponentRows,
    );

    const selectedCompositeIds = new Set(compositeIds);
    const targetEntities = await listEntities(conn, {
      ...scope,
      id_subproyek: idSubProject,
    });
    const selectedTargetOrders = [
      ...compositeRows
        .filter((row) => (row.id_subproyek ?? null) === idSubProject)
        .map((row) => Number(row.sort_order)),
      ...itemRows
        .filter((row) => (row.id_subproyek ?? null) === idSubProject)
        .map((row) => Number(row.sort_order)),
    ];
    const remainingTargetEntities = targetEntities.filter(
      (entity) =>
        entity.entity_type !== "composite" ||
        !selectedCompositeIds.has(Number(entity.entity_id)),
    );
    const order =
      selectedTargetOrders.length > 0
        ? Math.min(...selectedTargetOrders)
        : remainingTargetEntities.length > 0
          ? Number(remainingTargetEntities.at(-1).sort_order) + 1
          : 0;

    await conn.execute(
      `DELETE FROM ${itemTable}
       WHERE id_composite IN (${compositePlaceholders})`,
      compositeIds,
    );
    await conn.execute(
      `DELETE FROM ${groupTable}
       WHERE id IN (${compositePlaceholders})`,
      compositeIds,
    );

    for (const component of components) {
      await conn.execute(
        `UPDATE ${basketTable}
         SET jumlah = ?, lastuser = ?
         WHERE id = ?`,
        [component.jumlah, form.updated_by ?? null, component.id_keranjangproyek],
      );
    }

    const [result] = await conn.execute(
      `INSERT INTO ${groupTable}
         (id_proyek, versi, instalasi, id_subproyek, nama, jumlah, satuan,
          urutan, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        scope.id_proyek,
        scope.versi,
        scope.instalasi,
        idSubProject,
        name,
        quantity,
        unit,
        order,
        form.updated_by ?? null,
        form.updated_by ?? null,
      ],
    );
    const compositeId = result.insertId;
    for (const [urutan, component] of components.entries()) {
      await conn.execute(
        `INSERT INTO ${itemTable}
           (id_composite, id_keranjangproyek, urutan)
         VALUES (?, ?, ?)`,
        [compositeId, component.id_keranjangproyek, urutan],
      );
    }

    const sourceSubProjects = new Set([
      idSubProject,
      ...compositeRows.map((row) => row.id_subproyek ?? null),
      ...components.map((component) => component.id_subproyek ?? null),
    ]);
    for (const id of sourceSubProjects) {
      await normalizeSubProjectOrder(conn, {
        ...scope,
        id_subproyek: id,
      });
    }
    await recalculateRecapTax(conn, scope.id_proyek, scope.versi);
    return { insertId: compositeId };
  });
};

const update = async (form) => {
  const { id, id_proyek, user, ...rest } = form;
  const compositeId = Number(id);
  if (!Number.isInteger(compositeId) || compositeId <= 0) {
    throw new Error("Gabungan tidak valid.");
  }
  const fields = [];
  const values = [];
  if (rest.nama !== undefined) {
    const name = String(rest.nama).trim();
    if (!name) throw new Error("Nama gabungan wajib diisi.");
    fields.push("nama = ?");
    values.push(name);
  }
  if (rest.jumlah !== undefined) {
    fields.push("jumlah = ?");
    values.push(normalizeQuantity(rest.jumlah));
  }
  if (rest.satuan !== undefined) {
    fields.push("satuan = ?");
    values.push(String(rest.satuan).trim());
  }
  if (rest.updated_by !== undefined) {
    fields.push("updated_by = ?");
    values.push(rest.updated_by ?? null);
  }
  const hasSubProject = Object.prototype.hasOwnProperty.call(
    rest,
    "id_subproyek",
  );
  const hasComponents = Object.prototype.hasOwnProperty.call(
    rest,
    "component_ids",
  );
  if (hasSubProject) fields.push("id_subproyek = ?");
  if (fields.length === 0 && !hasSubProject && !hasComponents) {
    throw new Error("Tidak ada perubahan untuk disimpan.");
  }

  return withTransaction(pool, async (conn) => {
    const [currentRows] = await conn.execute(
      `SELECT id, id_proyek, versi, instalasi, id_subproyek
       FROM ${groupTable} WHERE id = ? FOR UPDATE`,
      [compositeId],
    );
    const current = currentRows[0];
    if (!current) throw new Error("Gabungan tidak ditemukan.");
    if (
      id_proyek != null &&
      Number(current.id_proyek) !== Number(id_proyek)
    ) {
      throw new Error("Gabungan tidak ditemukan di proyek ini.");
    }
    await assertCompositeEditor(conn, current.id_proyek, user);
    await invalidateApproval(
      conn,
      current.id_proyek,
      current.versi,
      rest.updated_by,
    );
    if (hasComponents) {
      const componentIds = Array.isArray(rest.component_ids)
        ? rest.component_ids.map(Number)
        : [];
      if (
        componentIds.length === 0 ||
        componentIds.some(
          (componentId) =>
            !Number.isInteger(componentId) || componentId <= 0,
        ) ||
        new Set(componentIds).size !== componentIds.length
      ) {
        throw new Error("Daftar produk gabungan tidak valid.");
      }
      const placeholders = componentIds.map(() => "?").join(", ");
      const [componentRows] = await conn.execute(
        `SELECT id, id_proyek, versi, instalasi
         FROM ${basketTable}
         WHERE id IN (${placeholders})
         FOR UPDATE`,
        componentIds,
      );
      if (
        componentRows.length !== componentIds.length ||
        componentRows.some(
          (component) =>
            Number(component.id_proyek) !== Number(current.id_proyek) ||
            Number(component.versi) !== Number(current.versi) ||
            Number(component.instalasi) !== Number(current.instalasi),
        )
      ) {
        throw new Error("Produk gabungan tidak ditemukan di penawaran ini.");
      }
      const [existingLinks] = await conn.execute(
        `SELECT ci.id_keranjangproyek, ci.id_composite
         FROM ${itemTable} ci
         WHERE ci.id_keranjangproyek IN (${placeholders})`,
        componentIds,
      );
      if (
        existingLinks.some(
          (link) => Number(link.id_composite) !== compositeId,
        )
      ) {
        throw new Error("Produk sudah menjadi bagian gabungan lain.");
      }
      await conn.execute(`DELETE FROM ${itemTable} WHERE id_composite = ?`, [
        compositeId,
      ]);
      for (const [urutan, componentId] of componentIds.entries()) {
        await conn.execute(
          `INSERT INTO ${itemTable}
             (id_composite, id_keranjangproyek, urutan)
           VALUES (?, ?, ?)`,
          [compositeId, componentId, urutan],
        );
      }
    }
    const idSubProject = hasSubProject
      ? await validateSubProject(conn, current.id_proyek, rest.id_subproyek)
      : current.id_subproyek;
    const isMovingSubProject =
      hasSubProject && (current.id_subproyek ?? null) !== idSubProject;
    if (hasSubProject) {
      values.push(idSubProject);
    }
    if (isMovingSubProject) {
      fields.push("urutan = ?");
      const targetEntities = (
        await listEntities(conn, {
          id_proyek: current.id_proyek,
          versi: current.versi,
          instalasi: current.instalasi,
          id_subproyek: idSubProject,
        })
      ).filter(
        (entity) =>
          entity.entity_type !== "composite" ||
          Number(entity.entity_id) !== compositeId,
      );
      values.push(
        targetEntities.length > 0
          ? Number(targetEntities.at(-1).sort_order) + 1
          : 0,
      );
    }
    if (fields.length > 0) {
      values.push(compositeId);
      await conn.execute(
        `UPDATE ${groupTable} SET ${fields.join(", ")} WHERE id = ?`,
        values,
      );
    }
    if (isMovingSubProject) {
      await normalizeSubProjectOrder(conn, {
        id_proyek: current.id_proyek,
        versi: current.versi,
        instalasi: current.instalasi,
        id_subproyek: current.id_subproyek ?? null,
      });
      await normalizeSubProjectOrder(conn, {
        id_proyek: current.id_proyek,
        versi: current.versi,
        instalasi: current.instalasi,
        id_subproyek: idSubProject,
      });
    }
    await recalculateRecapTax(conn, current.id_proyek, current.versi);
    return { affectedRows: 1 };
  });
};

const destroy = async ({ id, id_proyek, updated_by, user }) => {
  const compositeId = Number(id);
  if (!Number.isInteger(compositeId) || compositeId <= 0) {
    throw new Error("Gabungan tidak valid.");
  }
  return withTransaction(pool, async (conn) => {
    const [rows] = await conn.execute(
      `SELECT id, id_proyek, versi, instalasi, id_subproyek
       FROM ${groupTable} WHERE id = ? FOR UPDATE`,
      [compositeId],
    );
    const group = rows[0];
    if (!group) throw new Error("Gabungan tidak ditemukan.");
    if (id_proyek != null && Number(group.id_proyek) !== Number(id_proyek)) {
      throw new Error("Gabungan tidak ditemukan di proyek ini.");
    }
    await assertCompositeEditor(conn, group.id_proyek, user);
    await invalidateApproval(
      conn,
      group.id_proyek,
      group.versi,
      updated_by,
    );
    const [componentRows] = await conn.execute(
      `SELECT kp.id_subproyek
       FROM ${itemTable} ci
       JOIN ${basketTable} kp ON kp.id = ci.id_keranjangproyek
       WHERE ci.id_composite = ?`,
      [compositeId],
    );
    await conn.execute(`DELETE FROM ${groupTable} WHERE id = ?`, [
      compositeId,
    ]);
    const subProjects = new Set([
      group.id_subproyek ?? null,
      ...componentRows.map((row) => row.id_subproyek ?? null),
    ]);
    for (const idSubProject of subProjects) {
      await normalizeSubProjectOrder(conn, {
        id_proyek: group.id_proyek,
        versi: group.versi,
        instalasi: group.instalasi,
        id_subproyek: idSubProject,
      });
    }
    await recalculateRecapTax(conn, group.id_proyek, group.versi);
    return { affectedRows: 1 };
  });
};

const reorder = async ({
  id_proyek,
  versi,
  instalasi,
  id_subproyek = null,
  items,
  updated_by,
  user,
}) => {
  const scope = normalizeScope({ id_proyek, versi, instalasi });
  if (!Array.isArray(items) || items.length < 2) {
    throw new Error("Pilih minimal dua baris untuk mengubah urutan.");
  }
  const normalizedItems = items.map((item) => ({
    type: item?.type,
    id: Number(item?.id),
  }));
  if (
    normalizedItems.some(
      ({ type, id }) =>
        !["item", "composite"].includes(type) ||
        !Number.isInteger(id) ||
        id <= 0,
    ) ||
    new Set(normalizedItems.map(({ type, id }) => `${type}:${id}`)).size !==
      normalizedItems.length
  ) {
    throw new Error("Urutan baris gabungan tidak valid.");
  }

  return withTransaction(pool, async (conn) => {
    await assertCompositeEditor(conn, scope.id_proyek, user);
    const currentEntities = await listEntities(conn, {
      ...scope,
      id_subproyek,
    });
    const currentKeys = new Set(
      currentEntities.map((entity) => `${entity.entity_type}:${entity.entity_id}`),
    );
    const requestedKeys = new Set(
      normalizedItems.map(({ type, id }) => `${type}:${id}`),
    );
    if (
      currentKeys.size !== requestedKeys.size ||
      [...currentKeys].some((key) => !requestedKeys.has(key))
    ) {
      throw new Error(
        "Urutan harus mencakup semua baris di sub proyek yang sama.",
      );
    }
    await invalidateApproval(
      conn,
      scope.id_proyek,
      scope.versi,
      updated_by,
    );
    await saveEntityOrder(conn, normalizedItems);
    return { affectedRows: normalizedItems.length };
  });
};

const copyForVersion = async (
  conn,
  { id_proyek, sourceVersion, targetVersion, basketIdMap },
) => {
  const [groups] = await conn.execute(
    `SELECT id, instalasi, id_subproyek, nama, jumlah, satuan, urutan
     FROM ${groupTable}
     WHERE id_proyek = ? AND versi = ?
     ORDER BY id`,
    [id_proyek, sourceVersion],
  );
  for (const group of groups) {
    const [result] = await conn.execute(
      `INSERT INTO ${groupTable}
         (id_proyek, versi, instalasi, id_subproyek, nama, jumlah, satuan,
          urutan)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id_proyek,
        targetVersion,
        group.instalasi,
        group.id_subproyek,
        group.nama,
        group.jumlah,
        group.satuan,
        group.urutan,
      ],
    );
    const [components] = await conn.execute(
      `SELECT id_keranjangproyek, urutan FROM ${itemTable}
       WHERE id_composite = ?`,
      [group.id],
    );
    for (const component of components) {
      const copiedId = basketIdMap.get(Number(component.id_keranjangproyek));
      if (!copiedId) {
        throw new Error("Produk gabungan gagal disalin ke versi baru.");
      }
      await conn.execute(
        `INSERT INTO ${itemTable}
           (id_composite, id_keranjangproyek, urutan)
         VALUES (?, ?, ?)`,
        [result.insertId, copiedId, component.urutan],
      );
    }
  }
};

module.exports = {
  list,
  create,
  replace,
  update,
  destroy,
  reorder,
  copyForVersion,
  normalizeReplacementSelections,
  expandReplacementComponents,
};
