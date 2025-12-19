import * as model from "../models/proyek.model.js";

export const getAll = async () => {
  return model.findAll();
};
export const getStagedProductByProjectId = async (id) => {
  return model.findStagedProductByProjectId(id);
};
