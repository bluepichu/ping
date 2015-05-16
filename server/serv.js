var express = require("express");
var app = express();
var bodyparser = require("body-parser");
app.use(bodyparser.json());
var http = require("http").Server(app);
var path = require("path");
var db = require("./db");
var ObjectId = db.ObjectId;
var twilio = require("./twilio");
var getQR = require("./qrcode");

app.get("/css/:file", function(req, res){
	res.sendFile("/css/" + req.params.file, {root: path.join(__dirname, "../public")});
});

app.get("/js/:file", function(req, res){
	res.sendFile("/js/" + req.params.file, {root: path.join(__dirname, "../public")});
});

app.get("/twilio", function(req, res){ // testing only
	twilio.send(["+17032096667", "+17032096667"], "Oh well", function(err, data){
		if(!err){
			console.log("success");
		} else {
			console.log("failure", err);
		}
	});
	res.send("Message sent.");
});

app.get("/qrtest", function(req, res){ // testing only
	getQR.getQR("handle");
});

http.listen(process.env.PORT || 1337, function(){});