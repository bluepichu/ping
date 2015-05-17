// copypaste this into a mongo console

var assignments = [
	["HackTJ 2.0", "/images/stub_hack.png"]	
]

function assignImage( eventname, url ){
	db.events.update({name:eventname}, {$set:{image:url}}, {multi:true});
}

for(var i = 0; i < assignments.length; i++){
	print("assigning " + assignments[i][1]);
	assignImage(assignments[i][0], assignments[i][1]);
}
