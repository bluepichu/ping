
var uristring = process.env.MONGOLAB_URI ||
	process.env.MONGOHQ_URL ||
	'mongodb://localhost/ping';
console.log("uristring is " + uristring);

var mongoose = require('mongoose');

mongoose.connect(uristring);

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function (callback) {
	var channelSchema = mongoose.Schema({
		name		: String,
		subscribed	: [mongoose.Schema.Types.Mixed], // all subscribed to the channel; users and loose phones
		event		: Event,
		subChannels	: [Channel] // notification to a channel is also sent to all subchannels
	});
	var userSchema = mongoose.Schema({
		name		: String,
		phone		: String,
		channels	: [Channel], // channels
		organized	: [Event], // events the user is running
		participated: [Event], // events the user is going to
		spectated	: [Event] // events the user is spectating
	});
	var eventSchema = mongoose.Schema({
		name		: String,
		description	: String,
		phones		: [String], // for loose phones that have subscribed to something in the event
		channels	: [Channel],
		participants: [User],
		spectators	: [User], // users who subscribe to something in the event?
		subEvents	: [SubEvent]
		// time		: Date
	});
	var subEventSchema = mongoose.Schema({ // match, heat, or panel
		name		: String,
		description	: String,
		
		parentEvent : Event,
		
		channels	: [Channel],
		participants: [User],
		spectators	: [User],
		time		: Date,
		// endTime	: Date
	});
	
	var Channel	= mongoose.model('Channel', channelSchema);
	var User	= mongoose.model('User', userSchema);
	var Event	= mongoose.model('Event', eventSchema);
	var SubEvent= mongoose.model('SubEvent', subEventSchema);
});

function newEvent(name, description){
	var evt = new Event();
	evt.name = name;
	evt.description = description;
	evt.save(function(err, user_Saved){
	    if(err){
	        throw err;
	        console.log(err);
	    }else{
	        console.log('saved!');
	    }
	});
	return evt;
}

