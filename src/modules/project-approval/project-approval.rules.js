const APPROVAL_RANK = {
  "head-sales": 1,
  owner: 2,
  super: 2,
};

const isBelow = (item, threshold) => {
  const price = item.hargakustom ?? item.harga;
  const normalizedPrice = Number(price);
  const normalizedThreshold = Number(threshold);
  return (
    price != null &&
    threshold != null &&
    Number.isFinite(normalizedPrice) &&
    Number.isFinite(normalizedThreshold) &&
    normalizedPrice < normalizedThreshold
  );
};

export const getRequiredApprovalLevel = (items = []) => {
  if (items.some((item) => isBelow(item, item.hargabatas))) {
    return "owner";
  }
  if (items.some((item) => isBelow(item, item.hargajual))) {
    return "head-sales";
  }
  return null;
};

export const isApprovalSufficient = (requiredLevel, approvedLevel) => {
  if (!requiredLevel) return true;
  return (
    (APPROVAL_RANK[approvedLevel] ?? 0) >=
    (APPROVAL_RANK[requiredLevel] ?? Infinity)
  );
};

export const canApprove = (requiredLevel, role) =>
  (APPROVAL_RANK[role] ?? 0) >= (APPROVAL_RANK[requiredLevel] ?? Infinity);

export const canCancelApproval = (approval, user) =>
  (approval?.approvedBy != null &&
    String(approval.approvedBy) === String(user?.id_karyawan)) ||
  canApprove(approval?.approvedLevel, user?.peran);
