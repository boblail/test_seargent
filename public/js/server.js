var App = (function() {
  
  var messenger = new Messenger();
  
  $(document).ready(function() {
    App.respondToRunButton();
    App.listenForMessages();
  });
  
  return {
    hideAjaxLoader: function() {
      $('#loading').hide();
      $('#connect input').removeAttr('disabled');
    },
    
    showAjaxLoader: function() {
      $('#loading').show();
      $('#connect input').attr('disabled', 'disabled');
    },
    
    debug: function(o) {
      if(window.console && window.console.log) {
        window.console.log(o);
      }
    },
    
    respondToRunButton: function() {
      $('#connectButton').click(function () {
        App.showAjaxLoader();
        messenger.talk(
          'run',
          {},
          function() {App.hideAjaxLoader(); App.debug('tests running');},
          function() {App.hideAjaxLoader(); App.debug('failed to run tests');}
        );
        return false;
      });
    },
    
    listenForMessages: function() {
      messenger.listen('', function(message) {
        switch(message.type) {
          case 'results':
            App.postResults(message.data);
            break;
        }
      });
    },
    
    postResults: function(data) {
      var template = '<li class="result"><strong>"{{message}}"</strong> from {{user-agent}}</li>';
      var html = Mustache.to_html(template, data);
      $('ol#results').append(html);
    }
  }
})();
