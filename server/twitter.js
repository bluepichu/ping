var setTwitterQuery = function(cb, user_handle){
	setInterval(function(){ 
		var xhr = new XMLHttpRequest;
		xhr.onload = function(){
			var result = JSON.parse(this.responseText);
			cb(result[0][0]["text"]) 
		}
		xhr.open("GET", ("https://api.twitter.com/1.1/statuses/user_timeline.json?screen_name="+user_handle+"&count=1"), true);
		xhr.send();
	}, 60000);
}

module.exports = setTwitterQuery;