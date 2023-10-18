const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();
const port = 3001;

const proyek = require("./utils/proyek");
const produk = require("./utils/produk");
const stok = require("./utils/stok");
const keranjangproyek = require("./utils/keranjangproyek");
const karyawan = require("./utils/karyawan");

// Parse JSON bodies
app.use(bodyParser.json());
// Parse URL-encoded bodies (e.g., form data)
app.use(bodyParser.urlencoded({ extended: true }));

//set up cors
app.use(cors());
app.use((req, res, next) => {
  console.log(`IP: ${req.ip} ${new Date()}`);
  next();
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// produk
app.get("/api/produk", async (req, res) => {
  const list = produk.list(req.query);
  res.json(await list);
});
app.post("/api/produk", async (req, res) => {
  const result = await produk
    .create(req.body)
    .then((result) => res.json({ message: "Produk berhasil ditambahkan" }))
    .catch((e) => res.status(400).json({ message: e.message }));
});
app.put("/api/produk", async (req, res) => {
  const result = await produk
    .update(req.body)
    .then((result) => res.json({ message: "Data berhasil diubah" }))
    .catch((e) => res.status(400).json({ message: e.message }));
});
app.delete("/api/produk", async (req, res) => {
  produk
    .destroy(req.body)
    .then((result) => res.json({ message: "Data berhasil dihapus" }))
    .catch((e) => res.status(400).json({ message: e.message }));
});

// stok
app.get("/api/stok", async (req, res) => {
  const list = stok.list(req.query);
  res.json(await list);
});
app.post("/api/stok", async (req, res) => {
  const result = await stok
    .create(req.body)
    .then((result) => res.json({ message: "Stok berhasil ditambahkan" }))
    .catch((e) => res.status(400).json({ message: e.message }));
});
app.put("/api/stok", async (req, res) => {
  const result = await stok
    .update(req.body)
    .then((result) => res.json({ message: "Stok berhasil diubah" }))
    .catch((e) => res.status(400).json({ message: e.message }));
});
app.delete("/api/stok", async (req, res) => {
  stok
    .destroy(req.body)
    .then((result) => res.json({ message: "Stok berhasil dihapus" }))
    .catch((e) => res.status(400).json({ message: e.message }));
});

// proyek
app.get("/api/proyek", async (req, res) => {
  const list = proyek.list(req.query);
  res.json(await list);
});
app.post("/api/proyek", async (req, res) => {
  const result = await proyek
    .create(req.body)
    .then((result) => res.json({ message: "Proyek berhasil ditambahkan" }))
    .catch((e) => res.status(400).json({ message: e.message }));
});
app.put("/api/proyek", async (req, res) => {
  const result = await proyek
    .update(req.body)
    .then((result) => res.json({ message: "Proyek berhasil diubah" }))
    .catch((e) => res.status(400).json({ message: e.message }));
});
app.delete("/api/proyek", async (req, res) => {
  proyek
    .destroy(req.body)
    .then((result) => res.json({ message: "Proyek berhasil dihapus" }))
    .catch((e) => res.status(400).json({ message: e.message }));
});

// keranjangproyek
app.get("/api/keranjangproyek", async (req, res) => {
  const list = keranjangproyek.list(req.query);
  res.json(await list);
});
app.post("/api/keranjangproyek", async (req, res) => {
  const result = await keranjangproyek
    .create(req.body)
    .then((result) => res.json({ message: "Produk berhasil ditambahkan" }))
    .catch((e) => res.status(400).json({ message: e.message }));
});
app.put("/api/keranjangproyek", async (req, res) => {
  const result = await keranjangproyek
    .update(req.body)
    .then((result) => res.json({ message: "Produk berhasil diubah" }))
    .catch((e) => res.status(400).json({ message: e.message }));
});
app.delete("/api/keranjangproyek", async (req, res) => {
  keranjangproyek
    .destroy(req.body)
    .then((result) => res.json({ message: "Produk berhasil dihapus" }))
    .catch((e) => res.status(400).json({ message: e.message }));
});

// karyawan
app.get("/api/karyawan", async (req, res) => {
  const list = karyawan.list(req.query);
  res.json(await list);
});
app.post("/api/karyawan", async (req, res) => {
  const result = await karyawan
    .create(req.body)
    .then((result) => res.json({ message: "karyawan berhasil ditambahkan" }))
    .catch((e) => res.status(400).json({ message: e.message }));
});
app.put("/api/karyawan", async (req, res) => {
  const result = await karyawan
    .update(req.body)
    .then((result) => res.json({ message: "karyawan berhasil diubah" }))
    .catch((e) => res.status(400).json({ message: e.message }));
});
app.delete("/api/karyawan", async (req, res) => {
  karyawan
    .destroy(req.body)
    .then((result) => res.json({ message: "karyawan berhasil dihapus" }))
    .catch((e) => res.status(400).json({ message: e.message }));
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
