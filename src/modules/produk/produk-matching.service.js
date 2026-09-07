const MATCH_THRESHOLD = 60;
const STRONG_MATCH_THRESHOLD = 85;

const normalize = (value = "") =>
  String(value)
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

const compareProduct = (input, product) => {
  const fields = [
    ["nama", 0.6],
    ["merek", 0.2],
    ["tipe", 0.2],
  ];
  const productValues = fields.map(([field]) =>
    field === "merek" ? product.nmerek || product.merek : product[field],
  );
  const scores = fields
    .map(([field, weight]) => {
      const inputValue = input[field];
      const score = Math.max(
        ...productValues
          .map((productValue) => textSimilarity(inputValue, productValue))
          .filter((value) => value != null),
        0,
      );
      if (score === 0 && !normalize(inputValue)) return null;
      return score == null ? null : { field, score, weight };
    })
    .filter(Boolean);

  if (scores.length === 0) return 0;

  const weightTotal = scores.reduce((total, item) => total + item.weight, 0);
  let score =
    scores.reduce((total, item) => total + item.score * item.weight, 0) /
    weightTotal;

  return Math.round(score);
};

export const findProductCandidates = (products, input, limit = 8) =>
  products
    .map((product) => ({
      ...product,
      matchPercent: compareProduct(input, product),
      nameMatchPercent: textSimilarity(input.nama, product.nama) ?? 0,
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
        product.matchPercent >= STRONG_MATCH_THRESHOLD &&
        product.nameMatchPercent >= STRONG_MATCH_THRESHOLD
          ? "Strong"
          : "Possible",
    }));

export { MATCH_THRESHOLD, STRONG_MATCH_THRESHOLD, compareProduct, normalize };
