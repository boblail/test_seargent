/**
 * The Choreographer
 *  Your server is my stage -- dirt simple URL routing for Node.js.
 *
 * by Han
 *
 * http://github.com/laughinghan/choreographer
 *
 */


var sys         = require("sys"),
    parse       = require('url').parse,
    nodeStatic  = require('../node-static/lib/node-static');

this.Router = function() {
  
  if(!(this instanceof arguments.callee)) {
    return new arguments.callee(arguments);
  }
  
  var self = this;
  
  
  function extendResponse(response) {
    response.simpleText = function(code, body) {
      response.writeHead(code, { "Content-Type": "text/plain"
                          , "Content-Length": body.length
                          });
      response.end(body);
    };
    response.simpleJSON = function(code, obj) {
      var body = JSON.stringify(obj);
      response.writeHead(code, { "Content-Type": "text/json"
                          , "Content-Length": body.length
                          });
      response.end(body);
    };
  }
  
  // handler, to be passed to `require('http').createServer()`
  this.handler = function(options) {
    options = options || {};
    var fileServer;
    
    
    function routeAndStaticHandler(request, response) {
      if(request.method == 'GET') {
        fileServer.serve(request, response, function(e) {
          if(e && (e.status == 404)) {
            // sys.puts('[router] file not found: \"' + request.url + '\", routing...');
            routerHandler(request, response);
          }
        });
      } else {
        routerHandler(request, response);
      }
    }
    
    
    function routerHandler(request, response) {
      
      extendResponse(response);
      
      var path   = parse(request.url).pathname,
         _routes = routes[request.method];
      for(var i=0, ii=_routes.length; i < ii; i++) {
        var route   =_routes[i],
            matches = route.exec(path);                     // say '/foo/bar/baz' matches '/foo/*/*'
        if(matches) {                                       // then matches would be ['/foo/bar/baz','bar','baz']
          __Array_push.apply(arguments, matches.slice(1));  // so turn arguments from [request,res] into [request,res,'bar','baz']
          return route.callback.apply(this, arguments);
        }
      }
      
      notFoundHandler.apply(this, arguments);
    };
    
    
    if(options.serveStatic) {
      fileServer = new nodeStatic.Server('./public');
      return routeAndStaticHandler;
    } else {
      return routerHandler;
    }
  };
  
  // dictionary of arrays of routes
  var routes = {};
  
  // routing API
  ['GET', 'POST', 'PUT', 'DELETE', 'HEAD'].forEach(function(method) {
    routes[method] = [];
    
    // e.g. router.get('/foo/*', function(request,res,bar){});
    self[method.toLowerCase()] = function(route, ignoreCase, callback) {
      if(arguments.length === 2) {
        callback = ignoreCase;
        ignoreCase = self.ignoreCase;
      }
      
      if(route.constructor.name === 'RegExp') { //instanceof fails between modules
        route = new RegExp(route); //if route is already a RegExp, just clone it
      } else {//else stringify and interpret as regex where * matches URI segments
        route = new RegExp('^' + //and everything else matches literally
          String(route).replace(specialChars, '\\$&').replace('*', '([^/?#]*)')
        + '(?:[?#].*)?$', ignoreCase ? 'i' : '');
      }
      route.callback = callback;
      routes[method].push(route);
    };
  });
  
  // special characters that need to be escaped when passed to `RegExp()`
  // lest they be interpreted as pattern-matching:
  var specialChars = /[|.+?{}()\[\]^$]/g;
  
  // creating `get` routes automatically creates `head` routes:
  routes.GET.push = function(route) { //as called by `router.get()`
    __Array_push.call(this, route);
    routes.HEAD.push(route);
  };
  
  // 404 is a route too
  self.notFound = function(handler) {
    notFoundHandler = handler;
  };
  
  // handles requests where no matching route is found
  var notFoundHandler = defaultNotFound;
  
};
var __Array_push = [].push; // Array.prototype.push, used by `router()`

function defaultNotFound(request, res) {
  res.writeHead(404, { 'Content-Type': 'text/html' });
  res.end('<html><head><title>Error 404: Not Found</title></head><body>\n' +
    '<h1>Error 404: Not Found</h1>\n' +
    '<p>Cannot ' + request.method + ' ' + request.url + '</body></html>\n');
}
