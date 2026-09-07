import assert from "node:assert/strict";
import test from "node:test";
import {
  compareProduct,
  findProductCandidates,
} from "./produk-matching.service.js";

const existing = {
  nama: "Coca Cola Zero 330ml",
  merek: "Coca Cola",
  tipe: "",
};

test("matches exact product names strongly", () => {
  assert.ok(compareProduct(existing, existing) >= 85);
});

test("matches reordered names strongly", () => {
  assert.ok(
    compareProduct(
      { nama: "Zero Coca-Cola 330 ML", merek: "Coca Cola", tipe: "" },
      existing,
    ) >= 85,
  );
});

test("matches a small name typo strongly", () => {
  assert.ok(
    compareProduct(
      { nama: "Coca Colaa Zero 330ml", merek: "Coca Cola", tipe: "" },
      existing,
    ) >= 85,
  );
});

test("does not label a different size as a strong match", () => {
  const [candidate] = findProductCandidates([existing], {
    nama: "Coca Cola Zero 500ml",
    merek: "Coca Cola",
    tipe: "",
  });

  assert.equal(candidate.matchLabel, "Possible");
});

test("does not treat a different variant as a strong match", () => {
  const [candidate] = findProductCandidates([existing], {
    nama: "Coca Cola Original",
    merek: "Coca Cola",
    tipe: "",
  });

  assert.equal(candidate.matchLabel, "Possible");
});

test("counts a name entered in tipe as a matching signal", () => {
  assert.ok(
    compareProduct(
      { nama: "", merek: "", tipe: "Coca Cola Zero 330ml" },
      existing,
    ) >= 85,
  );
});

test("counts a type entered in nama as a matching signal", () => {
  assert.ok(
    compareProduct(
      { nama: "330ml", merek: "", tipe: "Zero" },
      { nama: "Zero", merek: "", tipe: "330ml" },
    ) >= 85,
  );
});

test("normalizes letter-number formatting variations", () => {
  const formats = ["12ds", "12 ds", "ds 12", "ds12", "ds-12"];
  for (const format of formats) {
    assert.ok(
      compareProduct(
        { nama: format, merek: "", tipe: "" },
        { nama: "ds12", merek: "", tipe: "" },
      ) >= 85,
    );
  }
});

test("keeps a product when extra query words do not match", () => {
  const [candidate] = findProductCandidates(
    [{ nama: "baru ampli", merek: "", tipe: "" }],
    { nama: "ampli baru abc", merek: "", tipe: "" },
  );

  assert.equal(candidate.nama, "baru ampli");
  assert.equal(candidate.matchPercent, 67);
});

test("ranks candidates by the number of matched query words", () => {
  const candidates = findProductCandidates(
    [
      { nama: "ampli", merek: "", tipe: "" },
      { nama: "baru ampli", merek: "", tipe: "" },
    ],
    { nama: "ampli baru abc", merek: "", tipe: "" },
  );

  assert.deepEqual(
    candidates.map((candidate) => candidate.nama),
    ["baru ampli", "ampli"],
  );
});
