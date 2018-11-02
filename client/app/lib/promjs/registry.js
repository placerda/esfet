'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _lodash = require('lodash');

var _utils = require('./utils');

var _counter = require('./counter');

var _counter2 = _interopRequireDefault(_counter);

var _gauge = require('./gauge');

var _gauge2 = _interopRequireDefault(_gauge);

var _histogram = require('./histogram');

var _histogram2 = _interopRequireDefault(_histogram);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Registry = function () {
  function Registry() {
    _classCallCheck(this, Registry);

    // initialize an empty object on every metric type. only counters and gauges are supported currently.
    this.data = (0, _lodash.zipObject)(['counter', 'gauge', 'histogram'], [{}, {}, {}]);
  }

  _createClass(Registry, [{
    key: 'create',
    value: function create(type, name, help, options) {
      // check args
      if (!type || !name) {
        throw new Error('A metric type and metric name is required');
      }
      // check for name collisions
      if ((0, _lodash.has)(this.data, type + '.' + name)) {
        throw new Error('A metric with the name \'' + name + '\' already exists for type \'' + type + '\'');
      }
      switch (type) {
        case 'counter':
          this.data.counter[name] = {
            type: type,
            help: help,
            instance: new _counter2.default()
          };
          return this.data.counter[name].instance;
        case 'gauge':
          this.data.gauge[name] = {
            type: type,
            help: help,
            instance: new _gauge2.default()
          };
          return this.data.gauge[name].instance;
        case 'histogram':
          this.data.histogram[name] = {
            type: type,
            help: help,
            instance: new _histogram2.default(options)
          };
          return this.data.histogram[name].instance;
        default:
          throw new Error('No metric type specified.');
      }
    }
  }, {
    key: 'metrics',
    value: function metrics() {
      // Returns a string in the prometheus' desired format
      // More info: https://prometheus.io/docs/concepts/data_model/
      // Loop through each metric type (counter, histogram, etc);
      return (0, _lodash.reduce)(this.data, function (output, metrics, type) {
        // For each saved metric, create a help and type entry.
        output += (0, _lodash.reduce)(metrics, function (result, metric, name) {
          var values = metric.instance.collect();
          if (metric.help) {
            result += '# HELP ' + name + ' ' + metric.help + '\n';
          }
          result += '# TYPE ' + name + ' ' + type + '\n';
          // Each metric can have many labels. Iterate over each and append to the string.
          result += (0, _lodash.reduce)(values, function (str, value) {
            str += type === 'counter' || type === 'gauge' ? (0, _utils.formatCounterOrGauge)(name, value) : (0, _utils.formatHistogramOrSummary)(name, value);
            return str;
          }, '');
          return result;
        }, '');
        return output;
      }, '');
    }
  }, {
    key: 'clear',
    value: function clear() {
      (0, _lodash.each)(this.data, function (metrics) {
        (0, _lodash.each)(metrics, function (_ref) {
          var instance = _ref.instance;

          instance.resetAll();
        });
      });
      return this;
    }
  }, {
    key: 'get',
    value: function get(name) {
      var metric = (0, _lodash.find)((0, _lodash.valuesIn)(this.data), function (v) {
        return (0, _lodash.has)(v, name);
      });
      return metric ? metric[name].instance : null;
    }
  }]);

  return Registry;
}();

exports.default = Registry;