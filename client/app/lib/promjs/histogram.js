'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _lodash = require('lodash');

var _mixins = require('./mixins');

var _collector = require('./collector');

var _collector2 = _interopRequireDefault(_collector);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function findBucket(ary, num) {
  var max = Math.max.apply(null, ary);
  var min = Math.min.apply(null, ary);
  // Lower than the smallest bucket
  if (num < min) {
    return null;
  }
  // Equals the smallest bucket
  if (num === min) {
    return min;
  }
  // Bigger/equal to the the largest bucket.
  if (num >= max) {
    return max;
  }

  // This works because histogram bucket arrays are sorted smallest to largest.
  for (var i = 0; i < ary.length; i += 1) {
    var bound = ary[i];
    var next = ary[i + 1];
    // End of the array;
    if (!next) {
      return max;
    }

    if (bound === num) {
      return bound;
    } else if (bound < num && num < next) {
      return bound;
    }
  }
}

function getInitialValue(buckets) {
  // Make the skeleton to which values will be saved.
  var entries = (0, _lodash.reduce)(buckets, function (result, b) {
    result[b.toString()] = 0;
    return result;
  }, {});

  return {
    sum: 0,
    count: 0,
    entries: entries,
    raw: []
  };
}

var Histogram = function (_Collector) {
  _inherits(Histogram, _Collector);

  function Histogram(buckets) {
    _classCallCheck(this, Histogram);

    // Sort to get smallest -> largest in order.
    var _this = _possibleConstructorReturn(this, (Histogram.__proto__ || Object.getPrototypeOf(Histogram)).call(this));

    var sorted = buckets.sort(function (a, b) {
      return a > b ? 1 : -1;
    });
    _this.buckets = sorted;
    _this.set(getInitialValue(_this.buckets));
    _this.observe = _this.observe.bind(_this);
    return _this;
  }

  _createClass(Histogram, [{
    key: 'observe',
    value: function observe(value, labels) {
      var metric = this.get(labels);
      if (!metric) {
        //Create a metric for the labels.
        metric = this.set(getInitialValue(this.buckets), labels).get(labels);
      }
      metric.value.raw.push(value);
      var bucket = findBucket(this.buckets, value);
      if (bucket) {
        var val = metric.value.entries[bucket.toString()];
        metric.value.entries[bucket.toString()] = val + 1;
      }

      metric.value.sum = (0, _lodash.sum)(metric.value.raw);
      metric.value.count += 1;
      return this;
    }
  }, {
    key: 'reset',
    value: function reset(labels) {
      this.set(getInitialValue(this.buckets), labels);
      return this;
    }
  }, {
    key: 'resetAll',
    value: function resetAll() {
      return _mixins.resetAll.call(this);
    }
  }]);

  return Histogram;
}(_collector2.default);

exports.default = Histogram;