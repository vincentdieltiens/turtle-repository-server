'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const sha1 = require('sha1');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const config = require('./config.json');

// Host and port of the server
const PORT = process.env.PORT || config.port;
const HOST = config['bind-address'];

// Get Username and password of transmission-daemon
const transmissionConfig = require(config['transmission-daemon-conf-path']);

const transmissionUsername = transmissionConfig['rpc-username'];
const transmissionPassword = transmissionConfig['rpc-password'];

const router = express.Router();

router.get('/', function (req, res) {
	res.json({ message: 'nothing here' });
});

router.post('/signin', function (req, res) {
	let hashedPassword = hashPasswordLikeTransmission(req.body.password, transmissionPassword);

	if (transmissionUsername == req.body.username &&
		transmissionPassword == hashedPassword) {
		res.json({ message: 'Ok' });
	} else {
		res.json({ error: 403, message: 'Authentication failed' });
	}
});

router.get('/directories', function(req, res) {
	let paths = config['allowed-paths'];
	let directories = [];
	for(let i in paths) {
		directories.push({
			path: paths[i]
		});
	}
	res.json(directories);
});

router.get('/directories/:path*', function(req, res) {
	let requestedPath = Buffer.from(req.params.path, 'base64').toString('ascii');
	let otherParams = req.params[0].split('/').filter(item => item != '');
	let depth = otherParams ? parseInt(otherParams, 10) : 1;
	let paths = config['allowed-paths'];

	let computedPath = '';
	let isAllowed = false;
	for(var i in paths) {
		let relative = path.relative(paths[i], path.join('/', requestedPath));
		if (!relative.match(/\.\./)) {
			isAllowed = true;
			computedPath = path.join(paths[i], relative);
			break;
		}
	}

	if (!fs.existsSync(computedPath) || !isAllowed) {
		res.status(403).json({
			error: {
				error: 403,
				message: 'Not allowed'
			}
		});
		return;
	}

	let content = deepReaddir(computedPath, depth);

	res.json(content);
});

router.delete('/directories/:path', function(req, res) {
	let requestedPath = Buffer.from(req.params.path, 'base64').toString('ascii');
	let computedPath = isPathAllowed(requestedPath);
	
	if (!computedPath) {
		res.status(403).json({
			error: {
				error: 403,
				message: 'Not allowed'
			}
		});
		return;
	}

	if (!fs.existsSync(computedPath) ) {
		res.status(403).json({
			error: {
				error: 403,
				message: 'Directory doesn\'t exists'
			}
		});
		return;
	}

	if (isAllowedPathRoot(computedPath)) {
		res.status(403).json({
			error: {
				error: 403,
				message: 'Directory '+computedPath+' can\'t be deleted'
			}
		});
		return;
	}

	fs.rmdirSync(computedPath);

	let directory = {
		path: computedPath,
		type: 'directory'
	};

	res.json(directory);
});

router.put('/directories', function(req, res) {
	let requestedPath = req.body.path;
	let paths = config['allowed-paths'];
	let computedPath = isPathAllowed(requestedPath);
	
	if (!computedPath) {
		res.status(403).json({
			error: {
				error: 403,
				message: 'Not allowed'
			}
		});
		return;
	}
	
	if (fs.existsSync(computedPath) ) {
		res.status(409).json({
			error: {
				error: 409,
				message: 'Directory already exists'
			}
		});
		return;
	}

	fs.mkdirSync(computedPath);

	let directory = {
		path: computedPath,
		type: 'directory'
	};

	res.json(directory);
});

/**
 * Hash the given password using sallted sha1 (by extracting the salt from the hashed password of transmission config)
 * @param {string} password the password to hash
 * @param {string} transmissionPassword the hashed transmission password
 * @return the ssha1 password
 */
function hashPasswordLikeTransmission(password, transmissionPassword) {
	let salt = transmissionPassword.substr(-8);
	return '{'+saltedSha1Password(password, salt);
}

/**
 * hash the password using sha1 and a given salt
 * @param {string} password the password to hash
 * @param {string} salt the salt to use
 * @return the hashed password
 */
function saltedSha1Password(password, salt) {
	return sha1(password + salt) + salt;
}

/**
 * Tells if a given path is inside the allowed path (= is an allowed path of one of his descendant)
 * @param {string} requestedPath 
 * @return true if the path is allowed, false otherwise
 */
function isPathAllowed(requestedPath) {
	let paths = config['allowed-paths'];
	let computedPath = '';
	//
	// Test each allowed path
	//
	for(var i in paths) {
		// If the relative path has ".." in it, it's not a descendant directory
		let relative = path.relative(paths[i], path.join(requestedPath));
		if (!relative.match(/\.\./)) {
			computedPath = path.join(paths[i], relative);
			break;
		}
	}

	return computedPath;
}

function isAllowedPathRoot(_path) {
	let paths = config['allowed-paths'];
	for(var i in paths) {
		if (paths[i] == _path) {
			return true;
		}
	}
	return false;
}

function deepReaddir(_path, depth=1) {
	let options = { withFileTypes: true };
	let items = fs.readdirSync(_path, options);
	let content = [];
	items.map(item => {
		let itemPath = path.join(_path, item.name);
		let infos = {
			path: itemPath,
			type: item.isDirectory() ? 'directory' : 'file'
		};
		if(item.isDirectory() && depth > 1) {
			infos.files = deepReaddir(itemPath, depth-1);
		}
		content.push(infos);
	});
	return content;
}

// all of our routes will be prefixed with /api
app.use('/', router);

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);