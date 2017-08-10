const gulp = require('gulp');
const browserSync = require('browser-sync').create();
const config = require('load-gulp-config');

const pack = config.util.readJSON('package.json');
const conf = require('./gulp/gulpconfig');

global.browserSync = browserSync;

config(gulp, {
	// path to task's files dir 'gulp/tasks'
	configPath: config.util.path.join('gulp/tasks', '*.{js,json,yml,yaml}'),
	data:Object.assign({ someCfg:{
		conf: conf
	}, anyValue:1, anyParams:[] }, pack)
});