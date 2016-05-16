'use strict'
const Datastore = require('nedb');
const fs = require('fs');

var dbPath = ('./db/lean.db');
if(!fs.existsSync(dbPath))
    fs.writeFile(dbPath);

var db = new Datastore({filename: dbPath, autoload: true });
module.exports = db;