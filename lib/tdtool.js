'use strict'

const confParser = require('tellstick.conf-parser')

const LINE_DELIMETER = '\n'
const PAIR_DELIMETER = '\t'

const exec = require('child_process').exec;

const execute = cmd => new Promise((resolve, reject) => {
  exec(cmd, (err, stdout, stderr) => err ? reject(stderr) : resolve(stdout))})

/**
 * Wrapper for CMD interaction with
 * @type {Object}
 */
const TDtool = {
  isInstalled: () => execute('command -v tdtool').catch(() => Promise.reject(
    '"tdtool" does not seem to be installed, but is required by this plugin.'
  )),

  listDevices: () => {
    return TDtool.isInstalled().then(() =>
      execute('tdtool --list-devices')
    ).then(deviceString => {
      return confParser.parse('/etc/tellstick.conf').then(conf => {
        return deviceString
          .split(LINE_DELIMETER)
          .map(line =>
            line.split(PAIR_DELIMETER).reduce((obj, unparsedPair) => {
              const pair = unparsedPair.split('=')
              if (pair[0])
                obj[pair[0]] = pair[0] === 'id' ? parseInt(pair[1]) : pair[1]
              return obj
            }, {}))
          .filter(device => !!device.id && device.type === 'device')
          .map(device => Object.assign(
            conf.devices.find(confDev => confDev.id === device.id), device))
      })
    })
  },

  restart: () => execute('/etc/init.d/telldusd restart'),

  device: id => TDtool.listDevices().then(
    devices => devices.find(d => d.id === id) || Promise.reject('not_found')),

  run: (cmd, target) => TDtool.isInstalled().then(() =>
    execute(`tdtool ${cmd} ${target}`)),

  /**
   * Shorthand methods for running a command on a Device with the given
   * Device ID.
   *
   * @param  {[type]} TDtool [description]
   * @param  {[type]} '--on' [description]
   * @return {[type]}        [description]
   */
  on:  id => TDtool.run('--on', id),
  off: id => TDtool.run('--off', id),
  dim: id => TDtool.run('--dim', id),
  dimlevel: level => TDtool.run('--dimlevel', level),
}

module.exports = TDtool
