/*jshint node:true, unused:true */

'use strict';

/**
 * Node code modules
 */
var http = require('http');
var path = require('path');
var os = require('os');
var spawn = require('child_process').spawn;


/**
 * npm packaged modules
 */
var _ = require('lodash');
var gulp = require('gulp');
var gutil = require('gulp-util');
var runSequence = require('run-sequence');
var through = require('through2');
var del = require('del');
var sass = require('gulp-sass');
var sourcemaps = require('gulp-sourcemaps');
var livereload = require('gulp-livereload');
var prettyHrtime = require('pretty-hrtime');
var chalk = require('chalk');
var connect = require('connect');
var connectLiveReload = require('connect-livereload');
var serveStatic = require('serve-static');


/**
 * Constants
 */
var LOCAL_PORT = 9001;
var SRC_DIR = './source';
var BUILD_DIR = './build';
var SASS_DIR = './sass';
var SASS_FILES = './sass/**/*.scss';
var PHP_FILES = path.join(SRC_DIR, '**/*.php');
var STATIC_ASSETS = [
  path.join(SRC_DIR, '**'),   // everything...
  '!' + PHP_FILES             // ...except PHP_FILES
];


/**
 * sass compiles SCSS source files to CSS
 */
gulp.task('sass', function() {
  var sassErrorReporter = function(err) {
    err = err.match(/([^:]+):(\d+):(\d*)\s*(.*)/);
    err = _.zipObject(['input', 'abspath', 'line', 'char', 'message'], err);
    err.path = path.relative(process.cwd(), err.abspath);
    gutil.log(
      chalk.red('Sass Error:'),
      chalk.magenta(err.path) + ':' +
      chalk.cyan(err.line) + ':' +
      chalk.cyan(err.char),
      err.message
    );
  };

  // return gulp.src(path.join(SASS_DIR, '**/*.scss'))
  return gulp.src(SASS_FILES)
    .pipe(sourcemaps.init())
    .pipe(sass({
      outputStyle: 'compressed',
      onError: sassErrorReporter
    }))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(path.join(BUILD_DIR, 'css')))
    .on('data', function(data) {
      gutil.log('Sass: compiled', chalk.magenta(data.relative));
    });
});


/**
 * clean removes the build directory
 */
gulp.task('clean', function(cb) {
  del(BUILD_DIR, cb);
});


/**
 * copies STATIC_ASSETS to BUILD_DIR using relative paths (so things stay nested)
 */
gulp.task('copy', function() {
  gulp.src(STATIC_ASSETS, {base: SRC_DIR}) // base tells gulp to copy with relative paths
    .pipe(gulp.dest(BUILD_DIR));
});


/**
 * build just lumps together other tasks: clean, then php, sass and copy
 */
gulp.task('build', function(cb) {
  runSequence('clean', 'copy', ['php', 'sass'], cb);
});


/**
 * renders PHP files by piping them through the PHP command line binary
 * @param  {glob} target gulp.src compatible glob or string of PHP source files
 * @param  {object} opts gulp.src options object, usually used to set the base dir {base: dir}
 * @return {stream}        returns a through2 stream of vinyl files
 */
var renderPHP = function(target, opts) {
  return gulp.src(target, opts)
    .pipe(through.obj(function(file, enc, cb) {
      var startTime = process.hrtime();
      var contents = new Buffer(0); // init an empty buffer
      var php = spawn('php', ['-d', 'include_path=' + path.dirname(file.path)]);

      var hrtimeMagenta = function(time) {
        return chalk.magenta(prettyHrtime(process.hrtime(time)));
      };

      php.stdout.on('data', function(data) {
        contents = Buffer.concat([contents, data]);
      });

      php.stdout.on('end', function() {
        if (!contents.length) {
          var relfile = file.relative;
          file = null; // return null to remove empty files from the stream
          gutil.log(
            'PHP: Dropping', chalk.magenta(relfile),
            "because PHP returned no content after", hrtimeMagenta(startTime)
          );
        }
      });

      php.on('close', function() {
        if (contents.length) {
          var oldFile = file.relative;
          file.path = file.path.replace(/php$/, 'html');

          file.contents = contents;
          gutil.log(
            "PHP: Rendered", chalk.magenta(oldFile),
            "to", chalk.magenta(file.relative),
            'after', hrtimeMagenta(startTime)
          );
        }
        cb(null, file);
      });

      file.pipe(php.stdin);
    }));
};


/**
 * php calls renderPHP() for all files in the PHP_FILES glob
 */
gulp.task('php', function() {
  return renderPHP(PHP_FILES)
    .pipe(gulp.dest(BUILD_DIR));
});


/**
 * gulp-reload auto-reloads the gulpfile on change, called from 'watch'
 * This is horribly unstable and will leave an orphaned
 * gulp process running after `gulp watch` exits
 */
gulp.task('gulp-reload', function() {
  spawn('gulp', ['watch'], {stdio: 'inherit'});
  process.exit();
});


/**
 * gulp webserver - start up a livereload-enabled webserver.
 * The connect-livereload middleware injects the livereload snippet
 */
gulp.task('webserver', ['build'], function() {
  var reporter = function() {
    gutil.log(
      "Local webserver listening on:",
      chalk.magenta(LOCAL_PORT),
      '(http://' + os.hostname().toLowerCase() + ':' + LOCAL_PORT + ')'
    );
  };
  var app = connect()
    .use(connectLiveReload())
    .use(serveStatic(BUILD_DIR));
  http.createServer(app).listen(LOCAL_PORT, null, null, reporter);
});


/**
 * The main watch task, tracks and responds to changes in source files
 */
gulp.task('watch', ['webserver'], function() {
  livereload.listen();

  // see the note above the gulp-reload task before enabling this
  // gulp.watch('gulpfile.js', ['gulp-reload']);

  // Process PHP files
  gulp.watch(PHP_FILES)
    .on('change', function(event) {
      if (event.type === 'added' || event.type === 'changed') {
        renderPHP(event.path, {base: SRC_DIR})
          .pipe(gulp.dest(BUILD_DIR));
      }
      // This could just nuke BUILD_DIR with "clean" and then rebuild,
      // but that seemed like overkill
      if (event.type == 'deleted') {
        var srcfile = path.relative(SRC_DIR, event.path);
        var destfile = srcfile.replace(/php$/, 'html');
        del(path.join(BUILD_DIR, destfile), function() {
          gutil.log(
            "PHP:", chalk.magenta(srcfile),
            "was removed, removing", chalk.magenta(destfile));
        });
      }
    });

  // Re-compile SCSS on change
  gulp.watch(SASS_FILES, ['sass']);

  // Move static files on change
  gulp.watch(STATIC_ASSETS, ['copy']);

  // trigger livereload whenever files in BUILD_DIR change
  gulp.watch([path.join(BUILD_DIR, '/**/*')])
    .on('change', livereload.changed);
});