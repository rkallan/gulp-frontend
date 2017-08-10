var dev = 'dev/';
var dest = 'dest/';
var resources = 'resources/';
var dataFolder = 'data/';
var nunjucksFolder = 'nunjucks/';

module.exports = {
	path: {
		dev: {
			base: dev,
			nunjucks: {
				path: dev + nunjucksFolder,
				pages: dev + nunjucksFolder + 'pages/'
			},
			resources: {
				scss: dev + resources + 'scss/',
				images: dev + resources + 'images/',
				fonts: dev + resources + 'fonts/',
				javascript: dev + resources + 'js/',
				data: {
					json: dev + resources + dataFolder + 'json/'
				}
			}
		},
		dest: {
			base: dest,
			html: dest + 'html/',
			resources: {
				css: dest + resources + 'css/',
				images: dest + resources + 'images/',
				fonts: dest + resources + 'fonts/',
				javascript: dest + resources + 'js/'
			}
		}
	}
};