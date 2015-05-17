$(function() {
	var $search = $("#search"),
		$searchTerm = $("#search-term");

	$searchTerm.change(function() {
		// search?
	});
	$search.find("a").click(function() {
		if ($search.hasClass("active")) {
			$search.blur();
			setTimeout(function() {
				$search.removeClass("active");
			}, 100);
			setTimeout(function() {
				$searchTerm.val("");
			}, 500);
		} else {
			$search.addClass("active");
			setTimeout(function() {
				$searchTerm.focus();
			}, 300);
		}
	});
	$('#settings').click(function() {
		$("#modal-settings").openModal();
	});
	$("#sorting-algorithm").material_select();
	$("#unsubscribe").click(function() {
		$("#modal-settings").closeModal();
		setTimeout(function() {
			$("#modal-confirmation").openModal();
		}, 300);
	})
});