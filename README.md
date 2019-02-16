# Turtle transmission server

## Configuration

All configuration is in the file `config.json` :

```json
{
  "allowed-paths": [
    "/allowed/directory/path/A", 
    "/another/allowed/path"
  ],
  "port": 9092,
  "bind-address": "0.0.0.0",
  "transmission-daemon-conf-path": "/var/lib/transmission-daemon/info/settings.json",
  "whitelist": [
    "192.168.*.*"
  ]
}
```

## Authentication

It uses JSWT (JSon Web Token) for authentication.
Using the `/signin` route, the client send a username and a password and the API return a token that should be passed to the next API calls through HTTP headers

The username

## Directory Routes

### POST `/signin`

Sign in to the server

#### Body Parameters

Parameter name | Type | Optionnal
---------------|------|--------------
`username`     | `string` | false
`password`     | `string` | false

### GET  `/directories`

List all the allowed directories that the user can browse and modify

#### Result

An JSON array of string paths

```json
["/path/1", "/path/other"]
```

### GET `/directories/:path`

List the content of a given directory

#### Url parameters

Parameter name | Type | Optionnal     | Description
---------------|------|---------------|-------------
`path`     | `string` | false         |
`depth`	   | `number` | true (default: `1`)    | The depth of the listing. 

#### Result

An JSON array representing the directory tree

```json
[{
	"path": "/path/to/A",
	"files": [{
		"path": "/path/to/A/A"
	}, {
		"path": "/path/to/A/B"
	}]
}, {
	"path": "/path/to/B",
	"files": []
}]
```

### POST `/directories`

Adds a new directory.

#### Body paramters

Parameter name | Type | Optionnal     | Description
---------------|------|---------------|-------------
`path`     | `string` | false         | The path of the directory to create. The path should be inside one of the allowed directories (see GET `/directories`)

#### Result

The directory :

```json
{
	"path": "/the/created/directory/path",
	"files": []
}
```

### DELETE `/directories/:path`

Parameter name | Type | Optionnal     | Description
---------------|------|---------------|-------------
`path`     | `string` | false         | The path of the directory to delete. The path should be inside one of the allowed directories (see GET `/directories`)

#### Result 

The deleted directory :

```json
{
	"path": "/the/deleted/directory/path",
	"files": []
}
```

## File Routes

### POST `/files/move`

Parameter name | Type | Optionnal     | Description
---------------|------|---------------|-------------
`from-path`     | `string` | false         | 
`to-path`     | `string` | false         | 