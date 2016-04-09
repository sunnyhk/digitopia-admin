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

###Model Configuration
"admin" properties define /admin behavior for models

[example MyUser](https://github.com/mediapolis/digitopia-example/blob/master/common/models/MyUser.json)

[example Loopback Types](https://github.com/mediapolis/digitopia-example/blob/master/common/models/type-test.json)

```

// add this objects to define the /admin properties to expose for each view
"admin": {
  "defaultProperty": "email", // property to display in relation links and for search
  "listProperties": [], // list of properties on list view
	"viewProperties": [], // list of properties on instance view
  "editProperties": []  // list of properties on edit view
}

// in property definition objects you can refine the default behavior

"propertyname":{
	"type":"string",
	"admin":{
		"inputType": "textarea" // edit UI textarea
	}
}

// UI behavior choose value from static set
"chooseOneExample": {
  "type": "string",
  "admin": {
    "options": ["one", "two", "three"] // edit UI as radio
  }
}

"chooseMultipleExample": {
  "type": ["string"],
  "admin": {
    "options": ["one", "two", "three"],
    "multiple": true //  edit UI as checkboxes
  }
}

"aDate": {
  "type": "date",
  "admin": {
    "inputType": "datetime" //  edit UI as date and time
  }
}
...

enable client side validation as needed on a property

"someProperty": {
	type: 'xxx',
	admin:{
		validate: {
			required:true,
			integer:true,
			float:true,
			url:true,
			email:true,
			password:true,
			cc-number:true,
			cc-exp:true,
			cc-cvc:true,
			mask: 'regex',
			length: integer,
			min-length: integer,
			max-length: integer,
			min: float,
			max: float,
			match: '#password' // confirming input - jquery selector of input to confirm
		}
	}
}
...

define acl to allow model access to "admin" role
{
  "accessType": "*",
  "principalType": "ROLE",
  "principalId": "admin",
  "permission": "ALLOW",
  "property": "*"
}
```
