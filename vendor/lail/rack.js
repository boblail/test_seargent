var sys = require("sys"),
    http = require('http'),
    parse = require('url').parse,
    nodeStatic = require('../node-static/lib/node-static');



this.createRackServer = function(router) {
  
  var fileServer = new nodeStatic.Server('./public', {
    cache: false
  });
  
  function rackAdapter(request, response) {
    var array = router(request),
        response = array[0],
        headers = array[1],
        body = array[2];
    response.writeHead(response, headers);
    response.end(body);
  }
  
  return http.createServer(function(request, response) {
    fileServer.serve(request, response, function(e) {
      if(e && (e.status == 404)) { // the file wasn't found
        sys.debug('file not found: \"' + request.url + '\"');
        rackAdapter(request, response);
      }
    });
  });
}



// Refactored from The Choreographer by Han (http://github.com/laughinghan/choreographer)
this.Router = function() {
  
  if(!(this instanceof arguments.callee)) {
    return new arguments.callee(arguments);
  }
  
  var self = this;
  
  this.handler = function(request) {
    
    var path    = parse(request.url).pathname,
       _routes  = routes[request.method];
    for(var i=0, ii=_routes.length; i < ii; i++) {
      var route   =_routes[i],
          matches = route.exec(path);                     // say '/foo/bar/baz' matches '/foo/*/*'
      if(matches) {                                       // then matches would be ['/foo/bar/baz','bar','baz']
        __Array_push.apply(arguments, matches.slice(1));  // so turn arguments from [request] into [request,'bar','baz']
        return route.callback.apply(this, arguments);
      }
    }
    
    // route not found: no route has matched and hence returned yet
    return notFoundHandler.apply(this, arguments);
  };
  
  // dictionary of arrays of routes
  var routes = {};
  
  // routing API
  ['GET', 'POST', 'PUT', 'DELETE', 'HEAD'].forEach(function(method) {
    
    routes[method] = [];
    
    // e.g. router.get('/foo/*', function(req,res,bar){});
    self[method.toLowerCase()] = function(route, ignoreCase, callback) {
      if(arguments.length === 2) {
        callback = ignoreCase;
        ignoreCase = self.ignoreCase;
      }
      
      if(route.constructor.name === 'RegExp') {   // instanceof fails between modules
        route = new RegExp(route);                // if route is already a RegExp, just clone it
      } else {                                    // else stringify and interpret as regex where * matches URI segments
        route = new RegExp('^' +                  // and everything else matches literally
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
  routes.GET.push = function(route) {
    __Array_push.call(this, route);
    routes.HEAD.push(route);
  };
  
  // 404 is a route too
  this.notFound = function(handler) {
    notFoundHandler = handler;
  };
  
  // handles requests where no matching route is found
  var notFoundHandler = defaultNotFound;
  
};
var __Array_push = [].push; // Array.prototype.push, used by `Router.hander`

function defaultNotFound(request) {
  var headers = {
    'Content-Type': 'text/html'
  };
  var body = '<html><head><title>Error 404: Not Found</title></head><body>\n' +
             '<h1>Error 404: Not Found</h1>\n' +
             '<p>Cannot ' + request.method + ' ' + request.url + '</body></html>\n';
  return [404, headers, body];
}
