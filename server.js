    HOST            = null; // localhost
    PORT            = 8000;
var MESSAGE_BACKLOG = 200,
    SESSION_TIMEOUT = 60 * 1000,
    
    
    starttime = (new Date()).getTime(), // when the daemon started
    sys = require("sys"),
    fs = require('fs'),
    // mem = process.memoryUsage(),
    url = require("url"),
    qs = require("querystring"),
    http = require('http'),
    choreographer = require('./vendor/choreographer/choreographer'),
    router = new choreographer.Router(),
    clientScript = '<script src="/js/messenger.js" type="text/javascript"></script><script src="/js/client.js" type="text/javascript"></script>';



// setInterval(function() {mem = process.memoryUsage();}, 10*1000); // every 10 seconds poll for the memory.



var channel = new function() {
  var messages  = [],
      callbacks = [];
  
  
  function describeMessage(message) {
    var type = message.type;
    var json = message.data;
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
    return log;
  }
  
  
  this.appendMessage = function(type, json) {
    json = json || {};
    var message = {
      type: type,
      data: json,
      timestamp: (new Date()).getTime()
    };
    
    sys.puts(describeMessage(message));
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
  fs.readFile('./tests/test.html', function(err, data) {
    if(err) {throw err;}
    var html = injectScript(data.toString());
    response.writeHead(200, {
      "Content-Type": "text/html",
      "Content-Length": html.length
    });
    response.end(html);
  });
});



function injectScript(html) {
  return html.replace(/(<\s*\/\s*body\s*>)/i, (clientScript + '$1'));
}



router.post("/talk", function(request, response) {
  var buffer = '';
  request.addListener('data', function(chunk) {buffer += chunk});
  request.addListener('end', function() {
    var message = qs.parse(buffer);
    var data = message.data || {};
    data['user-agent'] = request.headers['user-agent'];
    channel.appendMessage(message.type, data);
    response.simpleJSON(200, {});
  });
});



router.get("/listen", function(req, res) {
  var since = qs.parse(url.parse(req.url).query).since;
  if(!since) {
    sys.puts('<listen> since parameter missing');
    return res.simpleJSON(400, {error: "Must supply since parameter"});
  }
  
  since = parseInt(since, 10);
  channel.query(since, function(messages) {
    res.simpleJSON(200, {messages: messages});
  });
});



http.createServer(router.handler({serveStatic: true}))
    .listen(Number(process.env.PORT || PORT), HOST);
