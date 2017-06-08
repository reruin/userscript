// ==UserScript==
// @name         hostloc_emot
// @namespace    https://github.com/reruin
// @version      0.3
// @license      MIT
// @description  hostloc_emot
// @author       reruin@gmail.com
// @grant        none
// @include      http://www.hostloc.com/
// @include      https://hostloc.com/
// @connect      *
// @run-at       document-start
// ==/UserScript==


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

  var dom = {
    create : function (tag, id, cls, style, parent,data) {
        var el = document.createElement(tag);
        if (id) el.id = id;
        if (cls) el.className = cls;
        if (style) el.setAttribute("style", style);
        if (data) {
            for (var key in data)
                el.setAttribute(key, data[key]);
        }
        if (parent) parent.appendChild(el);
        return el;
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
            // console.log(stack[i].post,m)
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
          for (var j = rule.length - 1; j >= 0; j--) {
            if(obj.url.match(rule[j])){
              flag = true;
              break;
            }
          }
          if(flag){
            ret.push({
              pre : stack[i].pre || noop,
              post : stack[i].post || noop,
              args : {}
            });
          }
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
    console.log(handlers)
    if(handlers.length){
      handlers.forEach(function(handler){
        if(handler.redirect){
          open(handler.redirect);
        }
        else if(handler.pre) handler.pre(handler.args);
      });
    }

    document.addEventListener('DOMContentLoaded' , function(){
      if(handlers.length){
        handlers.forEach(function(handler){
          if(handler.post) {
            console.log(handler.post)
            handler.post(handler.args);
          }
        });
      }
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
  nw.dom = dom;

  nw.init = init;
  nw.noop = noop;

  nw.addStyle = page.addStyle;
  nw.addScript = page.addScript;
}(this));


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

  var extra = ["00.jpg","01.jpg","02.gif","03.jpg","04.gif","05.gif","06.gif","07.gif","08.gif","09.jpg","10.jpg","100.jpg","101.gif","102.gif","103.jpg","104.gif","105.jpg","106.gif","107.jpg","108.jpg","109.gif","11.jpg","110.jpg","111.jpg","112.jpg","113.jpg","114.jpg","115.jpg","116.gif","117.jpg","118.jpg","119.jpg","12.jpg","120.gif","121.jpg","123.jpg","124.jpg","125.jpg","126.jpg","127.jpg","128.jpg","129.jpg","13.gif","130.gif","131.gif","132.jpg","133.jpg","134.gif","135.gif","137.jpg","138.gif","139.gif","14.gif","140.gif","141.gif","142.gif","143.jpg","144.gif","145.jpg","146.gif","147.jpg","148.jpg","149.gif","15.gif","150.jpg","152.jpg","153.gif","154.gif","156.jpg","157.jpg","159.gif","16.gif","160.jpg","161.gif","162.jpg","165.gif","166.jpg","167.jpg","168.jpg","169.jpg","17.gif","170.gif","171.gif","172.jpg","173.jpg","174.jpg","175.gif","179.jpg","18.gif","20.jpg","21.jpg","22.jpg","23.gif","24.jpg","25.jpg","26.jpg","27.jpg","28.jpg","29.gif","32.jpg","33.jpg","34.gif","35.gif","36.jpg","37.jpg","38.jpg","39.jpg","41.jpg","42.gif","43.jpg","44.gif","48.jpg","49.gif","50.gif","51.gif","52.jpg","53.gif","54.gif","55.jpg","56.gif","57.gif","58.jpg","59.jpg","60.jpg","61.jpg","62.gif","64.jpg","65.jpg","66.jpg","67.jpg","69.jpg","71.jpg","72.gif","73.gif","74.gif","75.jpg","76.jpg","77.jpg","78.jpg","79.jpg","80.jpg","81.jpg","83.jpg","84.jpg","85.jpg","86.jpg","88.jpg","90.jpg","91.gif","92.jpg","93.jpg","95.gif","96.jpg","97.jpg","98.gif","99.gif"];
  for(var i in extra){
    extra[i] = 'http://www.ghost64.com/qqtupian/qqbiaoqing/150412244930/' + extra[i];
  }

  var js = ';(function(root){var path = '+JSON.stringify(path)+';var insert = seditor_insertunit;root.init_emot = function(){ root.seditor_insertunit = function(key , text){ if(path[text]){ text = "[img]static/image/smiley/"+path[text]+".gif[/img]"};  insert(key , text);} }; root.init_emot(); }(this));';

  var js_post = ';(function(root){ var r = root.insertSmiley; root.insertSmiley = function(){ r.apply(root , Array.prototype.slice.call(arguments)); var evt = document.createEvent("HTMLEvents"); evt.initEvent("render_emot", false, false);document.dispatchEvent(evt); };}(this));';


  function create_extra(){
    document.createElement('div');
    var html = [];
    html.push('<style>.modal-content{padding-top:5px;}.modal-content a{display:inline-block;}.modal-content img.pre{display:none;position:absolute;}.modal-content a:hover img.pre { display:block; }</style>');

    html.push('<div class="flb" style="border-bottom: 1px solid #eee;"><h3 style="color:#369;font-size:15px;font-weight:normal;">添加表情</h3><span style="position:absolute;right:5px;top:5px;"><a href="javascript:;" class="flbc" emot-extra-close title="关闭">关闭</a></span></div><div class="modal-content">');
    for(var i in extra){
      html.push(
      '<a rel="'+extra[i]+'"><img style="height:40px;" emot-extra-add src="'+extra[i]+'"/><a>'
      );
    }

    html.push('</div>');
   
    nw.dom.create('div' , 'j_emot_extra' , 'fwinmask' , 'background:#fff;position: fixed; z-index: 2001; left: 50%; top: 50%;width:750px;height:450px;transform: translate(-50%,-50%);padding:1px;box-shadow: 0 0 4px rgba(0,0,0,0.6);' , document.body).innerHTML = html.join('');
    
  }

  function remove_extra(){
    document.body.removeChild(nw.$('#j_emot_extra'));
  }

  function add_extra(img){
    var code = '[img]'+img+'[/img]';
    var tc = nw.$('#e_textarea') || nw.$('#postmessage') || nw.$('#fastpostmessage');
    if(tc){
      var len = tc.length;
      var tc_start = tc.selectionStart;
      tc.value = tc.value.substr(0,tc_start)+code+tc.value.substring(tc_start,len);  

      remove_extra();
    }
  }

  function hover_extra(){

  }

  function create_extra_btn(parent){
    nw.dom.create('a',null,null,'background: #369;border-radius:10px;color:#fff;text-align:center;font-size: 12px;line-height: 1em;text-indent: 0;line-height: 20px;cursor: pointer;',parent,{'title':'增强表情','emot-extra':''}).innerHTML = '图';
  }

  function render(el){
    el.value = nw.r(el.value , path , function(u){
      return '[img]static/image/smiley/'+u+'.gif[/img]';
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
    create_extra_btn( nw.$('#e_adv_s3') );
  }else{
      //render exist
    nw.$$('td.t_f').forEach(function(el){
      el.innerHTML = nw.r(el.innerHTML , path , function(u){
        return '<img src="/static/image/smiley/'+ u + '.gif" />';
      });
    });

    nw.m('#fwin_reply:inserted:watch',function(el){
        setTimeout(function(){
          nw.addScript('window.init_emot();','body');
          create_extra_btn( nw.$('#fwin_reply .fpd') );
        },1000);
      
    });

    nw.addScript(js , 'body');
    
    create_extra_btn( nw.$('.fpd') );
  }

  document.addEventListener('click' , function(e){
    var el = e.target;
    if(el.getAttribute('emot-extra') !== null){
      create_extra();
    }
    else if(el.getAttribute('emot-extra-close') !== null ){
      remove_extra();
    }else if(el.getAttribute('emot-extra-add') !== null ){
      add_extra(el.src);
    }
  },true);
});
