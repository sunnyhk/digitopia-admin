var adminBoot = require('digitopia-admin');
module.exports = function (server) {
	var userAuth = [];
	adminBoot(server, userAuth);
};
