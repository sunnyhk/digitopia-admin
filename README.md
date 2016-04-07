# digitopia-admin

A simple backend CMS for loopback sites

Mounts backend services on /admin

Users with "admin" role can log in and list/view/edit instances in all the database models defined in loopback.

Status: very early stages of development, building for a particular project but with public release in mind.

Usage example:

https://github.com/mediapolis/digitopia-example

Documentation http://blog.digitopia.com/

to install add module to package.json

`"digitopia-admin": "git+https://github.com/mediapolis/digitopia-admin.git"`

add boot/00-admin.js to mount /admin app
params:
* server: app
* userAuth: an array of middleware to ensure that the user has permission to use /admin
* userModelName: plural form of user table for constructing login/logout endpoints
* tableNames: array or model names to add to navigation

```javascript
var adminBoot = require('digitopia-admin');
var getCurrentUser = require('../middleware/context-currentUser');
var ensureAdminUser = require('../middleware/context-ensureAdminUser');

module.exports = function (server) {
	var userAuth = [getCurrentUser(), ensureAdminUser()];
	adminBoot(server, userAuth, 'MyUsers', ['MyUser', 'ImageSet']);
};
```
