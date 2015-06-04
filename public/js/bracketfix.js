/**
 * Created by Lucas on 6/3/15.
 */

// Additional code to modify behavior and appearance of the jQuery brackets
!function($) {

	var validMatch = function(e) {
		for (var i = 0; i < 2; i++) {
			if ($(e.target.parentElement.parentElement).find('.team')[i].getAttribute('data-teamid') == '-1') {
				return false
			}
		}
		return true;
	};

	$(document).ready(function() {
		$('.tools').remove();
		$('.label').click(function(e) {
			if (validMatch(e)) {
				console.log('click', e.target);
				// TODO Add code to call modal window and obtain participant data / send text to them
			}
		});
	});

}(jQuery);