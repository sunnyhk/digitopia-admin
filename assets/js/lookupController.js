(function ($) {
	function lookupController(elem, options) {
		this.element = $(elem);
	}
	$.fn.lookupController = GetJQueryPlugin('lookupController', lookupController);
})(jQuery);
