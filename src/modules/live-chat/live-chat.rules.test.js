import test from "node:test";
import assert from "node:assert/strict";
import { isSendRateLimited } from "./live-chat.rules.js";

test("regular users must wait two seconds between messages", () => {
  assert.equal(isSendRateLimited("sales", 1_999_999), true);
  assert.equal(isSendRateLimited("sales", 2_000_000), false);
});

test("super users are exempt from the send interval", () => {
  assert.equal(isSendRateLimited("super", 0), false);
});
