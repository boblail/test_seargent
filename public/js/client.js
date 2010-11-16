var App = (function() {
  var last_message_time = (new Date()).getTime();
  var transmission_errors = 0;
  
  $(document).ready(function() {
    App.writeBadgeToBody();
    App.longPoll();
    App.sendResults();
  });
  
  return {
    debug: function(o) {
      if(window.console && window.console.log) {
        window.console.log(o);
      }
    },
    
    
    
    writeBadgeToBody: function() {
      $(document.body)
        .css({'padding-top': '44px'})
        .append('<div id="live_test_suite" style="position:fixed; top:0; left:0; width:100%; background:#ccc; color:Black; font-family:Verdana; font-size:12px; line-height:12px; padding:8px 24px;">Test Suite loaded <strong>' + new Date() + '</strong></div>');
    },
    
    
    
    refresh: function() {
      window.location.reload();
    },
    
    
    
    sendResults: function() {
      $.ajax({
        cache: false,
        type: 'POST',
        dataType: 'json',
        url: '/results',
        error: function() {
          App.debug('failed to post results');
        },
        success: function() {
          App.debug('results posted');
        }
      });
    },
    
    
    
    // process updates if we have any, request updates from the server,
    // and call again with response. the last part is like recursion except the call
    // is being made from the response handler, and not at some point during the
    // function's execution.
    longPoll: function(data) {
      
      if(transmission_errors > 2) {
        App.debug('giving up');
        return;
      }
      
      // process any updates we may have
      // data will be null on the first call of longPoll
      if(data && data.messages) {
        for(var i=0, ii=data.messages.length; i<ii; i++) {
          var message = data.messages[i];
          
          // track oldest message so we only request newer messages from server
          if(message.timestamp > last_message_time) {
            last_message_time = message.timestamp;
          }
          
          //dispatch new messages to their appropriate handlers
          switch(message.type) {
            case 'run':
              App.refresh();
              break;
            
            default:
              App.debug('Unhandled message \"' + message.type + '\"');
              break;
          }
        }
      }
      
      // make another request
      $.ajax({
        cache: false,
        type: 'GET',
        url: '/recv',
        dataType: 'json',
        data: {since: last_message_time},
        error: function() {
           App.debug('long poll error. trying again...');
           transmission_errors += 1;
           // don't flood the servers on error, wait 10 seconds before retrying
           setTimeout(App.longPoll, 10*1000);
         },
         success: function(data) {
           transmission_errors = 0;
           //if everything went well, begin another request immediately
           //the server will take a long time to respond
           //how long? well, it will wait until there is another message
           //and then it will return it to us and close the connection.
           //since the connection is closed when we get data, we longPoll again
           App.longPoll(data);
         }
       });
    }
  }
})();
