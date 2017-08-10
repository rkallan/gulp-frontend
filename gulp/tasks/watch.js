module.exports = function(gulp, data, util, taskName){
	'use strict';

	gulp.task(taskName, function(callback){
		 gulp.watch(data.someCfg.conf.path.dev.resources.scss + '**/*.scss', ['css:watch']);
		 gulp.watch(data.someCfg.conf.path.dev.nunjucks.path + '**/*.nunjucks', ['nunjucksRender:watch']);
		 gulp.watch(data.someCfg.conf.path.dev.resources.javascript + '**/*.js', ['concatJs:watch']);
	});
};