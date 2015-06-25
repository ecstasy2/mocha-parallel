'use strict';

var fmt = require('util').format;
var parallelizer = require('../lib/parallelizer');
require('colors');

var resultColors = {
  'passes': 'green',
  'pending': 'blue',
  'failures': 'red'
};

function repeat(str, n) {
  return new Array(n + 1).join(str);
}

var m = {
  results: [],
  totalTasks: 0,
  column: 0,
  maxColumns: 0,
  padding: '    ',

  init: function (totalTasks, workerLength) {
    m.totalTasks = totalTasks;
    m.maxColumns = Math.min(
      (process.stdout.columns || 80) - m.padding.length - 2 * ('' + totalTasks).length - 20, 80
    );

    process.stdout.write(fmt('\n%sRunning %d tests with %d parallel jobs\n', m.padding, totalTasks, workerLength));
    process.stdout.write(m.padding); // Initial padding. Padding for other rows are added in `printProgress`
  },

  progress: function (result) {
    m.results.push(result);
    [ 'passes', 'pending', 'failures' ].forEach(function (resultType) {
      var n = Math.min(m.maxColumns - m.column, result.stats[resultType]);
      var remaining = result.stats[resultType] - n;

      m.printDots(resultColors[resultType], n);

      if (m.column === m.maxColumns ) {
        m.printProgress();
        m.column = 0;
      }

      m.printDots(resultColors[resultType], remaining);
    });

  },

  epilogue: function (resultSet) {
    process.stdout.write(repeat(' ', m.maxColumns - m.column));
    m.printProgress();

    m.results.forEach(function (result) {
      result.failures.forEach(function (failure) {
        process.stdout.write('\n\n');
        process.stdout.write(m.padding + 'Failure: ' + failure.fullTitle + '\n');
        process.stdout.write(m.padding + failure.err.message.red + '\n');
        process.stdout.write(m.padding + failure.err.stack.replace(/\n/g, '\n' + m.padding, 1) + '\n');
      });
    });

    process.stdout.write('\n');
    var passing = 0, failures = 0, pending = 0;
    m.results.forEach(function (result) {
      passing += result.stats.passes;
      failures += result.stats.failures;
      pending += result.stats.pending;
    });

    process.stdout.write(m.padding + (passing + ' passing')[resultColors['passes']] + '\n');
    process.stdout.write(m.padding + (pending + ' pending')[resultColors['pending']] + '\n');
    process.stdout.write(m.padding + (failures + ' failing')[resultColors['failures']] + '\n');
  },

  printDots: function (color, n) {
    m.column += n;
    process.stdout.write(repeat('.'[color], n));
  },

  printProgress: function () {
    process.stdout.write(fmt(' Tests: %d/%d (%d %)\n' + m.padding,
      m.totalTasks - parallelizer.queue.length,
      m.totalTasks,
      Math.floor(100 * (m.totalTasks - parallelizer.queue.length) / m.totalTasks)));
  }

};

module.exports = m;
