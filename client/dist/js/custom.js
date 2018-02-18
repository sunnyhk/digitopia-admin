var ajax_post = function(url, data) {
	var posting = $.post(url, data);

	posting.done(function() {
		alert("Success");
	})
	.fail(function() {
		alert("Failed");
	})
	.always(function() {
		location.reload();
	});
};