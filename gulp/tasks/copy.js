module.exports = function(gulp, data, util, taskName){
	'use strict';
	
	const gulpCopy = require('gulp-copy');
	var options =  {
		prefix: 5
	};
	
	gulp.task(taskName + ':images', function () {
		return gulp.src(data.someCfg.conf.path.dev.resources.images + '**/*')
			.pipe(gulp.dest(data.someCfg.conf.path.dest.resources.images));
	});
	
	gulp.task(taskName + ':fonts', function () {
		return gulp.src(data.someCfg.conf.path.dev.resources.images + '**/*')
			.pipe(gulp.dest(data.someCfg.conf.path.dest.resources.images));
	});
	
};