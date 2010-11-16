HOST = null; // localhost
PORT = 8000;
var MESSAGE_BACKLOG = 200,
    SESSION_TIMEOUT = 60 * 1000;



var starttime = (new Date()).getTime(), // when the daemon started
    sys = require("sys"),
    fs = require('fs'),
    mem = process.memoryUsage(),
    url = require("url"),
    qs = require("querystring"),
    http = require('http'),
    choreographer = require('./vendor/choreographer/choreographer'),
    router = new choreographer.Router(),
    Mu = require('./vendor/mu/lib/mu');


Mu.templateRoot = './views';


setInterval(function() {mem = process.memoryUsage();}, 10*1000); // every 10 seconds poll for the memory.



var channel = new function() {
  var messages  = [],
      callbacks = [];
  
  this.appendMessage = function(type, json) {
    json = json || {};
    var message = {
      type: type,
      data: json,
      timestamp: (new Date()).getTime()
    };
    
    
    var log = '[' + type + ']';
    var anyKeys = false;
    for(key in json) {
      if(!anyKeys) {
        log = log + ' (';
        anyKeys = true;
      } else {
        log = log + ', ';
      }
      log = log + key + ': ' + json[key];
    }
    if(anyKeys) {
      log = log + ')';
    }
    sys.puts(log);
    
    
    messages.push(message);
    
    while(callbacks.length > 0) {
      callbacks.shift().callback([message]);
    }
    
    while(messages.length > MESSAGE_BACKLOG) {
      messages.shift();
    }
  };
  
  
  
  this.query = function(since, callback) {
    var matching = [];
    for(var i=0, ii=messages.length; i < ii; i++) {
      var message = messages[i];
      if(message.timestamp > since) {
        matching.push(message);
      }
    }
    
    if(matching.length > 0) {
      callback(matching);
    } else {
      callbacks.push({timestamp: new Date(), callback: callback});
    }
  };
  
  
  
  // clear old callbacks
  // they can hang around for at most 30 seconds.
  setInterval(function () {
    var now = new Date();
    while (callbacks.length > 0 && now - callbacks[0].timestamp > 30*1000) {
      callbacks.shift().callback([]);
    }
  }, 3000);
};



router.get("/", function(request, response) {
  fs.readFile('./views/test.html', function(err, data) {
    if(err) {throw err;}
    var html = injectScript(data.toString());
    response.writeHead(200, {
      "Content-Type": "text/html",
      "Content-Length": html.length
    });
    response.end(html);
  });
  // json = {
  //   time: new Date().toString()
  // };
  // Mu.render('observer.html', json, {}, function(err, output) {
  //   if (err) {
  //     throw err;
  //   }
  //   var buffer = '';
  //   output.addListener('data', function(c) {buffer += c; })
  //         .addListener('end', function() {
  //           response.writeHead(200, {
  //             "Content-Type": "text/html",
  //             "Content-Length": buffer.length
  //           });
  //           response.end(buffer);
  //         });
  // });
});



var clientScript = '<script src="/js/client.js" type="text/javascript"></script>';
function injectScript(html) {
  return html.replace(/(<\s*\/\s*body\s*>)/i, (clientScript + '$1'));
}



router.post("/results", function(request, response) {
  channel.appendMessage('results');
  response.simpleJSON(200, {});
});



router.post("/run", function(request, response) {
  channel.appendMessage('run');
  response.simpleJSON(200, {});
});



router.get("/recv", function(req, res) {
  var since = qs.parse(url.parse(req.url).query).since;
  if(!since) {
    return res.simpleJSON(400, {error: "Must supply since parameter"});
  }
  
  since = parseInt(since, 10);
  channel.query(since, function(messages) {
    res.simpleJSON(200, {messages: messages, rss: mem.rss});
  });
});



http.createServer(router.handler({serveStatic: true}))
    .listen(Number(process.env.PORT || PORT), HOST);
