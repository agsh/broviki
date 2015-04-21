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
	, jade = require('gulp-jade')
	, concatJST = require('gulp-jade-jst-concat')
	, addsrc = require('gulp-add-src')
	;

gulp.task('jade', function() {
	gulp.src('client/templates/*.jade')
		.pipe(jade({
			client: true
		}))
		.pipe(concatJST('templates.js', {
			basepath: 'client/templates'
			, globals: {
				__: 'i18n'
			}
		}))
		.pipe(gulp.dest('client/js'))
});

gulp.task('less to css', function() {
	// all less styles
	gulp.src([
		'client/styles/*.less'
	])
		.pipe(less())
		.pipe(addsrc('node_modules/bootstrap/dist/css/bootstrap.css'))
		.pipe(concat('styles.css'))
		.pipe(gulp.dest('dist/styles'));
	// font-icons
	gulp
		.src('/node_modules/font-awesome/css/font-awesome.min.css')
		.pipe(gulp.dest('dist/styles'))
});

gulp.task('browserify js', function() {
	var browserified = transform(function(filename) {
		var b = browserify({entries: filename, debug: true});
		return b.bundle();
	});
	gulp.src('client/js/start.js')
		.pipe(browserified)
		.pipe(sourcemaps.init({loadMaps: true}))
		//.pipe(concat('bundled.js'))
		.pipe(uglify())
		.pipe(sourcemaps.write('./'))
		.pipe(gulp.dest('dist/js'))
		;
});

gulp.task('watch js', function() {
	gulp.watch('client/js/*.js', ['browserify js']);
});

gulp.task('templates and html', function() {
	gulp.src(['client/index.html'])
		.pipe(gulp.dest('dist'))
		;
	gulp.src('client/templates/*')
		.pipe(gulp.dest('dist/templates'))
		;
});

gulp.task('all', ['jade', 'less to css', 'browserify js', 'templates and html']);
