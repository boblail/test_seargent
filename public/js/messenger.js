var Messenger = (function() {
  
  var constructor = function() {
    this.last_message_time = (new Date()).getTime();
    this.transmission_errors = 0;
    this.send_url = '/talk';
    this.listen_url = '/listen';
  }
  
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
  
  function debug(o) {
    if(window.console && window.console.log) {
      window.console.log(o);
    }
  }
  
  constructor.prototype.talk = function(message, data, success, error) {
    var self = this;
    
    $.ajax({
      cache: false,
      type: 'POST',
      url: self.send_url,
      dataType: 'json',
      data: {
        type: message,
        data: data
      },
      error: error,
      success: success
    });    
  }
  
  constructor.prototype.listen = function(channel, callback) {
    var self = this;
    
    (function longPoll() {
      $.ajax({
        cache: false,
        type: 'GET',
        url: self.listen_url,
        dataType: 'json',
        data: {
          channel: channel,
          since: self.last_message_time
        },
        error: function() {
          App.debug('long poll error. trying again...');
          self.transmission_errors++;
          setTimeout(longPoll, 10*1000); // don't flood the servers on error, wait 10 seconds before retrying
        },
        success: function(data) {
          self.transmission_errors = 0;
          
          // process any updates we may have
          // data will be null on the first call of longPoll
          if(data && data.messages) {
            for(var i=0, ii=data.messages.length; i<ii; i++) {
              var message = data.messages[i];
              
              // track oldest message so we only request newer messages from server
              if(message.timestamp > self.last_message_time) {
                self.last_message_time = message.timestamp;
              }
              
              debug(describeMessage(message));
              
              callback(message);
            }
          }
          //if everything went well, begin another request immediately
          //the server will take a long time to respond
          //how long? well, it will wait until there is another message
          //and then it will return it to us and close the connection.
          //since the connection is closed when we get data, we longPoll again
          longPoll();
        }
      })
    })();
  }
  
  return constructor;
})();
