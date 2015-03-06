/**
 * Created by Andrew D.Laptev<a.d.laptev@gmail.com> on 06.03.15.
 */

var gulp = require('gulp')
	, concat = require('gulp-concat')
	;

gulp.task('default', function() {
	// place code for your default task here
	gulp.src([
		'*.less'
	])
		.pipe(concat('lib.js'))
		.pipe(gulp.dest('./dist'));
});