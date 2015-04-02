/*jshint node:true, unused:true */
/*eslint-env node, browser */
/*eslint quotes: [1, "single"] */

'use strict';

/**
 * Node core modules
 */
var os = require('os');
var path = require('path');
var spawn = require('child_process').spawn;


/**
 * npm packaged modules
 */
var gulp = require('gulp');
var gutil = require('gulp-util');
var filter = require('gulp-filter');
var chalk = gutil.colors;
var runSequence = require('run-sequence');
var through = require('through2');
var del = require('del');
var sass = require('gulp-sass');
var sourcemaps = require('gulp-sourcemaps');
var prettyHrtime = require('pretty-hrtime');
var browserSync = require('browser-sync');
var reloadStream = browserSync.reload.bind(null, {stream: true});


/**
 * Constants
 */
var SRC_DIR = './source';
var BUILD_DIR = './build';
var SASS_FILES = './sass/**/*.scss';
var PHP_FILES = path.join(SRC_DIR, '**/*.php');
var STATIC_ASSETS = [
  path.join(SRC_DIR, '**'),       // everything...
  '!' + PHP_FILES,                // ...except PHP_FILES
  '!' + SRC_DIR + '/templates/**' // ...and template files
];


/**
 * sass compiles SCSS source files to CSS
 */
gulp.task('sass', function() {
  var sassErrorReporter = function(err) {
    err.path = path.relative(process.cwd(), err.file);
    gutil.log(
      chalk.red('Sass Error:'),
      chalk.magenta(err.path) + ':' + chalk.cyan(err.line) + ':' + chalk.cyan(err.column),
      err.message
    );
  };

  return gulp.src(SASS_FILES)
    .pipe(sourcemaps.init())
    .pipe(sass({
      outputStyle: 'compressed',
      onError: sassErrorReporter
    }))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(path.join(BUILD_DIR, 'css')))
    .pipe(filter('**/*.css'))
    .pipe(reloadStream())
    .on('data', function(data) {
      gutil.log('Sass: compiled', chalk.magenta(data.relative));
    });
});


/**
 * remove the build directory
 */
gulp.task('clean', function(cb) {
  del(BUILD_DIR, cb);
});


/**
 * copy STATIC_ASSETS to BUILD_DIR using relative paths (so things stay nested)
 */
gulp.task('copy', function() {
  return gulp.src(STATIC_ASSETS, {base: SRC_DIR}) // base tells gulp to copy with relative paths
    .pipe(gulp.dest(BUILD_DIR));
});

/**
 * A reload utility task, used to fire browserSync after the copy task
 */
gulp.task('browserSync reload', ['copy'], browserSync.reload);


/**
 * this just lumps together other tasks: clean, then php, sass and copy
 */
gulp.task('build', function(cb) {
  runSequence('clean', 'copy', ['php', 'sass'], 'browserSync reload', cb);
});


/**
 * Cleans up PHP rendering errors and
 * @param  buffer err a possibly concatenated set of PHP errors
 * @return object     Object contains error message, file path and line number
 */
var formatPHPError = function(err) {
  return err
    .toString()
    .match(/\n\n[^\n]+\n\n/g)
    .map(function(e) {
      var parts = e.match(/\s+([^:]*):\s*(.*)(?: in )(.*)(?: on line )(\d+)\s+$/);
      return {
        level: parts[1],
        error: parts[2],
        path: path.relative(process.cwd(), parts[3]),
        line: parts[4]
      };
    });
};


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
      var errors = new Buffer(0); // init an empty buffer
      var php = spawn('php', [
        '-d', 'include_path=' + path.dirname(file.path),
        '-d', 'display_errors=stderr'
      ]);
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
            'because PHP returned no content after', hrtimeMagenta(startTime)
          );
        }
      });

      php.stderr.on('data', function(data) {
        errors = Buffer.concat([errors, data]);
      });

      php.stderr.on('end', function() {
        if (errors.length) {
          formatPHPError(errors).forEach(function(e) {
            gutil.log(
              'PHP ' + e.level + ': ' +
              chalk.magenta(e.path) + ':' + chalk.cyan(e.line) +
              ' in ' + chalk.magenta(file.relative) + ' ' +
              e.error);
          });
        }
      });

      php.on('close', function() {
        if (contents.length) {
          var oldFile = file.relative;
          file.path = file.path.replace(/php$/, 'html');
          file.contents = contents;
          gutil.log(
            'PHP: Rendered', chalk.magenta(oldFile),
            'after', hrtimeMagenta(startTime)
          );
        }
        cb(null, file);
      });

      file.pipe(php.stdin);
    }));
};


/**
 * php calls renderPHP() with all files in the PHP_FILES glob
 */
gulp.task('php', function() {
  return renderPHP(PHP_FILES)
    .pipe(gulp.dest(BUILD_DIR));
});


/**
 * The main watch task, tracks and responds to changes in source files
 */
gulp.task('watch', ['build'], function() {
  browserSync({
    host: os.hostname().toLowerCase() + '.local',
    open: false,
    logConnections: true,
    server: './build'
  });

  // Process PHP files
  gulp.watch(PHP_FILES)
    .on('change', function(event) {
      if (event.type === 'added' || event.type === 'changed') {
        renderPHP(event.path, {base: SRC_DIR})
          .pipe(gulp.dest(BUILD_DIR))
          .pipe(reloadStream());
      }
      // This could just nuke BUILD_DIR with "clean" and then rebuild,
      // but that seemed like overkill
      if (event.type === 'deleted') {
        var srcfile = path.relative(SRC_DIR, event.path);
        var destfile = srcfile.replace(/php$/, 'html');
        del(path.join(BUILD_DIR, destfile), function() {
          gutil.log(
            'PHP:', chalk.magenta(srcfile),
            'was removed, removing', chalk.magenta(destfile));
        });
      }
    });

  // Re-compile SCSS on change
  gulp.watch(SASS_FILES, ['sass']);

  // Move static files on change
  gulp.watch(STATIC_ASSETS, ['copy', 'browserSync reload']);

  // Silly Twig templating example
  gulp.watch(SRC_DIR + '/**/*.twig', ['php']);

});
