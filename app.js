const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();
const port = 3001;

// multer setup
const multer = require("multer");
// const storage = multer.memoryStorage();
// const upload = multer({ dest: "nota/" });
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "nota/");
  },
  filename: (req, file, cb) => {
    cb(null, new Date().getTime() + `.jpeg`);
  },
});

const proyek = require("./utils/proyek");
const dashboard = require("./utils/dashboard");
const keranjangproyek = require("./utils/keranjangproyek");
const rekapitulasiproyek = require("./utils/rekapitulasiproyek");
const operasionalkantor = require("./utils/operasionalkantor");
const kategorioperasionalkantor = require("./utils/kategorioperasionalkantor");
const pengeluaranproyek = require("./utils/pengeluaranproyek");
const pembayaranproyek = require("./utils/pembayaranproyek");
const produk = require("./utils/produk");
const stok = require("./utils/stok");
const karyawan = require("./utils/karyawan");
const perusahaan = require("./utils/perusahaan");
const pengeluaran = require("./utils/pengeluaran");
const lembur = require("./utils/lembur");
const distributor = require("./utils/distributor");
const klien = require("./utils/klien");
const gudang = require("./utils/gudang");
const pengeluaranperusahaan = require("./utils/pengeluaranperusahaan");
const user = require("./utils/user");
const kategoriproduk = require("./utils/kategoriproduk");
const subkategoriproduk = require("./utils/subkategoriproduk");
const merek = require("./utils/merek");
const statusproyek = require("./utils/statusproyek");
const nota = require("./utils/nota");
const kwitansi = require("./utils/kwitansi");
const keranjangnota = require("./utils/keranjangnota");
const laporan = require("./utils/laporan");
const alat = require("./utils/alat");

// Parse JSON bodies
app.use(bodyParser.json());
// Parse URL-encoded bodies (e.g., form data)
app.use(bodyParser.urlencoded({ extended: true }));

app.use(multer({ storage }).single("file"));

//set up cors
app.use(cors());

app.use((req, res, next) => {
  console.log(`IP: ${req.ip} ${req.method}${req.url} ${new Date()}`);
  next();
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// dashboard
app.get("/api/sumpenawaran", async (req, res) => {
  const list = dashboard.sumPenawaran(req.query);
  res.json(await list);
});
app.post("/api/proyek", async (req, res) => {
  const result = await proyek
    .create(req.body)
    .then((result) =>
      res.json({
        message: "Proyek berhasil ditambahkan",
      })
    )
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

// produk
app.get("/api/produk", async (req, res) => {
  const list = produk.list(req.query);
  res.json(await list);
});
app.get("/api/kategoriproduk", async (req, res) => {
  const list = produk.listKategori(req.query);
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

// laporan
app.get("/api/totaloperasional", async (req, res) => {
  const list = laporan.totalOperasional(req.query);
  res.json(await list);
});
app.get("/api/bulananproyek", async (req, res) => {
  const list = laporan.bulananProyek(req.query);
  res.json(await list);
});

// alat
app.post("/api/importpengeluaranproyek", async (req, res) => {
  const result = await alat
    .importPengeluaranProyek(req.body)
    .then((result) =>
      res.json({
        message: result.msg,
        result: result,
      })
    )
    .catch((e) => res.status(400).json({ message: e.message }));
});
app.post("/api/importpembayaranproyek", async (req, res) => {
  const result = await alat
    .importPembayaranProyek(req.body)
    .then((result) =>
      res.json({
        message: result.msg,
        result: result,
      })
    )
    .catch((e) => res.status(400).json({ message: e.message }));
});
app.post("/api/importoperasionalkantor", async (req, res) => {
  const result = await alat
    .importOperasionalKantor(req.body)
    .then((result) =>
      res.json({
        message: result.msg,
        result: result,
      })
    )
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
    .then((result) =>
      res.json({
        message: "Proyek berhasil ditambahkan",
      })
    )
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
app.put("/api/updateversiproyek", async (req, res) => {
  const result = await proyek
    .updateVersion(req.body)
    .then((result) => res.json({ message: "Versi proyek berhasil diubah" }))
    .catch((e) => res.status(400).json({ message: e.message }));
});

// keranjangproyek
app.get("/api/keranjangproyek", async (req, res) => {
  const list = keranjangproyek.list(req.query);
  res.json(await list);
});
app.get("/api/versikeranjangproyek", async (req, res) => {
  const list = keranjangproyek.listVersion(req.query);
  res.json(await list);
});
app.post("/api/keranjangproyek", async (req, res) => {
  const result = await keranjangproyek
    .create(req.body)
    .then((result) => res.json({ message: "Produk berhasil ditambahkan" }))
    .catch((e) => res.status(400).json({ message: e.message }));
});
app.post("/api/versibarukeranjangproyek", async (req, res) => {
  const result = await keranjangproyek
    .createNewVersion(req.body)
    .then((result) => res.json({ message: "Versi baru berhasil ditambahkan" }))
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

// rekapitulasiproyek
app.get("/api/rekapitulasiproyek", async (req, res) => {
  const list = rekapitulasiproyek.list(req.query);
  res.json(await list);
});
app.get("/api/versirekapitulasiproyek", async (req, res) => {
  const list = rekapitulasiproyek.listVersion(req.query);
  res.json(await list);
});
app.post("/api/rekapitulasiproyek", async (req, res) => {
  const result = await rekapitulasiproyek
    .create(req.body)
    .then((result) =>
      res.json({ message: "Rekapitulasi Proyek berhasil ditambahkan" })
    )
    .catch((e) => res.status(400).json({ message: e.message }));
});
app.post("/api/versibarurekapitulasiproyek", async (req, res) => {
  const result = await rekapitulasiproyek
    .createNewVersion(req.body)
    .then((result) => res.json({ message: "Versi baru berhasil ditambahkan" }))
    .catch((e) => res.status(400).json({ message: e.message }));
});
app.put("/api/rekapitulasiproyek", async (req, res) => {
  const result = await rekapitulasiproyek
    .update(req.body)
    .then((result) =>
      res.json({ message: "Rekapitulasi Proyek berhasil diubah" })
    )
    .catch((e) => res.status(400).json({ message: e.message }));
});
app.delete("/api/rekapitulasiproyek", async (req, res) => {
  rekapitulasiproyek
    .destroy(req.body)
    .then((result) =>
      res.json({ message: "Rekapitulasi Proyek berhasil dihapus" })
    )
    .catch((e) => res.status(400).json({ message: e.message }));
});

// jenisproyek
app.post("/api/jenisproyek", async (req, res) => {
  const result = await rekapitulasiproyek
    .createJenisProyek(req.body)
    .then((result) =>
      res.json({ message: "Rekapitulasi Proyek berhasil ditambahkan" })
    )
    .catch((e) => res.status(400).json({ message: e.message }));
});
app.put("/api/jenisproyek", async (req, res) => {
  const result = await rekapitulasiproyek
    .updateJenisProyek(req.body)
    .then((result) =>
      res.json({ message: "Rekapitulasi Proyek berhasil diubah" })
    )
    .catch((e) => res.status(400).json({ message: e.message }));
});

// pengeluaranproyek
app.get("/api/pengeluaranproyek", async (req, res) => {
  const list = pengeluaranproyek.list(req.query);
  res.json(await list);
});
app.post("/api/pengeluaranproyek", async (req, res) => {
  const result = await pengeluaranproyek
    .create(req.body)
    .then((result) =>
      res.json({ message: "Pengeluaran Proyek berhasil ditambahkan" })
    )
    .catch((e) => res.status(400).json({ message: e.message }));
});
app.put("/api/pengeluaranproyek", async (req, res) => {
  const result = await pengeluaranproyek
    .update(req.body)
    .then((result) =>
      res.json({ message: "Pengeluaran Proyek berhasil diubah" })
    )
    .catch((e) => res.status(400).json({ message: e.message }));
});
app.delete("/api/pengeluaranproyek", async (req, res) => {
  pengeluaranproyek
    .destroy(req.body)
    .then((result) =>
      res.json({ message: "Pengeluaran Proyek berhasil dihapus" })
    )
    .catch((e) => res.status(400).json({ message: e.message }));
});

// pembayaranproyek
app.get("/api/pembayaranproyek", async (req, res) => {
  const list = pembayaranproyek.list(req.query);
  res.json(await list);
});
app.get("/api/totalpembayaranproyek", async (req, res) => {
  const list = pembayaranproyek.total(req.query);
  res.json(await list);
});
app.post("/api/pembayaranproyek", async (req, res) => {
  const result = await pembayaranproyek
    .create(req.body)
    .then((result) =>
      res.json({ message: "Pembayaran Proyek berhasil ditambahkan" })
    )
    .catch((e) => res.status(400).json({ message: e.message }));
});
app.put("/api/pembayaranproyek", async (req, res) => {
  const result = await pembayaranproyek
    .update(req.body)
    .then((result) =>
      res.json({ message: "Pembayaran Proyek berhasil diubah" })
    )
    .catch((e) => res.status(400).json({ message: e.message }));
});
app.delete("/api/pembayaranproyek", async (req, res) => {
  pembayaranproyek
    .destroy(req.body)
    .then((result) =>
      res.json({ message: "Pembayaran Proyek berhasil dihapus" })
    )
    .catch((e) => res.status(400).json({ message: e.message }));
});

// nota
app.get("/api/nota", async (req, res) => {
  const list = nota.list(req.query);
  res.json(await list);
});
app.post("/api/nota", async (req, res) => {
  const result = await nota
    .create(req.body)
    .then((result) =>
      res.json({
        message: "Nota berhasil ditambahkan",
      })
    )
    .catch((e) => res.status(400).json({ message: e.message }));
});
app.put("/api/nota", async (req, res) => {
  const result = await nota
    .update(req.body)
    .then((result) => res.json({ message: "Nota berhasil diubah" }))
    .catch((e) => res.status(400).json({ message: e.message }));
});
app.delete("/api/nota", async (req, res) => {
  nota
    .destroy(req.body)
    .then((result) => res.json({ message: "Nota berhasil dihapus" }))
    .catch((e) => res.status(400).json({ message: e.message }));
});

// keranjangnota
app.get("/api/keranjangnota", async (req, res) => {
  const list = keranjangnota.list(req.query);
  res.json(await list);
});
app.post("/api/keranjangnota", async (req, res) => {
  const result = await keranjangnota
    .create(req.body)
    .then((result) =>
      res.json({
        message: "Keranjang Nota berhasil ditambahkan",
      })
    )
    .catch((e) => res.status(400).json({ message: e.message }));
});
app.put("/api/keranjangnota", async (req, res) => {
  const result = await keranjangnota
    .update(req.body)
    .then((result) => res.json({ message: "Keranjang Nota berhasil diubah" }))
    .catch((e) => res.status(400).json({ message: e.message }));
});
app.delete("/api/keranjangnota", async (req, res) => {
  keranjangnota
    .destroy(req.body)
    .then((result) => res.json({ message: "Keranjang Nota berhasil dihapus" }))
    .catch((e) => res.status(400).json({ message: e.message }));
});

// kwitansi
app.get("/api/kwitansi", async (req, res) => {
  const list = kwitansi.list(req.query);
  res.json(await list);
});
app.post("/api/kwitansi", async (req, res) => {
  const result = await kwitansi
    .create(req.body)
    .then((result) =>
      res.json({
        message: "Kwitansi berhasil ditambahkan",
      })
    )
    .catch((e) => res.status(400).json({ message: e.message }));
});
app.put("/api/kwitansi", async (req, res) => {
  const result = await kwitansi
    .update(req.body)
    .then((result) => res.json({ message: "Kwitansi berhasil diubah" }))
    .catch((e) => res.status(400).json({ message: e.message }));
});
app.delete("/api/kwitansi", async (req, res) => {
  kwitansi
    .destroy(req.body)
    .then((result) => res.json({ message: "Kwitansi berhasil dihapus" }))
    .catch((e) => res.status(400).json({ message: e.message }));
});

// operasionalkantor
app.get("/api/operasionalkantor", async (req, res) => {
  const list = operasionalkantor.list(req.query);
  res.json(await list);
});
app.post("/api/operasionalkantor", async (req, res) => {
  const result = await operasionalkantor
    .create(req.body)
    .then((result) =>
      res.json({ message: "Operasional Kantor berhasil ditambahkan" })
    )
    .catch((e) => res.status(400).json({ message: e.message }));
});
app.put("/api/operasionalkantor", async (req, res) => {
  const result = await operasionalkantor
    .update(req.body)
    .then((result) =>
      res.json({ message: "Operasional Kantor berhasil diubah" })
    )
    .catch((e) => res.status(400).json({ message: e.message }));
});
app.delete("/api/operasionalkantor", async (req, res) => {
  operasionalkantor
    .destroy(req.body)
    .then((result) =>
      res.json({ message: "Operasional Kantor berhasil dihapus" })
    )
    .catch((e) => res.status(400).json({ message: e.message }));
});

// kategorioperasionalkantor
app.get("/api/kategorioperasionalkantor", async (req, res) => {
  const list = kategorioperasionalkantor.list(req.query);
  res.json(await list);
});
app.post("/api/kategorioperasionalkantor", async (req, res) => {
  const result = await kategorioperasionalkantor
    .create(req.body)
    .then((result) =>
      res.json({ message: "Kategori Operasional Kantor berhasil ditambahkan" })
    )
    .catch((e) => res.status(400).json({ message: e.message }));
});
app.put("/api/kategorioperasionalkantor", async (req, res) => {
  const result = await kategorioperasionalkantor
    .update(req.body)
    .then((result) =>
      res.json({ message: "Kategori Operasional Kantor berhasil diubah" })
    )
    .catch((e) => res.status(400).json({ message: e.message }));
});
app.delete("/api/kategorioperasionalkantor", async (req, res) => {
  kategorioperasionalkantor
    .destroy(req.body)
    .then((result) =>
      res.json({ message: "Kategori Operasional Kantor berhasil dihapus" })
    )
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

// perusahaan
app.get("/api/perusahaan", async (req, res) => {
  const list = perusahaan.list(req.query);
  res.json(await list);
});
app.post("/api/perusahaan", async (req, res) => {
  const result = await perusahaan
    .create(req.body)
    .then((result) => res.json({ message: "perusahaan berhasil ditambahkan" }))
    .catch((e) => res.status(400).json({ message: e.message }));
});
app.put("/api/perusahaan", async (req, res) => {
  const result = await perusahaan
    .update(req.body)
    .then((result) => res.json({ message: "perusahaan berhasil diubah" }))
    .catch((e) => res.status(400).json({ message: e.message }));
});
app.delete("/api/perusahaan", async (req, res) => {
  perusahaan
    .destroy(req.body)
    .then((result) => res.json({ message: "perusahaan berhasil dihapus" }))
    .catch((e) => res.status(400).json({ message: e.message }));
});

// pengeluaran
app.get("/api/pengeluaran", async (req, res) => {
  const list = pengeluaran.list(req.query);
  res.json(await list);
});
app.post("/api/pengeluaran", async (req, res) => {
  const result = await pengeluaran
    .create(req.body)
    .then((result) => res.json({ message: "pengeluaran berhasil ditambahkan" }))
    .catch((e) => res.status(400).json({ message: e.message }));
});
app.put("/api/pengeluaran", async (req, res) => {
  const result = await pengeluaran
    .update(req.body)
    .then((result) => res.json({ message: "pengeluaran berhasil diubah" }))
    .catch((e) => res.status(400).json({ message: e.message }));
});
app.delete("/api/pengeluaran", async (req, res) => {
  pengeluaran
    .destroy(req.body)
    .then((result) => res.json({ message: "pengeluaran berhasil dihapus" }))
    .catch((e) => res.status(400).json({ message: e.message }));
});

// lembur
app.get("/api/lembur", async (req, res) => {
  const list = lembur.list(req.query);
  res.json(await list);
});
app.post("/api/lembur", async (req, res) => {
  const result = await lembur
    .create(req.body)
    .then((result) => res.json({ message: "lembur berhasil ditambahkan" }))
    .catch((e) => res.status(400).json({ message: e.message }));
});
app.put("/api/lembur", async (req, res) => {
  const result = await lembur
    .update(req.body)
    .then((result) => res.json({ message: "lembur berhasil diubah" }))
    .catch((e) => res.status(400).json({ message: e.message }));
});
app.delete("/api/lembur", async (req, res) => {
  lembur
    .destroy(req.body)
    .then((result) => res.json({ message: "lembur berhasil dihapus" }))
    .catch((e) => res.status(400).json({ message: e.message }));
});

// distributor
app.get("/api/distributor", async (req, res) => {
  const list = distributor.list(req.query);
  res.json(await list);
});
app.post("/api/distributor", async (req, res) => {
  const result = await distributor
    .create(req.body)
    .then((result) => res.json({ message: "distributor berhasil ditambahkan" }))
    .catch((e) => res.status(400).json({ message: e.message }));
});
app.put("/api/distributor", async (req, res) => {
  const result = await distributor
    .update(req.body)
    .then((result) => res.json({ message: "distributor berhasil diubah" }))
    .catch((e) => res.status(400).json({ message: e.message }));
});
app.delete("/api/distributor", async (req, res) => {
  distributor
    .destroy(req.body)
    .then((result) => res.json({ message: "distributor berhasil dihapus" }))
    .catch((e) => res.status(400).json({ message: e.message }));
});

// klien
app.get("/api/klien", async (req, res) => {
  const list = klien.list(req.query);
  res.json(await list);
});
app.post("/api/klien", async (req, res) => {
  const result = await klien
    .create(req.body)
    .then((result) => res.json({ message: "klien berhasil ditambahkan" }))
    .catch((e) => res.status(400).json({ message: e.message }));
});
app.put("/api/klien", async (req, res) => {
  const result = await klien
    .update(req.body)
    .then((result) => res.json({ message: "klien berhasil diubah" }))
    .catch((e) => res.status(400).json({ message: e.message }));
});
app.delete("/api/klien", async (req, res) => {
  klien
    .destroy(req.body)
    .then((result) => res.json({ message: "klien berhasil dihapus" }))
    .catch((e) => res.status(400).json({ message: e.message }));
});

// gudang
app.get("/api/gudang", async (req, res) => {
  const list = gudang.list(req.query);
  res.json(await list);
});
app.post("/api/gudang", async (req, res) => {
  const result = await gudang
    .create(req.body)
    .then((result) => res.json({ message: "gudang berhasil ditambahkan" }))
    .catch((e) => res.status(400).json({ message: e.message }));
});
app.put("/api/gudang", async (req, res) => {
  const result = await gudang
    .update(req.body)
    .then((result) => res.json({ message: "gudang berhasil diubah" }))
    .catch((e) => res.status(400).json({ message: e.message }));
});
app.delete("/api/gudang", async (req, res) => {
  gudang
    .destroy(req.body)
    .then((result) => res.json({ message: "gudang berhasil dihapus" }))
    .catch((e) => res.status(400).json({ message: e.message }));
});

// pengeluaranperusahaan
app.get("/api/pengeluaranperusahaan", async (req, res) => {
  const list = pengeluaranperusahaan.list(req.query);
  res.json(await list);
});
app.post("/api/pengeluaranperusahaan", async (req, res) => {
  const result = await pengeluaranperusahaan
    .create(req.body)
    .then((result) =>
      res.json({ message: "pengeluaranperusahaan berhasil ditambahkan" })
    )
    .catch((e) => res.status(400).json({ message: e.message }));
});
app.put("/api/pengeluaranperusahaan", async (req, res) => {
  const result = await pengeluaranperusahaan
    .update(req.body)
    .then((result) =>
      res.json({ message: "pengeluaranperusahaan berhasil diubah" })
    )
    .catch((e) => res.status(400).json({ message: e.message }));
});
app.delete("/api/pengeluaranperusahaan", async (req, res) => {
  pengeluaranperusahaan
    .destroy(req.body)
    .then((result) =>
      res.json({ message: "pengeluaranperusahaan berhasil dihapus" })
    )
    .catch((e) => res.status(400).json({ message: e.message }));
});

// user
app.get("/api/user", async (req, res) => {
  const list = user.list(req.query);
  res.json(await list);
});
app.post("/api/user", async (req, res) => {
  const result = await user
    .create(req.body)
    .then((result) => res.json({ message: "user berhasil ditambahkan" }))
    .catch((e) => res.status(400).json({ message: e.message }));
});
app.put("/api/user", async (req, res) => {
  const result = await user
    .update(req.body)
    .then((result) => res.json({ message: "user berhasil diubah" }))
    .catch((e) => res.status(400).json({ message: e.message }));
});
app.delete("/api/user", async (req, res) => {
  user
    .destroy(req.body)
    .then((result) => res.json({ message: "user berhasil dihapus" }))
    .catch((e) => res.status(400).json({ message: e.message }));
});

// login
app.post("/api/login", async (req, res) => {
  const result = await user
    .login(req.body)
    .then((result) => res.json(result))
    .catch((e) => res.status(400).json({ message: e.message }));
});

// kategoriproduk
app.get("/api/kategoriproduk", async (req, res) => {
  const list = kategoriproduk.list(req.query);
  res.json(await list);
});
app.post("/api/kategoriproduk", async (req, res) => {
  const result = await kategoriproduk
    .create(req.body)
    .then((result) =>
      res.json({ message: "kategoriproduk berhasil ditambahkan" })
    )
    .catch((e) => res.status(400).json({ message: e.message }));
});
app.put("/api/kategoriproduk", async (req, res) => {
  const result = await kategoriproduk
    .update(req.body)
    .then((result) => res.json({ message: "kategoriproduk berhasil diubah" }))
    .catch((e) => res.status(400).json({ message: e.message }));
});
app.delete("/api/kategoriproduk", async (req, res) => {
  kategoriproduk
    .destroy(req.body)
    .then((result) => res.json({ message: "kategoriproduk berhasil dihapus" }))
    .catch((e) => res.status(400).json({ message: e.message }));
});

// subkategoriproduk
app.get("/api/subkategoriproduk", async (req, res) => {
  const list = subkategoriproduk.list(req.query);
  res.json(await list);
});
app.post("/api/subkategoriproduk", async (req, res) => {
  const result = await subkategoriproduk
    .create(req.body)
    .then((result) =>
      res.json({ message: "subkategoriproduk berhasil ditambahkan" })
    )
    .catch((e) => res.status(400).json({ message: e.message }));
});
app.put("/api/subkategoriproduk", async (req, res) => {
  const result = await subkategoriproduk
    .update(req.body)
    .then((result) =>
      res.json({ message: "subkategoriproduk berhasil diubah" })
    )
    .catch((e) => res.status(400).json({ message: e.message }));
});
app.delete("/api/subkategoriproduk", async (req, res) => {
  subkategoriproduk
    .destroy(req.body)
    .then((result) =>
      res.json({ message: "subkategoriproduk berhasil dihapus" })
    )
    .catch((e) => res.status(400).json({ message: e.message }));
});

// merek
app.get("/api/merek", async (req, res) => {
  const list = merek.list(req.query);
  res.json(await list);
});
app.post("/api/merek", async (req, res) => {
  const result = await merek
    .create(req.body)
    .then((result) => res.json({ message: "merek berhasil ditambahkan" }))
    .catch((e) => res.status(400).json({ message: e.message }));
});
app.put("/api/merek", async (req, res) => {
  const result = await merek
    .update(req.body)
    .then((result) => res.json({ message: "merek berhasil diubah" }))
    .catch((e) => res.status(400).json({ message: e.message }));
});
app.delete("/api/merek", async (req, res) => {
  merek
    .destroy(req.body)
    .then((result) => res.json({ message: "merek berhasil dihapus" }))
    .catch((e) => res.status(400).json({ message: e.message }));
});

// statusproyek
app.get("/api/statusproyek", async (req, res) => {
  const list = statusproyek.list(req.query);
  res.json(await list);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
