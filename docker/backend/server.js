'use strict';

const express = require('express');
const Influx = require('influx');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const redis   = require("redis");
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const redis_host = "redis";
const influxdb_host = "influxdb";


// Constants
const PORT = 8080;
const HOST = '0.0.0.0';

//inicializa conexão com o Influx
const influx = new Influx.InfluxDB({
 host: influxdb_host,
 database: 'mydash',
 schema: [
   {
     measurement: 'client_quality',
     fields: {
       representation: Influx.FieldType.INTEGER,
       bitrate: Influx.FieldType.INTEGER
     },
     tags: [
       'client',
       'client_short'
     ]
   }
 ]
})

// App
const app = express();
app.use(cookieParser());
let client  = redis.createClient("redis://" + redis_host + ":6379");
app.use(session({
    store: new RedisStore({ host: redis_host, port: 6379, client: client,ttl :  720}),
    secret: 'anything',
    saveUninitialized: false,
    resave: false
}));
// app.use(session({secret: "this-is-my-secret"}));
app.use(bodyParser.json({ type: 'application/json' }));

app.get('/', (req, res) => {
  res.send('mydash backend\n');
});

// Metrics Router
var metricsRouter = express.Router();
metricsRouter.post('/', function(req, res) {

  req.session.dummy = "1";

  if (req.body.type == "video"){
    let fields = req.body.fields;
    let momento = Date.now() * 1000000;

    // adiciona informações básicas na seção
    req.session.representation = fields.representation;
    req.session.bitrate = fields.bitrate;
    // req.session.save()

    // gera o log
    influx.writePoints([
      {
        measurement: 'client_quality',
        tags: { client: req.sessionID, client_short: req.sessionID.substring(0,4)},
        fields: fields,
        //timestamp: req.body.time
        timestamp: momento
      }
    ]).catch(err => {
      console.error(`Error saving data to InfluxDB! ${err.stack}`)
    })
  }

  res.send({ status: 'SUCCESS' });
});
app.use("/metrics", metricsRouter);


app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);

module.exports = app;
