var loopback = require('loopback');
var async = require('async');
var jade = require('jade');
var path = require('path');
var extend = require('util')._extend;
var _ = require('lodash');

var adminGetUploadForProperty = function adminGetUploadForProperty(prop, uploads) {
	if (uploads && uploads.length) {
		for (var j = 0; j < uploads.length; j++) {
			if (uploads[j].property === prop) {
				return uploads[j];
			}
		}
	}
	return {
		url: '/admin/dist/images/fpo.jpg'
	};
};

module.exports = function (server, userAuth, userModelName, tableNames, options) {
	var router = server.loopback.Router();

	var path = require('path');
	var p = path.join(__dirname, '../../client/dist');
	server.use('/admin/dist/', loopback.static(p));

	if (!options) {
		options = {};
	}

	function render(template, locals, next) {
		if (!locals) {
			locals = {};
		}
		locals.userModel = userModelName;
		locals.menu = tableNames;
		locals.adminGetUploadForProperty = adminGetUploadForProperty;
		locals.adminOptions = options;

		var templatePath = path.join(__dirname, '../views/', template);
		var fn = jade.compileFile(templatePath, {
			'pretty': true,
			'filename': templatePath
		});

		var html = fn(extend(server.locals, locals));
		next(null, html);
	}

	router.get('/admin/schema/:model', userAuth, function (req, res, next) {
		if (!server.models[req.params.model]) {
			res.sendStatus(404);
		}
		else {
			var schema = getModelInfo(req.params.model);
			res.send('<pre>' + JSON.stringify(schema, null, ' ') + '</pre>');
		}
	});

	// need login
	router.get('/admin/need-login', function (req, res, next) {
		render('admin/views/need-login.jade', {}, function (err, html) {
			res.send(html);
		});
	});

	// dashboard
	router.get('/admin', userAuth, function (req, res, next) {
		render('admin/dash.jade', {}, function (err, html) {
			res.send(html);
		});
	});

	// list instances in model
	router.get(/^\/admin\/views\/([^\/]*)\/index$/, userAuth, function (req, res, next) {
		var model = req.params[0];
		var schema = getModelInfo(model);

		var q;

		if (!req.query.property) {
			req.query.property = schema.admin.listProperties[0];
		}

		if (req.query.q) {
			q = {
				'where': {}
			};
			q.where[req.query.property] = {
				'like': req.query.q + '%'
			};
		}

		server.models[model].find(q, function (err, instances) {
			render('admin/views/index.jade', {
				model: model,
				schema: schema,
				instances: instances,
				q: req.query.q
			}, function (err, html) {
				res.send(html);
			});
		});
	});

	router.get(/^\/admin\/views\/([^\/]*)\/add$/, userAuth, function (req, res, next) {
		doTemplate('add', req, res, next);
	});

	router.get(/^\/admin\/views\/([^\/]*)\/(\d+)\/view$/, userAuth, function (req, res, next) {
		doTemplate('view', req, res, next);
	});

	router.get(/^\/admin\/views\/([^\/]*)\/(\d+)\/edit$/, userAuth, function (req, res, next) {
		doTemplate('edit', req, res, next);
	});

	function doTemplate(mode, req, res, next) {
		var model = req.params[0];
		var id = req.params[1] ? req.params[1] : -1;

		var schema = getModelInfo(model);

		var childRelations = [];
		var parentRelations = [];
		var includes = [];

		var modelPlural = model + 's';

		var endpoint = req.protocol + '://' + req.get('host') + '/api/' + modelPlural;
		if (id !== -1) {
			endpoint += '/' + id;
		}

		for (var relation in schema.relations) {
			if (!schema.admin.includeRelations || schema.admin.includeRelations.indexOf(relation) != -1) {
				if (schema.relations[relation].type === 'hasMany' || schema.relations[relation].type === 'hasOne') {
					var rel = schema.relations[relation];
					childRelations.push(rel);
					includes.push(relation);
				}

				if (schema.relations[relation].type === 'belongsTo') {
					var rel = schema.relations[relation];
					parentRelations.push(rel);
					includes.push(relation);
				}
			}
		}

		var theInstance;
		async.series([
			function resolve(cb) {
				server.models[model].findById(id, {
					include: includes
				}, function (err, instance) {
					theInstance = instance;
					cb(err, instance);
				});
			}
		], function (err, results) {
			if (err) {
				res.status(500).send('error ' + err);
			}
			if (id !== -1 && !theInstance) {
				res.status(404).send('not found');
			}

			var parents = [];
			var children = {};

			for (var i in parentRelations) {
				var relation = parentRelations[i];

				if (!theInstance && relation.polymorphic) {}
				else {
					var related = theInstance ? theInstance[relation.name]() : [];
					var relatedModel = relation.polymorphic ? theInstance[relation.polymorphic.discriminator] : relation.modelTo;
					var relatedSchema = getModelInfo(relatedModel);
					parents.push({
						name: relation.name,
						model: relatedModel,
						type: relation.type,
						foreignKey: relation.keyFrom,
						lookupProperty: relatedSchema.admin.defaultProperty,
						lookupEndpoint: '/api/' + relatedModel + 's/',
						url: related ? '/admin/views/' + relatedModel + '/' + related.id + '/view' : null,
						description: related ? related[relatedSchema.admin.defaultProperty] : null
					});
				}
			}

			for (var i in childRelations) {
				var relation = childRelations[i];
				var related = undefined;

				if (theInstance) {
					if (relation.type === 'hasOne') {
						if (theInstance[relation.name]()) {
							related = [theInstance[relation.name]()];
						}
					}
					else {
						related = theInstance[relation.name]();
					}
				}

				// compute url if child does not exist or hasMany
				var createChild = "";
				if (relation.multiple || !related || !related.length) {
					createChild = '/admin/views/' + relation.modelTo + '/add?' + relation.keyTo + '=' + id;
					if (relation.polymorphic) {
						createChild += '&' + relation.polymorphic.discriminator + '=' + model;
					}
					if (relation.modelThrough) {
						createChild = '/admin/views/' + relation.modelThrough + '/add?' + relation.keyTo + '=' + id;
					}
				}

				if (!children[relation.name]) {
					children[relation.name] = {
						relation: relation,
						createUrl: createChild,
						children: []
					};
				}

				if (related) {
					var relatedModel = relation.modelTo;
					var relatedSchema = getModelInfo(relatedModel);

					for (var j = 0; j < related.length; j++) {
						var child = related[j];
						var item = {
							name: relation.name,
							model: relatedModel,
							type: relation.type,
							url: '/admin/views/' + relatedModel + '/' + child.id + '/view',
							description: child[relatedSchema.admin.defaultProperty]
						}

						if (relation.modelThrough) {
							item.url = '/admin/views/' + relation.modelThrough + '/' + child.id + '/view'
						}

						children[relation.name].children.push(item);
					}
				}
			}

			if (!theInstance) {
				theInstance = {};
			}

			render('admin/views/instance.jade', {
				'mode': mode,
				'model': model,
				'schema': schema,
				'instance': theInstance,
				'childRelations': childRelations,
				'parentRelations': parentRelations,
				'endpoint': endpoint,
				'parents': parents,
				'children': children,
				'query': req.query
			}, function (err, html) {
				res.send(html);
			});
		});
	}

	server.use(router);


	var utils = require('loopback-datasource-juggler/lib/utils');
	var _ = require('lodash');

	function clone(obj) {
		if (!obj) {
			return obj;
		}
		return JSON.parse(JSON.stringify(obj));
	}

	function formatProperties(properties) {
		var result = {};
		for (var key in properties) {
			result[key] = {};
			for (var prop in properties[key]) {
				if (prop !== 'type') {
					result[key][prop] = properties[key][prop];
				}
				else {
					if (properties[key].type.name) {
						result[key].type = properties[key].type.name;
					}
					else if (properties[key].type instanceof Array) {
						result[key].type = 'Array';
					}
					else if (properties[key].type instanceof Object) {
						result[key].type = 'Object';
					}
				}
			}
		}
		return result;
	}

	function getModelInfo(modelName) {

		var model = server.models[modelName];

		var result = {
			id: model.definition.name,
			name: model.definition.name,
			properties: formatProperties(model.definition.properties)
		};

		var keys = ['description', 'plural', 'strict', 'hidden', 'admin'];

		keys.forEach(function (key) {
			result[key] = clone(_.get(model.definition.settings, key));
		});

		result['relations'] = clone(model.relations);

		if (!result.admin) {
			result.admin = {
				defaultProperty: 'id'
			};
		}

		var populateList, populateEdit, populateView;

		if (!result.admin.helpers) {
			result.admin.helpers = [];
		}

		if (!result.admin.listProperties) {
			result.admin.listProperties = [];
			populateList = true;
		}

		if (!result.admin.editProperties) {
			result.admin.editProperties = [];
			populateEdit = true;
		}

		if (!result.admin.viewProperties) {
			result.admin.viewProperties = [];
			populateView = true;
		}

		for (var prop in result.properties) {

			if (!result.properties[prop].admin) {
				result.properties[prop].admin = {};
			}

			if (!result.properties[prop].admin.validate) {
				result.properties[prop].admin.validate = {};
			}

			// map loopback required,length to admin.validate properties

			if (result.properties[prop].required) {
				result.properties[prop].admin.validate['required'] = true;
			}

			if (result.properties[prop].length) {
				result.properties[prop].admin.validate['max-length'] = result.properties[prop].length;
			}


			var type = result.properties[prop].type;

			if (type === 'Boolean') {
				type = 'checkbox';
			}
			if (type === 'String') {
				type = 'text';
			}
			if (type === 'Text') {
				type = 'textarea';
			}
			if (type === 'Number') {
				type = 'number';
			}
			if (type === 'Object') {
				type = 'textarea';
			}
			if (type === 'Array') {
				type = 'textarea';
			}
			if (type === 'Date') {
				type = 'date';
			}

			if (!result.properties[prop].admin.inputType) {
				result.properties[prop].admin.inputType = type;
			}

			if (populateList) {
				result.admin.listProperties.push(prop);
			}

			if (populateView) {
				result.admin.viewProperties.push(prop);
			}

			if (prop !== 'id') {
				if (populateEdit) {
					result.admin.editProperties.push(prop);
				}
			}

		}

		for (var relation in result.relations) {
			if (result.relations[relation].type === 'belongsTo') {
				var rel = result.relations[relation];
				var foreignKey = rel.keyFrom;
				result.properties[foreignKey].admin.readonly = true;
			}
		}

		return result;
	};

};
