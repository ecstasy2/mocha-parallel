'use strict';

var Worker = require('./worker');

var parallelizer = {
  workerList: null,
  queue: null,
  total: 0,
  completeCount: 0,
  failures: 0,

  /**
 * Shuffles array in place.
 * @param {Array} a items The array containing the items.
 */
 shuffle: function (a) {
      var j, x, i;
      for (i = a.length; i; i--) {
          j = Math.floor(Math.random() * i);
          x = a[i - 1];
          a[i - 1] = a[j];
          a[j] = x;
      }
  },

  parallelize: function (queue, opts) {
    var workerList = [];
    parallelizer.workerList = workerList;
    parallelizer.queue = parallelizer.shuffle(queue);
    parallelizer.total = queue.length;
    parallelizer.reporter = opts.reporter;

    for (var i = 0; i < opts.parallel; i++) {
      var worker = new Worker(i, opts);
      worker.queue = queue;
      // worker.on('results', parallelizer.reporter.progress);
      worker.on('results', parallelizer.onresults);
      worker.once('complete', parallelizer.oncomplete);
      workerList.push(worker);
    }

    workerList.forEach(function (worker) {
      worker.work();
    });
  },

  onresults: function (result, stats, args) {

    console.log('\n\n');

    if (stats) {
      parallelizer.failures += (parseInt(stats.failing) ? parseInt(stats.failing) : 0);

      console.log(`${!stats.failing ? '---' : '+++'} (${stats.passing} passing, ${stats.failing} failing, ${stats.pending} pending) : ` + args + '\n\n' + result);
      return ;
    }
    console.log('+++ ' + args + '\n\n' + result);
  },

  oncomplete: function (event) {
    if (++parallelizer.completeCount !== parallelizer.workerList.length) {
      // console.log(parallelizer);
      return;
    }

    // parallelizer.reporter.epilogue();
    process.exit(Math.min(1, parallelizer.failures));
  }
};

module.exports = parallelizer;
