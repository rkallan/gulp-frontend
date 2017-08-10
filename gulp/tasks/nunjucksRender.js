module.exports = function(gulp, data, util, taskName){
	'use strict';
	
	const nunjucksRender = require('gulp-nunjucks-render');
	const gulpData = require('gulp-data');
	var fs = require('fs');
	
	gulp.task(taskName + ':compile', function() {
		return gulp.src(data.someCfg.conf.path.dev.nunjucks.pages + '**/*.nunjucks')
			.pipe(gulpData(function() {
				return JSON.parse(fs.readFileSync(data.someCfg.conf.path.dev.resources.data.json + 'content.json'));
			}))
			.pipe(nunjucksRender({
				path: data.someCfg.conf.path.dev.nunjucks.path
				})
			)
			.pipe(gulp.dest(data.someCfg.conf.path.dest.html));
	});
	
	gulp.task(taskName + ':watch', [taskName + ':compile'], function() {
		return global.browserSync.reload('*.html');
	});
};