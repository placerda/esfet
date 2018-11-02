'use strict';

const redis = require("redis");
const Influx = require("influx");
const bunyan = require("bunyan");
const env = require('dotenv').config()
const log = bunyan.createLogger({name: "metrics"});

// constants
const INTERVAL = 1000; //in ms
const BANDWIDTH = process.env.BANDWIDTH * 1024 * 1024; //in bps
const ACTIVE_SESSIONS_NANO_RANGE = 12000000000; //interval to consider active sessions (12 seconds)
const SWITCH_STEPS_NANO_RANGE = 20000000000; // interval used to get last switch_steps (must be higher than ACTIVE_SESSIONS_RANGE)
const INFLUXDB_HOST = "influxdb";

//influx
const influx = new Influx.InfluxDB({
 host: INFLUXDB_HOST,
 database: 'mydash',
 schema: [
   {
     measurement: 'system_quality',
     fields: {
       inefficiency: Influx.FieldType.FLOAT,
       unfairness: Influx.FieldType.FLOAT,
       instability: Influx.FieldType.FLOAT,
       last_client: Influx.FieldType.STRING
     },
     tags: [
       'type'
     ]
   }
 ]
})

influx.createDatabase('mydash')

function execute(){

    let momento = Date.now() * 1000000; // times 1000000 because of influxdb uses nanoseconds as default
    let range = momento - (SWITCH_STEPS_NANO_RANGE); // range to get all records to be included in the instability metric calculation
    let active_range = momento - ACTIVE_SESSIONS_NANO_RANGE ; // range to consider sessions as active (must be lower than the range above)
    let query = `select client, client_short, bitrate, time from client_quality where time >= ${range} order by time desc`
    let all_records = [];
    let active_sessions = [];
    influx.query(query).then(result => {
      all_records = result;
      active_sessions = all_records.filter((element, index, self) =>  // filter to keep only the last record of each client session
           (index === self.findIndex((t) => ((t.client === element.client))) &&
           (element.time.getNanoTime() > active_range)))
      if (active_sessions.length > 0){
        log.info ("active sessions: " + active_sessions.length);
        let ineff = inefficiency(active_sessions);
        let unfair = unfairness(active_sessions);
        let insta = instability(all_records, momento);
        log.debug ("inefficiency: " + ineff);
        log.debug ("unfairness: " + unfair);
        log.debug ("instability: " + insta);

        // grava a metrica no momento atual.
        influx.writePoints([
          {
            measurement: 'system_quality',
            tags: { type: 'video'},
            fields: {inefficiency: ineff, unfairness: unfair, instability: insta},
            timestamp: momento
          }
        ]).catch(err => {
          log.error(`Error saving data to InfluxDB! ${err.stack}`)
        })
      }
    }).catch(err => {
      log.error(err.stack)
    })

   return 0;
}

function inefficiency(active_sessions){
    log.info("## inefficiency");
    let sum = active_sessions.reduce( (previous, elem) => { return previous + elem.bitrate; }, 0 );
    log.info ("sum_bitrates: " + sum);
    log.info ("bandwidth: " + BANDWIDTH);
    if (sum > BANDWIDTH) {
        log.warn("BANDWIDTH constant (", BANDWIDTH, ") is lower than the sum of the bitrates (", sum, ").");
        sum = BANDWIDTH;
    }
    let result = Math.abs(sum - BANDWIDTH)/BANDWIDTH;
    log.info("inefficiency: " + result);
    return (result);
}

function unfairness(active_sessions){
  log.info("## unfairness");
  let n = active_sessions.length;
  let sum = active_sessions.reduce( (previous, elem) => { return previous + elem.bitrate; }, 0 );
  let sum_quad = active_sessions.reduce( (previous, elem) => { return previous + (elem.bitrate * elem.bitrate); }, 0 );
  let jain_fair = (sum * sum) / (n * (sum_quad))
  let result = Math.sqrt(1 - jain_fair);
  log.info("jain_fair: " + jain_fair);
  log.info("unfairness: " + result);
  return result;
}

function instability(all_records, momento){
  log.info("## instability");
  let numerator  = switchsteps_sum(all_records, momento);
  let denominator = bitrates_sum(all_records, momento);
  if (denominator == 0){
    msg = "division by zero when calculating instability";
    log.error(msg);
    throw new Error(msg);
  }
  let result = numerator/denominator;
  log.info("instability: " + result);
  return result;
}

function switchsteps_sum(all_records, momento){
  let momentoms = Math.trunc(momento / 1000000); // uses miliseconds to avoid going over Javascript maximum number
  let clients = all_records.filter((element, index, self) =>  // get unique clients in the time range
              index === self.findIndex((t) => ((t.client === element.client))))
  let sum = 0;
  for (let i = 0; i < clients.length; i++){
    let prev = -1;
    for (let cur = 0; cur < all_records.length; cur++ ){
      if (clients[i].client == all_records[cur].client){
        if (prev == -1) prev = cur;
        else if (all_records[prev].bitrate != all_records[cur].bitrate){
          let w = Math.trunc(SWITCH_STEPS_NANO_RANGE / 1000000 ) - (momentoms - all_records[prev].time.getTime());
          sum = sum + (Math.abs(all_records[prev].bitrate - all_records[cur].bitrate) * w);
          prev = cur;
        }
      }
    }
  }
  log.info("switchsteps_sum: " + sum);
  return sum;
}

function bitrates_sum(all_records, momento){
  let sum = 0;
  let momentoms = Math.trunc(momento / 1000000); // uses miliseconds to avoid going over Javascript maximum number
  for (let cur = 0; cur < all_records.length; cur++ ){
        log.info("cur: " + cur);
        log.info("momentoms: " + momentoms);
        let w = Math.trunc(SWITCH_STEPS_NANO_RANGE / 1000000) - (momentoms - all_records[cur].time.getTime());
        sum = sum + (all_records[cur].bitrate * w);
        log.info("w: " + w);
        log.info("sum: " + sum);
      }
      log.info("bitrates_sum: " + sum);
      return sum;
  }

setInterval(execute, INTERVAL);
