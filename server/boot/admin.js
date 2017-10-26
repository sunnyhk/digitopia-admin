var loopback = require('loopback');
var async = require('async');
var pug = require('pug');
var path = require('path');
var moment = require('moment');
var extend = require('util')._extend;
var csv = require('csv');
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

module.exports.setUpRoleToggleAPI = function setUpRoleToggleAPI(myUserModel) {

	myUserModel.toggleadmin = function (id, ctx, done) {

		var currentRoles = [];
		var req = ctx.req;

		var context = ctx.req.getCurrentContext();
		var roles = context.get('currentUserRoles');
		if (roles && roles.length) {
			for (var i = 0; i < roles.length; i++) {
				if (roles[i].role().name === 'superuser') {
					context.set('isSuperUser', 'true');
				}
			}
		}

		if (!context.get('isSuperUser')) {
			var error = new Error("access denied");
			error.status = 401;
			return done(error);
		}

		myUserModel.findOne({
			'where': {
				'id': id
			}
		}, function (err, user) {
			if (err) {
				return done(err);
			}
			else {
				async.series(
					[
						function (cb) {
							var q = {
								'where': {
									'principalType': req.app.models.RoleMapping.USER,
									'principalId': user.id
								},
								'include': ['role']
							};

							req.app.models.RoleMapping.find(q, function (err, roles) {
								currentRoles = roles;
								cb(err);
							});
						},
						function (cb) {
							var isAdmin = false;
							var theRole = null;
							for (var i = 0; i < currentRoles.length; i++) {
								if (currentRoles[i].role().name === 'admin') {
									isAdmin = true;
									theRole = currentRoles[i];
								}
							}

							if (isAdmin) {
								console.log('remove admin');
								theRole.destroy(cb);
							}
							else {
								console.log('make admin');

								req.app.models.Role.findOne({
									'where': {
										'name': 'admin'
									}
								}, function (err, role) {
									role.principals.create({
										principalType: req.app.models.RoleMapping.USER,
										principalId: user.id
									}, function (err, principal) {
										cb();
									});
								});
							}
						}
					],
					function (err, results) {
						return done(err);
					}
				);
			}
		});
	};

	myUserModel.remoteMethod(
		'toggleadmin', {
			http: {
				path: '/:id/toggleadmin',
				verb: 'get'
			},
			accepts: [{
				arg: 'id',
				type: 'number',
				required: true
			}, {
				arg: 'options',
				type: 'object',
				http: {
					source: 'context'
				}
			}],
			returns: {
				arg: 'result',
				type: 'object'
			}
		}
	);

	myUserModel.togglesuperuser = function (id, ctx, done) {

		var currentRoles = [];
		var req = ctx.req;

		var context = ctx.req.getCurrentContext();
		var roles = context.get('currentUserRoles');
		if (roles && roles.length) {
			for (var i = 0; i < roles.length; i++) {
				if (roles[i].role().name === 'superuser') {
					context.set('isSuperUser', 'true');
				}
			}
		}

		if (!context.get('isSuperUser')) {
			var error = new Error("access denied");
			error.status = 401;
			return done(error);
		}

		myUserModel.findOne({
			'where': {
				'id': id
			}
		}, function (err, user) {
			if (err) {
				return done(err);
			}
			else {
				async.series(
					[
						function (cb) {
							var q = {
								'where': {
									'principalType': req.app.models.RoleMapping.USER,
									'principalId': user.id
								},
								'include': ['role']
							};

							req.app.models.RoleMapping.find(q, function (err, roles) {
								currentRoles = roles;
								cb(err);
							});
						},
						function (cb) {
							var isAdmin = false;
							var isSuperUser = false;
							var theRole = null;
							for (var i = 0; i < currentRoles.length; i++) {
								if (currentRoles[i].role().name === 'superuser') {
									isSuperUser = true;
									theRole = currentRoles[i];
								}
							}

							if (isSuperUser) {
								console.log('remove superuser');
								theRole.destroy(cb);
							}
							else {
								console.log('make superuser');

								req.app.models.Role.findOne({
									'where': {
										'name': 'superuser'
									}
								}, function (err, role) {
									role.principals.create({
										principalType: req.app.models.RoleMapping.USER,
										principalId: user.id
									}, function (err, principal) {
										cb();
									});
								});
							}
						}
					],
					function (err, results) {
						return done(err);
					}
				);
			}
		});
	};

	myUserModel.remoteMethod(
		'togglesuperuser', {
			http: {
				path: '/:id/togglesuperuser',
				verb: 'get'
			},
			accepts: [{
				arg: 'id',
				type: 'number',
				required: true
			}, {
				arg: 'options',
				type: 'object',
				http: {
					source: 'context'
				}
			}],
			returns: {
				arg: 'result',
				type: 'object'
			}
		}
	);
};

module.exports.adminBoot = function adminBoot(server, userAuth, userModelName, tableNames, options) {
	var router = server.loopback.Router();

	var theUserModel = server.models[userModelName];

	server.locals.moment = moment;

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
		locals.userModel = theUserModel.pluralModelName;
		locals.menu = tableNames;
		locals.adminGetUploadForProperty = adminGetUploadForProperty;
		locals.adminOptions = options;

		var templatePath = path.join(__dirname, '../views/', template);
		var fn = pug.compileFile(templatePath, {
			'pretty': true,
			'filename': templatePath
		});

		if (options.dashboard) {
			options.dashboard(function (err, dash) {
				locals.dashboardData = dash;
				var html = fn(extend(server.locals, locals));
				next(null, html);
			});
		}
		else {

			var html = fn(extend(server.locals, locals));
			next(null, html);
		}
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

		render('admin/views/need-login.pug', {}, function (err, html) {
			res.send(html);
		});
	});

	// need login
	router.get('/admin/users', userAuth, function (req, res, next) {
		var loopbackContext = req.getCurrentContext();
		var currentUser = loopbackContext.get('currentUser');
		var isSuperUser = loopbackContext.get('isSuperUser');

		if (!isSuperUser) {
			return next();
		}

		server.models.Role.findOne({
			where: {
				'name': 'admin'
			}
		}, function (err, role) {
			server.models.RoleMapping.find({
				where: {
					and: [{
						'principalType': 'USER'
					}, {
						'roleId': role.id
					}]
				}
			}, function (err, mappings) {

				async.map(mappings, function (mapping, done) {
					theUserModel.findOne({
						'where': {
							'id': mapping.principalId
						}
					}, function (err, user) {
						done(err, user);
					});
				}, function (err, users) {
					render('admin/admin-users.pug', {
						'currentUser': loopbackContext.get('currentUser'),
						'isSuperUser': loopbackContext.get('isSuperUser'),
						'users': users
					}, function (err, html) {
						res.send(html);
					});
				});
			});
		});
	});

	// dashboard
	router.get('/admin', userAuth, function (req, res, next) {
		var loopbackContext = req.getCurrentContext();

		render('admin/dash.pug', {
			'currentUser': loopbackContext.get('currentUser'),
			'isSuperUser': loopbackContext.get('isSuperUser')
		}, function (err, html) {
			res.send(html);
		});
	});

	// list instances in model
	router.get(/^\/admin\/views\/([^\/]*)\/index$/, userAuth, function (req, res, next) {
		var loopbackContext = req.getCurrentContext();

		var model = req.params[0];
		var schema = getModelInfo(model);
		var format = req.query.format;

		var query = req.query.q ? req.query.q : '';

		var q = {};

		if (!req.query.property) {
			req.query.property = schema.admin.listProperties[0];
		}

		if (query) {
			q = {
				'where': {}
			};
			q.where[req.query.property] = {
				'like': query + '%'
			};
		}

		var p = req.query.p ? req.query.p : 1;

		if (!format) {
			q.limit = 30;
			q.skip = (p - 1) * 30;
		}

		server.models[model].count({}, function (err, count) {

			server.models[model].find(q, function (err, instances) {
				if (format === 'json') {
					return res.attachment(model + '.json').send(instances);
				}
				else if (format === 'csv') {
					var items = [];
					var headings = [];
					for (var i = 0; i < instances.length; i++) {
						var row = [];
						for (var property in instances[i].__data) {
							if (i === 0) {
								headings.push(property);
							}
							row.push(instances[i][property]);
						}
						if (i === 0) {
							items.push(headings);
						}
						items.push(row);
					}
					csv.stringify(items, function (err, formatted) {
						return res.attachment(model + '.csv').send(formatted);
					});
				}
				else {
					render('admin/views/index.pug', {
						'currentUser': loopbackContext.get('currentUser'),
						'isSuperUser': loopbackContext.get('isSuperUser'),
						'model': model,
						'schema': schema,
						'instances': instances,
						'count': count,
						'pages': Math.ceil(count / 30),
						'page': p,
						'next': Math.ceil(count / 30) < p ? p + 1 : p,
						'prev': p > 1 ? p - 1 : 1,
						'q': query,
						'uri': 'index?q=' + query + '&property=' + req.query.property
					}, function (err, html) {
						res.send(html);
					});
				}
			});
		});
	});

	router.get(/^\/admin\/views\/([^\/]*)\/add$/, userAuth, function (req, res, next) {
		doTemplate('add', req, res, next);
	});

	router.get(/^\/admin\/views\/([^\/]*)\/([a-zA-Z0-9\-]+)\/view$/, userAuth, function (req, res, next) {
		doTemplate('view', req, res, next);
	});

	router.get(/^\/admin\/views\/([^\/]*)\/([a-zA-Z0-9\-]+)\/edit$/, userAuth, function (req, res, next) {
		doTemplate('edit', req, res, next);
	});

	function doTemplate(mode, req, res, next) {
		var loopbackContext = req.getCurrentContext();

		var model = req.params[0];
		var id = req.params[1] ? req.params[1] : -1;

		var schema = getModelInfo(model);

		var childRelations = [];
		var parentRelations = [];
		var hiddenRelations = []; // NEW, store relation info that invisible to users
		var includes = [];

		var modelPlural = req.app.models[model].pluralModelName;

		var apiMountPoint = options.endpoint;
		if (!apiMountPoint) {
			apiMountPoint = req.protocol + '://' + req.get('host') + '/api/';
		}

		var endpoint = apiMountPoint + modelPlural;
		if (id !== -1) {
			endpoint += '/' + id;
		}

		for (var relation in schema.relations) {
			if (!schema.admin.includeRelations || schema.admin.includeRelations.indexOf(relation) != -1) {
				if (schema.relations[relation].type === 'hasMany' || schema.relations[relation].type === 'hasOne') {
					var rel = schema.relations[relation];
					childRelations.push(rel);
					includes.push(relation);
					// BEGIN look for the model defined by modelThrough
					if (rel.modelThrough) {
						for (var relationThru in schema.relations) {
							if (schema.relations[relationThru].modelTo === rel.modelThrough) {
								var relThru = schema.relations[relationThru]
								hiddenRelations.push(relThru); // store definitions
								includes.push(relationThru); // store row records
							}
						}
					} // END
				}

				if (schema.relations[relation].type === 'belongsTo') {
					var rel = schema.relations[relation];
					parentRelations.push(rel);
					includes.push(relation);
				}
			}
		}

		var theInstance;
		var isSuperUser = false;
		var isAdminUser = false;
		async.series([
			function resolve(cb) {
				server.models[model].findById(id, {
					include: includes
				}, function (err, instance) {
					theInstance = instance;
					cb(err, instance);
				});
			},
			function getRoles(cb) {
				// if this is the user model and there is an instance get the roles
				if (model !== userModelName || theInstance === null) {
					return cb(null);
				}

				var q = {
					'where': {
						'principalType': req.app.models.RoleMapping.USER,
						'principalId': theInstance.id
					},
					'include': ['role']
				};

				req.app.models.RoleMapping.find(q, function (err, roles) {
					if (roles && roles.length) {
						for (var i = 0; i < roles.length; i++) {
							if (roles[i].role().name === 'superuser') {
								isSuperUser = true;
							}
						}

						for (var i = 0; i < roles.length; i++) {
							if (roles[i].role().name === 'admin') {
								isAdminUser = true;
							}
						}
					}
					cb(null);
				});
			}
		], function (err, results) {
			if (err) {
				return res.status(500).send('error ' + err);
			}
			if (id !== -1 && !theInstance) {
				return res.status(404).send('not found');
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
					var relatedModelPlural = relatedSchema.plural ? relatedSchema.plural : (relatedModel + 's')
					parents.push({
						'name': relation.name,
						'model': relatedModel,
						'type': relation.type,
						'foreignKey': relation.keyFrom,
						'lookupProperty': relatedSchema.admin.defaultProperty,
						'lookupEndpoint': '/api/' + relatedModelPlural + '/',
						'url': related ? '/admin/views/' + relatedModel + '/' + related.id + '/view' : null,
						'description': related ? related[relatedSchema.admin.defaultProperty] : null
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
							// Attempt to find the through model via hiddenRelations
							var myChild = child // default to original code
							for (var m in hiddenRelations) {
								var hiddenRelation = hiddenRelations[m]
								if (hiddenRelation.modelTo == relation.modelThrough) {
									var hiddenRelated = theInstance[hiddenRelation.name]()
									for (var n = 0; n < hiddenRelated.length; n++) {
										var hiddenChild = hiddenRelated[n];
										if (hiddenChild[relation.keyThrough] == child.id) {
											myChild = hiddenChild
											break;
										}
									}
									break
								}
							}
							item.url = '/admin/views/' + relation.modelThrough + '/' + myChild.id + '/view'
						}

						children[relation.name].children.push(item);
					}
				}
			}

			if (!theInstance) {
				theInstance = {};
			}

			render('admin/views/instance.pug', {
				'currentUser': loopbackContext.get('currentUser'),
				'isSuperUser': loopbackContext.get('isSuperUser'),
				'isUserModel': model === userModelName,
				'instanceIsAdminUser': isAdminUser,
				'instanceIsSuperUser': isSuperUser,
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
