/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */
;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */
;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */
;
/*!40101 SET NAMES utf8mb4 */
;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */
;
/*!40103 SET TIME_ZONE='+00:00' */
;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */
;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */
;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */
;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `aktivitassales` (
  `id` int(1) NOT NULL AUTO_INCREMENT,
  `lastuser` int(1) DEFAULT NULL,
  `lastupdate` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `inputcode` varchar(23) NOT NULL,
  `id_karyawan` int(1) NOT NULL,
  `id_proyek` int(1) DEFAULT NULL,
  `aktivitas` varchar(200) NOT NULL,
  `catatan` varchar(200) NOT NULL,
  `id_instansi` int(1) DEFAULT NULL,
  `tanggalselesai` datetime DEFAULT NULL,
  `pic` varchar(32) NOT NULL,
  `output` varchar(200) NOT NULL,
  `tindakanselanjutnya` varchar(200) NOT NULL,
  `tanggal` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `id_karyawan` (`id_karyawan`),
  KEY `id_proyek` (`id_proyek`),
  KEY `id_instansi` (`id_instansi`),
  CONSTRAINT `aktivitassales_ibfk_1` FOREIGN KEY (`id_karyawan`) REFERENCES `karyawan` (`id`),
  CONSTRAINT `aktivitassales_ibfk_2` FOREIGN KEY (`id_proyek`) REFERENCES `proyek` (`id`),
  CONSTRAINT `aktivitassales_ibfk_3` FOREIGN KEY (`id_instansi`) REFERENCES `instansi` (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 8 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `bank` (
  `id` int(1) NOT NULL AUTO_INCREMENT,
  `nama` varchar(32) NOT NULL,
  `lastuser` int(1) NOT NULL,
  `lastupdate` datetime DEFAULT current_timestamp(),
  `inputcode` varchar(21) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 4 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `coa` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_logical` varchar(10) DEFAULT NULL,
  `id_coa_subtype` int(1) DEFAULT NULL,
  `id_perusahaan` int(1) DEFAULT NULL,
  `nama` varchar(24) NOT NULL,
  `aktif` tinyint(1) NOT NULL DEFAULT 1,
  `keterangan` varchar(200) NOT NULL DEFAULT '',
  `created_at` datetime DEFAULT current_timestamp(),
  `created_by` int(11) DEFAULT NULL,
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `updated_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_nama` (`nama`),
  UNIQUE KEY `unique_id_logical` (`id_logical`),
  KEY `fk_coa_created_by` (`created_by`),
  KEY `fk_coa_updated_by` (`updated_by`),
  KEY `fk_coa_id_coa_type` (`id_coa_subtype`),
  KEY `id_perusahaan` (`id_perusahaan`),
  CONSTRAINT `coa_ibfk_1` FOREIGN KEY (`id_perusahaan`) REFERENCES `perusahaan` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_coa_created_by` FOREIGN KEY (`created_by`) REFERENCES `karyawan` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_coa_id_coa_type` FOREIGN KEY (`id_coa_subtype`) REFERENCES `coa_subtype` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_coa_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `karyawan` (`id`) ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 2 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `coa_filter` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nama` varchar(24) NOT NULL,
  `aktif` tinyint(1) NOT NULL DEFAULT 1,
  `keterangan` varchar(200) NOT NULL DEFAULT '',
  `created_at` datetime DEFAULT current_timestamp(),
  `created_by` int(11) DEFAULT NULL,
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `updated_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nama` (`nama`),
  KEY `fk_coa_filter_created_by` (`created_by`),
  KEY `fk_coa_filter_updated_by` (`updated_by`),
  CONSTRAINT `fk_coa_filter_created_by` FOREIGN KEY (`created_by`) REFERENCES `karyawan` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_coa_filter_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `karyawan` (`id`) ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 2 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `coa_filter_map` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_coa_filter` int(11) DEFAULT NULL,
  `id_coa_type` int(11) DEFAULT NULL,
  `id_coa_subtype` int(11) DEFAULT NULL,
  `id_coa` int(11) DEFAULT NULL,
  `aktif` tinyint(1) NOT NULL DEFAULT 1,
  `keterangan` varchar(200) NOT NULL DEFAULT '',
  `created_at` datetime DEFAULT current_timestamp(),
  `created_by` int(11) DEFAULT NULL,
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `updated_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_map_filter_type` (`id_coa_type`),
  KEY `fk_map_filter_subtype` (`id_coa_subtype`),
  KEY `fk_map_filter_coa` (`id_coa`),
  KEY `fk_coa_filter_map_created_by` (`created_by`),
  KEY `fk_coa_filter_map_updated_by` (`updated_by`),
  KEY `fk_coa_filter_map` (`id_coa_filter`),
  CONSTRAINT `fk_coa_filter_map` FOREIGN KEY (`id_coa_filter`) REFERENCES `coa_filter` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_coa_filter_map_created_by` FOREIGN KEY (`created_by`) REFERENCES `karyawan` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_coa_filter_map_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `karyawan` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_map_filter_coa` FOREIGN KEY (`id_coa`) REFERENCES `coa` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_map_filter_subtype` FOREIGN KEY (`id_coa_subtype`) REFERENCES `coa_subtype` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_map_filter_type` FOREIGN KEY (`id_coa_type`) REFERENCES `coa_type` (`id`) ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 2 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `coa_subtype` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_coa_type` int(1) DEFAULT NULL,
  `nama` varchar(24) NOT NULL,
  `aktif` tinyint(1) NOT NULL DEFAULT 1,
  `keterangan` varchar(200) NOT NULL DEFAULT '',
  `created_at` datetime DEFAULT current_timestamp(),
  `created_by` int(11) DEFAULT NULL,
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `updated_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_nama` (`nama`),
  KEY `fk_coa_subtype_created_by` (`created_by`),
  KEY `fk_coa_subtype_updated_by` (`updated_by`),
  KEY `fk_coa_subtype_id_coa_type` (`id_coa_type`),
  CONSTRAINT `fk_coa_subtype_created_by` FOREIGN KEY (`created_by`) REFERENCES `karyawan` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_coa_subtype_id_coa_type` FOREIGN KEY (`id_coa_type`) REFERENCES `coa_type` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_coa_subtype_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `karyawan` (`id`) ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 2 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `coa_type` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nama` varchar(24) NOT NULL,
  `normal_balance` tinyint(1) NOT NULL,
  `aktif` tinyint(1) NOT NULL DEFAULT 1,
  `keterangan` varchar(200) NOT NULL DEFAULT '',
  `created_at` datetime DEFAULT current_timestamp(),
  `created_by` int(11) DEFAULT NULL,
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `updated_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_nama` (`nama`),
  KEY `fk_coa_type_created_by` (`created_by`),
  KEY `fk_coa_type_updated_by` (`updated_by`),
  CONSTRAINT `fk_coa_type_created_by` FOREIGN KEY (`created_by`) REFERENCES `karyawan` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_coa_type_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `karyawan` (`id`) ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 2 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `distributor` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nama` varchar(32) NOT NULL,
  `alamat` varchar(300) NOT NULL,
  `lastupdate` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `lastuser` int(1) DEFAULT NULL,
  `manualinput` smallint(1) DEFAULT 0,
  `inputcode` varchar(21) DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 4 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `golonganinstansi` (
  `id` int(1) NOT NULL AUTO_INCREMENT,
  `nama` varchar(32) NOT NULL,
  `keterangan` varchar(200) NOT NULL,
  `creationdate` date NOT NULL DEFAULT current_timestamp(),
  `lastupdate` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `authorid_karyawan` int(1) DEFAULT NULL,
  `lastid_karyawan` int(1) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nama` (`nama`),
  KEY `authorid_karyawan` (`authorid_karyawan`),
  KEY `lastid_karyawan` (`lastid_karyawan`),
  CONSTRAINT `golonganinstansi_ibfk_1` FOREIGN KEY (`authorid_karyawan`) REFERENCES `karyawan` (`id`),
  CONSTRAINT `golonganinstansi_ibfk_2` FOREIGN KEY (`lastid_karyawan`) REFERENCES `karyawan` (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 2 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `gudang` (
  `id` int(1) NOT NULL AUTO_INCREMENT,
  `nama` varchar(32) NOT NULL,
  `alamat` varchar(300) NOT NULL,
  `lastupdate` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `lastuser` int(1) DEFAULT NULL,
  `manualinput` smallint(1) DEFAULT 0,
  `inputcode` varchar(21) DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 4 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `instansi` (
  `id` int(1) NOT NULL AUTO_INCREMENT,
  `id_jenisinstansi` int(1) DEFAULT NULL,
  `id_golonganinstansi` int(1) DEFAULT NULL,
  `nama` varchar(32) NOT NULL,
  `swasta` tinyint(1) NOT NULL,
  `kota` varchar(32) NOT NULL,
  `alamat` varchar(300) NOT NULL,
  `lastupdate` datetime NOT NULL DEFAULT current_timestamp(),
  `lastuser` int(1) DEFAULT NULL,
  `manualinput` smallint(1) DEFAULT 0,
  `inputcode` varchar(21) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `lastuser` (`lastuser`),
  KEY `id_golonganinstansi` (`id_golonganinstansi`),
  KEY `id_jenisinstansi` (`id_jenisinstansi`),
  CONSTRAINT `instansi_ibfk_1` FOREIGN KEY (`lastuser`) REFERENCES `karyawan` (`id`),
  CONSTRAINT `instansi_ibfk_2` FOREIGN KEY (`id_golonganinstansi`) REFERENCES `golonganinstansi` (`id`),
  CONSTRAINT `instansi_ibfk_3` FOREIGN KEY (`id_jenisinstansi`) REFERENCES `jenisinstansi` (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 2746 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `jasa` (
  `id` int(1) NOT NULL AUTO_INCREMENT,
  `nama` varchar(32) NOT NULL,
  `harga` int(1) NOT NULL,
  `tanggal` datetime DEFAULT NULL,
  `satuan` varchar(32) NOT NULL,
  `lastupdate` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `lastuser` int(1) DEFAULT NULL,
  `manualinput` smallint(1) DEFAULT 0,
  `inputcode` varchar(21) DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `jasaproyek` (
  `id` int(1) NOT NULL AUTO_INCREMENT,
  `id_jasa` int(11) NOT NULL,
  `id_proyek` int(11) NOT NULL,
  `harga` int(11) NOT NULL,
  `jumlah` int(11) NOT NULL,
  `lastupdate` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `lastuser` int(1) DEFAULT NULL,
  `manualinput` smallint(1) DEFAULT 0,
  `inputcode` varchar(21) DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `jenisinstansi` (
  `id` int(1) NOT NULL AUTO_INCREMENT,
  `nama` varchar(32) NOT NULL,
  `keterangan` varchar(200) NOT NULL,
  `creationdate` date NOT NULL DEFAULT current_timestamp(),
  `lastupdate` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `authorid_karyawan` int(1) DEFAULT NULL,
  `lastid_karyawan` int(1) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nama` (`nama`),
  KEY `authorid_karyawan` (`authorid_karyawan`),
  KEY `lastid_karyawan` (`lastid_karyawan`),
  CONSTRAINT `jenisinstansi_ibfk_1` FOREIGN KEY (`authorid_karyawan`) REFERENCES `karyawan` (`id`),
  CONSTRAINT `jenisinstansi_ibfk_2` FOREIGN KEY (`lastid_karyawan`) REFERENCES `karyawan` (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 2 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `jenisproyek` (
  `id` int(1) NOT NULL AUTO_INCREMENT,
  `nama` varchar(32) NOT NULL,
  `keterangan` varchar(200) NOT NULL,
  `creationdate` date NOT NULL DEFAULT current_timestamp(),
  `lastupdate` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `authorid_karyawan` int(1) DEFAULT NULL,
  `lastid_karyawan` int(1) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nama` (`nama`),
  KEY `authorid_karyawan` (`authorid_karyawan`),
  KEY `lastid_karyawan` (`lastid_karyawan`),
  CONSTRAINT `jenisproyek_ibfk_1` FOREIGN KEY (`authorid_karyawan`) REFERENCES `karyawan` (`id`),
  CONSTRAINT `jenisproyek_ibfk_2` FOREIGN KEY (`lastid_karyawan`) REFERENCES `karyawan` (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 23 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `jurnal` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_perusahaan` int(11) DEFAULT NULL,
  `id_proyek` int(11) DEFAULT NULL,
  `tanggal` date NOT NULL,
  `aktif` tinyint(1) NOT NULL DEFAULT 1,
  `keterangan` varchar(200) NOT NULL DEFAULT '',
  `created_at` datetime DEFAULT current_timestamp(),
  `created_by` int(11) DEFAULT NULL,
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `updated_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_jurnal_perusahaan` (`id_perusahaan`),
  KEY `fk_jurnal_created_by` (`created_by`),
  KEY `fk_jurnal_updated_by` (`updated_by`),
  KEY `id_proyek` (`id_proyek`),
  CONSTRAINT `fk_jurnal_created_by` FOREIGN KEY (`created_by`) REFERENCES `karyawan` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_jurnal_perusahaan` FOREIGN KEY (`id_perusahaan`) REFERENCES `perusahaan` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_jurnal_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `karyawan` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `jurnal_ibfk_1` FOREIGN KEY (`id_proyek`) REFERENCES `proyek` (`id`) ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `karyawan` (
  `id` int(1) NOT NULL AUTO_INCREMENT,
  `nama` varchar(32) NOT NULL,
  `id_statuskaryawan` int(1) DEFAULT NULL,
  `lastupdate` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `lastuser` int(1) DEFAULT NULL,
  `manualinput` smallint(1) DEFAULT 0,
  `inputcode` varchar(21) DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `nama` (`nama`)
) ENGINE = InnoDB AUTO_INCREMENT = 347 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `kategorioperasionalkantor` (
  `id` int(1) NOT NULL AUTO_INCREMENT,
  `nama` varchar(32) NOT NULL,
  `lastupdate` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `lastuser` int(1) DEFAULT NULL,
  `manualinput` smallint(1) DEFAULT 0,
  `inputcode` varchar(21) DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 36 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `kategoriproduk` (
  `id` int(1) NOT NULL AUTO_INCREMENT,
  `nama` varchar(32) NOT NULL,
  `lastupdate` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `lastuser` int(1) DEFAULT NULL,
  `manualinput` smallint(1) DEFAULT 0,
  `inputcode` varchar(21) DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `nama` (`nama`)
) ENGINE = InnoDB AUTO_INCREMENT = 39 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `kategoriproyek` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nama` varchar(32) NOT NULL,
  `lastupdate` datetime NOT NULL DEFAULT current_timestamp(),
  `lastuser` int(1) DEFAULT NULL,
  `manualinput` smallint(1) DEFAULT 0,
  `inputcode` varchar(21) DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 893 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `keranjangnota` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_nota` int(1) NOT NULL,
  `id_produk` int(11) NOT NULL,
  `jumlah` int(11) NOT NULL,
  `harga` int(11) NOT NULL,
  `lastupdate` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `lastuser` int(1) DEFAULT NULL,
  `manualinput` smallint(1) DEFAULT 0,
  `inputcode` varchar(21) DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 18 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `keranjangproyek` (
  `id` int(1) NOT NULL AUTO_INCREMENT,
  `id_proyek` int(1) NOT NULL,
  `id_subproyek` int(1) DEFAULT NULL,
  `id_produk` int(1) NOT NULL,
  `versi` int(1) NOT NULL,
  `jumlah` int(1) NOT NULL,
  `hargamodal` int(1) NOT NULL,
  `harga` int(1) NOT NULL,
  `hargakustom` double DEFAULT NULL,
  `instalasi` tinyint(1) NOT NULL DEFAULT 0,
  `showmerek` tinyint(1) NOT NULL DEFAULT 1,
  `showtipe` tinyint(1) NOT NULL DEFAULT 1,
  `keterangan` varchar(300) NOT NULL,
  `lastupdate` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `lastuser` int(1) DEFAULT NULL,
  `manualinput` smallint(1) DEFAULT 0,
  `inputcode` varchar(21) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `id_subproyek` (`id_subproyek`),
  KEY `id_proyek` (`id_proyek`),
  KEY `id_produk` (`id_produk`),
  CONSTRAINT `keranjangproyek_ibfk_1` FOREIGN KEY (`id_subproyek`) REFERENCES `subproyek` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `keranjangproyek_ibfk_2` FOREIGN KEY (`id_proyek`) REFERENCES `proyek` (`id`),
  CONSTRAINT `keranjangproyek_ibfk_3` FOREIGN KEY (`id_produk`) REFERENCES `produk` (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 819 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `keteranganpenawaran` (
  `id` int(1) NOT NULL AUTO_INCREMENT,
  `keterangan` varchar(255) NOT NULL,
  `lastuser` int(1) NOT NULL,
  `lastupdate` datetime DEFAULT current_timestamp(),
  `inputcode` varchar(23) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 21 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `klien` (
  `id` int(1) NOT NULL AUTO_INCREMENT,
  `nama` varchar(32) NOT NULL,
  `alamat` varchar(300) NOT NULL,
  `lastupdate` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `lastuser` int(1) DEFAULT NULL,
  `manualinput` smallint(1) DEFAULT 0,
  `inputcode` varchar(21) DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 4 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `kwitansi` (
  `id` int(1) NOT NULL AUTO_INCREMENT,
  `id_kustom` varchar(32) NOT NULL,
  `nama_pembayar` varchar(100) NOT NULL,
  `nominal` bigint(1) NOT NULL,
  `keterangan` varchar(150) NOT NULL,
  `tanggal` date NOT NULL,
  `id_karyawan` int(1) NOT NULL,
  `last_update` datetime NOT NULL DEFAULT current_timestamp(),
  `lastupdate` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `lastuser` int(1) DEFAULT NULL,
  `manualinput` smallint(1) DEFAULT 0,
  `inputcode` varchar(21) DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 6 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `kwitansi_sequences` (
  `year` int(1) NOT NULL,
  `last_seq` int(1) NOT NULL,
  PRIMARY KEY (`year`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `laporan` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nama` varchar(24) NOT NULL,
  `isReport` tinyint(1) NOT NULL DEFAULT 0,
  `aktif` tinyint(1) NOT NULL DEFAULT 1,
  `keterangan` varchar(200) NOT NULL DEFAULT '',
  `created_at` datetime DEFAULT current_timestamp(),
  `created_by` int(11) DEFAULT NULL,
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `updated_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_laporan_nama` (`nama`),
  KEY `fk_laporan_created_by` (`created_by`),
  KEY `fk_laporan_updated_by` (`updated_by`),
  CONSTRAINT `fk_laporan_created_by` FOREIGN KEY (`created_by`) REFERENCES `karyawan` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_laporan_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `karyawan` (`id`) ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 4 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `laporan_relation` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nama` varchar(32) DEFAULT NULL,
  `id_parent` int(11) NOT NULL,
  `id_child` int(11) DEFAULT NULL,
  `id_laporan` int(11) DEFAULT NULL,
  `id_coa_filter` int(11) DEFAULT NULL,
  `id_coa_type` int(11) DEFAULT NULL,
  `id_coa_subtype` int(11) DEFAULT NULL,
  `id_coa` int(11) DEFAULT NULL,
  `modifier` tinyint(1) NOT NULL DEFAULT 1,
  `aktif` tinyint(1) NOT NULL DEFAULT 1,
  `keterangan` varchar(200) NOT NULL DEFAULT '',
  `created_at` datetime DEFAULT current_timestamp(),
  `created_by` int(11) DEFAULT NULL,
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `updated_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_laporan_relation_id_parent_id_child` (`id_parent`, `id_child`),
  KEY `fk_laporan_relation_id_child` (`id_child`),
  KEY `fk_laporan_relation_id_coa_filter` (`id_coa_filter`),
  KEY `fk_laporan_relation_id_coa_type` (`id_coa_type`),
  KEY `fk_laporan_relation_id_coa_subtype` (`id_coa_subtype`),
  KEY `fk_laporan_relation_id_coa` (`id_coa`),
  KEY `fk_laporan_relation_created_by` (`created_by`),
  KEY `fk_laporan_relation_updated_by` (`updated_by`),
  CONSTRAINT `fk_laporan_relation_created_by` FOREIGN KEY (`created_by`) REFERENCES `karyawan` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_laporan_relation_id_child` FOREIGN KEY (`id_child`) REFERENCES `laporan` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_laporan_relation_id_coa` FOREIGN KEY (`id_coa`) REFERENCES `coa` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_laporan_relation_id_coa_filter` FOREIGN KEY (`id_coa_filter`) REFERENCES `coa_filter` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_laporan_relation_id_coa_subtype` FOREIGN KEY (`id_coa_subtype`) REFERENCES `coa_subtype` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_laporan_relation_id_coa_type` FOREIGN KEY (`id_coa_type`) REFERENCES `coa_type` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_laporan_relation_id_parent` FOREIGN KEY (`id_parent`) REFERENCES `laporan` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_laporan_relation_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `karyawan` (`id`) ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 6 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `lembur` (
  `id` int(1) NOT NULL AUTO_INCREMENT,
  `id_karyawan` int(1) NOT NULL,
  `id_proyek` int(1) NOT NULL,
  `durasi` int(1) NOT NULL,
  `harga` int(1) NOT NULL,
  `keterangan` varchar(300) NOT NULL,
  `tanggal` date DEFAULT NULL,
  `lastupdate` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `lastuser` int(1) DEFAULT NULL,
  `manualinput` smallint(1) DEFAULT 0,
  `inputcode` varchar(21) DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 4 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `merek` (
  `id` int(1) NOT NULL AUTO_INCREMENT,
  `nama` varchar(32) NOT NULL,
  `lastupdate` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `lastuser` int(1) DEFAULT NULL,
  `manualinput` smallint(1) DEFAULT 0,
  `inputcode` varchar(21) DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `nama` (`nama`)
) ENGINE = InnoDB AUTO_INCREMENT = 4887 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `metodepembayaran` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_bank` int(1) NOT NULL,
  `norekening` varchar(24) NOT NULL,
  `atasnama` varchar(24) NOT NULL,
  `nama` varchar(32) NOT NULL,
  `keterangan` varchar(300) NOT NULL,
  `lastupdate` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `lastuser` int(1) DEFAULT NULL,
  `manualinput` smallint(1) DEFAULT 0,
  `inputcode` varchar(21) DEFAULT '0',
  `id_perusahaan` int(11) DEFAULT NULL,
  `id_coa` int(11) DEFAULT NULL,
  `hide` smallint(1) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `id_perusahaan` (`id_perusahaan`),
  KEY `id_coa` (`id_coa`),
  CONSTRAINT `metodepembayaran_ibfk_1` FOREIGN KEY (`id_perusahaan`) REFERENCES `perusahaan` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `metodepembayaran_ibfk_2` FOREIGN KEY (`id_coa`) REFERENCES `coa` (`id`) ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 319 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `metodepengeluaran` (
  `nama` varchar(32) NOT NULL,
  `keterangan` varchar(300) NOT NULL,
  `lastuser` int(1) NOT NULL,
  `lastupdate` datetime NOT NULL DEFAULT current_timestamp(),
  `inputcode` varchar(23) NOT NULL,
  PRIMARY KEY (`nama`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `nota` (
  `id` int(1) NOT NULL AUTO_INCREMENT,
  `id_kustom` int(1) NOT NULL,
  `user` varchar(32) NOT NULL,
  `instansi` varchar(32) NOT NULL,
  `tanggal` date NOT NULL,
  `id_karyawan` int(1) NOT NULL,
  `lastupdate` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `lastuser` int(1) DEFAULT NULL,
  `manualinput` smallint(1) DEFAULT 0,
  `inputcode` varchar(21) DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 5 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `operasionalkantor` (
  `id` int(1) NOT NULL AUTO_INCREMENT,
  `tanggal` date NOT NULL,
  `id_karyawan` int(1) DEFAULT NULL,
  `id_kategorioperasionalkantor` int(1) DEFAULT NULL,
  `id_metodepembayaran` int(1) DEFAULT NULL,
  `id_perusahaan` int(1) DEFAULT NULL,
  `keterangan` varchar(200) NOT NULL,
  `biaya` int(1) NOT NULL,
  `lastupdate` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `lastuser` int(1) DEFAULT NULL,
  `manualinput` smallint(1) DEFAULT 0,
  `inputcode` varchar(21) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `id_kategorioperasionalkantor` (`id_kategorioperasionalkantor`),
  KEY `id_karyawan` (`id_karyawan`),
  KEY `id_metodepembayaran` (`id_metodepembayaran`),
  KEY `id_perusahaan` (`id_perusahaan`),
  CONSTRAINT `operasionalkantor_ibfk_1` FOREIGN KEY (`id_kategorioperasionalkantor`) REFERENCES `kategorioperasionalkantor` (`id`),
  CONSTRAINT `operasionalkantor_ibfk_2` FOREIGN KEY (`id_karyawan`) REFERENCES `karyawan` (`id`),
  CONSTRAINT `operasionalkantor_ibfk_3` FOREIGN KEY (`id_metodepembayaran`) REFERENCES `metodepembayaran` (`id`),
  CONSTRAINT `operasionalkantor_ibfk_4` FOREIGN KEY (`id_perusahaan`) REFERENCES `perusahaan` (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 4230 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `pembayaranproyek` (
  `id` int(1) NOT NULL AUTO_INCREMENT,
  `id_second` varchar(9) DEFAULT NULL,
  `id_proyek` int(1) NOT NULL,
  `nominal` bigint(1) NOT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 0,
  `id_karyawaninvoice` int(1) DEFAULT NULL,
  `id_karyawankwitansi` int(1) DEFAULT NULL,
  `id_metodepembayaran` int(1) NOT NULL,
  `pembayar` varchar(100) NOT NULL,
  `untukpembayaran` varchar(300) NOT NULL,
  `tanggal` date NOT NULL,
  `keterangan` varchar(200) NOT NULL,
  `lastupdate` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `lastuser` int(1) DEFAULT NULL,
  `manualinput` smallint(1) DEFAULT 0,
  `inputcode` varchar(21) DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `id_second` (`id_second`),
  KEY `id_proyek` (`id_proyek`),
  KEY `id_karyawaninvoice` (`id_karyawaninvoice`),
  KEY `id_karyawankwitansi` (`id_karyawankwitansi`),
  CONSTRAINT `pembayaranproyek_ibfk_1` FOREIGN KEY (`id_proyek`) REFERENCES `proyek` (`id`),
  CONSTRAINT `pembayaranproyek_ibfk_2` FOREIGN KEY (`id_proyek`) REFERENCES `proyek` (`id`),
  CONSTRAINT `pembayaranproyek_ibfk_3` FOREIGN KEY (`id_karyawaninvoice`) REFERENCES `karyawan` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `pembayaranproyek_ibfk_4` FOREIGN KEY (`id_karyawankwitansi`) REFERENCES `karyawan` (`id`) ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 2245 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `pengeluaran` (
  `id` int(1) NOT NULL AUTO_INCREMENT,
  `id_karyawan` int(1) NOT NULL,
  `id_proyek` int(1) NOT NULL,
  `id_kategori` int(1) NOT NULL,
  `tanggal` date DEFAULT NULL,
  `harga` int(1) NOT NULL,
  `keterangan` varchar(300) NOT NULL,
  `lastupdate` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `lastuser` int(1) DEFAULT NULL,
  `manualinput` smallint(1) DEFAULT 0,
  `inputcode` varchar(21) DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 4 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `pengeluaranperusahaan` (
  `id` int(1) NOT NULL AUTO_INCREMENT,
  `id_distributor` int(1) NOT NULL,
  `id_kategori` int(1) NOT NULL,
  `nominal` int(1) NOT NULL,
  `tanggal` date DEFAULT NULL,
  `keterangan` varchar(300) NOT NULL,
  `lastupdate` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `lastuser` int(1) DEFAULT NULL,
  `manualinput` smallint(1) DEFAULT 0,
  `inputcode` varchar(21) DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 4 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `pengeluaranproyek` (
  `id` int(1) NOT NULL AUTO_INCREMENT,
  `id_proyek` int(1) NOT NULL,
  `tanggal` date NOT NULL,
  `id_karyawan` int(1) DEFAULT NULL,
  `id_produk` int(1) NOT NULL,
  `id_produkkeluar` int(11) DEFAULT NULL,
  `id_vendor` int(1) DEFAULT NULL,
  `jumlah` double NOT NULL,
  `harga` double NOT NULL,
  `lunas` tinyint(1) NOT NULL,
  `status` varchar(32) NOT NULL,
  `keterangan` varchar(200) NOT NULL,
  `lastupdate` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `lastuser` int(1) DEFAULT NULL,
  `manualinput` smallint(1) DEFAULT 0,
  `inputcode` varchar(21) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `id_produk` (`id_produk`),
  KEY `id_karyawan` (`id_karyawan`),
  KEY `pengeluaranproyek_ibfk_3` (`id_proyek`),
  KEY `id_vendor` (`id_vendor`),
  CONSTRAINT `pengeluaranproyek_ibfk_1` FOREIGN KEY (`id_produk`) REFERENCES `produk` (`id`),
  CONSTRAINT `pengeluaranproyek_ibfk_2` FOREIGN KEY (`id_karyawan`) REFERENCES `karyawan` (`id`),
  CONSTRAINT `pengeluaranproyek_ibfk_3` FOREIGN KEY (`id_proyek`) REFERENCES `proyek` (`id`),
  CONSTRAINT `pengeluaranproyek_ibfk_4` FOREIGN KEY (`id_vendor`) REFERENCES `vendor` (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 43137 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `peran` (
  `nama` varchar(20) NOT NULL,
  `keterangan` varchar(100) NOT NULL,
  `lastuser` int(1) NOT NULL,
  `inputcode` varchar(23) NOT NULL,
  `lastupdate` datetime DEFAULT current_timestamp(),
  `rank` int(1) NOT NULL,
  PRIMARY KEY (`nama`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `peristiwa` (
  `id` int(1) NOT NULL AUTO_INCREMENT,
  `nama` varchar(24) NOT NULL,
  `aktif` tinyint(1) NOT NULL DEFAULT 1,
  `keterangan` varchar(200) NOT NULL DEFAULT '',
  `created_at` datetime DEFAULT current_timestamp(),
  `created_by` int(11) DEFAULT NULL,
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `updated_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_nama` (`nama`),
  KEY `fk_peristiwa_created_by` (`created_by`),
  KEY `fk_peristiwa_updated_by` (`updated_by`),
  CONSTRAINT `fk_peristiwa_created_by` FOREIGN KEY (`created_by`) REFERENCES `karyawan` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_peristiwa_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `karyawan` (`id`) ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `peristiwa_coa_map` (
  `id` int(1) NOT NULL AUTO_INCREMENT,
  `id_peristiwa` int(1) NOT NULL,
  `entry_tipe` tinyint(1) NOT NULL,
  `aktif` tinyint(1) NOT NULL DEFAULT 1,
  `amount_source` varchar(24) NOT NULL DEFAULT '',
  `keterangan` varchar(200) NOT NULL DEFAULT '',
  `created_at` datetime DEFAULT current_timestamp(),
  `created_by` int(11) DEFAULT NULL,
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `updated_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_peristiwa_coa_map_created_by` (`created_by`),
  KEY `fk_peristiwa_coa_map_updated_by` (`updated_by`),
  KEY `id_peristiwa` (`id_peristiwa`),
  CONSTRAINT `fk_peristiwa_coa_map_created_by` FOREIGN KEY (`created_by`) REFERENCES `karyawan` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_peristiwa_coa_map_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `karyawan` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `peristiwa_coa_map_ibfk_1` FOREIGN KEY (`id_peristiwa`) REFERENCES `peristiwa` (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `perubahanmodal` (
  `id` int(1) NOT NULL AUTO_INCREMENT,
  `input_date` date NOT NULL,
  `periode` date NOT NULL,
  `saldoakhir` int(1) NOT NULL,
  `created_at` date NOT NULL DEFAULT current_timestamp(),
  `created_by` int(11) DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `updated_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `periode` (`periode`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `perusahaan` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nama` varchar(32) NOT NULL,
  `logo` varchar(32) NOT NULL,
  `deskripsi` varchar(100) NOT NULL,
  `alamat` varchar(150) NOT NULL,
  `kontak` varchar(100) NOT NULL,
  `lastupdate` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `lastuser` int(1) DEFAULT NULL,
  `manualinput` smallint(1) DEFAULT 0,
  `inputcode` varchar(21) DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 4 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `produk` (
  `id` int(1) NOT NULL AUTO_INCREMENT,
  `id_kustom` varchar(32) NOT NULL,
  `nama` varchar(200) NOT NULL,
  `id_kategori` int(1) NOT NULL,
  `id_subkategori` int(1) NOT NULL,
  `id_merek` int(1) DEFAULT NULL,
  `id_vendor` int(1) NOT NULL,
  `tipe` varchar(32) NOT NULL,
  `stok` int(1) NOT NULL,
  `satuan` varchar(32) NOT NULL,
  `hargamodal` int(1) NOT NULL,
  `hargajual` int(1) NOT NULL,
  `tanggal` date DEFAULT NULL,
  `keterangan` varchar(300) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `aktif` tinyint(1) NOT NULL DEFAULT 1,
  `lastupdate` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `lastuser` int(1) DEFAULT NULL,
  `manualinput` smallint(1) DEFAULT 0,
  `inputcode` varchar(21) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `id_kategori` (`id_kategori`),
  KEY `id_merek` (`id_merek`),
  CONSTRAINT `produk_ibfk_1` FOREIGN KEY (`id_kategori`) REFERENCES `kategoriproduk` (`id`),
  CONSTRAINT `produk_ibfk_2` FOREIGN KEY (`id_merek`) REFERENCES `merek` (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 30989 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `produkkeluar` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_produkmasuk` int(1) NOT NULL,
  `id_produk` int(1) NOT NULL,
  `id_proyek` int(1) DEFAULT NULL,
  `jumlah` int(1) NOT NULL,
  `sn` varchar(22) NOT NULL,
  `tanggal` date DEFAULT NULL,
  `metodepengeluaran` varchar(32) NOT NULL,
  `keterangan` varchar(300) NOT NULL,
  `lastuser` int(1) NOT NULL,
  `lastupdate` datetime NOT NULL DEFAULT current_timestamp(),
  `inputcode` varchar(23) NOT NULL,
  `harga` int(1) NOT NULL,
  `pembeli` varchar(32) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `id_proyek` (`id_proyek`),
  KEY `id_produkmasuk` (`id_produkmasuk`),
  CONSTRAINT `produkkeluar_ibfk_1` FOREIGN KEY (`id_proyek`) REFERENCES `proyek` (`id`),
  CONSTRAINT `produkkeluar_ibfk_2` FOREIGN KEY (`id_produkmasuk`) REFERENCES `produkmasuk` (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 298 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `produkmasuk` (
  `id` int(1) NOT NULL AUTO_INCREMENT,
  `id_produk` int(1) NOT NULL,
  `id_vendor` int(1) NOT NULL,
  `jumlah` double NOT NULL,
  `keluar` int(1) NOT NULL,
  `harga` int(1) NOT NULL,
  `terbayar` int(1) NOT NULL,
  `tanggal` date DEFAULT NULL,
  `jatuhtempo` date DEFAULT NULL,
  `inputcode` varchar(23) NOT NULL,
  `lastuser` varchar(32) NOT NULL,
  `lastupdate` datetime DEFAULT current_timestamp(),
  `manualinput` tinyint(1) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `id_produk` (`id_produk`),
  KEY `id_vendor` (`id_vendor`),
  CONSTRAINT `produkmasuk_ibfk_1` FOREIGN KEY (`id_produk`) REFERENCES `produk` (`id`),
  CONSTRAINT `produkmasuk_ibfk_2` FOREIGN KEY (`id_vendor`) REFERENCES `vendor` (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 315 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `proyek` (
  `id` int(1) NOT NULL AUTO_INCREMENT,
  `id_second` varchar(32) NOT NULL,
  `id_kustom` int(1) DEFAULT NULL,
  `id_penawaran` int(1) NOT NULL,
  `id_perusahaan` int(1) DEFAULT NULL,
  `id_instansi` int(1) NOT NULL,
  `id_po` varchar(24) NOT NULL,
  `klien` varchar(32) NOT NULL,
  `nama` varchar(32) NOT NULL,
  `nilai` int(1) NOT NULL,
  `id_statusproyek` int(1) NOT NULL,
  `id_karyawan` int(1) NOT NULL,
  `id_jenisproyek` int(1) DEFAULT NULL,
  `tanggal` date DEFAULT NULL,
  `tanggal_penawaran` date DEFAULT NULL,
  `tanggal_reject` date DEFAULT NULL,
  `tanggalsuratjalan` datetime DEFAULT NULL,
  `alamatsuratjalan` varchar(200) NOT NULL,
  `keterangan` varchar(300) NOT NULL,
  `hide` tinyint(1) NOT NULL DEFAULT 0,
  `versi` int(1) NOT NULL,
  `lastupdate` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `lastuser` int(1) DEFAULT NULL,
  `manualinput` smallint(1) DEFAULT 0,
  `inputcode` varchar(21) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `id_perusahaan` (`id_perusahaan`),
  KEY `id_statusproyek` (`id_statusproyek`),
  KEY `id_jenisproyek` (`id_jenisproyek`),
  CONSTRAINT `proyek_ibfk_1` FOREIGN KEY (`id_perusahaan`) REFERENCES `perusahaan` (`id`),
  CONSTRAINT `proyek_ibfk_2` FOREIGN KEY (`id_statusproyek`) REFERENCES `statusproyek` (`id`),
  CONSTRAINT `proyek_ibfk_3` FOREIGN KEY (`id_jenisproyek`) REFERENCES `jenisproyek` (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 4683 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `proyek_keteranganpenawaran` (
  `id_proyek` int(1) NOT NULL,
  `id_keteranganpenawaran` int(1) NOT NULL,
  `lastuser` int(1) DEFAULT NULL,
  `lastupdate` datetime DEFAULT current_timestamp(),
  `inputcode` varchar(23) NOT NULL,
  PRIMARY KEY (`id_proyek`, `id_keteranganpenawaran`),
  KEY `id_keteranganpenawaran` (`id_keteranganpenawaran`),
  CONSTRAINT `proyek_keteranganpenawaran_ibfk_1` FOREIGN KEY (`id_proyek`) REFERENCES `proyek` (`id`),
  CONSTRAINT `proyek_keteranganpenawaran_ibfk_2` FOREIGN KEY (`id_keteranganpenawaran`) REFERENCES `keteranganpenawaran` (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `proyek_sequences` (
  `periode` mediumint(6) NOT NULL,
  `last_seq` int(1) NOT NULL,
  PRIMARY KEY (`periode`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `rekapitulasiproyek` (
  `id` int(1) NOT NULL AUTO_INCREMENT,
  `id_proyek` int(1) NOT NULL,
  `versi` int(1) NOT NULL,
  `diskon` int(1) NOT NULL,
  `diskoninstalasi` int(1) NOT NULL,
  `pajak` int(1) NOT NULL,
  `audio` tinyint(1) NOT NULL,
  `cctv` tinyint(1) NOT NULL,
  `multimedia` tinyint(1) NOT NULL,
  `lastupdate` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `lastuser` int(1) DEFAULT NULL,
  `manualinput` smallint(1) DEFAULT 0,
  `inputcode` varchar(21) DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 54 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `statuskaryawan` (
  `id` int(1) NOT NULL AUTO_INCREMENT,
  `status` varchar(16) NOT NULL,
  `keterangan` varchar(100) NOT NULL,
  `inputcode` varchar(24) NOT NULL,
  `lastuser` int(1) NOT NULL,
  `lastupdate` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 3 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `statusproyek` (
  `id` int(1) NOT NULL AUTO_INCREMENT,
  `nama` varchar(32) NOT NULL,
  `progress` tinyint(1) NOT NULL,
  `lastupdate` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `lastuser` int(1) DEFAULT NULL,
  `manualinput` smallint(1) DEFAULT 0,
  `inputcode` varchar(21) DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 16 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `statustodolist` (
  `id` tinyint(1) NOT NULL AUTO_INCREMENT,
  `status` varchar(64) NOT NULL,
  `keterangan` varchar(300) NOT NULL,
  `lastupdate` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `lastuser` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 5 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `stok` (
  `id` int(1) NOT NULL AUTO_INCREMENT,
  `jumlah` int(1) NOT NULL,
  `harga` int(1) NOT NULL,
  `terbayar` int(1) NOT NULL,
  `tanggal` date DEFAULT NULL,
  `jatuhtempo` date DEFAULT NULL,
  `id_produk` int(1) NOT NULL,
  `id_vendor` int(1) NOT NULL,
  `id_gudang` int(1) NOT NULL,
  `keterangan` varchar(300) NOT NULL,
  `lastupdate` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `lastuser` int(1) DEFAULT NULL,
  `manualinput` smallint(1) DEFAULT 0,
  `inputcode` varchar(21) DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 8 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `subkategoriproduk` (
  `id` int(1) NOT NULL AUTO_INCREMENT,
  `id_kategoriproduk` int(1) NOT NULL,
  `nama` varchar(32) NOT NULL,
  `lastupdate` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `lastuser` int(1) DEFAULT NULL,
  `manualinput` smallint(1) DEFAULT 0,
  `inputcode` varchar(21) DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 8 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `subproyek` (
  `id` int(1) NOT NULL AUTO_INCREMENT,
  `id_proyek` int(1) NOT NULL,
  `nama` varchar(32) NOT NULL,
  `lastuser` int(1) NOT NULL,
  `lastupdate` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `id_proyek` (`id_proyek`),
  CONSTRAINT `subproyek_ibfk_1` FOREIGN KEY (`id_proyek`) REFERENCES `proyek` (`id`) ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 16 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `todolist` (
  `id` int(1) NOT NULL AUTO_INCREMENT,
  `id_user` int(1) DEFAULT NULL,
  `id_karyawan` int(1) DEFAULT NULL,
  `kegiatan` varchar(300) NOT NULL,
  `keterangan` varchar(300) NOT NULL,
  `lastupdate` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `lastuser` int(1) DEFAULT NULL,
  `creationdate` date NOT NULL DEFAULT current_timestamp(),
  `deadlinedate` date NOT NULL,
  `id_status` tinyint(1) DEFAULT NULL,
  `isdailyreset` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `id_karyawan` (`id_karyawan`),
  KEY `id_user` (`id_user`),
  KEY `id_status` (`id_status`),
  CONSTRAINT `todolist_ibfk_1` FOREIGN KEY (`id_karyawan`) REFERENCES `karyawan` (`id`),
  CONSTRAINT `todolist_ibfk_2` FOREIGN KEY (`id_user`) REFERENCES `user` (`id`),
  CONSTRAINT `todolist_ibfk_3` FOREIGN KEY (`id_status`) REFERENCES `statustodolist` (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 5 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `transaksi` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_jurnal` int(11) DEFAULT NULL,
  `id_coa` int(11) DEFAULT NULL,
  `tipe` tinyint(1) NOT NULL,
  `amount` decimal(17, 2) NOT NULL,
  `keterangan` varchar(200) NOT NULL DEFAULT '',
  `created_at` datetime DEFAULT current_timestamp(),
  `created_by` int(11) DEFAULT NULL,
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `updated_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_transaksi_jurnal` (`id_jurnal`),
  KEY `fk_transaksi_coa` (`id_coa`),
  KEY `fk_transaksi_created_by` (`created_by`),
  KEY `fk_transaksi_updated_by` (`updated_by`),
  CONSTRAINT `transaksi_ibfk_1` FOREIGN KEY (`id_coa`) REFERENCES `coa` (`id`),
  CONSTRAINT `transaksi_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `karyawan` (`id`),
  CONSTRAINT `transaksi_ibfk_3` FOREIGN KEY (`updated_by`) REFERENCES `karyawan` (`id`),
  CONSTRAINT `transaksi_ibfk_4` FOREIGN KEY (`id_jurnal`) REFERENCES `jurnal` (`id`) ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `transfer_bank` (
  `id` int(1) NOT NULL AUTO_INCREMENT,
  `id_metode_pembayaran_asal` int(1) NOT NULL,
  `id_metode_pembayaran_tujuan` int(1) NOT NULL,
  `tanggal` date NOT NULL DEFAULT current_timestamp(),
  `nominal` int(1) NOT NULL,
  `keterangan` varchar(200) NOT NULL,
  `created_at` date NOT NULL DEFAULT current_timestamp(),
  `created_by` int(1) DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL ON UPDATE current_timestamp(),
  `updated_by` int(1) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_metode_pembayaran_asal` (`id_metode_pembayaran_asal`),
  KEY `id_metode_pembayaran_tujuan` (`id_metode_pembayaran_tujuan`),
  KEY `created_by` (`created_by`),
  KEY `updated_by` (`updated_by`),
  CONSTRAINT `transfer_bank_ibfk_1` FOREIGN KEY (`id_metode_pembayaran_asal`) REFERENCES `metodepembayaran` (`id`),
  CONSTRAINT `transfer_bank_ibfk_2` FOREIGN KEY (`id_metode_pembayaran_tujuan`) REFERENCES `metodepembayaran` (`id`),
  CONSTRAINT `transfer_bank_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `karyawan` (`id`),
  CONSTRAINT `transfer_bank_ibfk_4` FOREIGN KEY (`updated_by`) REFERENCES `karyawan` (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `user` (
  `id` int(1) NOT NULL AUTO_INCREMENT,
  `username` varchar(32) NOT NULL,
  `password` varchar(60) NOT NULL,
  `peran` varchar(32) NOT NULL,
  `id_karyawan` int(1) DEFAULT NULL,
  `lastupdate` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `lastuser` int(1) DEFAULT NULL,
  `manualinput` smallint(1) DEFAULT 0,
  `inputcode` varchar(21) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `user_ibfk_1` (`id_karyawan`),
  KEY `user_ibfk_2` (`peran`),
  CONSTRAINT `user_ibfk_1` FOREIGN KEY (`id_karyawan`) REFERENCES `karyawan` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `user_ibfk_2` FOREIGN KEY (`peran`) REFERENCES `peran` (`nama`) ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 11 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `vendor` (
  `id` int(1) NOT NULL AUTO_INCREMENT,
  `id_vendor_jenis` int(11) DEFAULT NULL,
  `nama` varchar(32) NOT NULL,
  `alamat` varchar(300) NOT NULL,
  `lastupdate` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `lastuser` int(1) DEFAULT NULL,
  `manualinput` smallint(1) DEFAULT 0,
  `inputcode` varchar(21) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `fk_vendor_jenis` (`id_vendor_jenis`),
  CONSTRAINT `fk_vendor_jenis` FOREIGN KEY (`id_vendor_jenis`) REFERENCES `vendor_jenis` (`id`) ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 6874 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8 */
;
CREATE TABLE `vendor_jenis` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nama` varchar(24) NOT NULL,
  `aktif` tinyint(1) NOT NULL DEFAULT 1,
  `keterangan` varchar(200) NOT NULL DEFAULT '',
  `created_at` datetime DEFAULT current_timestamp(),
  `created_by` int(11) DEFAULT NULL,
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `updated_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_vendor_jenis_created_by` (`created_by`),
  KEY `fk_vendor_jenis_updated_by` (`updated_by`),
  CONSTRAINT `fk_vendor_jenis_created_by` FOREIGN KEY (`created_by`) REFERENCES `karyawan` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_vendor_jenis_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `karyawan` (`id`) ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 2 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */
;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */
;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */
;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */
;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */
;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */
;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */
;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */
;