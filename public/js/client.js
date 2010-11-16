var App = (function() {
  
  var messenger = new Messenger();
  
  $(document).ready(function() {
    App.writeBadgeToBody();
    App.listenForMessages();
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
      messenger.talk(
        'results',
        {message: 'hi'},
        function() {App.debug('results posted');},
        function() {App.debug('failed to post results');}
      );
    },
    
    listenForMessages: function() {
      messenger.listen('', function(message) {
        switch(message.type) {
          case 'run':
            App.refresh();
            break;
        }
      });
    }
  }
})();
