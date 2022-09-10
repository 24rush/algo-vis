import {Scene} from "./build/scene.js"

if (!String.prototype.format) {
    String.prototype.format = function() {
      var args = arguments;
      return this.replace(/{(\d+)}/g, function(match, number) { 
        return typeof args[number] != 'undefined'
          ? args[number]
          : match
        ;
      });
    };
  }

export function logd(msg) {
    console.log(msg);
}

export function strformat() {
  var newArgs = [];
  for (let arg in arguments) {
    if (arg == 0)
      continue;

    newArgs.push(arguments[arg]);
  }

  return arguments[0].format(...newArgs);
}

export var esprima = exports.esprima;

new Scene("app", "code-editor");