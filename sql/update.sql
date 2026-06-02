CREATE TABLE laporan_map(
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_laporan INT DEFAULT NULL,
    id_coa_filter INT DEFAULT NULL,
    id_coa_type INT DEFAULT NULL,
    id_coa_subtype INT DEFAULT NULL,
    id_coa INT DEFAULT NULL,
    modifier TiNYINT(1) NOT NULL DEFAULT 1,
    -- metadata 
    aktif TINYINT(1) NOT NULL DEFAULT 1,
    keterangan VARCHAR(200) NOT NULL DEFAULT "",
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INT DEFAULT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT DEFAULT NULL,
    CONSTRAINT fk_vendor_jenis_created_by FOREIGN KEY (created_by) REFERENCES karyawan(id) ON UPDATE CASCADE,
    CONSTRAINT fk_vendor_jenis_updated_by FOREIGN KEY (updated_by) REFERENCES karyawan(id) ON UPDATE CASCADE
);