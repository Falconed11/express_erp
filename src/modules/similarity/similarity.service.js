const DEFAULT_FIELD_CONFIG = [
  { inputField: "nama", productField: "nama", weight: 0.6 },
  { inputField: "merek", productField: "merek", weight: 0.2 },
  { inputField: "id_kustom", productField: "id_kustom", weight: 0.1 },
  { inputField: "tipe", productField: "tipe", weight: 0.1 },
];

const normalize = (value = "") =>
  String(value ?? "")
    .toLowerCase()
    .replace(/([0-9]+)\s*(ml|cl|l|kg|g|mg|gb|tb|w|v)\b/g, "$1$2")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const tokens = (value) => {
  const baseTokens = normalize(value).split(/\s+/).filter(Boolean);
  const result = [...baseTokens];
  const consumed = new Set();

  for (let index = 0; index < baseTokens.length - 1; index += 1) {
    const left = baseTokens[index];
    const right = baseTokens[index + 1];
    if (/^[a-z]+$/.test(left) && /^\d+$/.test(right)) {
      result[index] = `${left}${right}`;
      consumed.add(index + 1);
    }
    if (/^\d+$/.test(left) && /^[a-z]+$/.test(right)) {
      result[index] = `${right}${left}`;
      consumed.add(index + 1);
    }
  }

  const canonicalTokens = result.filter((_, index) => !consumed.has(index));
  return canonicalTokens.map((token) => {
    const lettersThenNumbers = token.match(/^([a-z]+)(\d+)$/);
    const numbersThenLetters = token.match(/^(\d+)([a-z]+)$/);
    if (lettersThenNumbers) return token;
    if (numbersThenLetters)
      return `${numbersThenLetters[2]}${numbersThenLetters[1]}`;
    return token;
  });
};

const levenshtein = (left, right) => {
  const previous = Array.from(
    { length: right.length + 1 },
    (_, index) => index,
  );

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = previous[0];
    previous[0] = leftIndex;

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const above = previous[rightIndex];
      previous[rightIndex] = Math.min(
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + 1,
        diagonal + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }

  return previous[right.length];
};

const textSimilarity = (left, right) => {
  const leftTokens = tokens(left);
  const rightTokens = tokens(right);
  if (leftTokens.length === 0 || rightTokens.length === 0) return null;

  const matchedTokens = leftTokens.filter((leftToken) =>
    rightTokens.some(
      (rightToken) =>
        rightToken.includes(leftToken) ||
        levenshtein(leftToken, rightToken) <=
          Math.max(
            1,
            Math.floor(Math.min(leftToken.length, rightToken.length) / 5),
          ),
    ),
  ).length;

  return Math.round((matchedTokens / leftTokens.length) * 100);
};

const productFieldMap = {
  merek: (record) => record.nmerek || record.merek || record.nama_merek || "",
  id_kustom: (record) => record.id_kustom || "",
  tipe: (record) => record.tipe || "",
  nama: (record) => record.nama || "",
};

const getFieldValue = (record, field) => {
  if (!record || !field) return "";
  const extractor = productFieldMap[field] ?? ((row) => row[field] ?? "");
  return String(extractor(record) ?? "");
};

const normalizeFieldConfig = (fields = DEFAULT_FIELD_CONFIG) =>
  fields.map((field) => {
    if (typeof field === "string") {
      return { inputField: field, productField: field, weight: 1 };
    }
    if (Array.isArray(field)) {
      const [inputField, weight] = field;
      return { inputField, productField: inputField, weight };
    }
    return {
      inputField: field.inputField ?? field.field,
      productField: field.productField ?? field.field,
      weight: field.weight ?? 1,
    };
  });

const compareObject = (input, record, fields = DEFAULT_FIELD_CONFIG) => {
  const config = normalizeFieldConfig(fields);
  const candidates = [];

  for (const { inputField, productField, weight } of config) {
    const inputValue = input?.[inputField] ?? "";
    if (!String(inputValue ?? "").trim()) continue;

    const productInputValue = getFieldValue(record, productField);
    const productValueMatches = [productInputValue]
      .concat(
        ["nama", "merek", "id_kustom", "tipe"]
          .filter((field) => field !== productField)
          .map((field) => getFieldValue(record, field)),
      )
      .filter(Boolean);

    const bestScore = Math.max(
      ...productValueMatches
        .map((candidateValue) => textSimilarity(inputValue, candidateValue))
        .filter((value) => value != null),
      0,
    );

    if (bestScore > 0 || normalize(inputValue)) {
      candidates.push({ score: bestScore, weight });
    }
  }

  if (!candidates.length) return 0;

  const totalWeight = candidates.reduce((sum, item) => sum + item.weight, 0);
  const weightedScore =
    candidates.reduce((sum, item) => sum + item.score * item.weight, 0) /
    totalWeight;

  return Math.round(weightedScore);
};

const rankCandidates = (
  products,
  input,
  fields = DEFAULT_FIELD_CONFIG,
  limit = 8,
) =>
  products
    .map((product) => ({
      ...product,
      matchPercent: compareObject(input, product, fields),
      nameMatchPercent:
        textSimilarity(input.nama, getFieldValue(product, "nama")) ?? 0,
    }))
    .filter((product) => product.matchPercent > 0)
    .sort(
      (left, right) =>
        right.matchPercent - left.matchPercent ||
        right.nameMatchPercent - left.nameMatchPercent,
    )
    .slice(0, limit)
    .map((product) => ({
      ...product,
      matchLabel:
        product.matchPercent >= 85 && product.nameMatchPercent >= 85
          ? "Strong"
          : "Possible",
    }));

export {
  DEFAULT_FIELD_CONFIG,
  compareObject,
  levenshtein,
  normalize,
  rankCandidates,
  textSimilarity,
  tokens,
};
