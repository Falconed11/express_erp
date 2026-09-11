import {
  DEFAULT_FIELD_CONFIG,
  compareObject,
  normalize,
  rankCandidates,
  textSimilarity,
} from "../similarity/similarity.service.js";

const MATCH_THRESHOLD = 60;
const STRONG_MATCH_THRESHOLD = 85;

const compareProduct = (input, product) => compareObject(input, product);
const findProductCandidates = (products, input, limit = 8) =>
  rankCandidates(products, input, DEFAULT_FIELD_CONFIG, limit);

export { MATCH_THRESHOLD, STRONG_MATCH_THRESHOLD, compareProduct, normalize };
export { findProductCandidates, textSimilarity };
