'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.formatHistogramOrSummary = formatHistogramOrSummary;
exports.findExistingMetric = findExistingMetric;
exports.formatCounterOrGauge = formatCounterOrGauge;

var _lodash = require('lodash');

function getLabelPairs(metric) {
  var pairs = (0, _lodash.map)((0, _lodash.omit)(metric, 'value'), function (v, k) {
    return k + '="' + v + '"';
  });
  return pairs.length === 0 ? '' : '' + pairs.join(',');
}

function formatHistogramOrSummary(name, metric) {
  var bucketLabel = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'le';

  var str = '';
  var labels = getLabelPairs(metric);
  if (labels) {
    str += name + '_count{' + labels + '} ' + metric.value.count + '\n';
    str += name + '_sum{' + labels + '} ' + metric.value.sum + '\n';
  } else {
    str += name + '_count ' + metric.value.count + '\n';
    str += name + '_sum ' + metric.value.sum + '\n';
  }

  return (0, _lodash.reduce)(metric.value.entries, function (result, count, bucket) {
    if (labels) {
      str += name + '_bucket{' + bucketLabel + '="' + bucket + '",' + labels + '} ' + count + '\n';
    } else {
      str += name + '_bucket{' + bucketLabel + '="' + bucket + '"} ' + count + '\n';
    }

    return str;
  }, str);
}

function findExistingMetric(labels, values) {
  // If there are no labels, there can only be one metric
  if (!labels) {
    return values[0];
  }
  return (0, _lodash.find)(values, function (v) {
    return (0, _lodash.isEqual)((0, _lodash.omit)(v, 'value'), labels);
  });
}

function formatCounterOrGauge(name, metric) {
  var value = ' ' + metric.value.toString();
  // If there are no keys on `metric`, it doesn't have a label;
  // return the count as a string.
  if ((0, _lodash.keys)(metric).length === 1 && typeof metric.value === 'number') {
    return '' + name + value + '\n';
  }
  var pair = (0, _lodash.map)((0, _lodash.omit)(metric, 'value'), function (v, k) {
    return k + '="' + v + '"';
  });
  return name + '{' + pair.join(',') + '}' + value + '\n';
}