/**
 * Created by und on 07.03.15.
 */

$(function() {
	var links = $('.tab-links');
	links.children('li').each(function() {
		this.onclick = function() {
			var tabs = $('.tab-content');
			tabs.children('div').hide();
			tabs.children('#' + this.dataset.tab).show();
			var links = $('.tab-links > li').removeClass('active');
			this.className = 'active';
		};
	});
	links.children('.buttons').click(function() {
		process.exit();
	});
});

$('.close').click(function() {
	App.close();
});

$('.minimize').click(function() {
	App.minimize();
});