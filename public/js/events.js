$(function() {
	var $columns = [$("#col1"), $("#col2"), $("#col3")],
		defaultImg = "<div class=\"bookmark-icon\"><i class=\"mdi-action-bookmark-outline\"></i></div>",
		numCards = 0;

	var addCard = function(title, image, link) {
		var img = "<img src=\"" + image + "\"/>";
		if (image === undefined) {
			img = defaultImg;
		}
		$columns[numCards % 3].append("<a href=\"" + link + "\" target=\"_blank\"><div class=\"card small\">" +
			"<div class=\"card-image fill-card\">" +
			img +
			"<span class=\"card-title\">" + title + "</span>" +
			"</div>" +
			"</div></a>");
		numCards++;
	};
	var removeCards = function() {
		numCards = 0;
		$columns.forEach(function (column) {
			column.empty();
		});
	};
	$("#modal-event").openModal();
});