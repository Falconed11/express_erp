import { Router } from "express";
import KeranjangProyekController from "../controllers/keranjang-proyek.controller.js";

const router = Router();

// router.post("/", KeranjangProyekController.create);
// router.get("/", KeranjangProyekController.get);
router.get("/:idProyek/summary", KeranjangProyekController.getOfferingSummary);
router.get("/:idProyek/composites", KeranjangProyekController.listComposites);
router.post("/:idProyek/composites", KeranjangProyekController.createComposite);
router.post(
  "/:idProyek/composites/reorder",
  KeranjangProyekController.reorderComposite,
);
router.put(
  "/:idProyek/composites/:id",
  KeranjangProyekController.updateComposite,
);
router.delete(
  "/:idProyek/composites/:id",
  KeranjangProyekController.deleteComposite,
);
// router.patch("/:id", KeranjangProyekController.patch);
// router.delete("/:id", KeranjangProyekController.delete);

export default router;
