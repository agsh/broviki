/**
 * Created by Andrew D.Laptev<a.d.laptev@gmail.com> on 06.03.15.
 */

var gulp = require('gulp')
	, concat = require('gulp-concat')
	, less = require('gulp-less')
	;

gulp.task('default', function() {
	// place code for your default task here
	gulp.src([
		'styles/*.less'
	])
		.pipe(concat('styles.css'))
		.pipe(less())
		.pipe(gulp.dest('styles'));
});