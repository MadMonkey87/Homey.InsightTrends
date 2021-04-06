'use strict';

const Homey = require('homey');
const { HomeyAPI } = require('athom-api');
const Stats = require('fast-stats').Stats;
const createTrend = require('trendline');

class InsightTrendsApp extends Homey.App {
  async onInit() {
    this.log('InsightTrendsApp has been initialized');

    const errorTrigger = new Homey.FlowCardTrigger('error')
    errorTrigger
      .register();

    const numberCalculatedTrigger = new Homey.FlowCardTrigger('number_trend_calculated')
    numberCalculatedTrigger
      .register()
      .registerRunListener(async (args, state) => {
        return new Promise(async (resolve, reject) => {
          resolve(args.insight.uri == state.uri && args.insight.id == state.id);
        })
      })
      .getArgument('insight')
      .registerAutocompleteListener(this.numberInsightAutocompleteListener);

    const booleanCalculatedTrigger = new Homey.FlowCardTrigger('boolean_trend_calculated')
    booleanCalculatedTrigger
      .register()
      .registerRunListener(async (args, state) => {
        return new Promise(async (resolve, reject) => {
          resolve(args.insight.uri == state.uri && args.insight.id == state.id);
        })
      })
      .getArgument('insight')
      .registerAutocompleteListener(this.booleanInsightAutocompleteListener);

    const numberCondition = new Homey.FlowCardCondition('number_condition')
      .register()
      .registerRunListener(async (args, state) => {
        return new Promise(async (resolve, reject) => {
          try {
            const logs = await this.getLogEntries(args);
            const value = this.getNumberValue(logs, args);
            resolve(this.compareNumberValue(value, args));
          } catch (e) {
            this.log(e);
            errorTrigger.trigger({ error: e.toString() });
            reject(e);
          }
        });
      })
      .getArgument('insight')
      .registerAutocompleteListener(this.numberInsightAutocompleteListener);

    const booleanCondition = new Homey.FlowCardCondition('boolean_condition')
      .register()
      .registerRunListener(async (args, state) => {
        return new Promise(async (resolve, reject) => {
          try {
            const logs = await this.getLogEntries(args);
            const value = this.getBooleanValue(logs, args);
            resolve(this.compareBooleanValue(value, args));
          } catch (e) {
            this.log(e);
            errorTrigger.trigger({ error: e.toString() });
            reject(e);
          }
        });
      })
      .getArgument('insight')
      .registerAutocompleteListener(this.booleanInsightAutocompleteListener);

    const calculateTrendAction = new Homey.FlowCardAction('calculate_trend')
      .register()
      .registerRunListener(async (args, state) => {
        return new Promise(async (resolve, reject) => {
          try {
            const logs = await this.getLogEntries(args);

            const booleanBasedCapability = args.insight.type == 'boolean';
            const state = { uri: args.insight.uri, id: args.insight.id };
            let start = Date.now();

            const stats = new Stats().push(logs.map(e => e.y));
            const range = stats.range();

            if (booleanBasedCapability) {
              const booleanTokens = {
                hasFalseValue: logs.some(e => e.y == false),
                hasTrueValue: logs.some(e => e.y == true),
                min: range[0] >= 0.5 ? true : false,
                max: range[1] >= 0.5 ? true : false,
                amean: stats.amean() >= 0.5 ? true : false,
                median: stats.median() >= 0.5 ? true : false,
                size: logs.length
              };
              this.log('boolean calculation completed', (Date.now() - start) + ' MS', booleanTokens);

              booleanCalculatedTrigger.trigger(numberTokens, state);
            } else {
              const trends = createTrend(logs, 'x', 'y');

              const numberTokens = {
                min: range[0],
                max: range[1],
                amean: stats.amean(),
                median: stats.median(),
                standardDeviation: stats.σ(),
                trend: trends.slope,
                size: logs.length
              };
              this.log('number calculation completed', (Date.now() - start) + ' MS', numberTokens);

              numberCalculatedTrigger.trigger(numberTokens, state);
            }

            resolve();
          } catch (e) {
            this.log(e);
            errorTrigger.trigger({ error: e.toString() });
            reject(e);
          }
        });
      })
      .getArgument('insight')
      .registerAutocompleteListener(this.allInsightAutocompleteListener);
  }

  getApi() {
    if (!this.api) {
      this.api = HomeyAPI.forCurrentHomey(this.homey);
    }
    return this.api;
  }

  compareNumberValue(value, args) {
    switch (args.operator) {
      case 'smaller': return value < args.value;
      case 'smaller_equal': return value <= args.value;
      case 'equal': return value == args.value;
      case 'not_equal': return value != args.value;
      case 'greater_equal': return value >= args.value;
      case 'greater': return value >= args.value;
      default: false;
    }
  }

  compareBooleanValue(value, args) {
    switch (args.operator) {
      case 'true': return value == true;
      case 'false': return value == false;
      default: false;
    }
  }

  getNumberValue(logs, args) {
    if (args.characteristic == 'trend') {
      const trends = createTrend(logs, 'x', 'y');
      return trends.slope;
    }

    const stats = new Stats().push(logs.map(e => e.y));
    switch (args.characteristic) {
      case 'min': return stats.range()[0];
      case 'max': return stats.range()[1];
      case 'average': return stats.amean();
      case 'median': return stats.median();
      case 'standardDeviation': return stats.σ();
      default: return null;
    }
  }

  getBooleanValue(logs, args) {
    const stats = new Stats().push(logs.map(e => e.y));
    switch (args.characteristic) {
      case 'hasTrueValue': return logs.some(e => e.y == true);
      case 'hasFalseValue': return logs.some(e => e.y == false);
      case 'average': return stats.amean() >= 0.5 ? true : false;
      case 'median': return stats.median() >= 0.5 ? true : false;
      default: return null;
    }
  }

  getResolution(minutes) {
    let resolution = 'lastHour';
    if (minutes <= 60) {
      resolution = 'lastHour';
    } else if (minutes <= 60 * 6) {
      resolution = 'last6Hours';
    } else if (minutes <= 60 * 24) {
      resolution = 'last24Hours';
    } else if (minutes <= 60 * 24 * 3) {
      resolution = 'last3Days';
    } else if (minutes <= 60 * 24 * 7) {
      resolution = 'last7Days';
    } else if (minutes <= 60 * 24 * 14) {
      resolution = 'last14Days';
    } else if (minutes <= 60 * 24 * 31) {
      resolution = 'last31Days';
    } else if (minutes <= 60 * 24 * 31 * 3) {
      resolution = 'last3Months';
    } else if (minutes <= 60 * 24 * 31 * 6) {
      resolution = 'last6Months';
    } else {
      resolution = 'lastYear';
    }
    return resolution;
  }

  async getLogEntries(args) {
    const minutes = args.scope * parseInt(args.scopeUnit);
    let resolution = this.getResolution(minutes);

    let start = Date.now();
    const api = await Homey.app.getApi();
    const minDate = Date.now() - minutes * 60000;

    let request = { uri: args.insight.uri, id: args.insight.id };
    if (!args.booleanBasedCapability) {
      request.resolution = resolution;
    }
    const entries = await api.insights.getLogEntries(request);
    this.log('fetching entries completed', (Date.now() - start) + ' MS');

    const booleanBasedCapability = args.insight.type == 'boolean';

    start = Date.now();
    let result = [];
    for (let i = entries.values.length - 1; i >= 0; i--) {
      let entry = entries.values[i];
      const date = Date.parse(entry.t);

      if (date < minDate) {
        break;
      }
      if (entry.v != null) {
        result.push({ x: date / 1000, y: booleanBasedCapability ? entry.v ? 0 : 1 : entry.v });
      }
    }
    this.log('transforming entries completed', (Date.now() - start) + ' MS');

    return result;
  }

  numberInsightAutocompleteListener(query, args) {
    return Homey.app.insightAutocompleteListener(query, args, { type: 'number' });
  }

  booleanInsightAutocompleteListener(query, args) {
    return Homey.app.insightAutocompleteListener(query, args, { type: 'boolean' });
  }

  allInsightAutocompleteListener(query, args) {
    return Homey.app.insightAutocompleteListener(query, args, {});
  }

  insightAutocompleteListener(query, args, filter) {
    return new Promise(async (resolve, reject) => {
      try {
        const api = await Homey.app.getApi();
        const logs = await api.insights.getLogs(filter);
        resolve(
          logs
            .filter(e => !filter.type || e.type == filter.type)
            .map(e => {
              let result = { name: e.title, description: e.uriObj.name, id: e.id, uri: e.uri, type: e.type, booleanBasedCapability: e.type == 'boolean' }
              if (e.uriObj.iconObj) {
                result.icon = e.uriObj.iconObj.url;
              }
              if (e.units) {
                result.name = result.name + ' (' + e.units + ')';
              }
              return result;
            })
            .sort((i, j) =>
              ('' + i.description).localeCompare(j.description)
            )
        );
      } catch (error) {
        Homey.app.log('error fetching insights', error);
        reject(error);
      }
    });
  }

  async getInsights(search, callback) {
    try {
      const api = await Homey.app.getApi();
      const logs = await api.insights.getLogs({});
      callback(null,
        logs
          .filter(e => search == null || search == '' || (e.title && e.title.toLowerCase().search(search.toLowerCase()) >= 0) || (e.uriObj && e.uriObj.name && e.uriObj.name.toLowerCase().search(search.toLowerCase()) >= 0))
          .map(e => {
            let result = { name: e.title, description: e.uriObj.name, id: e.id, uri: e.uri, type: e.type, units: e.units, booleanBasedCapability: e.type == 'boolean', color: '#062f42' }
            if (e.uriObj.color) {
              result.color = e.uriObj.color;
            }
            if (e.uriObj.iconObj) {
              result.icon = e.uriObj.iconObj.url;
            }
            if (e.units) {
              result.name = result.name + ' (' + e.units + ')';
            }
            return result;
          })
          .sort((i, j) => i.title < j.title)
      );
    } catch (error) {
      Homey.app.log('error fetching insights', error);
      callback(error, null);
    }
  }

  async getTrends(id, uid, minutes, scopeUnit, callback) {
    try {
      let result = {
        entries: [],
        booleanBasedCapability: false,
        trendline: [],
        performance: {
          total: Date.now(),
          calculation: 0,
          fetchInsight: 0,
          fetchLogEntries: 0
        }
      };

      const resolution = this.getResolution(minutes);

      const api = await Homey.app.getApi();
      const minDate = Date.now() - minutes * 60000;

      result.performance.fetchInsight = Date.now();
      const entry = await api.insights.getLog({ uri: uid, id: id });
      result.performance.fetchInsight = Date.now() - result.performance.fetchInsight;
      result.lastValue = entry.lastValue;

      result.booleanBasedCapability = entry.type == 'boolean';

      let request = { uri: uid, id: id };
      if (!result.booleanBasedCapability) {
        request.resolution = resolution;
      }
      result.performance.fetchLogEntries = Date.now();
      const entries = await api.insights.getLogEntries(request);
      result.performance.fetchLogEntries = Date.now() - result.performance.fetchLogEntries;

      result.performance.calculation = Date.now();

      for (let i = entries.values.length - 1; i >= 0; i--) {
        let entry = entries.values[i];
        const date = Date.parse(entry.t);

        if (date < minDate) {
          break;
        }
        if (entry.v != null) {
          result.entries.push({ x: date, y: result.booleanBasedCapability ? entry.v ? 0 : 1 : entry.v });
        }
      }

      const stats = new Stats().push(result.entries.map(e => e.y));
      const range = stats.range();

      if (result.entries.length > 2) {
        const trends = createTrend(result.entries, 'x', 'y');
        const distance = result.entries[0].x - result.entries[result.entries.length - 1].x;
        result.trend = trends.slope * distance / (minutes / scopeUnit);
        result.trendline.push({ x: result.entries[0].x, y: trends.calcY(result.entries[0].x) });
        result.trendline.push({ x: result.entries[result.entries.length - 1].x, y: trends.calcY(result.entries[result.entries.length - 1].x) });
      } else {
        result.trend = 0;
      }

      if (result.booleanBasedCapability) {
        result.hasFalseValue = result.entries.some(e => e.y == false);
        result.hasTrueValue = result.entries.some(e => e.y == true);
        result.amean = stats.amean() >= 0.5 ? true : false;
        result.median = stats.median() >= 0.5 ? true : false;
        result.standardDeviation = stats.σ();
        result.size = result.entries.length;
      } else {
        result.min = range[0];
        result.max = range[1];
        result.amean = stats.amean();
        result.median = stats.median();
        result.standardDeviation = stats.σ();
        result.size = result.entries.length;
        result.hasFalseValue = false;
        result.hasTrueValue = false;
      }
      result.performance.calculation = Date.now() - result.performance.calculation;
      result.performance.total = Date.now() - result.performance.total;
      callback(null, result);
    } catch (error) {
      Homey.app.log('error fetching insights', error);
      callback(error, null);
    }
  }

}

module.exports = InsightTrendsApp;