var TWILIO_SID = process.env.TWILIO_SID;
var TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
var TWILIO_NUMBER = process.env.TWILIO_NUMBER;
var twilio = require("twilio")(TWILIO_SID, TWILIO_AUTH_TOKEN);
var AsyncHandler = require("./async").AsyncHandler;

var send = function(to, message, cb){
	if(to.constructor === Array){
		var ash = new AsyncHandler(cb);
		for(var i = 0; i < to.length; i++){
			ash.attach(sendOne, [to[i], message], function(){ this.next() });
		}
		ash.run();
	} else {
		sendOne(to, message, cb);
	}
}

var sendOne = function(to, message, cb){
	twilio.sendMessage({
		to: to,
		from: TWILIO_NUMBER,
		body: message
	}, cb);
}

module.exports = {
	send: send
}