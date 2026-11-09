const isProjectDetailUpdate = ({ fields = [], id_instansi, instansi }) =>
  fields.some((field) => field !== "sembunyikankop=?") ||
  Boolean(id_instansi) ||
  Boolean(instansi);

const shouldAssertStatusResetApproval = ({ id_statusproyek, isDetailUpdate }) =>
  Number(id_statusproyek) === 1 && !isDetailUpdate;

const assertProjectDetailEditor = (project, user) => {
  const rank = Number(user?.rank);
  const isHighRole =
    user?.rank != null && Number.isFinite(rank) && rank <= 20;
  const isAssigned =
    project?.id_karyawan == null ||
    Number(project.id_karyawan) === Number(user?.id_karyawan);

  if (!project || (!isHighRole && !isAssigned)) {
    const error = new Error("Anda tidak berhak mengubah detail proyek ini.");
    error.statusCode = 403;
    throw error;
  }
};

module.exports = {
  assertProjectDetailEditor,
  isProjectDetailUpdate,
  shouldAssertStatusResetApproval,
};
