#!/usr/bin/env node

var packageDescriptor = require('./package.json')
var fs = require('fs')
var path = require('path')
var cp = require('child_process')
require('colors')
var log = console.log.bind(console, 'RayCmd - {DEV}:'.red)
var chokidar = require('chokidar')
var kill = require('tree-kill')
var program = require('commander')
var grConfig = {}
var GOSUFFIX = '.go'

program
  .version(packageDescriptor.version)
  .arguments('<cwdpath>')
  // .option('-m, --match <match>', 'regex')
  .action(function(cwdpath) {
    grConfig.path = cwdpath
  })

program
  .command('run [goFile] [restGoFiles...]')
  .action(function(goFile, restGoFiles) {
    grConfig.goFiles = [goFile].concat(restGoFiles).filter(function(x) {return x})
  })

program.parse(process.argv)

var base = grConfig.path || process.cwd()
var cwdGoFiles = fs.readdirSync(base).filter(function(fileName) {
  if (fileName.substring(fileName.length - 3) !== GOSUFFIX) {
    return
  }
  var fileStat = fs.statSync(path.join(base, fileName))
  return fileStat.isFile() // that must be read file, not symbol link
})

if (!grConfig.goFiles || !grConfig.goFiles.length) {
  grConfig.goFiles = cwdGoFiles
}

// console.info(grConfig.goFiles)
//
// process.exit(-1)

if (!grConfig.goFiles || !grConfig.goFiles.length) {
  console.error('no any go file supply')
  process.exit(1)
}

var watcher = chokidar.watch(path.join(base, './**/*.go'))

// var gorunshell
var goRun = function () {
  gorunshell = cp.exec(
    'go run ' + grConfig.goFiles.join(' '),
    {}/*options, [optional]*/,
    function (error, stdout, stderr) {
      if (stderr && error !== null) {
        log('stdout: ', stdout)
        log('stderr: ', stderr)
        console.info(error)
        log('exec error: ', error)
      } else {
        log('♪ Go Server Restarted'.green)
      }
    }
  )

  gorunshell.stdout.on('data', function (data) {
    log('stdout: ' + data)
  })

  gorunshell.stderr.on('data', function (data) {
    log('stderr: ' + data)
  })

  gorunshell.on('exit', function (code) {
    log('child process exited with code ' + code)
  })
}

var goReload = function () {
  kill(gorunshell.pid, 'SIGTERM', function () {
    console.info('killed')
    goRun()
  })
}

var watchCb = function (logmessage) {
  return function(absPath) {
    log(logmessage)
    goReload()
  }
}

watcher.on('ready', function () {
  log('Start...'.green)
  goRun()
  watcher
    .on('add', watchCb('add'))
    .on('change', watchCb('change'))
    .on('unlink', watchCb('unlink'))
})
