/**
 * Created by Lucas on 6/2/15.
 */

var CHALLONGE_API_KEY = process.env.CHALLONGE_API_KEY;
var CHALLONGE_BASE_URL = 'https://api.challonge.com/v1/';
var request = require('request');
var AsyncHandler = require("./async").AsyncHandler;

var createTournament = function(settings, cb) {
	request({
		url: CHALLONGE_BASE_URL + 'tournaments',
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		json: {
			api_key: CHALLONGE_API_KEY,
			tournament: settings
		}
	}, function(error, response, body){
		if(error) {
			console.log(error);
		} else {
			if(response.statusCode !== 200) {
				return console.log('Invalid Status Code Returned:', response.statusCode);
			}
			console.log(response.statusCode, body);
			cb({
				url: response.tournament.url,
				id: response.tournament.id
			});
		}
	});
};

var addPlayers = function(players, tournamentid, cb) {
	var playerIds = [];
	for(var i = 0; i < players.length; i++){
		playerIds.push(null);
	}
	if(players.constructor === Array){
		var ash = new AsyncHandler(function(){
			cb(playerIds);
		});
		for(var i = 0; i < players.length; i++){
			ash.attach(addPlayer, [players[i], tournamentid], (function(ind){ return function(err, data){
				playerIds[ind] = data;
				this.next()
			}})(i));
		}
		ash.run();
	} else {
		addPlayer(players, tournamentid);
	}
};

var addPlayer = function(player, tournamentid, cb) {
	request({
		url: CHALLONGE_BASE_URL + 'tournaments/' + tournamentid + '/participants',
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		json: {
			api_key: CHALLONGE_API_KEY,
			participant: player
		}
	}, function(error, response, body){	// Callback
		if(error) {
			console.log(error);
		} else {
			if(response.statusCode !== 200) {
				return console.log('Invalid Status Code Returned:', response.statusCode);
			}
			console.log(response.statusCode, body);
			cb(null, response.participant.id);
		}
	});
};

var alterTournament = function(altertype) {
	function alter(tournamentid, cb) {
		request({
			url: CHALLONGE_BASE_URL + 'tournaments/' + tournamentid + '/' + altertype,
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			json: {
				api_key: CHALLONGE_API_KEY
			}
		}, function (error, response, body) {	// Callback
			if (error) {
				console.log(error);
			} else {
				if (response.statusCode !== 200) {
					return console.log('Invalid Status Code Returned:', response.statusCode);
				}
				console.log(response.statusCode, body);
				cb(response);
			}
		});
	}
};

var getMatches = function(tournamentid, state, participant, cb) {
	var req = {
		api_key: CHALLONGE_API_KEY
	};

	if (state != null) {
		req.state = state;
	} else {
		req.state = 'all';
	}
	if (participant != null) {
 		req.participant_id = participant;
	}

	request({
		url: CHALLONGE_BASE_URL + 'tournaments/' + tournamentid + '/matches',
		method: 'GET',
		headers: {
			'Content-Type': 'application/json'
		},
		json: req
	}, function(error, response, body){	// Callback
		if(error) {
			console.log(error);
		} else {
			if(response.statusCode !== 200) {
				return console.log('Invalid Status Code Returned:', response.statusCode);
			}
			console.log(response.statusCode, body);
			cb(response);
		}
	});
};

var submitMatch = function(tournamentid, matchid, results, cb) {
	request({
		url: CHALLONGE_BASE_URL + 'tournaments/' + tournamentid + '/matches/' + matchid,
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json'
		},
		json: {
			api_key: CHALLONGE_API_KEY,
			match: results
		}
	}, function(error, response, body){	// Callback
		if(error) {
			console.log(error);
		} else {
			if(response.statusCode !== 200) {
				return console.log('Invalid Status Code Returned:', response.statusCode);
			}
			console.log(response.statusCode, body);
			cb(response);
		}
	});
};

module.exports = {
	createTournament: createTournament,
	addPlayers: addPlayers,
	getMatches: getMatches,
	submitMatch: submitMatch,
	startTournament: alterTournament('start'),
	finalizeTournament: alterTournament('finalize'),
	resetTournament: alterTournament('reset')
};