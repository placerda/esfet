'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _collector = require('./collector');

var _collector2 = _interopRequireDefault(_collector);

var _mixins = require('./mixins');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Gauge = function (_Collector) {
  _inherits(Gauge, _Collector);

  function Gauge(name, help) {
    _classCallCheck(this, Gauge);

    // this.set(0);
    var _this = _possibleConstructorReturn(this, (Gauge.__proto__ || Object.getPrototypeOf(Gauge)).call(this, 'gauge', name, help));

    _this.inc = _this.inc.bind(_this);
    _this.dec = _this.dec.bind(_this);
    _this.add = _this.add.bind(_this);
    _this.sub = _this.sub.bind(_this);
    return _this;
  }

  _createClass(Gauge, [{
    key: 'inc',
    value: function inc(labels) {
      return _mixins.add.call(this, 1, labels);
    }
  }, {
    key: 'dec',
    value: function dec(labels) {
      var metric = this.get(labels);
      this.set(metric ? metric.value - 1 : 0, labels);
      return this;
    }
  }, {
    key: 'add',
    value: function add(amount, labels) {
      return _mixins.add.call(this, amount, labels);
    }
  }, {
    key: 'sub',
    value: function sub(amount, labels) {
      var metric = this.get(labels);
      this.set(metric ? metric.value - amount : 0, labels);
      return this;
    }
  }, {
    key: 'reset',
    value: function reset(labels) {
      return _mixins.resetCounter.call(this, labels);
    }
  }, {
    key: 'resetAll',
    value: function resetAll() {
      return _mixins.resetAll.call(this);
    }
  }]);

  return Gauge;
}(_collector2.default);

exports.default = Gauge;