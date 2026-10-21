import test from "node:test";
import assert from "node:assert/strict";
import { createKeteranganKhususPenawaranService } from "./keterangan-khusus-penawaran.service.js";

const createRepository = (overrides = {}) => ({
  getProject: async () => ({ id: 7, id_karyawan: 11, progress: 50 }),
  hasOfferVersion: async () => true,
  list: async () => [],
  create: async (data) => data,
  update: async () => ({ affectedRows: 1 }),
  remove: async () => ({ affectedRows: 1 }),
  ...overrides,
});

const editor = { id_karyawan: 11, rank: 30 };

test("lists only the requested project and offer version", async () => {
  let listScope;
  const service = createKeteranganKhususPenawaranService(
    createRepository({
      list: async (idProyek, versi) => {
        listScope = { idProyek, versi };
        return [
          { id: 1, keterangan: "Catatan aktif", aktif: 1 },
          { id: 2, keterangan: "Catatan nonaktif", aktif: 0 },
        ];
      },
    }),
  );

  const result = await service.list({ id_proyek: "7", versi: "2" });

  assert.deepEqual(listScope, { idProyek: 7, versi: 2 });
  assert.equal(result.length, 2);
  assert.equal(result[1].aktif, 0);
});

test("rejects a version that does not belong to the project", async () => {
  let createCalled = false;
  const service = createKeteranganKhususPenawaranService(
    createRepository({
      hasOfferVersion: async () => false,
      create: async () => {
        createCalled = true;
      },
    }),
  );

  await assert.rejects(
    service.create({ id_proyek: 7, versi: 3, keterangan: "Catatan" }, editor),
    { statusCode: 404 },
  );
  assert.equal(createCalled, false);
});

test("creates a trimmed note with its exact project-version scope", async () => {
  let created;
  const service = createKeteranganKhususPenawaranService(
    createRepository({
      create: async (data) => {
        created = data;
        return { id: 19 };
      },
    }),
  );

  await service.create(
    { id_proyek: 7, versi: 2, keterangan: "  Catatan khusus  " },
    editor,
  );

  assert.deepEqual(created, {
    idProyek: 7,
    versi: 2,
    keterangan: "Catatan khusus",
    actorId: 11,
  });
});

test("rejects writes by users who do not own or manage the project", async () => {
  let createCalled = false;
  const service = createKeteranganKhususPenawaranService(
    createRepository({
      create: async () => {
        createCalled = true;
      },
    }),
  );

  await assert.rejects(
    service.create(
      { id_proyek: 7, versi: 2, keterangan: "Catatan" },
      { id_karyawan: 12, rank: 30 },
    ),
    { statusCode: 403 },
  );
  assert.equal(createCalled, false);
});

test("updates and deletes only entries within the requested version", async () => {
  const calls = [];
  const service = createKeteranganKhususPenawaranService(
    createRepository({
      update: async (data) => {
        calls.push(["update", data]);
        return { affectedRows: 0 };
      },
      remove: async (data) => {
        calls.push(["remove", data]);
        return { affectedRows: 1 };
      },
    }),
  );

  await assert.rejects(
    service.update(
      {
        id: 19,
        id_proyek: 7,
        versi: 2,
        keterangan: "Perubahan lintas versi",
      },
      editor,
    ),
    { statusCode: 404 },
  );
  await service.remove({ id: 19, id_proyek: 7, versi: 2 }, editor);

  assert.equal(calls[0][1].versi, 2);
  assert.equal(calls[1][1].versi, 2);
});

test("allows changing active status without changing note text", async () => {
  let updateData;
  const service = createKeteranganKhususPenawaranService(
    createRepository({
      update: async (data) => {
        updateData = data;
        return { affectedRows: 1 };
      },
    }),
  );

  await service.update(
    { id: 19, id_proyek: 7, versi: 2, aktif: false },
    editor,
  );

  assert.equal(updateData.aktif, false);
  assert.equal(updateData.keterangan, undefined);
  assert.equal(updateData.versi, 2);
});

test("rejects invalid active status values", async () => {
  const service = createKeteranganKhususPenawaranService(createRepository());

  await assert.rejects(
    service.update({ id: 19, id_proyek: 7, versi: 2, aktif: "false" }, editor),
    { statusCode: 400 },
  );
});
