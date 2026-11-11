import assert from "node:assert/strict";
import test from "node:test";
import repository from "../repositories/operasional-produksi.repository.js";
import router from "./operasional-produksi.routes.js";

const listHandler = router.stack.find(
  ({ route }) => route?.path === "/",
).route.stack[0].handle;

const invokeList = async ({ query = {}, user }) => {
  const response = {
    statusCode: 200,
    body: undefined,
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  const errors = [];

  await listHandler({ query, user }, response, (error) => errors.push(error));

  return { response, errors };
};

test("lists the authenticated user's company records without a project ID", async (t) => {
  const rows = [{ id: 1, id_proyek: 12 }];
  const listForCompany = t.mock.method(
    repository,
    "listForCompany",
    async () => rows,
  );

  const { response, errors } = await invokeList({
    user: { id_perusahaan: 42 },
  });

  assert.deepEqual(errors, []);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, rows);
  assert.equal(listForCompany.mock.calls[0].arguments[0], 42);
});

test("preserves project-specific listing when a project ID is supplied", async (t) => {
  const rows = [{ id: 1, id_proyek: 12 }];
  const list = t.mock.method(repository, "list", async () => rows);
  const listForCompany = t.mock.method(
    repository,
    "listForCompany",
    async () => [],
  );

  const { response, errors } = await invokeList({
    query: { id_proyek: "12" },
    user: { id_perusahaan: 42 },
  });

  assert.deepEqual(errors, []);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, rows);
  assert.equal(list.mock.calls[0].arguments[0], "12");
  assert.equal(listForCompany.mock.callCount(), 0);
});

test("rejects company-wide listing when the user has no company", async (t) => {
  const listForCompany = t.mock.method(repository, "listForCompany");

  const { response, errors } = await invokeList({ user: {} });

  assert.deepEqual(errors, []);
  assert.equal(response.statusCode, 403);
  assert.deepEqual(response.body, {
    message: "Perusahaan pengguna tidak ditemukan",
  });
  assert.equal(listForCompany.mock.callCount(), 0);
});
