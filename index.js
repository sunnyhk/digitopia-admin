var adminBoot = require("./server/boot/admin.js")

module.exports = function (server, userAuth, userModelName, tableNames, options) {
	console.log('mounting digitopia-admin');
	adminBoot(server, userAuth, userModelName, tableNames, options);
};
