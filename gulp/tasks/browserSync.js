module.exports = function(gulp, data, util, taskName){
	'use strict';
	
	gulp.task('browser-sync', function() {
		return global.browserSync.init({
			server: {
				baseDir: data.someCfg.conf.path.dest.base
			},
			injectchanges: true,
		});
	});
};