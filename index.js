var adminBoot = require("./server/boot/admin.js")

module.exports = function (server, userAuth) {
	console.log('mounting digitopia-admin');
	adminBoot(server, userAuth);
};
