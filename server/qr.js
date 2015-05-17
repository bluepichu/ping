var qr = require("qr-image");

var qrGen = function(event, channel){
	return qr.imageSync("sms://" + process.env.TWILIO_NUMBER + "?body=PING SUB " + event + (channel ? "/" + channel : ""), {type: "svg"});
}

module.exports = qrGen;