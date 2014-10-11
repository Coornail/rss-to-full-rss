'use strict';

var gulp = require('gulp'),
    jshint = require('gulp-jshint');

var files = {
  js: ['./index.js', './libs/*.js', './tests/*.js'],
  tests: ['./tests/*.js'],
};

/*
gulp.task('test:js', function() {
  gulp.src(files.tests, {read: false})
    .pipe(plumber())
    .pipe(mocha({reporter: 'min'}));
});
*/
gulp.task('lint:js', function() {
   gulp.src(files.js)
     .pipe(jshint())
     .pipe(jshint.reporter('jshint-stylish'));
});

gulp.task('watch', function() {
  gulp.watch(files.js, ['lint:js']);
});

gulp.task('default', ['lint:js', 'watch']);
