var express = require("express");
var app = express();
var bodyparser = require("body-parser");
app.use(bodyparser.json());
app.use(bodyparser.urlencoded());
var cookieparser = require("cookie-parser");
app.use(cookieparser());
var http = require("http").Server(app);
var path = require("path");
var db = require("./db");
var ObjectId = db.ObjectId;
var twilio = require("./twilio");
var cryptoString = require("random-crypto-string");
var crypto = require("crypto");
var extend = require("extend");
var tweet = require("./twitter");
var qr = require("./qr");

require("string-format").extend(String.prototype);

var morgan = require("morgan");
app.use(morgan("dev"));

var HASH_COUNT = 2;

var REPLIES = {
	subscribe: {
		success: "You have succesfully subscribed to {0}.",
		missing: "You need to specify what to subscribe to!  Use PING SUBSCRIBE or PING SUB followed by an event handle (optionally with a channel).",
		nonexistentChannel: "That channel doesn't exist.",
		nonexistentEvent: "That event doesn't exist."
	},
	unsubscribe: {
		success: "You have succesfully unsubscribed from {0}.",
		missing: "You need to specify what to unsubscribe from!  Use PING UNSUBSCRIBE, PING UNSUB, or PING STOP followed by an event handle (optionally with a channel) or ALL if you want to unsubscribe from everything.",
		notSubscribed: "You weren't subscribed to {0}.",
		nonexistentChannel: "That channel doesn't exist.",
		nonexistentEvent: "That event doesn't exist."
	},
	help: "To subscribe, send PING SUBSCRIBE or PING SUB followed by the event handle (optionally with a channel).\nTo unsubscribe, send PING UNSUBSCRIBE, PING UNSUB, or PING STOP followed by the event handle (optionally with a channel).\nTo stop all subscriptions, send PING UNSUBSCRIBE ALL, PING UNSUB ALL, or PING STOP ALL.\nTo view this message, send PING HELP.\nFor more information, visit urlhere.com.",
	default: "I don\"t understand that command.  (Did you forget to start with PING?)  To view help, reply PING HELP.",
	error: "Your request failed due to a server error.  Try again later.",
	welcome: "Welcome to Ping!  This system will allow you to receive text notifications for various events and channels.  For more information, visit urlhere.com or reply PING HELP."
};

var noCB = function(){};

var subscribe = function(tel, path){
	console.log(path);
	if(path.length < 1){
		twilio.send(tel, REPLIES.subscribe.missing, noCB);
		return;
	}
	db.getEventModel().find({
		slug: path[0]
	}, function(err, data){
		if(err || !data){
			console.log(err);
			twilio.send(tel, REPLIES.error, noCB);
			return;
		}
		if(data.length != 1){
			twilio.send(tel, REPLIES.subscribe.nonexistentEvent, noCB);
			return;
		}
		var event = data[0];
		db.getChannelModel().find({
			event: event._id,
			name: path[1] || "main"
		}, function(err, data){
			console.log(err, data);
			if(err || !data){
				console.log(err);
				twilio.send(tel, REPLIES.error, noCB);
				return;
			}
			if(data.length != 1){
				twilio.send(tel, REPLIES.subscribe.nonexistentChannel, noCB);
				return;
			}
			db.getUserModel().update({
				phone: tel
			}, {
				$addToSet: {
					subscriptions: data[0]._id
				}
			}, {
				upsert: true
			}, function(err, dat){
				if(err || !dat){
					console.log(err);
					twilio.send(tel, REPLIES.error, noCB);
					return;
				}
				console.log(dat);
				if(dat.upserted){
					twilio.send(tel, REPLIES.welcome, noCB);
				}
				twilio.send(tel, REPLIES.subscribe.success.format(path[0] + (path[1] ? " " + path[1] : "")), noCB);
				db.getChannelModel().update({
					_id: data[0]._id
				}, {
					$addToSet: {
						subscribers: tel
					}
				}, noCB);
			});
		});
	});
}

var unsubscribe = function(tel, path){
	if(path.length < 1){
		twilio.send(tel, REPLIES.unsubscribe.missing, noCB);
		return;
	}
	db.getUserModel().find({
		phone: tel
	}, function(err, data){
		if(err || !data){
			twilio.send(tel, REPLIES.error, noCB);
			return;
		}
		if(data.length == 0){
			twilio.send(tel, REPLIES.unsubscribe.notSubscribed);
			return;
		}
		var user = data[0];
		db.getEventModel().find({
			slug: path[0]
		}, function(err, dat){
			if(err || !dat){
				twilio.send(tel, REPLIES.error, noCB);
				return;
			}
			if(dat.length != 1){
				twilio.send(tel, REPLIES.unsubscribe.nonexistentEvent, noCB);
				return;
			}
			var event = dat[0];
			db.getChannelModel().find({
				event: event._id,
				name: path[1] || "main"
			}, function(err, dt){
				if(err || !dat){
					twilio.send(tel, REPLIES.error, noCB);
					return;
				}
				if(dat.length != 1){
					twilio.send(tel, REPLIES.unsubscribe.nonexistentChannel, noCB);
					return;
				}
				var channel = dt[0];
				if(user.subscriptions.indexOf(channel._id) < 0){
					twilio.send(tel, REPLIES.unsubscribe.notSubscribed.format(path[0] + (path[1] ? " " + path[1] : "")), noCB);
					return;
				}
				db.getUserModel().update({
					_id: user._id
				}, {
					$pull: {
						subscriptions: channel._id
					}
				}, noCB);
				db.getChannelModel().update({
					_id: channel._id
				}, {
					$pull: {
						subscribers: tel
					}
				}, function(err, d){
					if(err || !d){
						twilio.send(tel, REPLIES.error, noCB);
						return;
					}
					twilio.send(tel, REPLIES.unsubscribe.success.format(path[0] + (path[1] ? " " + path[1] : "")), noCB);
				});
			});
		});
	});
}

var static = function(pth){
	return function(req, res){
		res.sendFile(pth, {root: path.join(__dirname, "../public")});
	}
}

var checkSchema = function(object, schema){
	for(field in object){
		if(!(field in schema)){
			return false;
		}
	}
	for(field in schema){
		if(schema[field].indexOf("optional") < 0 && !(field in object)){
			return false;
		}
		if(schema[field].indexOf("optional") >= 0 && !(field in object)){
			continue;
		}
		if(schema[field].indexOf((object[field].constructor === Array) ? "array" : typeof(object[field])) < 0){
			return false;
		}
	}
	return true;
}

var passwordHash = function(password, salt){
	for(var i = 0; i < HASH_COUNT; i++){
		var hash = crypto.createHash("sha512");
		password = hash.update(password).update(salt).digest("base64");
	}
	return password;
}

app.get("/css/:file", function(req, res){
	res.sendFile("/css/" + req.params.file, {root: path.join(__dirname, "../public")});
});

app.get(/\/js\/(.*)/, function(req, res){
	res.sendFile("/js/" + req.params[0], {root: path.join(__dirname, "../public")});
});

app.get(/\/font\/(.*)/, function(req, res){
	res.sendFile("/font/" + req.params[0], {root: path.join(__dirname, "../public")});
});

app.get("/images/:file", function(req, res){
	res.sendFile("/images/" + req.params.file, {root: path.join(__dirname, "../public")});
});

app.post("/twilio", function(req, res){
	var message = req.body.Body.toLowerCase().split(/[\s\/]/g);

	if(message[0] != "ping"){
		twilio.send(req.body.From, REPLIES.default, noCB);
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
			twilio.send(req.body.From, REPLIES.help, noCB);
			break;
		case "default":
			twilio.send(req.body.From, REPLIES.default, noCB);
			break;
	}

	res.sendFile("/twilio.xml", {root: path.join(__dirname, "../public")});
});

app.get("/qrtest", function(req, res){ // testing only
	res.send(qr("tsa-smash4"));
});

app.get("/twitter", function(req, res){ // testing only
	res.send(tweet(function(data){
		alert(data)
	}, "@ping_1t"));
});

app.get("/dbtest", function(req, res){
	db.getEventModel().findOne({name:"HackTJ 3.0"},function(err, evt){
		db.getChannelModel().findOne({name:"HackTJ 3.0 main channel"}, function(err, chan){
			db.createSubChannel(chan.id, "Workshops", evt.id);	
		});
	});
	//Event.findOne({name:"HackTJ 2.0"}, function(err, evt){
	//	db.newSubEvent(evt.id, "Cookie Baking Workshop", "Learn to bake cookies!", new Date());
	//});
	res.send("DB tested.");
});

app.post("/user/new", function(req, res){
	if(!checkSchema(req.body, {
		phone: "string",
		password: "string"
	})){
		res.status(200).send("{\"ok\": false, \"reason\": \"Invalid parameters.\"}");
		return;
	}
	cryptoString(8, function(err, salt){
		if(err || !salt){
			res.status(500).send("Internal error: failed generating salt.\n" + err);
			return;
		}
		db.getUserModel().find({
			phone: req.body.phone,
			password: {
				$exists: true
			}
		}, function(err, data){
			if(err || !data){
				res.status(500).send("Internal error: failed retrieving data.\n" + err + ", " + data);
				return;
			}
			if(data.length > 0){
				res.status(200).send("{\"ok\": false, \"reason\": \"Account already exists.\"}");
				return;
			}
			cryptoString(8, function(err, verCode){
				db.getUserModel().update({
					phone: req.body.phone
				}, {
					$set: {
						password: passwordHash(req.body.password, salt),
						salt: salt,
						verification: verCode
					},
					$setOnInsert: {
						organized: [],
						participated: [],
						spectated: [],
						subscriptions: [],
						authTokens: []
					}
				}, {
					upsert: true
				}, function(err, dat){
					res.status(200).send("{\"ok\": true}");
					twilio.send(req.body.phone, "Your Ping account verification code is \"" + verCode + "\".  If you didn't try to make an account on Ping, you may ignore this message.");
				});
			});
		});
	});
});

app.post("/user/verify", function(req, res){
	if(!checkSchema(req.body, {
		phone: "string",
		verificationCode: "string"
	})){
		res.status(200).send("{\"ok\": false, \"reason\": \"Invalid parameters.\"}");
		return;
	}

	db.getUserModel().find({
		phone: req.body.phone,
		verification: req.body.verificationCode
	}, function(err, data){
		if(err || !data){
			res.status(500).send("Inernal request: failed reading user data.");
			return;
		}
		if(data.length != 1){
			res.status(200).send("{\"ok\": false, \"reason\": \"Invalid verification code.\"}");
			return;
		}
		cryptoString(24, function(err, token){
			if(err || !token){
				res.status(500).send("Internal error: failed generating token.");
				return;
			}
			res.cookie("authToken", token).cookie("phone", req.body.phone);
			res.status(200).send("{\"ok\": true}");
			twilio.send(req.body.phone, "You have succesfully registered for Ping!");
			db.getUserModel().update({
				phone: req.body.phone
			}, {
				$set: {
					verification: true
				},
				$push: {
					authTokens: token
				}
			}, noCB);
		});
	});
});

app.post("/user/auth", function(req, res){
	if(!checkSchema(req.body, {
		phone: "string",
		password: "string"
	})){
		res.status(200).send("{\"ok\": false, \"reason\": \"Invalid parameters.\"}");
		return;
	}

	db.getUserModel().find({
		phone: req.body.phone,
		verification: true,
		password: {
			$exists: true
		}
	}, function(err, data){
		if(err || !data){
			res.status(500).send("Internal error: failed retrieving data.");
			return;
		}
		if(data.length != 1){
			res.status(200).send("{\"ok\": false, \"reason\": \"User does not exist.\"}");
			return;
		}
		user = data[0];
		if(user.password == passwordHash(req.body.password, user.salt)){
			cryptoString(24, function(err, token){
				if(err || !token){
					res.status(500).send("Internal error: failed generating token.");
					return;
				}
				res.cookie("authToken", token).cookie("phone", req.body.phone);
				res.status(200).send("{\"ok\": true}");
				db.getUserModel().update({
					phone: req.body.phone
				}, {
					$push: {
						authTokens: token
					}
				}, noCB);
			});
		} else {
			res.status(200).send("{\"ok\": false, \"reason\": \"Incorrect password.\"}");
			return;
		}
	});
});

app.post("/event/new", function(req, res){
	if(!checkSchema(req.body, {
		name: "string",
		slug: "optional string",
		description: "optional string",
		format: "optional string",
		public: "optional string"
	})){
		res.status(200).send("{\"ok\": false, \"reason\": \"Invalid parameters.\"}");
		return;
	}
	extend(req.body, {
		slug: req.body.name.toLowerCase().replace(/\s+/g, "-").replace(/[^A-Za-z0-9-]/g, ""),
		format: "panel",
		channels: []
	});
	db.getEventModel().find({
		slug: req.body.slug
	}, function(err, data){
		if(err || !data){
			res.status(500).send("Internal error: failed retrieving data.");
			return;
		}
		if(data.length > 0){
			res.status(200).send("{\"ok\": false, \"reason\": \"An event with that slug already exists.\"}");
			return;
		}
		db.getEventModel().create(req.body, function(err, dat){
			if(err || !dat){
				res.status(500).send("Internal error: failed inserting data.");
				return;
			}
			res.status(200).send("{\"ok\": true}");
		});
	});
});

app.get("/event/:handle&slug=:slug", function(req, res){
	console.log(req.query, req.params.handle, req.params.id, req.params.slug);
	if(!req.params.slug && !req.params.id){
		console.log("dbid " + req.params.id);
		res.status(200).send("{\"ok\": false, \"reason\": \"Invalid parameters\"}");
		return;
	}
	db.getEventModel().findOne({$or:[ {slug: req.params.slug}, {id: req.params.id}] }, function(err, data){
		if(err || !data){
			res.status(500).send("Internal error: failed retrieving data.");
			return;
		}
		console.log("gotv here");
		var participantNames = [];
		for(var i = 0; i < data.participants.length; i++){
			db.getUserModel().findById( data.participants[i], function(errr, person){
				if(errr || !person){
					console.log("supposed participant did not exist");
				}
				else{
					participantNames.push(person.name);
				}
			});
		}

		var message = data.toObject();
		message.participants = participantNames;
		res.status(200).send(JSON.stringify(message));
		console.log(message);
	});
});


app.get("/", static("/"));

app.get("/user/new", static("/user/new.html"));

app.get("/events", static("/events.html"));

app.post("/post/:event/:channel", function(req, res){
	if(!checkSchema(req.body, {
		message: "string"
	})){
		res.status(200).send("{\"ok\": false, \"reason\": \"Invalid parameters.\"}");
		return;
	}
	if(!req.cookies.phone || !req.cookies.authToken){
		res.status(200).send("{\"ok\": false, \"reason\": \"Insufficient priviliges.\"}");
		return;
	} 
	db.getUserModel().find({
		phone: req.cookies.phone,
		authTokens: {
			$in: [req.cookies.authToken]
		}
	}, function(err, data){
		if(err || !data){
			res.status(500).send("Internal error: failed reading user data.");
			return;
		}
		if(data.length != 1){
			res.status(200).send("{\"ok\": false, \"reason\": \"Insufficient priviliges.\"}");
			return;
		}
		var user = data[0];
		db.getEventModel().find({
			slug: req.params.event,
			organizers: {
				$in: [req.cookies.phone]
			}
		}, function(err, dat){
			console.log(dat, req.params.event, req.cookies.phone);
			if(err || !dat){
				res.status(500).send("Internal error: failed reading event data.");
				return;
			}
			if(dat.length != 1){
				res.status(200).send("{\"ok\": false, \"reason\": \"Event does not exist or insufficient priviliges.\"}");
				return;
			}
			console.log(dat);
			var event = dat[0];
			db.getChannelModel().find({
				event: event._id,
				name: req.params.channel
			}, function(err, dt){
				if(err || !dt){
					res.status(500).send("Internal error: failed reading channel data.");
					return;
				}
				if(dt.length != 1){
					res.status(200).send("{\"ok\": false, \"reason\": \"Channel does not exist.\"}");
					return;
				}
				var channel = dt[0];
				twilio.send(channel.subscribers, "[" + event.slug + (channel.name == "main" ? "]" : "/" + channel.name + "]") + " " + req.body.message, noCB);
				res.status(200).send("{\"ok\": true}");
			}); 
		});
	});
});

app.get("/qr/:event/:channel", function(req, res){
	res.send(qr(req.params.event, req.params.channel));
});

http.listen(process.env.PORT || 1337, noCB);
