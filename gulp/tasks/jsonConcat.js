module.exports = function(gulp, data, util, taskName){
	'use strict';
	
	const jsonConcat = require('gulp-json-concat');
	
	gulp.task(taskName + ':content', function() {
		return gulp.src(data.someCfg.conf.path.dev.resources.data.json + 'content/**/*.json')
			.pipe(jsonConcat('content.json',function(jsonData){
				return new Buffer(JSON.stringify(jsonData));
			}))
			.pipe(gulp.dest(data.someCfg.conf.path.dev.resources.data.json));
	});
};