import test from "node:test";
import assert from "node:assert/strict";
import {
  canApprove,
  canCancelApproval,
  getRequiredApprovalLevel,
  isApprovalSufficient,
} from "./project-approval.rules.js";

test("hargabatas breach requires owner approval even when hargajual is also breached", () => {
  assert.equal(
    getRequiredApprovalLevel([{ harga: 80, hargajual: 100, hargabatas: 90 }]),
    "owner",
  );
});

test("hargajual breach without a hargabatas breach requires head-sales", () => {
  assert.equal(
    getRequiredApprovalLevel([{ harga: 95, hargajual: 100, hargabatas: 90 }]),
    "head-sales",
  );
});

test("hargakustom overrides harga when checking the printed quote price", () => {
  assert.equal(
    getRequiredApprovalLevel([
      { harga: 100, hargakustom: 80, hargajual: 90, hargabatas: 70 },
    ]),
    "head-sales",
  );
});

test("missing thresholds and prices do not require approval", () => {
  assert.equal(
    getRequiredApprovalLevel([
      { harga: 100, hargajual: null, hargabatas: undefined },
      { harga: "invalid", hargajual: 1, hargabatas: null },
    ]),
    null,
  );
});

test("owner and super satisfy either threshold while head-sales only satisfies its own", () => {
  assert.equal(canApprove("head-sales", "head-sales"), true);
  assert.equal(canApprove("head-sales", "owner"), true);
  assert.equal(canApprove("head-sales", "super"), true);
  assert.equal(canApprove("owner", "head-sales"), false);
  assert.equal(canApprove("owner", "owner"), true);
  assert.equal(canApprove("owner", "super"), true);
});

test("an existing approval is sufficient only at or above the required level", () => {
  assert.equal(isApprovalSufficient("owner", "head-sales"), false);
  assert.equal(isApprovalSufficient("owner", "owner"), true);
  assert.equal(isApprovalSufficient("head-sales", "owner"), true);
  assert.equal(isApprovalSufficient(null, null), true);
});

test("the original approver or an approver at the same or higher level can cancel", () => {
  const approval = { approvedBy: 24, approvedLevel: "head-sales" };

  assert.equal(
    canCancelApproval(approval, { id_karyawan: 24, peran: "sales" }),
    true,
  );
  assert.equal(
    canCancelApproval(approval, { id_karyawan: 25, peran: "head-sales" }),
    true,
  );
  assert.equal(
    canCancelApproval(approval, { id_karyawan: 25, peran: "owner" }),
    true,
  );
  assert.equal(
    canCancelApproval(approval, { id_karyawan: 25, peran: "sales" }),
    false,
  );
});
