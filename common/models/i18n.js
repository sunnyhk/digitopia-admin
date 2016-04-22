var async = require('async');
var fs = require('fs');
var path = require('path');

module.exports = function (I18n) {
	I18n.observe('after delete', i18nUpdate);
	I18n.observe('after save', i18nUpdate);

	function i18nUpdate(ctx, next) {
		console.log('observe %j', ctx);
		var locales = I18n.app.get('i18n').getLocales();
		async.mapSeries(locales, saveLocaleFile, function (err, results) {
			if (err) {
				return next(err);
			}
			console.log('i18n db -> json sync complete');
			next();
		});
	}

	function saveLocaleFile(locale, cb) {
		console.log('locale:', locale);

		I18n.app.models.I18n.find({
			'where': {
				'locale': locale
			}
		}, function (err, data) {
			if (err) {
				console.log('error reading i18n database', err);
				return cb(err);
			}
			if (data) {
				var translations = {};
				for (var i = 0; i < data.length; i++) {
					translations[data[i].key] = data[i].value;
				}

				var target = path.join(__dirname, '../../../../locales/' + locale + '.json');
				var tmp = target + '.tmp';
				fs.writeFileSync(tmp, JSON.stringify(translations, null, 2), 'utf8');
				var stats = fs.statSync(tmp);
				if (stats.isFile()) {
					fs.renameSync(tmp, target);
					console.log(target + ' saved');
				}
				else {
					console.log('unable to write locales to file (either ' + tmp + ' or ' + target + ' are not writeable?): ');
				}
			}
			cb(err, data);
		});
	}

};
