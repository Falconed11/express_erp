import {
  approveProjectOffer,
  cancelProjectOfferApproval,
  getProjectApprovalStatus,
  getProjectApprovalStatuses,
} from "./project-approval.repository.js";
import { canApprove, canCancelApproval } from "./project-approval.rules.js";

const parsePositiveInteger = (value, label) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    const error = new Error(`${label} tidak valid.`);
    error.statusCode = 400;
    throw error;
  }
  return parsed;
};

const addPermission = (status, user) => ({
  ...status,
  canApprove: Boolean(
    status.requiredLevel && canApprove(status.requiredLevel, user?.peran),
  ),
  canCancel: Boolean(
    status.hasApproval &&
    canCancelApproval(
      {
        approvedBy: status.approvedBy,
        approvedLevel: status.approvedLevel,
      },
      user,
    ),
  ),
});

export const getStatus = async ({ id_proyek, versi }, user) => {
  const idProyek = parsePositiveInteger(id_proyek, "ID proyek");
  if (versi == null || versi === "") {
    const statuses = await getProjectApprovalStatuses(idProyek);
    return statuses.map((status) => addPermission(status, user));
  }
  const status = await getProjectApprovalStatus(
    idProyek,
    parsePositiveInteger(versi, "Versi penawaran"),
  );
  return addPermission(status, user);
};

export const approve = async ({ id_proyek, versi }, user) => {
  const idProyek = parsePositiveInteger(id_proyek, "ID proyek");
  const offerVersion = parsePositiveInteger(versi, "Versi penawaran");
  return addPermission(
    await approveProjectOffer(idProyek, offerVersion, user, canApprove),
    user,
  );
};

export const cancel = async ({ id_proyek, versi }, user) => {
  const idProyek = parsePositiveInteger(id_proyek, "ID proyek");
  const offerVersion = parsePositiveInteger(versi, "Versi penawaran");
  return addPermission(
    await cancelProjectOfferApproval(
      idProyek,
      offerVersion,
      user,
      canCancelApproval,
    ),
    user,
  );
};
