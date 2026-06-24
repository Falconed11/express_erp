-- =========================
-- Table: jurnal_form
-- =========================
CREATE TABLE jurnal_form (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama VARCHAR(32) NOT NULL UNIQUE,
    extra_fields JSON,
    created_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by INT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    keterangan varchar(500),
    aktif TINYINT(1) DEFAULT 1,
    CONSTRAINT fk_jurnal_form_created_by FOREIGN KEY (created_by) REFERENCES karyawan(id_karyawan),
    CONSTRAINT fk_jurnal_form_updated_by FOREIGN KEY (updated_by) REFERENCES karyawan(id_karyawan)
);
-- =========================
-- Table: jurnal_expression
-- =========================
CREATE TABLE jurnal_expression (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama VARCHAR(32) NOT NULL UNIQUE,
    id_filter INT DEFAULT NULL,
    filter_type ENUM('laporan', 'type', 'subtype', 'coa') DEFAULT NULL,
    formula varchar(500),
    created_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by INT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    keterangan TEXT,
    aktif TINYINT(1) DEFAULT 1,
    CONSTRAINT fk_jurnal_expression_created_by FOREIGN KEY (created_by) REFERENCES karyawan(id_karyawan),
    CONSTRAINT fk_jurnal_expression_updated_by FOREIGN KEY (updated_by) REFERENCES karyawan(id_karyawan)
);
-- =========================
-- Table: jurnal_form_expression (junction)
-- =========================
CREATE TABLE jurnal_form_expression (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_jurnal_form INT NOT NULL,
    id_jurnal_expression INT NOT NULL,
    input_type ENUM('debit', 'kredit') DEFAULT NULL,
    sort_order TINYINT,
    created_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by INT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    keterangan TEXT,
    aktif TINYINT(1) DEFAULT 1,
    CONSTRAINT fk_jfe_created_by FOREIGN KEY (created_by) REFERENCES karyawan(id_karyawan),
    CONSTRAINT fk_jfe_updated_by FOREIGN KEY (updated_by) REFERENCES karyawan(id_karyawan),
    UNIQUE KEY uniq_jfe (id_jurnal_form, id_jurnal_expression),
    CONSTRAINT fk_jfe_form FOREIGN KEY (id_jurnal_form) REFERENCES jurnal_form(id) ON UPDATE CASCADE,
    CONSTRAINT fk_jfe_expression FOREIGN KEY (id_jurnal_expression) REFERENCES jurnal_expression(id) ON UPDATE CASCADE
);