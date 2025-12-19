export const success = (res, data) => {
  res.status(200).json({ success: true, data });
};

export const created = (res, data) => {
  res.status(201).json({ success: true, data });
};
