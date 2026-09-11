import assert from "node:assert/strict";
import test from "node:test";
import {
  compareObject,
  rankCandidates,
  textSimilarity,
  normalize,
} from "./similarity.service.js";

const existing = {
  nama: "Coca Cola Zero 330ml",
  merek: "Coca Cola",
  id_kustom: "CCZ330",
  tipe: "soft drink",
};

test("exact same product", () => {
  assert.ok(compareObject(existing, existing) >= 85);
});

test("different casing", () => {
  assert.ok(
    compareObject(
      {
        nama: "APPLE IPHONE",
        merek: "Apple",
        id_kustom: "IPH15P256",
        tipe: "Smartphone",
      },
      {
        nama: "apple iphone",
        merek: "Apple",
        id_kustom: "IPH15P256",
        tipe: "Smartphone",
      },
    ) >= 85,
  );
});

test("punctuation differences", () => {
  assert.ok(
    compareObject(
      {
        nama: "iPhone-15 Pro Max!",
        merek: "Apple",
        id_kustom: "IPH15PM",
        tipe: "Smartphone",
      },
      {
        nama: "iPhone 15 Pro Max",
        merek: "Apple",
        id_kustom: "IPH15PM",
        tipe: "Smartphone",
      },
    ) >= 85,
  );
});

test("flipped word order", () => {
  assert.ok(
    compareObject(
      {
        nama: "iPhone 15 Pro Apple",
        merek: "Apple",
        id_kustom: "IPH15P",
        tipe: "Smartphone",
      },
      {
        nama: "Apple iPhone 15 Pro",
        merek: "Apple",
        id_kustom: "IPH15P",
        tipe: "Smartphone",
      },
    ) >= 85,
  );
});

test("extra words", () => {
  assert.ok(
    compareObject(
      {
        nama: "Apple iPhone 15 Pro 256GB",
        merek: "Apple",
        id_kustom: "IPH15P256",
        tipe: "Smartphone",
      },
      {
        nama: "Apple iPhone 15 Pro",
        merek: "Apple",
        id_kustom: "IPH15P",
        tipe: "Smartphone",
      },
    ) >= 70,
  );
});

test("missing words", () => {
  assert.ok(
    compareObject(
      {
        nama: "Apple iPhone 15 Pro Max",
        merek: "Apple",
        id_kustom: "IPH15PM",
        tipe: "Smartphone",
      },
      {
        nama: "Apple iPhone 15 Pro",
        merek: "Apple",
        id_kustom: "IPH15P",
        tipe: "Smartphone",
      },
    ) >= 60,
  );
});

test("minor typo", () => {
  assert.ok(
    compareObject(
      {
        nama: "Coca Colaa Zero 330ml",
        merek: "Coca Cola",
        id_kustom: "CCZ330",
        tipe: "soft drink",
      },
      existing,
    ) >= 80,
  );
});

test("unrelated products", () => {
  assert.ok(
    compareObject(
      {
        nama: "Rice Cooker",
        merek: "Panasonic",
        id_kustom: "RC1",
        tipe: "home appliance",
      },
      existing,
    ) < 50,
  );
});

test("substring false positives", () => {
  assert.ok(
    compareObject(
      { nama: "processor", merek: "", id_kustom: "", tipe: "" },
      { nama: "pro", merek: "", id_kustom: "", tipe: "" },
    ) < 50,
  );
});

test("same merek", () => {
  assert.ok(
    compareObject(
      { nama: "Apple iPhone 15 Pro", merek: "Apple", id_kustom: "", tipe: "" },
      { nama: "Apple Watch 10", merek: "Apple", id_kustom: "", tipe: "" },
    ) >= 50,
  );
});

test("different merek", () => {
  assert.ok(
    compareObject(
      { nama: "Apple iPhone 15 Pro", merek: "Apple", id_kustom: "", tipe: "" },
      { nama: "Samsung Galaxy S25", merek: "Samsung", id_kustom: "", tipe: "" },
    ) < 50,
  );
});

test("same id_kustom", () => {
  assert.ok(
    compareObject(
      {
        nama: "iPhone 15 Pro",
        merek: "Apple",
        id_kustom: "IPH15P",
        tipe: "Smartphone",
      },
      {
        nama: "Apple iPhone 15 Pro",
        merek: "Apple",
        id_kustom: "IPH15P",
        tipe: "Smartphone",
      },
    ) >= 85,
  );
});

test("different id_kustom", () => {
  assert.ok(
    compareObject(
      {
        nama: "iPhone 15 Pro",
        merek: "Apple",
        id_kustom: "IPH15P",
        tipe: "Smartphone",
      },
      {
        nama: "iPhone 15 Pro",
        merek: "Apple",
        id_kustom: "IPH15PM",
        tipe: "Smartphone",
      },
    ) >= 40,
  );
});

test("same tipe", () => {
  assert.ok(
    compareObject(
      {
        nama: "Coca Cola Zero",
        merek: "Coca Cola",
        id_kustom: "CCZ",
        tipe: "soft drink",
      },
      {
        nama: "Coca Cola Original",
        merek: "Coca Cola",
        id_kustom: "CCO",
        tipe: "soft drink",
      },
    ) >= 70,
  );
});

test("multiple candidates ranked correctly", () => {
  const candidates = rankCandidates(
    [
      { nama: "ampli", merek: "", id_kustom: "", tipe: "" },
      { nama: "baru ampli", merek: "", id_kustom: "", tipe: "" },
    ],
    { nama: "ampli baru abc", merek: "", id_kustom: "", tipe: "" },
    undefined,
    8,
  );

  assert.deepEqual(
    candidates.map((candidate) => candidate.nama),
    ["baru ampli", "ampli"],
  );
});

test("threshold filtering", () => {
  const candidates = rankCandidates(
    [
      {
        nama: "Coca Cola Zero 330ml",
        merek: "Coca Cola",
        id_kustom: "CCZ330",
        tipe: "soft drink",
      },
      {
        nama: "Rice Cooker",
        merek: "Panasonic",
        id_kustom: "RC1",
        tipe: "home appliance",
      },
    ],
    {
      nama: "Coca Cola Zero 330ml",
      merek: "Coca Cola",
      id_kustom: "CCZ330",
      tipe: "soft drink",
    },
    undefined,
    8,
  );

  assert.equal(candidates.length, 1);
});

test("result limit", () => {
  const candidates = rankCandidates(
    [
      {
        nama: "Apple iPhone 15 Pro",
        merek: "Apple",
        id_kustom: "IPH15P",
        tipe: "Smartphone",
      },
      {
        nama: "Apple iPhone 15 Pro Max",
        merek: "Apple",
        id_kustom: "IPH15PM",
        tipe: "Smartphone",
      },
      {
        nama: "Apple iPhone 15 Pro 256GB",
        merek: "Apple",
        id_kustom: "IPH15P256",
        tipe: "Smartphone",
      },
    ],
    {
      nama: "Apple iPhone 15 Pro",
      merek: "Apple",
      id_kustom: "IPH15P",
      tipe: "Smartphone",
    },
    undefined,
    2,
  );

  assert.equal(candidates.length, 2);
});
