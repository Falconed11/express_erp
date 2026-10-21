import * as Repository from "./keterangan-khusus-penawaran.repository.js";

const invalid = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const parsePositiveInteger = (value, label) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw invalid(`${label} tidak valid.`);
  }
  return parsed;
};

const parseScope = ({ id_proyek, versi }) => ({
  idProyek: parsePositiveInteger(id_proyek, "ID proyek"),
  versi: parsePositiveInteger(versi, "Versi penawaran"),
});

const parseNote = (value) => {
  if (typeof value !== "string" || !value.trim()) {
    throw invalid("Keterangan khusus belum diisi.");
  }
  return value.trim();
};

const assertValidScope = async ({ idProyek, versi }, repository) => {
  const project = await repository.getProject(idProyek);
  if (!project) throw invalid("Proyek tidak ditemukan.", 404);
  if (!(await repository.hasOfferVersion(idProyek, versi))) {
    throw invalid("Versi penawaran tidak ditemukan.", 404);
  }
  return project;
};

const assertCanEdit = (project, user) => {
  const rank = Number(user?.rank);
  const isHighRole = user?.rank != null && Number.isFinite(rank) && rank <= 20;
  const isUnassigned = project.id_karyawan == null;
  const isProjectOwner =
    user?.id_karyawan != null &&
    String(project.id_karyawan) === String(user.id_karyawan);
  const progress = Number(project.progress);

  if (
    !(isHighRole || isUnassigned || isProjectOwner) ||
    !Number.isFinite(progress) ||
    progress < 10 ||
    progress >= 100
  ) {
    throw invalid(
      "Anda tidak memiliki izin mengubah keterangan penawaran ini.",
      403,
    );
  }
};

const assertAffected = (result) => {
  if (!result.affectedRows)
    throw invalid("Keterangan khusus tidak ditemukan.", 404);
};

export const createKeteranganKhususPenawaranService = (
  repository = Repository,
) => ({
  async list(query) {
    const scope = parseScope(query);
    await assertValidScope(scope, repository);
    return repository.list(scope.idProyek, scope.versi);
  },

  async create(body, user) {
    const scope = parseScope(body);
    const project = await assertValidScope(scope, repository);
    assertCanEdit(project, user);
    return repository.create({
      ...scope,
      keterangan: parseNote(body.keterangan),
      actorId: user?.id_karyawan ?? null,
    });
  },

  async update(body, user) {
    const scope = parseScope(body);
    const id = parsePositiveInteger(body.id, "ID keterangan");
    const changes = {};
    if (body.keterangan !== undefined) {
      changes.keterangan = parseNote(body.keterangan);
    }
    if (body.aktif !== undefined) {
      if (typeof body.aktif !== "boolean") {
        throw invalid("Status aktif tidak valid.");
      }
      changes.aktif = body.aktif;
    }
    if (Object.keys(changes).length === 0) {
      throw invalid("Tidak ada perubahan keterangan khusus.");
    }
    const project = await assertValidScope(scope, repository);
    assertCanEdit(project, user);
    const result = await repository.update({
      id,
      ...scope,
      ...changes,
      actorId: user?.id_karyawan ?? null,
    });
    assertAffected(result);
    return result;
  },

  async remove(query, user) {
    const scope = parseScope(query);
    const id = parsePositiveInteger(query.id, "ID keterangan");
    const project = await assertValidScope(scope, repository);
    assertCanEdit(project, user);
    const result = await repository.remove({
      id,
      ...scope,
      actorId: user?.id_karyawan ?? null,
    });
    assertAffected(result);
    return result;
  },
});

const Service = createKeteranganKhususPenawaranService();

export const { list, create, update, remove } = Service;
