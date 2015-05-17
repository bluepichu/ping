$(window).load(function() {
	var smallScreen = window.matchMedia("only screen and (max-width: 480px)").matches;
	if (smallScreen) {
		setTimeout(function() {
			$("#preload-image").addClass("enlarge")
		}, 1500);
		setTimeout(function() {
			$("#preload").addClass("gone");
			$("#preload-image").addClass("gone");
			setTimeout(function() {
				$("#preload").css("display", "none");
			}, 550);
		}, 2000);
	}
});