const HttpError = require('http-errors');
const flatten = require('flattenjs');

exports.getTextQuery = () => ({});
exports.getFilters = (filters = {}) => {
  const flat = Object.keys(flatten.convert(filters));
  if (flat.some(v => v.includes('$'))) throw new HttpError(400, 'unsafe query parameter');
  return filters;
};
exports.getRegexQuery = () => ({});
exports.getRangeQuery = () => ({});
exports.getSort = (sort, order) => {
  if (!sort) return {};
  const r = {
    [sort]: order === 'desc' ? -1 : 1,
  };
  return r;
};
exports.populate = result => result;
exports.getQuery = (query = '{}') => {
  try {
    return JSON.parse(query);
  } catch (err) {
    throw new HttpError(400, "INVALID '$query' parameter");
  }
};
exports.getNumber = (number, def = 0) => {
  const r = parseInt(number, 10);
  if (Number.isNaN(r)) return def;
  return r;
};
