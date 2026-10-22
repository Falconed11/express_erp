import assert from "node:assert/strict";
import test from "node:test";
import jwt from "jsonwebtoken";
import {
  createCompanySwitchService,
  createRoleSwitchService,
} from "./role-switch.service.js";

const secret = "role-switch-test-secret";

const createUser = (overrides = {}) =>
  jwt.verify(
    jwt.sign(
      {
        id: 42,
        username: "superuser",
        id_karyawan: 9,
        id_perusahaan: 3,
        peran: "super",
        rank: 1,
        keteranganperan: "Super",
        can_switch_role: true,
        ...overrides,
      },
      secret,
      { expiresIn: "1h" },
    ),
    secret,
  );

const createService = ({ accountRole = "super", role = null } = {}) =>
  createRoleSwitchService({
    secret,
    getAccountRoleById: async () => accountRole,
    getRoleByName: async () => role,
  });

test("switches role while preserving identity, company, and token expiry", async () => {
  const user = createUser();
  const service = createService({
    role: { nama: "admin", rank: 5, keterangan: "Administrator" },
  });

  const { token } = await service({ user, peran: "admin" });
  const switchedUser = jwt.verify(token, secret);

  assert.equal(switchedUser.id, user.id);
  assert.equal(switchedUser.username, user.username);
  assert.equal(switchedUser.id_karyawan, user.id_karyawan);
  assert.equal(switchedUser.id_perusahaan, user.id_perusahaan);
  assert.equal(switchedUser.peran, "admin");
  assert.equal(switchedUser.rank, 5);
  assert.equal(switchedUser.keteranganperan, "Administrator");
  assert.equal(switchedUser.can_switch_role, true);
  assert.equal(switchedUser.exp, user.exp);
});

test("rejects sessions without the signed super-switch capability", async () => {
  const service = createService();

  await assert.rejects(
    service({ user: createUser({ can_switch_role: false }), peran: "admin" }),
    { statusCode: 403 },
  );
});

const createCompanyService = ({
  accountRole = "super",
  companies = [{ id: 3, nama: "Company Three" }],
} = {}) =>
  createCompanySwitchService({
    secret,
    getAccountRoleById: async () => accountRole,
    getCompanyOptions: async () => companies,
    getCompanyById: async (id) =>
      companies.find((company) => company.id === id),
  });

test("switches company without changing saved role or user identity", async () => {
  const user = createUser({ peran: "admin", id_perusahaan: 1 });
  const service = createCompanyService();

  const { token } = await service.switchCompany({
    user,
    id_perusahaan: "3",
  });
  const switchedUser = jwt.verify(token, secret);

  assert.equal(switchedUser.id, user.id);
  assert.equal(switchedUser.username, user.username);
  assert.equal(switchedUser.peran, user.peran);
  assert.equal(switchedUser.id_perusahaan, 3);
  assert.equal(switchedUser.can_switch_role, true);
  assert.equal(switchedUser.exp, user.exp);
});

test("rejects a company switch when the saved account is no longer super", async () => {
  const service = createCompanyService({ accountRole: "admin" });

  await assert.rejects(
    service.switchCompany({ user: createUser(), id_perusahaan: 3 }),
    { statusCode: 403 },
  );
});

test("rejects nonexistent companies and invalid company identifiers", async () => {
  const service = createCompanyService();

  await assert.rejects(
    service.switchCompany({ user: createUser(), id_perusahaan: 99 }),
    { statusCode: 404 },
  );
  await assert.rejects(
    service.switchCompany({ user: createUser(), id_perusahaan: "invalid" }),
    { statusCode: 400 },
  );
});

test("lists companies only for a verified super session", async () => {
  const companies = [{ id: 3, nama: "Company Three" }];
  const service = createCompanyService({ companies });

  assert.deepEqual(
    await service.listCompanies({ user: createUser() }),
    companies,
  );
  await assert.rejects(
    service.listCompanies({
      user: createUser({ can_switch_role: false }),
    }),
    { statusCode: 403 },
  );
});

test("rejects accounts that no longer have the stored super role", async () => {
  const service = createService({ accountRole: "admin" });

  await assert.rejects(service({ user: createUser(), peran: "admin" }), {
    statusCode: 403,
  });
});

test("rejects an unknown target role", async () => {
  const service = createService();

  await assert.rejects(service({ user: createUser(), peran: "missing" }), {
    statusCode: 404,
  });
});

test("requires a target role", async () => {
  const service = createService();

  await assert.rejects(service({ user: createUser(), peran: " " }), {
    statusCode: 400,
  });
});
