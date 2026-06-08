WITH RECURSIVE tree AS (
    -- 1. Anchor Member
    SELECT id AS id_laporan_relation,
        id_parent,
        id_child,
        id_coa_type,
        id_coa_subtype,
        id_coa,
        modifier,
        CAST(id AS CHAR(1000)) AS path,
        FALSE AS has_cycle,
        1 AS level -- <-- START AT LEVEL 1
    FROM laporan_relation
    WHERE id_parent = ?
    UNION ALL
    -- 2. Recursive Member
    SELECT lr.id AS id_laporan_relation,
        lr.id_parent,
        lr.id_child,
        lr.id_coa_type,
        lr.id_coa_subtype,
        lr.id_coa,
        lr.modifier,
        CONCAT(t.path, ',', lr.id),
        FIND_IN_SET(lr.id, t.path) > 0 AS has_cycle,
        t.level + 1 AS level -- <-- INCREMENT LEVEL ON EACH HOP
    FROM laporan_relation lr
        JOIN tree t ON lr.id_parent = t.id_child
    WHERE NOT t.has_cycle
) -- 3. Final Select
SELECT t.*,
    l.nama,
    l.keterangan
FROM tree t
    LEFT JOIN laporan l ON l.id = t.id_child;
-- value ready
WITH RECURSIVE tree AS (
    /* ROOT */
    SELECT CAST(CONCAT('report_', id) AS CHAR(100)) AS node_key,
        CAST(NULL AS CHAR(100)) AS parent_node_key,
        CAST(NULL AS SIGNED) AS id_laporan_relation,
        id AS id_laporan,
        CAST(NULL AS SIGNED) AS id_coa_type,
        CAST(NULL AS SIGNED) AS id_coa_subtype,
        CAST(NULL AS SIGNED) AS id_coa,
        CAST(NULL AS CHAR(10)) AS modifier,
        CAST(CONCAT('report_', id) AS CHAR(4000)) AS path,
        FALSE AS has_cycle,
        0 AS level,
        CAST('report' AS CHAR(20)) AS node_type,
        nama,
        keterangan
    FROM laporan
    WHERE id = ?
    UNION ALL
    /* LAPORAN -> RELATION */
    SELECT CAST(CONCAT('section_', lr.id) AS CHAR(100)),
        CAST(t.node_key AS CHAR(100)),
        lr.id,
        lr.id_child,
        lr.id_coa_type,
        lr.id_coa_subtype,
        lr.id_coa,
        lr.modifier,
        CONCAT(t.path, ',', CONCAT('section_', lr.id)),
        FIND_IN_SET(
            CONCAT('section_', lr.id),
            REPLACE(t.path, ',', ',')
        ) > 0,
        t.level + 1,
        CAST('section' AS CHAR(20)),
        l.nama,
        l.keterangan
    FROM tree t
        JOIN laporan_relation lr ON lr.id_parent = t.id_laporan
        left JOIN laporan l ON l.id = lr.id_child
    WHERE t.node_type IN ('report', 'section')
        AND NOT t.has_cycle
),
expanded AS (
    /* ORIGINAL TREE */
    SELECT *
    FROM tree
    UNION ALL
    /* TYPE -> SUBTYPE */
    SELECT CAST(
            CONCAT(
                'sub_',
                cs.id,
                '_rel_',
                t.id_laporan_relation
            ) AS CHAR(100)
        ) AS node_key,
        CAST(t.node_key AS CHAR(100)) AS parent_node_key,
        NULL AS id_laporan_relation,
        NULL AS id_laporan,
        NULL AS id_coa_type,
        cs.id AS id_coa_subtype,
        NULL AS id_coa,
        t.modifier,
        CONCAT(
            t.path,
            ',',
            CONCAT(
                'sub_',
                cs.id,
                '_rel_',
                t.id_laporan_relation
            )
        ),
        FALSE,
        t.level + 1,
        CAST('subtype' AS CHAR(20)),
        cs.nama,
        NULL AS keterangan
    FROM tree t
        JOIN coa_subtype cs ON cs.id_coa_type = t.id_coa_type
    WHERE t.id_coa_type IS NOT NULL
    UNION ALL
    /* RELATION SUBTYPE -> COA */
    SELECT CAST(
            CONCAT(
                'coa_',
                c.id,
                '_rel_',
                t.id_laporan_relation
            ) AS CHAR(100)
        ),
        CAST(t.node_key AS CHAR(100)),
        NULL,
        NULL,
        NULL,
        t.id_coa_subtype,
        c.id,
        t.modifier,
        CONCAT(
            t.path,
            ',',
            CONCAT(
                'coa_',
                c.id,
                '_rel_',
                t.id_laporan_relation
            )
        ),
        FALSE,
        t.level + 1,
        CAST('coa' AS CHAR(20)),
        c.nama,
        NULL
    FROM tree t
        JOIN coa c ON c.id_coa_subtype = t.id_coa_subtype
    WHERE t.id_coa_subtype IS NOT NULL
    UNION ALL
    /* GENERATED SUBTYPE -> COA */
    SELECT CAST(
            CONCAT(
                'coa_',
                c.id,
                '_sub_',
                e.id_coa_subtype,
                '_parent_',
                e.node_key
            ) AS CHAR(100)
        ),
        CAST(e.node_key AS CHAR(100)),
        NULL,
        NULL,
        NULL,
        e.id_coa_subtype,
        c.id,
        e.modifier,
        CONCAT(
            e.path,
            ',',
            CONCAT(
                'coa_',
                c.id,
                '_sub_',
                e.id_coa_subtype
            )
        ),
        FALSE,
        e.level + 1,
        CAST('coa' AS CHAR(20)),
        c.nama,
        NULL
    FROM expanded e
        JOIN coa c ON c.id_coa_subtype = e.id_coa_subtype
    WHERE e.node_type = 'subtype'
)
SELECT e.node_key,
    e.parent_node_key,
    e.id_laporan_relation,
    e.id_laporan,
    e.id_coa_type,
    e.id_coa_subtype,
    e.id_coa,
    e.modifier,
    e.level,
    e.node_type,
    e.nama,
    e.keterangan,
    e.path,
    e.has_cycle,
    SUM(
        CASE
            WHEN ct.normal_balance = 1 THEN 1
            ELSE -1
        END * CASE
            WHEN t.tipe = 1 THEN 1
            ELSE -1
        END * t.amount
    ) AS nominal
FROM expanded e
    left join coa c on c.id = e.id_coa
    left join coa_subtype cs on cs.id = c.id_coa_subtype
    left join coa_type ct on ct.id = cs.id_coa_type
    left join transaksi t on t.id_coa = c.id
group by e.node_key,
    c.id
ORDER BY e.level,
    e.path;