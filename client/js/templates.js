var jade = require('jade/runtime'); module.exports = {
"cams": function(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;

buf.push("<div class=\"tabs\"><div class=\"header\"><ul class=\"tab-links\"><li data-tab=\"cams\" class=\"active\"><a><i class=\"fa fa-home fa-2x\"></i></a></li><li data-tab=\"display\"><a><i class=\"fa fa-eye fa-2x\"></i></a></li><li data-tab=\"settings\"><a><i class=\"fa fa-gear fa-2x\"></i></a></li><li data-tab=\"console\"><a><span class=\"fa-stack\"><i class=\"fa fa-square fa-stack-2x\"></i><i class=\"fa fa-terminal fa-stack-1x fa-inverse\"></i></span></a></li><li data-tab=\"links\"><a><i class=\"fa fa-github fa-2x\"></i></a></li></ul></div><div class=\"tab-content\"><div id=\"cams\" class=\"tab active\"><p>Cams</p></div><div id=\"display\" class=\"tab\"><p>Display</p></div><div id=\"settings\" class=\"tab\"><p>Settings</p></div><div id=\"console\" class=\"tab\"><p>Console</p></div><div id=\"links\" class=\"tab\"><p>Other stuff</p></div></div><div class=\"tool-buttons\"><span class=\"minimize\"><a><i class=\"fa fa-compress\"></i></a></span><span class=\"close\"><a><i class=\"fa fa-close\"></i></a></span></div></div>");;return buf.join("");
},
"login": function(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;

buf.push("<style type=\"text/css\">body {\n  height: 100%;\n  margin: 0;\n  padding: 0;\n  background: #ABA9AA;\n  font-family: sans-serif;\n}\n\n.login_form {\n  width: 362px;\n  height: 220px;\n  margin-left: auto;\n  margin-right: auto;\n  margin-top: 200px;\n  background-color: #343234;\n  border-radius: 10px;\n  box-shadow: 0 0 20px;\n}\n\n.project {\n  margin: auto;\n  width: 362px;\n  text-align: right;\n  font-size: x-small;\n}\n\n.login_form div {\n  margin: 4px auto 4px auto;\n  width: 200px;\n}\n\n.login_form input {\n  padding: 3px;\n  text-align: center;\n  width: 200px;\n  border: 1px solid #b9b9b9;\n  border-top: 1px solid #a0a0a0;\n  -webkit-box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);\n  -moz-box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);\n  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);\n}\n\n.login_form input:hover {\n  border: 1px solid #b9b9b9;\n  border-top: 1px solid #a0a0a0;\n  -webkit-box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);\n  -moz-box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);\n  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);\n}\n\n.login_form input[type=\"submit\"] {\n  width: 120px;\n  margin: auto;\n  display: block;\n}\n\n.login_form img {\n  margin: 10px 0 -2px 0;\n}\n\n#message {\n  display: block;\n  color: rgb(255, 214, 52);\n  text-align: center;\n  font-size: small;\n  height: 16px;\n}</style><body><form id=\"loginForm\"><div class=\"login_form\"><img height=\"90\" src=\"/logo.png\"/><span id=\"message\"></span><div><input type=\"text\" id=\"name\" name=\"name\" placeholder=\"login\"/></div><div><input type=\"password\" id=\"password\" name=\"password\" placeholder=\"password\"/></div><div><input type=\"submit\" value=\"Login\"/></div></div></form></body>");;return buf.join("");
},
"main": function(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;

buf.push("<div id=\"window\"></div>");;return buf.join("");
},
"test": function(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (test) {
buf.push("<div>test template " + (jade.escape((jade_interp = test) == null ? '' : jade_interp)) + "</div>");}.call(this,"test" in locals_for_with?locals_for_with.test:typeof test!=="undefined"?test:undefined));;return buf.join("");
}};
