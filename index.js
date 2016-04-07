var adminBoot = require("./server/boot/admin.js")

module.exports = function (server, userAuth, tableNames) {
	console.log('mounting digitopia-admin');
	adminBoot(server, userAuth, tableNames);
};
