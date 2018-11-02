'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _lodash = require('lodash');

var _utils = require('./utils');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Collector = function () {
  function Collector() {
    _classCallCheck(this, Collector);

    this.data = [];
  }

  _createClass(Collector, [{
    key: 'set',
    value: function set(value, labels) {
      var existing = (0, _utils.findExistingMetric)(labels, this.data);
      if (existing) {
        existing.value = value;
      } else {
        this.data.push(Object.assign({}, labels, {
          value: value
        }));
      }
      return this;
    }
  }, {
    key: 'get',
    value: function get(labels) {
      return (0, _utils.findExistingMetric)(labels, this.data);
    }
  }, {
    key: 'collect',
    value: function collect(labels) {
      return (0, _lodash.filter)(this.data, (0, _lodash.matches)(labels));
    }
  }, {
    key: 'clearAll',
    value: function clearAll() {
      this.data = [];
      return this;
    }
  }]);

  return Collector;
}();

exports.default = Collector;