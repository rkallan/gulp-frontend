module.exports = function(gulp, data, util, taskName){
	'use strict';
	
	const autoprefixer = require('gulp-autoprefixer');
	const sass = require('gulp-sass');
	
	gulp.task(taskName + ':compile', function() {
		return gulp.src([data.someCfg.conf.path.dev.resources.scss + '**/*.{scss,sass}'])
			.pipe(sass().on('error', sass.logError))
			.pipe(autoprefixer({
				browsers: ['last 2 versions']
			}))
			.pipe(gulp.dest(data.someCfg.conf.path.dest.resources.css));
	});
	
	gulp.task('css:watch', ['css:compile'], function() {
		return global.browserSync.reload('*.css');
	});

};