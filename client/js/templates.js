var jade = require('jade/runtime'); module.exports = {
"main": function(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;

buf.push("<div class=\"tabs\"><div class=\"header\"><ul class=\"tab-links\"><li data-tab=\"cams\" class=\"active\"><a><i class=\"fa fa-home fa-2x\"></i></a></li><li data-tab=\"display\"><a><i class=\"fa fa-eye fa-2x\"></i></a></li><li data-tab=\"settings\"><a><i class=\"fa fa-gear fa-2x\"></i></a></li><li data-tab=\"console\"><a><span class=\"fa-stack\"><i class=\"fa fa-square fa-stack-2x\"></i><i class=\"fa fa-terminal fa-stack-1x fa-inverse\"></i></span></a></li><li data-tab=\"links\"><a><i class=\"fa fa-github fa-2x\"></i></a></li></ul></div><div class=\"tab-content\"><div id=\"cams\" class=\"tab active\"><p>Cams</p></div><div id=\"display\" class=\"tab\"><p>Display</p></div><div id=\"settings\" class=\"tab\"><p>Settings</p></div><div id=\"console\" class=\"tab\"><p>Console</p></div><div id=\"links\" class=\"tab\"><p>Other stuff</p></div></div><div class=\"tool-buttons\"><span class=\"minimize\"><a><i class=\"fa fa-compress\"></i></a></span><span class=\"close\"><a><i class=\"fa fa-close\"></i></a></span></div></div>");;return buf.join("");
},
"test": function(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (test) {
buf.push("<div>test template " + (jade.escape((jade_interp = test) == null ? '' : jade_interp)) + "</div>");}.call(this,"test" in locals_for_with?locals_for_with.test:typeof test!=="undefined"?test:undefined));;return buf.join("");
}};
