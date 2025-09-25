const f1 = async () => {
  return new Error("f1");
};

f1;

throw new Error("error");
