var express = require("express");
var app = express();
var bodyparser = require("body-parser");
app.use(bodyparser.urlencoded());
var http = require("http").Server(app);
var path = require("path");
var db = require("./db");
var ObjectId = db.ObjectId;
var twilio = require("./twilio");
var qr = require("./qr");

var morgan = require("morgan");
app.use(morgan("dev"));

var replies = {
	subscribe: {
		success: "You have been subscribed.",
		missing: "You need to specify what to subscribe to!  Use PING SUBSCRIBE or PING SUB followed by an event handle (optionally with a channel)."
	},
	unsubscribe: {
		success: "You have been unsubscribed.",
		missing: "You need to specify what to unsubscribe from!  Use PING UNSUBSCRIBE, PING UNSUB, or PING STOP followed by an event handle (optionally with a channel) or ALL if you want to unsubscribe from everything."
	},
	help: "To subscribe, send PING SUBSCRIBE or PING SUB followed by the event handle (optionally with a channel).\nTo unsubscribe, send PING UNSUBSCRIBE, PING UNSUB, or PING STOP followed by the event handle (optionally with a channel).\nTo stop all subscriptions, send PING UNSUBSCRIBE ALL, PING UNSUB ALL, or PING STOP ALL.\nTo view this message, send PING HELP.",
	default: "I don't understand that command.  (Did you forget to start with PING?)  To view help, reply PING HELP."
};

//

var subscribe = function(tel, path){
	if(path.length < 1){
		twilio.send(tel, replies.subscribe.missing, function(){});
		return;
	}
	// TODO
	twilio.send(tel, replies.subscribe.success, function(){});
}

var unsubscribe = function(tel, path){
	if(path.length < 1){
		twilio.send(tel, replies.unsubscribe.missing, function(){});
		return;
	}
	// TODO
	twilio.send(tel, replies.unsubscribe.success, function(){});
}

var encrypt = function(tel){
	var enc = "";
	
	for(var i = 0; i < tel.length; i++){
		enc += tel.charAt(i) + 5;
	}
	
	return enc;
}

var decrypt = function(tel){
	var dec = "";
	
	for(var i = 0; i < tel.length; i++){
		dec += tel.charAt(i) - 5;
	}
	
	return dec;
}

//

app.get("/css/:file", function(req, res){
	res.sendFile("/css/" + req.params.file, {root: path.join(__dirname, "../public")});
});

app.get("/js/:file", function(req, res){
	res.sendFile("/js/" + req.params.file, {root: path.join(__dirname, "../public")});
});

app.post("/twilio", function(req, res){
	var message = req.body.Body.toLowerCase().split(/[\s\/]/g);
	
	if(message[0] != "ping"){
		twilio.send(req.body.From, replies.default, function(){});
		return;
	}
	
	switch(message[1]){
		case "subscribe":
		case "sub":
			subscribe(req.body.From, message.slice(2));
			break;
		case "unsubscribe":
		case "unsub":
		case "stop":
			unsubscribe(req.body.From, message.slice(2));
			break;
		case "help":
			twilio.send(req.body.From, replies.help, function(){});
			break;
		case "default":
			twilio.send(req.body.From, replies.default, function(){});
			break;
	}
	
	res.sendFile("/twilio.xml" + req.params.file, {root: path.join(__dirname, "../public")});
});

app.get("/twilio", function(req, res){ // testing only
	twilio.send(["+17032096667", "+17032096667"], "Oh well", function(err, data){
		if(!err){
			console.log("success");
		} else {
			console.log("failure", err);
		}
	});
	res.send("<a href='sms://+17032096667?body=omg123'>Message sent.</a>");
});

app.get("/qrtest", function(req, res){ // testing only
	res.send(qr("tsa-smash4"));
});

http.listen(process.env.PORT || 1337, function(){});