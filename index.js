'use strict';

// Vendor dependencies.
const confParser = require('tellstick.conf-parser')
const bodyParser = require('body-parser')
const express    = require('express')
const fs         = require('fs')
const _          = require('underscore')

// Local modules
const tdtool     = require('./lib/tdtool')

// Configuration
const CONF_FILE = `/etc/tellstick.conf`

// Utility
const maxID = devices => _.max(devices, d => d.id).id
const fetchProtocol = device => 'archtech'
const archivePath = () =>
  `${__dirname}/config_history/${Date.now()}_tellstick.conf`
const archiveAndSave = config => new Promise((resolve, reject) => {
  fs.rename(CONF_FILE, archivePath(), err => {
    if (err) return reject(err)
    confParser.write(CONF_FILE, Object.assign(config, {
      devices: config.devices.map(device => _.pick(
        device, 'id', 'name', 'protocol', 'model', 'parameters'))
    }))
    .then(() => tdtool.restart())
    .then(resolve, reject)
  })
})

// Get our Express JS app up and running.
const app = express();

// Makes sure that the body attribute of the request object is a javascript
// object and not a JSON formatted string.
app.use(bodyParser.json());

app.get('/devices', (req, res) => {
  tdtool.listDevices().then(devices =>
    res.status(200).json(devices)
  , reason => {
    res.status(500).send(reason)
  })
})

app.get('/devices/:id', (req, res) => {
  tdtool.device(parseInt(req.params.id)).then(
    device => res.status(200).json(device),
    reason => res.sendStatus(404))
})

app.post('/devices', (req, res) => {
  confParser.parse(CONF_FILE).then(conf => {
    const entry = Object.assign(
      _.pick(req.body, 'name', 'model', 'parameters'), {
        id: maxID(conf.devices) + 1,
        protocol: fetchProtocol(req.body)
      })

    return archiveAndSave(Object.assign({}, conf, {
      devices: conf.devices.concat(entry)
    })).then(() => entry)
  }).then(
    addition => res.status(201).json(addition),
    reason   => res.status(500).send(reason))
})

app.patch('/devices/:id', (req, res) => {
  tdtool.device(parseInt(req.params.id, 10))
  .catch(() => res.sendStatus(404))
  .then(device => {
    const entry = Object.assign(
      device, _.pick(req.body, 'name', 'model', 'parameters'))
    entry.protocol = fetchProtocol(req.body)

    return confParser.parse(CONF_FILE).then(conf =>
      archiveAndSave(Object.assign({}, conf, {
        devices: conf.devices.map(d => d.id === entry.id ? entry : d)
      })).then(() => entry))
  }).then(
    updated => res.status(200).json(updated),
    reason  => res.status(500).send(reason))
})

app.delete('/devices/:id', (req, res) => {
  tdtool.device(parseInt(req.params.id, 10))
  .catch(() => res.sendStatus(404))
  .then(device => {
    return confParser.parse(CONF_FILE).then(conf =>
      archiveAndSave(Object.assign({}, conf, {
        devices: conf.devices.filter(d => d.id != device.id)
      })).then(() => device))
  }).then(
    deletion => res.status(200).json(deletion),
    reason   => res.status(500).send(reason))
})

app.post('/devices/:id/:action', (req, res) => {
  tdtool.run(`--${req.params.action}`, req.params.id).then(() => {
    res.sendStatus(200)
  })
})

app.listen(80, '0.0.0.0');
