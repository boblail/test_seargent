var App = {};

var CONFIG = { debug: false
             , id: null    // set in onConnect
             , last_message_time: (new Date()).getTime()
             , focus: true //event listeners bound in onConnect
             , unread: 0 //updated in the message-processing loop
             };

var starttime; // daemon start time
var rss; // daemon memory usage
var transmission_errors = 0;
var first_poll = true;



App.debug = function(o) {
  if(window.console && window.console.log) {
    window.console.log(o);
  }
}



// utility functions

util = {
  urlRE: /https?:\/\/([-\w\.]+)+(:\d+)?(\/([^\s]*(\?\S+)?)?)?/g, 

  //  html sanitizer 
  toStaticHTML: function(inputHtml) {
    inputHtml = inputHtml.toString();
    return inputHtml.replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;");
  }, 

  //pads n with zeros on the left,
  //digits is minimum length of output
  //zeroPad(3, 5); returns "005"
  //zeroPad(2, 500); returns "500"
  zeroPad: function (digits, n) {
    n = n.toString();
    while (n.length < digits) 
      n = '0' + n;
    return n;
  },

  //it is almost 8 o'clock PM here
  //timeString(new Date); returns "19:49"
  timeString: function (date) {
    var minutes = date.getMinutes().toString();
    var hours = date.getHours().toString();
    return this.zeroPad(2, hours) + ":" + this.zeroPad(2, minutes);
  },

  //does the argument only contain whitespace?
  isBlank: function(text) {
    var blank = /^\s*$/;
    return (text.match(blank) !== null);
  }
};



//used to keep the most recent messages visible
function scrollDown () {
  window.scrollBy(0, 100000000000000000);
  $("#entry").focus();
}



function updateRSS() {
  var bytes = parseInt(rss);
  if (bytes) {
    var megabytes = bytes / (1024*1024);
    megabytes = Math.round(megabytes*10)/10;
    $("#rss").text(megabytes.toString());
  }
}



function updateUptime() {
  if (starttime) {
    $("#uptime").text(starttime.toRelativeTime());
  }
}






// process updates if we have any, request updates from the server,
// and call again with response. the last part is like recursion except the call
// is being made from the response handler, and not at some point during the
// function's execution.
App.longPoll = function(data) {
  if(transmission_errors > 2) {
    hideAjaxLoader();
    return;
  }
  
  // process any updates we may have
  // data will be null on the first call of longPoll
  if(data && data.messages) {
    for(var i=0, ii=data.messages.length; i<ii; i++) {
      var message = data.messages[i];
      
      // track oldest message so we only request newer messages from server
      if(message.timestamp > CONFIG.last_message_time) {
        CONFIG.last_message_time = message.timestamp;
      }
      
      //dispatch new messages to their appropriate handlers
      switch(message.type) {
        default:
          App.debug('Unhandled message \"' + message.type + '\"');
          break;
      }
    }
  }
  
  
  
  // make another request
  $.ajax({
    cache: false,
    type: "GET",
    url: "/recv",
    dataType: "json",
    data: {since: CONFIG.last_message_time},
    error: function() {
       App.debug("long poll error. trying again...");
       transmission_errors += 1;
       // don't flood the servers on error, wait 10 seconds before retrying
       setTimeout(App.longPoll, 10*1000);
     },
     success: function (data) {
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



// //submit a new message to the server
// function send(msg) {
//   if (CONFIG.debug === false) {
//     // XXX should be POST
//     // XXX should add to messages immediately
//     jQuery.get("/send", {id: CONFIG.id, text: msg}, function (data) { }, "json");
//   }
// }



function hideAjaxLoader() {
  $('#loading').hide();
  $('#connect').show();
  $('#results').show();
}



function showAjaxLoader() {
  $('#loading').show();
  $('#connect').hide();
  $('#results').hide();
}



function onRunFail() {
  App.debug("error connecting to server");
  hideAjaxLoader();
}



function onRunSuccess(session) {
  hideAjaxLoader();
  if(session.error) {
    App.debug("error connecting: " + session.error);
  } else {
    
    // begin listening for test results
    App.longPoll();
  }
}



$(document).ready(function() {
  $("#connectButton").click(function () {
    showAjaxLoader();
    $.ajax({
      cache: false,
      type: "GET",
      dataType: "json",
      url: "/run",
      error: onRunFail,
      success: onRunSuccess
    });
    return false;
  });
});
