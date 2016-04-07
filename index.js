var adminBoot = require("./server/boot/admin.js")

module.exports = function (server, userAuth, userModelName, tableNames) {
	console.log('mounting digitopia-admin');
	adminBoot(server, userAuth, userModelName, tableNames);
};
