/**
 * Generates a default service object for service operations.
 * @param {import('#/types/model.types.js').CRUDModel} options
 */
export const generateDefaultCRUDService = ({
  create,
  getAll,
  getById,
  patch,
  destroy,
  customService = {},
}) => ({
  create: async (data) => create(data),
  getAll: async (data) => getAll(data),

  async getById(id) {
    const result = await getById(id);
    if (!result) {
      throw new Error("Data not found");
    }
    return result;
  },

  async patch(id, data) {
    const result = await patch(id, data);
    if (result.affectedRows === 0) {
      throw new Error("No data updated");
    }
    return result;
  },

  async destroy(id) {
    const result = await destroy(id);
    if (result.affectedRows === 0) {
      throw new Error("Data not found");
    }
    return result;
  },

  ...customService,
});
