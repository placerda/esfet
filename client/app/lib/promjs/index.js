'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = prom;

var _registry = require('./registry');

var _registry2 = _interopRequireDefault(_registry);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function prom() {
  return new _registry2.default();
}