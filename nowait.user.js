// ==UserScript==
// @name         nowait
// @namespace    https://github.com/reruin
// @version      0.2
// @license      MIT
// @description  nowait
// @author       reruin@gmail.com
// @grant        none
// @include      http://*
// @include      https://*
// @connect      *
// @run-at       document-start
// ==/UserScript==

// adf.ly
// ctfile.com -ad

(function(root){
  var nw = root.nw = {};
  var stack = [];
  var ArrayProto = Array.prototype, ObjProto = Object.prototype;
  var hasOwnProperty   = ObjProto.hasOwnProperty;

  var page  = {
    addStyle : function(css){
        var el = document.createElement("style");
        el.innerHTML = css;
        document.getElementsByTagName('head')[0].appendChild(el);
    },
    addScript : function(script , pos){
      var el = document.createElement("script");
      el.textContent = script;
      if(typeof pos == 'object'){
        pos.appendChild(el)
      }
      else if(pos == 'head'){
        document.getElementsByTagName('head')[0].appendChild(el);
      }else{
        document.getElementsByTagName('body')[0].appendChild(el);
      }
    },
    addHtml : function(dom){
      var el = document.createElement("dom");
      el.innerHTML = dom;
      document.getElementsByTagName('body')[0].appendChild(el);
    }
  };

  var promise = (function(){
    return typeof window.Promise === 'function' ?
      window.Promise :
      function(fn) {
        var state = 'pending',
            value = null,
            deferreds = [];

        this.then = function (onFulfilled, onRejected) {
            return new Promise(function (resolve, reject) {
                handle({
                    onFulfilled: onFulfilled || null,
                    onRejected: onRejected || null,
                    resolve: resolve,
                    reject: reject
                });
            });
        };

        function handle(deferred) {
          if (state === 'pending') {
              deferreds.push(deferred);
              return;
          }

          var cb = state === 'fulfilled' ? deferred.onFulfilled : deferred.onRejected,
              ret;
          if (cb === null) {
              cb = state === 'fulfilled' ? deferred.resolve : deferred.reject;
              cb(value);
              return;
          }
          try {
              ret = cb(value);
              deferred.resolve(ret);
          } catch (e) {
              deferred.reject(e);
          }
        }

        function resolve(newValue) {
            if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
                var then = newValue.then;
                if (typeof then === 'function') {
                    then.call(newValue, resolve, reject);
                    return;
                }
            }
            state = 'fulfilled';
            value = newValue;
            finale();
        }

        function reject(reason) {
            state = 'rejected';
            value = reason;
            finale();
        }

        function finale() {
            setTimeout(function () {
                deferreds.forEach(function (deferred) {
                    handle(deferred);
                });
            }, 0);
        }

        fn(resolve, reject);
    };
  }());

  function $(e){
    return document.querySelector(e);
  }
  function $$(e){
    return document.querySelectorAll(e);
  }

  function noop(){

  }

  function has(obj, key) {
      return obj != null && hasOwnProperty.call(obj, key);
  }

  function key(obj){
      var k = [];
      for(var i in obj){
          if(has(obj , i)) k.push(i);
      }
      return k;
  }

  function isString(v){
    return typeof v === 'string';
  }

  function is(v , b){ 
    return ObjProto.toString.call(v) === "[object "+b+"]"; 
  } 

  function isArray(v){ 
    return is(v , 'Array'); 
  } 

  function isRegExp(v){ 
    return is(v , 'RegExp'); 
  }

  function isObject(v){ 
    return is(v , 'Object'); 
  }

  function isFunction(v){ 
    return is(v , 'Function'); 
  }

  function create(expr , handler){
    if(expr && handler){
      stack.push({rule:expr , post:handler});
    }
    else{
      stack.push(expr);
    }
  }

  function replace(str,obj , format){
      return str.replace(RegExp('(?:' + key(obj).join('|').replace(/([\:\'\)\(\{\}])/g,'\\$1') + ')','g') , function(match){
          return format ? format(obj[match]) : obj[match];
      });
  }

  

  function toArray(a){
    return Array.prototype.slice.call(a);
  }

  function formatLink(newurl , m){
    return newurl.replace(/\$(\d+)/g , function($0,$1){
      return m[$1];
    });
  }

  function hit(obj){
    var ret = [];
    for(var i in stack){
        var rule = stack[i].rule;
        if( isRegExp(rule) ){
          var m = obj.url.match(rule);
          if( m ){
            if(isString(stack[i].post)){
              ret.push({
                redirect : formatLink(stack[i].post , toArray(m))
              });
            }else{
              ret.push({
                pre : stack[i].pre || noop,
                post : stack[i].post || noop,
                args : toArray(m)
              });
            }
          }

        }
        else if(isObject(rule)){
          var flag = true;
          var m = null, ret_t = {};
          for(var key in rule){
            m = obj[key].match(rule[key]);
            if(!m){
              flag = false;
              break;
            }else{
              if(m.length>1){
                ret_t[key] = toArray(m);
              }
            }
          }
          if(flag){
            ret.push({
              pre : stack[i].pre || noop,
              post : stack[i].post || noop,
              args : ret_t
            });
          }
        }
        else if(isFunction(rule)){
          if( rule() ){
            ret.push({
              pre : stack[i].pre || noop,
              post : stack[i].post || noop,
              args : {}
            });
          }
        }
        else if(isArray(rule)){
          var flag = false;
          rule.forEach(function(r){
            var m = obj.url.match(r);
            ret.push({
              pre : stack[i].pre || noop,
              post : stack[i].post || noop,
              args : {}
            });
          });
        }
    }
    return ret;
  }

  function init(){
    var loc = window.location;

    var obj = {
      url : loc.href,
      scheme: loc.protocol.slice(0, -1),
      host: loc.hostname,
      port: loc.port,
      path: loc.pathname,
      search: loc.search,
      hash: loc.hash
    };

    var handlers = hit(obj);
    
    handlers.forEach(function(handler){
      if(handler.redirect){
        open(handler.redirect);
      }
      else if(handler.pre) handler.pre(handler.args);
    });

    document.addEventListener('DOMContentLoaded' , function(){
      handlers.forEach(function(handler){
        if(handler.post) handler.post(handler.args);
      });
    })
  }

  function monitor(tag , expr , callback){
    var d = tag.split(':');
    var evts = {
      'removed':'DOMNodeRemoved',
      'inserted':'DOMNodeInserted',
      'modified':'DOMSubtreeModified'
    };

    tag = d[0];

    var evt = evts[d[1] || 'modified'];

    var watch = d[2] === undefined ? false : true;

    if(isFunction(expr))  {
      callback = expr;
      expr =  null ; 
    }

    var matchSpan = function(target , t){
      var k = document.createElement('div');
      k.appendChild(target.cloneNode(false));
      var ret = k.querySelector(t);
      k = null;
      return ret;
    }

    //return new promise(function(resolve, reject){
      var handler = function(event){
        var target = event.target;
        if(matchSpan(target , tag)){
          if(expr){
            var m = target.textContent.match(expr);
            if(m){
              if(callback) callback(m);
              if(!watch) document.removeEventListener(evt , handler);
            }
          }else{
            if(callback) callback(target);
            
            if(!watch) document.removeEventListener(evt , handler);
          }
        }
      };
      
      document.addEventListener(evt , handler);
    //});
  }

  function open(url){
    open_direct(url);
  }

  function open_direct(url){
    var link = document.createElementNS('http://www.w3.org/1999/xhtml', 'a');
    link.href = url;
    link.click();
  }

  nw.c = create;
  nw.m = monitor;
  nw.o = open;

  nw.$ = $;
  nw.$$ = $$;
  nw.r = replace;

  nw.init = init;
  nw.noop = noop;

  nw.addStyle = page.addStyle;
  nw.addScript = page.addScript;
}(this));


//==================================

/**
 * yifile.com
 */
nw.c(/yifile\.com\/file\/[\w\W]+/ , function(){
  var css = '.stxt,#g207,.newfdown{display:none !important;}#bootyz1,#bootyz2,#bootyz3{display:block !important;}';
  nw.addStyle(css);
});

/**
 * adf.ly
 */
nw.c({
  rule:/adf\.ly\/[^\/]+/,
  pre : function(data){
    function decode( ysmm ) {
        var left = '';
        var right = '';
        for ( var i = 0; i < ysmm.length; i++ ) {
            if ( i % 2 === 0 ) {
                left += ysmm.charAt(i);
            } else {
                right = ysmm.charAt(i) + right;
            }
        }
        return atob( left + right ).substr(2);
    }
    
    nw.m('script:removed',/var ysmm = '([a-zA-Z0-9+/=]+)'/,function(m){
      if(m) nw.o( decode(m[1]) );
    });
  }
});

//redirect
nw.c(/adf\.ly\/ad\/locked\?url=([^&]+)/ , '/$1');


/**
 * ctfile.com
 *
 * remove ad
 */
nw.c({
  rule:/ctfile\.com\/(file|downhtml)\//,
  pre : function(){
    var css = '#ad_left,.download-box+.row-fluid,.download-box>ul li:last-child,#ad_right,.downpage_rl,.downpage_rl+.row-fluid{display:none;}';
    nw.addStyle(css);
  }
});

/**
 * hostloc.com
 *
 * fix emot
 */
nw.c([
  /hostloc\.com\/thread/,
  /hostloc\.com\/forum\.php\?mod=post/,
  /hostloc\.com\/forum\.php\?mod=viewthread/,
  ] , function(){
  var path = {
    ":)":"default/smile",":lol":"default/lol",":hug:":"default/hug",":victory:":"default/victory",":time:":"default/time",":kiss:":"default/kiss",":handshake":"default/handshake",":call:":"default/call",":loveliness:":"default/loveliness",":Q":"default/mad",":L":"default/sweat",":(":"default/sad",":D":"default/biggrin",":'(":"default/cry",":@":"default/huffy",":o":"default/shocked",":P":"default/tongue",":$":"default/shy",";P":"default/titter",":funk:":"default/funk",

    "yc002t":"yct/002","yc022t":"yct/022","yc013t":"yct/013","yc009t":"yct/009","yc014t":"yct/014","yc007t":"yct/007","yc020t":"yct/020","yc001t":"yct/001","yc019t":"yct/019","yc003t":"yct/003","yc010t":"yct/010","yc017t":"yct/017","yc012t":"yct/012","yc006t":"yct/006","yc011t":"yct/011","yc004t":"yct/004","yc005t":"yct/005","yc018t":"yct/018","yc021t":"yct/021","yc015t":"yct/015","yc008t":"yct/008","yc016t":"yct/016",

    "{:3_54:}":"coolmonkey/05","{:3_68:}":"coolmonkey/16","{:3_67:}":"coolmonkey/09","{:3_66:}":"coolmonkey/11","{:3_65:}":"coolmonkey/08","{:3_64:}":"coolmonkey/13","{:3_63:}":"coolmonkey/04","{:3_62:}":"coolmonkey/10","{:3_61:}":"coolmonkey/07","{:3_60:}":"coolmonkey/15","{:3_59:}":"coolmonkey/01","{:3_58:}":"coolmonkey/03","{:3_57:}":"coolmonkey/12","{:3_56:}":"coolmonkey/02","{:3_55:}":"coolmonkey/06","{:3_69:}":"coolmonkey/14"
  };

  var js = ';(function(root){var path = '+JSON.stringify(path)+';var insert = seditor_insertunit;root.init_emot = function(){ root.seditor_insertunit = function(key , text){ if(path[text]){ text = "[img]http://www.hostloc.com/static/image/smiley/"+path[text]+".gif[/img]"};  insert(key , text);} }; root.init_emot(); }(this));';

  var js_post = ';(function(root){ var r = root.insertSmiley; root.insertSmiley = function(){ r.apply(root , Array.prototype.slice.call(arguments)); var evt = document.createEvent("HTMLEvents"); evt.initEvent("render_emot", false, false);document.dispatchEvent(evt); };}(this));'
  function render(el){
    el.value = nw.r(el.value , path , function(u){
      return '[img]http://www.hostloc.com/static/image/smiley/'+u+'.gif[/img]';
    });
  }

  document.addEventListener('render_emot' , function(){
    nw.$$('textarea').forEach(function(el){
      render(el);
    });
  });

  // edit page
  if(location.search.indexOf('mod=post')>=0){
    nw.addScript(js_post , 'body');
  }else{
      //render exist
    nw.$$('td.t_f').forEach(function(el){
      el.innerHTML = nw.r(el.innerHTML , path , function(u){
        return '<img src="/static/image/smiley/'+ u + '.gif" />';
      });
    });

    nw.m('.fwinmask:inserted:watch',function(el){
      setTimeout(function(){
        nw.addScript('window.init_emot();','body');
      },1000);
    });

    nw.addScript(js , 'body');
  }

});

nw.init();