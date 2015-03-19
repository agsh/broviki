/**
 * Created by Andrew D.Laptev<a.d.laptev@gmail.com> on 06.03.15.
 */

var gulp = require('gulp')
	, concat = require('gulp-concat')
	, less = require('gulp-less')
	, transform = require('vinyl-transform')
	, browserify = require('browserify')
	, sourcemaps = require('gulp-sourcemaps')
	, uglify = require('gulp-uglify')
	;

gulp.task('less to css', function() {
	// place code for your default task here
	gulp.src([
		'client/styles/*.less'
	])
		.pipe(concat('styles.css'))
		.pipe(less())
		.pipe(gulp.dest('dist/styles'));
});

gulp.task('browserify js', function() {
	var browserified = transform(function(filename) {
		var b = browserify({entries: filename, debug: true});
		return b.bundle();
	});
	gulp.src('client/js/app.js')
		.pipe(browserified)
		.pipe(sourcemaps.init({loadMaps: true}))
		//.pipe(concat('bundled.js'))
		.pipe(uglify())
		.pipe(sourcemaps.write('./'))
		.pipe(gulp.dest('dist/js'))
		;
});

gulp.task('other', function() {
	gulp.src(['client/index.html'])
		.pipe(gulp.dest('dist'))
		;
	gulp.src('client/templates/*')
		.pipe(gulp.dest('dist/templates'))
		;
});

gulp.task('all', ['less to css', 'browserify js', 'other']);
