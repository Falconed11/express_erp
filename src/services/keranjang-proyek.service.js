import KeranjangProyekModel from "../models/keranjang-proyek.model.js";
import KeranjangProyekComposite from "../../repositories/keranjangproyek-composite.cjs";

const _table = "pengeluaranproyek";

const KeranjangProyekService = {
  async getOfferingSummary(idProyek) {
    return KeranjangProyekModel.getOfferingSummary(idProyek);
  },
  async listComposites({ id_proyek, ...query }) {
    return KeranjangProyekComposite.list({ ...query, id_proyek });
  },
  async createComposite({ id_proyek, user, ...form }) {
    return KeranjangProyekComposite.create({
      ...form,
      id_proyek,
      user,
      updated_by: user?.id_karyawan ?? null,
    });
  },
  async updateComposite({ id, id_proyek, form, user }) {
    return KeranjangProyekComposite.update({
      ...form,
      id,
      id_proyek,
      user,
      updated_by: user?.id_karyawan ?? null,
    });
  },
  async deleteComposite({ id, id_proyek, user }) {
    return KeranjangProyekComposite.destroy({
      id,
      id_proyek,
      user,
      updated_by: user?.id_karyawan ?? null,
    });
  },
  async reorderComposite({ id_proyek, form, user }) {
    return KeranjangProyekComposite.reorder({
      ...form,
      id_proyek,
      user,
      updated_by: user?.id_karyawan ?? null,
    });
  },
};
export default KeranjangProyekService;
