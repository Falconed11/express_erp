# Guide: Adding a New System Journal Seed

This guide explains how to add a new system journal seed following the existing pattern in the seed service.

The current seed service uses three main system seeds:

- `OPERASIONAL_KANTOR`
- `HPP`
- `PENDAPATAN`

Each seed is responsible for creating or synchronizing:

1. COA Type
2. COA Subtype
3. COA
4. Journal Form
5. Journal Expression
6. Journal Form Expression
7. Verification/check logic

The seed is designed to be **idempotent**, meaning it can safely be executed multiple times without creating duplicate records.

---

# 1. Understand the Seed Structure

The overall structure is:

```text
SYSTEM_KEYS
    ↓
seedDefinitions
    ↓
ensureXxx()
    ↓
checkSeed()
    ↓
Service.apply()
```

For example:

```text
HPP
 ↓
ensureHpp()
 ↓
checkSeed()
 ↓
Service.apply()
```

When adding a new seed, follow the same flow.

---

# 2. Add a New System Key

First, add the new key to `SYSTEM_KEYS`.

Current example:

```js
const SYSTEM_KEYS = {
  OPERASIONAL_KANTOR: "OPERASIONAL_KANTOR",
  HPP: "HPP",
  PENDAPATAN: "PENDAPATAN",
};
```

Suppose we want to add a new journal called **Pembelian**.

Add:

```js
const SYSTEM_KEYS = {
  OPERASIONAL_KANTOR: "OPERASIONAL_KANTOR",
  HPP: "HPP",
  PENDAPATAN: "PENDAPATAN",
  PEMBELIAN: "PEMBELIAN",
};
```

### Rules

The key should:

- Be uppercase.
- Use `SCREAMING_SNAKE_CASE`.
- Be unique.
- Match the value stored in `jurnal_form.system_key`.

Example:

```js
PEMBELIAN: "PEMBELIAN",
```

---

# 3. Add the Seed Definition

Next, add the seed to `seedDefinitions`.

Current:

```js
const seedDefinitions = [
  { key: SYSTEM_KEYS.OPERASIONAL_KANTOR, label: "Operasional Kantor" },
  { key: SYSTEM_KEYS.HPP, label: "HPP" },
  { key: SYSTEM_KEYS.PENDAPATAN, label: "Pendapatan" },
];
```

Add:

```js
const seedDefinitions = [
  { key: SYSTEM_KEYS.OPERASIONAL_KANTOR, label: "Operasional Kantor" },
  { key: SYSTEM_KEYS.HPP, label: "HPP" },
  { key: SYSTEM_KEYS.PENDAPATAN, label: "Pendapatan" },
  { key: SYSTEM_KEYS.PEMBELIAN, label: "Pembelian" },
];
```

The `label` is the human-readable name shown in the check result.

---

# 4. Decide the Accounting Structure First

Before writing `ensureXxx()`, define the accounting structure.

For example, suppose **Pembelian** should create:

```text
COA Type
└── HPP

Journal Form
└── Pembelian

Expressions
├── Debit  → HPP
└── Kredit → Kas
```

Write this structure down first.

For example:

```text
PEMBELIAN

Debit:
    HPP

Kredit:
    Kas
```

Then determine the required database records.

Example:

```text
coa_type
    HPP

coa_subtype
    HPP

coa
    HPP

jurnal_form
    Pembelian

jurnal_expression
    HPP
    Kas

jurnal_form_expression
    Pembelian → HPP → debit
    Pembelian → Kas → kredit
```

This makes implementing the seed much easier.

---

# 5. Create the `ensureXxx()` Function

Every new seed should have its own function.

Use this naming pattern:

```js
const ensurePembelian = async (trx) => {
  // ...
};
```

The function should:

1. Find/create required COA types.
2. Find/create required COA subtypes.
3. Find/create required COA.
4. Find/create the journal form.
5. Find/create expressions.
6. Connect expressions to the journal form.

---

# 6. Use `syncByName()` for COA Type

Example:

```js
const hppType = await syncByName(trx, "coa_type", "HPP", {
  normal_balance: 0,
  aktif: true,
  keterangan: "System default",
});
```

This automatically:

- Creates the record if it doesn't exist.
- Updates incorrect values if it already exists.
- Returns the resulting row.

Do not manually write:

```js
const existing = await trx("coa_type")...
```

unless there is a special reason.

Prefer:

```js
const xxxType = await syncByName(...);
```

---

# 7. Use `syncByName()` for COA Subtype

Example:

```js
const hppSubtype = await syncByName(
  trx,
  "coa_subtype",
  "HPP",
  {
    id_coa_type: hppType.id,
    aktif: true,
    keterangan: "System default",
  },
  {
    id_coa_type: hppType.id,
  },
);
```

The last parameter is important.

It prevents matching a subtype with the same name but belonging to a different COA type.

For example:

```js
{
  nama: "HPP",
  id_coa_type: hppType.id
}
```

is safer than only:

```js
{
  nama: "HPP";
}
```

---

# 8. Use `syncByName()` for COA

If the journal requires a specific COA:

```js
const hppCoa = await syncByName(trx, "coa", "HPP", {
  id_coa_subtype: hppSubtype.id,
  aktif: true,
  keterangan: "System default",
});
```

The returned ID is then used by the expression:

```js
id_filter: hppCoa.id;
```

---

# 9. Create the Journal Form

Use:

```js
const form = await syncByName(trx, "jurnal_form", "Pembelian", {
  system_key: SYSTEM_KEYS.PEMBELIAN,
  extra_fields: JSON.stringify([]),
  keterangan: "System default",
  aktif: true,
});
```

Important fields:

```js
system_key;
extra_fields;
keterangan;
aktif;
```

The `system_key` must match the key added to `SYSTEM_KEYS`.

Example:

```js
system_key: SYSTEM_KEYS.PEMBELIAN;
```

Do not hardcode it if the constant already exists.

---

# 10. Create the Journal Expressions

Expressions represent the selectable accounting accounts.

For example, if Pembelian has:

```text
Debit  → HPP
Kredit → Kas
```

Create:

```js
const hppExpression = await syncExpression(trx, {
  nama: "HPP",
  filter_type: "coa",
  id_filter: hppCoa.id,
});
```

And:

```js
const kasExpression = await syncExpression(trx, {
  nama: "Kas",
  filter_type: "type",
  id_filter: aktivaLancar.id,
});
```

The important fields are:

```js
nama;
filter_type;
id_filter;
```

---

# 11. Understand `filter_type`

The `filter_type` determines what `id_filter` points to.

## `type`

Use when the expression points to a `coa_type`.

Example:

```js
{
  nama: "Kas",
  filter_type: "type",
  id_filter: aktivaLancar.id,
}
```

Meaning:

```text
Kas
 ↓
coa_type.id
```

---

## `subtype`

Use when the expression points to a `coa_subtype`.

Example:

```js
{
  nama: "Operasional Kantor",
  filter_type: "subtype",
  id_filter: operasionalSubtype.id,
}
```

Meaning:

```text
Operasional Kantor
 ↓
coa_subtype.id
```

---

## `coa`

Use when the expression points directly to a COA.

Example:

```js
{
  nama: "HPP",
  filter_type: "coa",
  id_filter: hppCoa.id,
}
```

Meaning:

```text
HPP
 ↓
coa.id
```

---

# 12. Connect Expressions to the Journal Form

Use:

```js
await syncFormExpression(trx, form.id, expression.id, "debit", 1);
```

For credit:

```js
await syncFormExpression(trx, form.id, expression.id, "kredit", 2);
```

The fourth parameter is:

```text
input_type
```

Allowed values in the existing seed:

```text
debit
kredit
```

The fifth parameter is:

```text
sort_order
```

Usually:

```text
1 = first expression
2 = second expression
3 = third expression
...
```

---

# 13. Example Complete `ensurePembelian()`

Assume the desired accounting setup is:

```text
Pembelian

Debit:
    HPP

Kredit:
    Kas
```

The implementation could look like:

```js
const ensurePembelian = async (trx) => {
  const aktivaLancar = await syncByName(trx, "coa_type", "Aktiva Lancar", {
    normal_balance: 1,
    aktif: true,
    keterangan: "System default",
  });

  const hppType = await syncByName(trx, "coa_type", "HPP", {
    normal_balance: 0,
    aktif: true,
    keterangan: "System default",
  });

  const hppSubtype = await syncByName(
    trx,
    "coa_subtype",
    "HPP",
    {
      id_coa_type: hppType.id,
      aktif: true,
      keterangan: "System default",
    },
    {
      id_coa_type: hppType.id,
    },
  );

  const hppCoa = await syncByName(trx, "coa", "HPP", {
    id_coa_subtype: hppSubtype.id,
    aktif: true,
    keterangan: "System default",
  });

  const form = await syncByName(trx, "jurnal_form", "Pembelian", {
    system_key: SYSTEM_KEYS.PEMBELIAN,
    extra_fields: JSON.stringify([]),
    keterangan: "System default",
    aktif: true,
  });

  const hppExpression = await syncExpression(trx, {
    nama: "HPP",
    filter_type: "coa",
    id_filter: hppCoa.id,
  });

  const kasExpression = await syncExpression(trx, {
    nama: "Kas",
    filter_type: "type",
    id_filter: aktivaLancar.id,
  });

  await syncFormExpression(trx, form.id, hppExpression.id, "debit", 1);

  await syncFormExpression(trx, form.id, kasExpression.id, "kredit", 2);
};
```

---

# 14. Add the New Seed to `Service.apply()`

This step is required.

Current:

```js
async apply() {
  return db.transaction(async (trx) => {
    await ensureOperationalOffice(trx);
    await ensureHpp(trx);
    await ensurePendapatan(trx);

    return {
      seeds: await Promise.all(
        seedDefinitions.map((def) => checkSeed(trx, def)),
      ),
    };
  });
},
```

Add:

```js
await ensurePembelian(trx);
```

Result:

```js
async apply() {
  return db.transaction(async (trx) => {
    await ensureOperationalOffice(trx);
    await ensureHpp(trx);
    await ensurePendapatan(trx);
    await ensurePembelian(trx);

    return {
      seeds: await Promise.all(
        seedDefinitions.map((def) => checkSeed(trx, def)),
      ),
    };
  });
},
```

---

# 15. Add Verification to `checkSeed()`

Adding `ensurePembelian()` is not enough.

The seed must also be verified by `checkSeed()`.

Add another condition:

```js
} else if (definition.key === SYSTEM_KEYS.PEMBELIAN) {
```

For example:

```js
} else if (definition.key === SYSTEM_KEYS.PEMBELIAN) {
  const type = await trx("coa_type")
    .where({ nama: "HPP", aktif: true })
    .first();

  const subtype = type
    ? await trx("coa_subtype")
        .where({
          nama: "HPP",
          id_coa_type: type.id,
          aktif: true,
        })
        .first()
    : null;

  const coa = subtype
    ? await trx("coa")
        .where({
          nama: "HPP",
          id_coa_subtype: subtype.id,
          aktif: true,
        })
        .first()
    : null;

  const aktivaLancar = await trx("coa_type")
    .where({
      nama: "Aktiva Lancar",
      aktif: true,
    })
    .first();

  if (!type) {
    details.push("HPP COA type is missing.");
  } else {
    verified.push("COA type: HPP");
  }

  if (type && type.normal_balance !== 0) {
    details.push("HPP COA type has the wrong normal balance.");
  }

  if (!subtype) {
    details.push("HPP COA subtype is missing.");
  } else {
    verified.push("COA subtype: HPP");
  }

  if (!coa) {
    details.push("HPP COA is missing.");
  } else {
    verified.push("COA: HPP");
  }

  const debit = expressions.find((e) => e.input_type === "debit");
  const kredit = expressions.find((e) => e.input_type === "kredit");

  if (
    !debit ||
    !debit.aktif ||
    debit.nama !== "HPP" ||
    debit.filter_type !== "coa" ||
    debit.id_filter !== coa?.id
  ) {
    details.push("Debit expression is incorrect.");
  } else {
    verified.push("Expression (debit): HPP");
  }

  if (
    !kredit ||
    !kredit.aktif ||
    kredit.nama !== "Kas" ||
    kredit.filter_type !== "type" ||
    kredit.id_filter !== aktivaLancar?.id
  ) {
    details.push("Kredit expression is incorrect.");
  } else {
    verified.push("Expression (kredit): Kas -> Aktiva Lancar");
  }
}
```

The exact verification logic must match the accounting structure defined in `ensurePembelian()`.

---

# 16. Important: Keep `ensureXxx()` and `checkSeed()` in Sync

This is one of the most important rules.

Whatever you create in:

```js
ensurePembelian();
```

must be checked in:

```js
checkSeed();
```

For example:

### Seed

```js
const hppExpression = await syncExpression(trx, {
  nama: "HPP",
  filter_type: "coa",
  id_filter: hppCoa.id,
});
```

### Check

```js
if (
  !debit ||
  debit.nama !== "HPP" ||
  debit.filter_type !== "coa" ||
  debit.id_filter !== coa?.id
) {
  details.push("Debit expression is incorrect.");
}
```

These definitions must agree.

---

# 17. Do Not Hardcode Database IDs

Avoid:

```js
id_filter: 5;
```

Do not assume that HPP always has ID `5`.

Instead:

```js
id_filter: hppCoa.id;
```

Or:

```js
id_filter: hppType.id;
```

depending on the `filter_type`.

This makes the seed work across:

- Development
- Staging
- Production
- Fresh databases
- Databases with different auto-increment IDs

---

# 18. Always Use Returned IDs

Follow this pattern:

```js
const type = await syncByName(...);

const subtype = await syncByName(..., {
  id_coa_type: type.id,
});
```

Then:

```js
const coa = await syncByName(..., {
  id_coa_subtype: subtype.id,
});
```

Then:

```js
const expression = await syncExpression(trx, {
  id_filter: coa.id,
});
```

Think of it as:

```text
Type
 ↓ id
Subtype
 ↓ id
COA
 ↓ id
Expression
 ↓ id
Form Expression
```

---

# 19. Preserve Idempotency

A seed should be safe to run repeatedly.

This is already handled by:

```js
syncByName();
syncExpression();
syncFormExpression();
```

Do not replace them with unconditional inserts such as:

```js
await trx("coa").insert(...);
```

unless you intentionally want duplicates.

The desired behavior is:

```text
First run
    ↓
Record doesn't exist
    ↓
INSERT

Second run
    ↓
Record exists
    ↓
Check values
    ↓
UPDATE only if necessary

Third run
    ↓
Everything already correct
    ↓
No unnecessary changes
```

---

# 20. Do Not Forget `aktif`

System records should normally use:

```js
aktif: true;
```

For example:

```js
{
  aktif: true,
  keterangan: "System default",
}
```

The seed should also repair an inactive system record when appropriate.

The existing helper already handles this:

```js
syncByName();
```

and:

```js
syncExpression();
```

---

# 21. Recommended Implementation Order

When adding a new seed, follow this exact order:

### Step 1

Add `SYSTEM_KEYS`.

```js
const SYSTEM_KEYS = {
  ...
  PEMBELIAN: "PEMBELIAN",
};
```

### Step 2

Add `seedDefinitions`.

```js
{
  key: SYSTEM_KEYS.PEMBELIAN,
  label: "Pembelian",
}
```

### Step 3

Define the accounting structure.

Example:

```text
Pembelian
    Debit  → HPP
    Kredit → Kas
```

### Step 4

Create:

```js
ensurePembelian();
```

### Step 5

Create required:

```text
coa_type
coa_subtype
coa
jurnal_form
jurnal_expression
jurnal_form_expression
```

### Step 6

Register it in:

```js
Service.apply();
```

### Step 7

Add the corresponding branch to:

```js
checkSeed();
```

### Step 8

Run the seed.

### Step 9

Run/check:

```js
Service.check();
```

### Step 10

Confirm the result is:

```js
{
  status: "correct";
}
```

---

# 22. Quick Checklist

Before committing a new seed, verify all of these:

```text
[ ] SYSTEM_KEYS added
[ ] seedDefinitions added
[ ] Accounting structure defined
[ ] ensureXxx() created
[ ] COA type created/synchronized
[ ] COA subtype created/synchronized
[ ] COA created/synchronized if required
[ ] jurnal_form created/synchronized
[ ] jurnal_expression created/synchronized
[ ] jurnal_form_expression created/synchronized
[ ] Correct debit/credit order
[ ] Correct filter_type
[ ] Correct id_filter
[ ] aktif = true
[ ] keterangan = "System default"
[ ] ensureXxx() added to Service.apply()
[ ] checkSeed() branch added
[ ] checkSeed() validates all required records
[ ] No hardcoded database IDs
[ ] Seed is idempotent
[ ] Service.check() returns status "correct"
```

---

# 23. Minimal Template

For future seeds, use this template:

```js
// 1. Add system key

const SYSTEM_KEYS = {
  // existing keys...
  NEW_SEED: "NEW_SEED",
};

// 2. Add definition

const seedDefinitions = [
  // existing definitions...
  {
    key: SYSTEM_KEYS.NEW_SEED,
    label: "New Seed",
  },
];

// 3. Create ensure function

const ensureNewSeed = async (trx) => {
  // Create/sync required coa_type

  const type = await syncByName(trx, "coa_type", "TYPE_NAME", {
    normal_balance: 0,
    aktif: true,
    keterangan: "System default",
  });

  // Create/sync required coa_subtype

  const subtype = await syncByName(
    trx,
    "coa_subtype",
    "SUBTYPE_NAME",
    {
      id_coa_type: type.id,
      aktif: true,
      keterangan: "System default",
    },
    {
      id_coa_type: type.id,
    },
  );

  // Create/sync required COA

  const coa = await syncByName(trx, "coa", "COA_NAME", {
    id_coa_subtype: subtype.id,
    aktif: true,
    keterangan: "System default",
  });

  // Create/sync journal form

  const form = await syncByName(trx, "jurnal_form", "FORM_NAME", {
    system_key: SYSTEM_KEYS.NEW_SEED,
    extra_fields: JSON.stringify([]),
    keterangan: "System default",
    aktif: true,
  });

  // Create/sync expressions

  const debitExpression = await syncExpression(trx, {
    nama: "DEBIT_EXPRESSION",
    filter_type: "coa",
    id_filter: coa.id,
  });

  // Create/sync credit expression

  const kreditExpression = await syncExpression(trx, {
    nama: "KREDIT_EXPRESSION",
    filter_type: "coa",
    id_filter: coa.id,
  });

  // Connect expressions to form

  await syncFormExpression(trx, form.id, debitExpression.id, "debit", 1);

  await syncFormExpression(trx, form.id, kreditExpression.id, "kredit", 2);
};

// 4. Register in Service.apply()

await ensureNewSeed(trx);

// 5. Add corresponding checkSeed() branch

if (definition.key === SYSTEM_KEYS.NEW_SEED) {
  // Verify all required records
  // Verify debit expression
  // Verify kredit expression
}
```

---

# 24. Mental Model

Whenever you add a seed, think about it as building this graph:

```text
                    SYSTEM KEY
                        │
                        ▼
                  jurnal_form
                        │
             ┌──────────┴──────────┐
             ▼                     ▼
       debit expression      kredit expression
             │                     │
             ▼                     ▼
          COA/type              COA/type
             │
             ▼
        coa_subtype
             │
             ▼
          coa_type
```

The exact structure depends on the accounting requirement.

The most important thing is that every relationship is created using the actual database IDs returned by the previous operation.

---

# 25. Final Rule

A new seed is considered complete only when these two functions agree:

```js
ensureXxx();
```

and:

```js
checkSeed();
```

`ensureXxx()` answers:

> "What should the database look like?"

`checkSeed()` answers:

> "Does the database currently look like that?"

If both describe the same structure, the seed is complete.

```

If you want, I can also turn this into a **shorter “developer cheat sheet” version** that fits on one screen.
```
