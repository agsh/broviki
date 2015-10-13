/**
 * Created by Andrew D.Laptev<a.d.laptev@gmail.com> on 06.03.15.
 */

var gulp = require('gulp')
	, concat = require('gulp-concat')
	, less = require('gulp-less')
	, transform = require('vinyl-transform')
	, buffer = require('vinyl-buffer')
	, browserify = require('browserify')
	, sourcemaps = require('gulp-sourcemaps')
	, source = require('vinyl-source-stream')
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
				i18n: 'i18next'
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
	return browserify({entries: './client/js/start.js', debug: true}).bundle()
		.pipe(source('start.js'))
		.pipe(buffer())
		.pipe(sourcemaps.init({loadMaps: true}))
		//.pipe(concat('bundled.js'))
		.pipe(uglify())
		.pipe(sourcemaps.write('./'))
		.pipe(gulp.dest('./dist/js'))
		;
});

gulp.task('watch js', function() {
	gulp.watch('client/js/*.js', ['browserify js']);
});

gulp.task('index', function() {
	gulp.src(['client/index.html'])
		.pipe(gulp.dest('dist'))
		;
});

gulp.task('all', ['jade', 'less to css', 'browserify js', 'index']);
