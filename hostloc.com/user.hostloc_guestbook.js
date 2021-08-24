// ==UserScript==
// @name         hostloc_guest_book
// @namespace    https://github.com/reruin
// @version      0.1
// @license      MIT
// @description  hostloc_guest_book
// @author       reruin@gmail.com
// @grant        none
// @include      https://www.hostloc.com/*
// @include      https://hostloc.com/*
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
        pos.appendChild(el);
      }
      else if(pos == 'head'){
        document.getElementsByTagName('head')[0].appendChild(el);
      }else{
        document.getElementsByTagName('body')[0].appendChild(el);
      }
    },
    addScriptLink : function( data , pos){
      var el = document.createElement("script");
      for(var i in data){
        el.setAttribute(i , data[i]);
      }

      if(typeof pos == 'object'){
        pos.appendChild(el);
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

  nw.init = init;
  nw.noop = noop;

  nw.addStyle = page.addStyle;
  nw.addScript = page.addScript;
  nw.addScriptLink = page.addScriptLink;
}(this));


/**
 * hostloc.com
 *
 * create temp guest book
 */


nw.c([
  /hostloc\.com\/thread/,
  /hostloc\.com\/forum\.php\?mod=post/,
  /hostloc\.com\/forum\.php\?mod=viewthread/,
  ] , function(){

    nw.addScript(`
      var API = 'https://api.reruin.net/hostloc/posts'
      var $ = jQuery

      var tpl = \`<div id="post_10861020">
  <table id="pid10861020" class="plhin" summary="pid10861020" cellspacing="0" cellpadding="0">
    <tbody>
      <tr>
        <td class="pls" rowspan="2">
          <div id="favatar10861020" class="pls favatar">
            <div class="pi">
              <div class="authi"><a href="space-uid-{uid}.html" target="_blank" class="xw1">{username}</a>
              </div>
            </div>
            <div>
              <div class="avatar" onmouseover="showauthor(this, 'userinfo10861020')"><a href="space-uid-{uid}.html" class="avtm" target="_blank"><img src="https://hostloc.com/uc_server/avatar.php?uid={uid}&size=middle"></a></div>
            </div>
          </div>
        </td>
        <td class="plc">
          <div class="pi">
            <div class="pti">
              <div class="pdbt">
              </div>
              <div class="authi">
                <img class="authicn vm" id="authicon10861020" src="static/image/common/online_member.gif">
                <em id="authorposton10861020">发表于 <span title="2021-8-23 16:53:38">{time}</span></em>
                <span class="pipe">|</span>
              </div>
            </div>
          </div>
          <div class="pct">
            <div class="pcb">
              <div class="t_fsz">
                <table cellspacing="0" cellpadding="0">
                  <tbody>
                    <tr>
                      <td class="t_f" id="postmessage_10861020">
                        {content}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div id="comment_10861020" class="cm">
              </div>
              <div id="post_rate_div_10861020"></div>
            </div>
          </div>
        </td>
      </tr>
      <tr id="_postposition10861020"></tr>
      <tr class="ad">
        <td class="pls">
        </td>
        <td class="plc">
        </td>
      </tr>
    </tbody>
  </table>
</div>\`
      $('#fastpostsubmit').on('click',function(e){
        createPost()
        e.preventDefault()
      })

      function parse (str, data) {
        data = data || {}
        return str.replace(/\{([a-z_0-9]+)\}/ig, function(str, key) {
          console.info('hit',key)
          var value = data[key];
          if (value === undefined) {
            console.log('No value provided for variable ' + str);
            value = "{" + key + "}";
          } else if (typeof value === 'function') {
            value = value(data);
          }
          return value;
        })
      }

      function convData (t){
        if(t.ts){
          var rel = (Date.now() - t.ts)/1000/60
          var label = ''
          if( rel < 1){
            label = '刚刚'
          }else if(rel < 60){
            label = Math.ceil(rel) + '分钟前'
          }else if(rel < 24*60){
            label = Math.ceil(rel / 60) + '小时前'
          }else {
            label = Math.ceil(rel / 24 / 60) + '天前'
          }
          t.time = label
        }
        return t
      }

      function createPost(){
        var content = $('#fastpostmessage').val()
        var username = $('.vwmy a').html()
        //space-uid-49562.html
        var uid = discuz_uid
        var post_id = location.pathname.split('-')[1]

        $.ajax({
          type: 'POST',
          url: API+'/'+post_id,
          data: {
            content:content,
            username:username,
            uid:uid,
          },
          success: function(resp){
            console.log(resp)
            location.reload()
            $('#fastpostform').submit()
          },
          error:function(){
          }
        });
        //
        
      } 

      function createDom(posts){
        posts.forEach(function(post){
          $('#postlist').append($(parse(tpl,convData(post))))
        })
      }

      function listPosts(){
        var post_id = location.pathname.split('-')[1]
        if(post_id){
          $.ajax({
            type: 'GET',
            url: API+'/'+post_id,
            success: function(resp){
              console.log(resp)
              createDom(resp)
            },
            error:function(){
            }
          });
        }
      }

      setTimeout(function(){
        if(/thread\\-\\d+/.test(location.pathname)){
          listPosts()
        }
      },0)

    `)
});


//==================================
nw.init();