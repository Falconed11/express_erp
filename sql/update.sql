ALTER TABLE laporan DROP COLUMN id_parent,
    DROP COLUMN id_coa_filter,
    DROP COLUMN id_coa,
    DROP COLUMN modifier,
    ADD COLUMN isReport TINYINT(1) NOT NULL DEFAULT 0
AFTER nama;
CREATE TABLE laporan_map(
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama VARCHAR(32) DEFAULT NULL,
    id_parent INT NOT NULL,
    id_laporan INT DEFAULT NULL,
    id_coa_filter INT DEFAULT NULL,
    id_coa_type INT DEFAULT NULL,
    id_coa_subtype INT DEFAULT NULL,
    id_coa INT DEFAULT NULL,
    -- 1. normal, -1. pembalik
    modifier TINYINT(1) NOT NULL DEFAULT 1,
    -- metadata 
    aktif TINYINT(1) NOT NULL DEFAULT 1,
    keterangan VARCHAR(200) NOT NULL DEFAULT "",
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INT DEFAULT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT DEFAULT NULL,
    CONSTRAINT fk_laporan_map_id_laporan FOREIGN KEY (id_laporan) REFERENCES laporan(id) ON UPDATE CASCADE,
    CONSTRAINT fk_laporan_map_id_coa_filter FOREIGN KEY (id_coa_filter) REFERENCES coa_filter(id) ON UPDATE CASCADE,
    CONSTRAINT fk_laporan_map_id_coa_type FOREIGN KEY (id_coa_type) REFERENCES coa_type(id) ON UPDATE CASCADE,
    CONSTRAINT fk_laporan_map_id_coa_subtype FOREIGN KEY (id_coa_subtype) REFERENCES coa_subtype(id) ON UPDATE CASCADE,
    CONSTRAINT fk_laporan_map_id_coa FOREIGN KEY (id_coa) REFERENCES coa(id) ON UPDATE CASCADE,
    CONSTRAINT fk_laporan_map_created_by FOREIGN KEY (created_by) REFERENCES karyawan(id) ON UPDATE CASCADE,
    CONSTRAINT fk_laporan_map_updated_by FOREIGN KEY (updated_by) REFERENCES karyawan(id) ON UPDATE CASCADE
);