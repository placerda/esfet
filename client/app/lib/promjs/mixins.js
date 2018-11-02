'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.add = add;
exports.resetCounter = resetCounter;
exports.resetAll = resetAll;

var _lodash = require('lodash');

function add(amount, labels) {
  if (typeof amount !== 'number') {
    throw new Error('Expected ' + amount + ' to be a number. Check the arguments to \'increment\'');
  }

  if (amount < 0) {
    throw new Error('Expected increment amount to be greater than -1. Received: ' + amount);
  }
  var metric = this.get(labels);
  this.set(metric ? metric.value + amount : amount, labels);
  return this;
}

function resetCounter(labels) {
  this.set(0, labels);
  return this;
}

function resetAll() {
  var _this = this;

  (0, _lodash.each)(this.data, function (d) {
    _this.reset((0, _lodash.omit)(d, 'value'));
  });
  return this;
}