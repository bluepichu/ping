var express = require("express");
var app = express();
var bodyparser = require("body-parser");
app.use(bodyparser.json());
var http = require("http").Server(app);
var path = require("path");
var db = require("./db");
var ObjectId = db.ObjectId;
var extend = require("extend");

app.get("/css/:file", function(req, res){
	res.sendFile("/css/" + req.params.file, {root: path.join(__dirname, "../public")});
});

app.get("/js/:file", function(req, res){
	res.sendFile("/js/" + req.params.file, {root: path.join(__dirname, "../public")});
});

http.listen(process.env.PORT || 1337, function(){});