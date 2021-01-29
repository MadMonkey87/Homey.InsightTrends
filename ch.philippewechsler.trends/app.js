'use strict';

const Homey = require('homey');
const { HomeyAPI } = require('athom-api');
const Stats = require('fast-stats').Stats;
const createTrend = require('trendline');

class InsightTrendsApp extends Homey.App {
  async onInit() {
    this.log('InsightTrendsApp has been initialized');

    const numberCalculatedTrigger = new Homey.FlowCardTrigger('number_trend_calculated')
    numberCalculatedTrigger
      .register()
      .registerRunListener(async (args, state) => {
        return new Promise(async (resolve, reject) => {
          resolve(args.insight.uri == state.uri && args.insight.id == state.id);
        })
      })
      .getArgument('insight')
      .registerAutocompleteListener(this.insightAutocompleteListener);

    const numberCondition = new Homey.FlowCardCondition('number_condition')
      .register()
      .registerRunListener(async (args, state) => {
        return new Promise(async (resolve, reject) => {
          try {
            const logs = await this.getLogEntries(args);
            const value = this.getValue(logs, args);
            resolve(this.compareValue(value, args));
          } catch (e) {
            this.log(e);
            reject(e);
          }
        });
      })
      .getArgument('insight')
      .registerAutocompleteListener(this.insightAutocompleteListener);

    const calculateTrendAction = new Homey.FlowCardAction('calculate_trend')
      .register()
      .registerRunListener(async (args, state) => {
        return new Promise(async (resolve, reject) => {
          try {
            const logs = await this.getLogEntries(args);

            let start = Date.now();
            const trends = createTrend(logs, 'x', 'y');
            const stats = new Stats().push(logs.map(e => e.y));
            const range = stats.range();
            const tokens = {
              min: range[0],
              max: range[1],
              amean: stats.amean(),
              median: stats.median(),
              standardDeviation: stats.σ(),
              trend: trends.slope,
              size: logs.length
            };
            this.log('calculation completed', (Date.now() - start) + ' MS', tokens);

            const state = { uri: args.insight.uri, id: args.insight.id };
            numberCalculatedTrigger.trigger(tokens, state);

            resolve();
          } catch (e) {
            this.log(e);
            reject(e);
          }
        });
      })
      .getArgument('insight')
      .registerAutocompleteListener(this.insightAutocompleteListener);
  }

  getApi() {
    if (!this.api) {
      this.api = HomeyAPI.forCurrentHomey(this.homey);
    }
    return this.api;
  }

  compareValue(value, args) {
    switch (args.operator) {
      case 'smaller': return value > args.value;
      case 'smaller_equal': return value >= args.value;
      case 'equal': return value == args.value;
      case 'not_equal': return value != args.value;
      case 'greater_equal': return value <= args.value;
      case 'greater': return value <= args.value;
      default: false;
    }
  }

  getValue(logs, args) {
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

  async getLogEntries(args) {

    const minutes = args.scope * parseInt(args.scopeUnit);
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

    Homey.app.log('minutes', minutes);
    Homey.app.log('resolution', resolution);

    let start = Date.now();
    const api = await Homey.app.getApi();
    const minDate = Date.now() - minutes * 60000;
    const entries = await api.insights.getLogEntries({ uri: args.insight.uri, id: args.insight.id, resolution: resolution });
    this.log('fetching entries completed', (Date.now() - start) + ' MS');

    start = Date.now();
    let result = [];
    for (let i = entries.values.length - 1; i >= 0; i--) {
      let entry = entries.values[i];
      const date = Date.parse(entry.t);

      if (date < minDate) {
        break;
      }
      if (entry.v) {
        result.push({ x: date / 1000, y: entry.v })
      }
    }
    this.log('transforming entries completed', (Date.now() - start) + ' MS');

    return result;
  }

  insightAutocompleteListener(query, args) {
    return new Promise(async (resolve, reject) => {
      try {
        const api = await Homey.app.getApi();
        const logs = await api.insights.getLogs({ type: 'number' });
        resolve(
          logs
            .filter(e => e.type == 'number')
            .map(e => {
              let result = { name: e.title, description: e.uriObj.name, id: e.id, uri: e.uri, type: e.type }
              if (e.uriObj.iconObj) {
                result.icon = e.uriObj.iconObj.url;
              }
              if (e.units) {
                result.name = result.name + ' (' + e.units + ')';
              }
              return result;
            })
        );
      } catch (error) {
        Homey.app.log('error fetching insights', error);
        reject(error);
      }
    });
  }

}

module.exports = InsightTrendsApp;