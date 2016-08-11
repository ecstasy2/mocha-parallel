'use strict';

var util = require('util');
var EventEmitter = require('events').EventEmitter;
var spawn = require('child_process').spawn;
var XRegExp = require('xregexp');

function Worker(index, opts) {
  EventEmitter.call(this);
  this.debug = require('debug')('worker:' + index);

  this.cwd = opts.cwd || null;
  this.env = opts.env || null;
  this.queue = opts.queue || null;
  this.isBusy = false;
  for (var key in opts) {
    this[key] = opts[key];
  }
}

// var stdout = `
//
//
//   154 passing (2m)
//   9 pending
// `;

// var regex = new XRegExp('(?<passing>\\d+) passing \\(\\d+[s|m]\\)\\W+((?<pending>\\d+) pending)?\\W+((?<failing>\\d+) failing)?');
// var stats = XRegExp.exec(stdout, regex);
// console.log(stats);

util.inherits(Worker, EventEmitter);

module.exports = Worker;

Worker.prototype.work = function () {
  if (!this.queue || this.queue.length === 0) {
    this.isBusy = false;
    return this.emit('complete');
  }

  this.isBusy = true;
  var next = this.queue.pop().split(' ');
  var command = next[0];
  var args = next.slice(1).filter(function (arg) {
    return !/^\s*$/.test(arg);
  });

  // args.push('--reporter', 'json');

  var opts = {};
  if (this.cwd) {
    opts.cwd = this.cwd;
  }

  if (this.env) {
    opts.env = this.env;
  }

  this.debug(
    'command: %s %s in %s',
    command,
    args.join(' '),
    this.cwd
  );
  var mocha = spawn(command, args, opts);

  var stdout = '';
  mocha.stdout.on('data', function (data) {
    stdout += data;
  });

  mocha.stderr.on('data', function (data) {
    // console.error(data.toString());
  });

  mocha.on('error', function (error) {
    this.debug('error: ', error);
    console.error('error: ' + error);
  }.bind(this));

  mocha.on('close', function () {
    this.debug(
      'complete: %s %s in %s',
      command,
      args.join(' '),
      this.cwd
    );

    var regex = new XRegExp('(?<passing>\\d+) passing \\(\\S+\\)\\W+((?<pending>\\d+) pending)?\\W+((?<failing>\\d+) failing)?');
    var stats = XRegExp.exec(stdout, regex);
    if (stats) {
      stats = {
        passing: stats.passing,
        pending: stats.pending || 0,
        failing: stats.failing || 0,
      };
    }
    else {
      stats = {};
    }

    this.emit('results', stdout, stats, args.join(' '));
    this.work();
  }.bind(this));
};
