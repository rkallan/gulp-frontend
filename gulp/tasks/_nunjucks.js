module.exports = function(gulp, data, util, taskName){
	'use strict';
	
	const nunjucks = require('gulp-nunjucks');
	
	gulp.task(taskName + ':compile', function() {
		return gulp.src(data.someCfg.conf.path.dev.nunjucks + '/**/*.html')
			.pipe(nunjucks.compile({name: 'Sindre'}))
			.pipe(gulp.dest(data.someCfg.conf.path.dest.html))
	});
	
	gulp.task(taskName + ':watch', [taskName + ':compile'], function() {
		return global.browserSync.reload('*.html');
	});
};