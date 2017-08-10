module.exports = function(gulp, data, util, taskName){
	'use strict';

	const concat = require('gulp-concat');
	const rename = require('gulp-rename');
	const uglify = require('gulp-uglify');
	const sourcemaps = require("gulp-sourcemaps");


	gulp.task(taskName + ':build', function() {
		return gulp.src([
				data.someCfg.conf.path.dev.resources.javascript + 'vendor/**/*.js',
				data.someCfg.conf.path.dev.resources.javascript + 'modules/**/*.js',
				data.someCfg.conf.path.dev.resources.javascript + 'general/**/*.js',
				data.someCfg.conf.path.dev.resources.javascript + 'default.js'
		])
			.pipe(sourcemaps.init())
			.pipe(concat('main.js'))
			.pipe(sourcemaps.write())
			//.pipe(rename('main.min.js'))
			//.pipe(uglify())
			.pipe(gulp.dest(data.someCfg.conf.path.dest.resources.javascript));
	});
	
	gulp.task(taskName + ':compile', function() {
		return gulp.src([data.someCfg.conf.path.dev.resources.javascript + 'modules/**/*.js', data.someCfg.conf.path.dev.resources.javascript + 'vendor/**/*.js', data.someCfg.conf.path.dev.resources.javascript + 'default.js'])
			.pipe(sourcemaps.init())
			.pipe(concat('main.js'))
			.pipe(sourcemaps.write()).pipe(rename('main.min.js'))
			.pipe(uglify())
			.pipe(gulp.dest(data.someCfg.conf.path.dest.resources.javascript));
	});
	
	gulp.task(taskName + ':watch', [taskName + ':build'], function() {
		return global.browserSync.reload('*.js');
	});
};