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
	// Check login status
	if ($.cookie("authToken")) {
		$("#settings").click(function() {
			$("#modal-settings").openModal();
		});
	} else {
		$("#settings").text("Login").click(function() {
			$("#modal-login").openModal();
		});
	}
	$("#unsubscribe").click(function() {
		$("#modal-settings").closeModal();
		setTimeout(function() {
			$("#modal-confirmation").openModal();
		}, 300);
	});
});