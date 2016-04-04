'use strict';

// Vendor dependencies.
const bodyParser = require('body-parser')
const express    = require('express')
const tdtool     = require('./lib/tdtool')
// Get our Express JS app up and running.
const app = express();

// Makes sure that the body attribute of the request object is a javascript
// object and not a JSON formatted string.
app.use(bodyParser.json());

app.get('/devices', (req, res) => {
  tdtool.listDevices().then(json => res.json(json))
})

app.listen(80, '0.0.0.0');
