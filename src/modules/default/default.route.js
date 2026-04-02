import { Router } from "express";

export const generateDefaultCRUDRouter = ({
  create,
  getById,
  getAll,
  patch,
  destroy,
}) => {
  const router = Router();
  router.get("/", getAll);
  router.post("/", create);
  router.get("/:id", getById);
  router.patch("/:id", patch);
  router.delete("/:id", destroy);
  return router;
};
