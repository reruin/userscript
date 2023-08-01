// ==UserScript==
// @name         che300
// @namespace    https://github.com/reruin
// @version      0.1
// @license      MIT
// @description  che300
// @author       reruin@gmail.com
// @grant        GM_xmlhttpRequest
// @include      http://www.che300.com/*
// @include      https://www.che300.com/*
// @connect      *
// @run-at       document-start
// ==/UserScript==


(function(root) {
  var nw = root.nw = {};
  var stack = [];
  var ArrayProto = Array.prototype,
    ObjProto = Object.prototype;
  var hasOwnProperty = ObjProto.hasOwnProperty;

  var page = {
    addStyle: function(css) {
      var el = document.createElement("style");
      el.innerHTML = css;
      document.getElementsByTagName('head')[0].appendChild(el);
    },
    addScript: function(script, pos) {
      var el = document.createElement("script");
      el.textContent = script;
      if (typeof pos == 'object') {
        pos.appendChild(el)
      } else if (pos == 'head') {
        document.getElementsByTagName('head')[0].appendChild(el);
      } else {
        document.getElementsByTagName('body')[0].appendChild(el);
      }
    },
    addHtml: function(dom) {
      var el = document.createElement(dom);
      el.innerHTML = dom;
      document.getElementsByTagName('body')[0].appendChild(el);
    }
  };

  var dom = {
    create: function(tag, id, cls, style, parent, data) {
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

  function $(e) {
    return document.querySelector(e);
  }

  function $$(e) {
    return document.querySelectorAll(e);
  }

  function noop() {

  }

  function has(obj, key) {
    return obj != null && hasOwnProperty.call(obj, key);
  }

  function key(obj) {
    var k = [];
    for (var i in obj) {
      if (has(obj, i)) k.push(i);
    }
    return k;
  }

  function isString(v) {
    return typeof v === 'string';
  }

  function is(v, b) {
    return ObjProto.toString.call(v) === "[object " + b + "]";
  }

  function isArray(v) {
    return is(v, 'Array');
  }

  function isRegExp(v) {
    return is(v, 'RegExp');
  }

  function isObject(v) {
    return is(v, 'Object');
  }

  function isFunction(v) {
    return is(v, 'Function');
  }

  function create(expr, handler) {
    if (expr && handler) {
      stack.push({ rule: expr, post: handler });
    } else {
      stack.push(expr);
    }
  }

  function replace(str, obj, format) {
    return str.replace(RegExp('(?:' + key(obj).join('|').replace(/([\:\'\)\(\{\}])/g, '\\$1') + ')', 'g'), function(match) {
      return format ? format(obj[match]) : obj[match];
    });
  }



  function toArray(a) {
    return Array.prototype.slice.call(a);
  }

  function formatLink(newurl, m) {
    return newurl.replace(/\$(\d+)/g, function($0, $1) {
      return m[$1];
    });
  }

  function hit(obj) {
    var ret = [];
    for (var i in stack) {
      var rule = stack[i].rule;
      if (isRegExp(rule)) {
        var m = obj.url.match(rule);
        if (m) {
          if (isString(stack[i].post)) {
            ret.push({
              redirect: formatLink(stack[i].post, toArray(m))
            });
          } else {
            ret.push({
              pre: stack[i].pre || noop,
              post: stack[i].post || noop,
              args: toArray(m)
            });

          }
        }

      } else if (isObject(rule)) {
        var flag = true;
        var m = null,
          ret_t = {};
        for (var key in rule) {
          m = obj[key].match(rule[key]);
          if (!m) {
            flag = false;
            break;
          } else {
            if (m.length > 1) {
              ret_t[key] = toArray(m);
            }
          }
        }
        if (flag) {
          ret.push({
            pre: stack[i].pre || noop,
            post: stack[i].post || noop,
            args: ret_t
          });
        }
      } else if (isFunction(rule)) {
        if (rule()) {
          ret.push({
            pre: stack[i].pre || noop,
            post: stack[i].post || noop,
            args: {}
          });
        }
      } else if (isArray(rule)) {
        var flag = false;
        for (var j = rule.length - 1; j >= 0; j--) {
          if (obj.url.match(rule[j])) {
            flag = true;
            break;
          }
        }
        if (flag) {
          ret.push({
            pre: stack[i].pre || noop,
            post: stack[i].post || noop,
            args: {}
          });
        }
      }
    }

    return ret;
  }

  function init() {
    var loc = window.location;

    var obj = {
      url: loc.href,
      scheme: loc.protocol.slice(0, -1),
      host: loc.hostname,
      port: loc.port,
      path: loc.pathname,
      search: loc.search,
      hash: loc.hash
    };

    var handlers = hit(obj);
    /*    console.log(handlers);
        debugger;*/
    if (handlers.length) {
      handlers.forEach(function(handler) {
        if (handler.redirect) {
          open(handler.redirect);
        } else if (handler.pre) handler.pre(handler.args);
      });
    }

    document.addEventListener('DOMContentLoaded', function() {

      if (handlers.length) {
        handlers.forEach(function(handler) {
          if (handler.post) {
            handler.post(handler.args);
          }
        });
      }
    })

  }

  /*function domReady(){

  }*/
  function monitor(opts, callback) {
    var evts = {
      'removed': 'DOMNodeRemoved',
      'inserted': 'DOMNodeInserted',
      'modified': 'DOMSubtreeModified'
    };

    opts = opts || {event:'modified' , watch:true}

    var evt = evts[opts.event || 'modified'];

    var watch = opts.watch || true //d[2] === undefined ? false : true;

    var expr = opts.expr

    var matchTag = function(target, t) {
      var k = document.createElement('div');
      k.appendChild(target.cloneNode(false));
      var ret = k.querySelector(t);
      k = null;
      return ret;
    }

    //return new promise(function(resolve, reject){
    var handler = function(event) {
      var target = event.target;
      if (matchTag(target, expr)) {
        if (callback) callback(target);
        if (!watch) document.removeEventListener(evt, handler);
      }
    };

    document.addEventListener(evt, handler);
    //});
  }

  function open(url) {
    open_direct(url);
  }

  function open_direct(url) {
    var link = document.createElementNS('http://www.w3.org/1999/xhtml', 'a');
    link.href = url;
    link.click();
  }

  var ajax = {
    get: function(url, fn) {
      var obj = new XMLHttpRequest(); // XMLHttpRequest对象用于在后台与服务器交换数据          
      obj.open('GET', url, true);
      obj.onreadystatechange = function() {
        console.log(obj)
        if (obj.readyState == 4 && obj.status == 200 || obj.status == 304) { // readyState == 4说明请求已完成
          fn.call(this, obj.responseText); //从服务器获得数据
        }
      };
      obj.send();
    },
    post: function(url, data, fn) { // datat应为'a=a1&b=b1'这种字符串格式，在jq里如果data为对象会自动将对象转成这种字符串格式
      var obj = new XMLHttpRequest();
      obj.open("POST", url, true);
      obj.setRequestHeader("Content-type", "application/x-www-form-urlencoded"); // 添加http头，发送信息至服务器时内容编码类型
      obj.onreadystatechange = function() {
        if (obj.readyState == 4 && (obj.status == 200 || obj.status == 304)) { // 304未修改
          fn.call(this, obj.responseText);
        }
      };
      obj.send(data);
    }
  };

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

  nw.request = ajax;

}(this));


/*
 * che300.com
 */
nw.c({
  rule: [
    /www\.che300\.com\/pinggu/
  ],
  pre: function() {

    var styles = ".ndot{background-image:url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAALCAMAAAB1RTwXAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTQyIDc5LjE2MDkyNCwgMjAxNy8wNy8xMy0wMTowNjozOSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTggKFdpbmRvd3MpIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjI5NDVFMTZERDJCNzExRThCRDNEQzA0NjUwN0QzRUE2IiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOjI5NDVFMTZFRDJCNzExRThCRDNEQzA0NjUwN0QzRUE2Ij4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6Mjk0NUUxNkJEMkI3MTFFOEJEM0RDMDQ2NTA3RDNFQTYiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6Mjk0NUUxNkNEMkI3MTFFOEJEM0RDMDQ2NTA3RDNFQTYiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz4V8sf3AAAABlBMVEX///8AAABVwtN+AAAAFUlEQVR42mJgoB5gZITRCBaQAAgwAADPAAmFXAd7AAAAAElFTkSuQmCC');}.n9{background-image:url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAALCAMAAAB1RTwXAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTQyIDc5LjE2MDkyNCwgMjAxNy8wNy8xMy0wMTowNjozOSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTggKFdpbmRvd3MpIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOkY5NkM0NTRCRDJCODExRThCNkRFODc2NTk1RDU0QjY5IiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOkY5NkM0NTRDRDJCODExRThCNkRFODc2NTk1RDU0QjY5Ij4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6Rjk2QzQ1NDlEMkI4MTFFOEI2REU4NzY1OTVENTRCNjkiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6Rjk2QzQ1NEFEMkI4MTFFOEI2REU4NzY1OTVENTRCNjkiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz506FanAAAABlBMVEX///8AAABVwtN+AAAAJklEQVR42mJgYGAEAgYGEI3AYBJdmJEBQkLEYVLYtMJVgABAgAEACL0AKD5Xx30AAAAASUVORK5CYII=');}.n8{background-image:url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAALCAMAAAB1RTwXAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTQyIDc5LjE2MDkyNCwgMjAxNy8wNy8xMy0wMTowNjozOSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6RUYxOEEyNDhEMkI3MTFFOEExQzlCMTRBQjQwMENDNDkiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6RUYxOEEyNDdEMkI3MTFFOEExQzlCMTRBQjQwMENDNDkiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTggKFdpbmRvd3MpIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6MEM2OUMxODZEMkI3MTFFOEIzRTFDOTBGMzU2RUIyNTUiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6MEM2OUMxODdEMkI3MTFFOEIzRTFDOTBGMzU2RUIyNTUiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz6jGnLsAAADAFBMVEX///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAALI7fhAAAAHUlEQVR42mJgYPgPBAwMIBqBMXk41OBTDAUAAQYAaGsn2d3Ff5YAAAAASUVORK5CYII=');}.n7{background-image:url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAALCAMAAAB1RTwXAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTQyIDc5LjE2MDkyNCwgMjAxNy8wNy8xMy0wMTowNjozOSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6RDhERDM0MEFEMkI3MTFFOEExMURFODY4MjNENkVCQkYiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6RDhERDM0MDlEMkI3MTFFOEExMURFODY4MjNENkVCQkYiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTggKFdpbmRvd3MpIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6RkVGOTU0MjlEMkI2MTFFOEJFRkQ5NUE0MTBFMTU1NkYiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6RkVGOTU0MkFEMkI2MTFFOEJFRkQ5NUE0MTBFMTU1NkYiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz4oHonbAAADAFBMVEX///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAALI7fhAAAAF0lEQVR42mL4DwUMEIDBIJVGMGAAIMAAaU4Z5xhOQRAAAAAASUVORK5CYII=');}.n6{background-image:url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAALCAMAAAB1RTwXAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTQyIDc5LjE2MDkyNCwgMjAxNy8wNy8xMy0wMTowNjozOSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTggKFdpbmRvd3MpIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOkFBQjlDNURCRDJCNzExRTg4Q0U5QUM2OTA4M0NBN0QxIiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOkFBQjlDNURDRDJCNzExRTg4Q0U5QUM2OTA4M0NBN0QxIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6QUFCOUM1RDlEMkI3MTFFODhDRTlBQzY5MDgzQ0E3RDEiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6QUFCOUM1REFEMkI3MTFFODhDRTlBQzY5MDgzQ0E3RDEiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz5BtcYRAAAABlBMVEX///8AAABVwtN+AAAAKElEQVR42mJgYGAEAgYGEI3AQBLGgMhA1DCiqWFkwKqVEa4TBAACDAAIfQAo3wv0qQAAAABJRU5ErkJggg==');}.n5{background-image:url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAALCAMAAAB1RTwXAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTQyIDc5LjE2MDkyNCwgMjAxNy8wNy8xMy0wMTowNjozOSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6RkJEODkzNkFEMkI3MTFFODg1QkJFODhFQ0VFMDBDNDQiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6RkJEODkzNjlEMkI3MTFFODg1QkJFODhFQ0VFMDBDNDQiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTggKFdpbmRvd3MpIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6NjgxNDc3NjFEMkI3MTFFODk4NTJBRjdDRDUwNzcxMkQiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6NjgxNDc3NjJEMkI3MTFFODk4NTJBRjdDRDUwNzcxMkQiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz7i9OvcAAADAFBMVEX///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAALI7fhAAAAI0lEQVR42mL4DwEMDCAMBsgMsAwDqjyaApgIQg3EPDgACDAAFb4k3CBacFUAAAAASUVORK5CYII=');}.n4{background-image:url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAALCAMAAAB1RTwXAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTQyIDc5LjE2MDkyNCwgMjAxNy8wNy8xMy0wMTowNjozOSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTggKFdpbmRvd3MpIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjk4NTcyQ0E0RDJCODExRThCODY2RjhDREVFNzg4MUQ1IiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOjk4NTcyQ0E1RDJCODExRThCODY2RjhDREVFNzg4MUQ1Ij4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6OTg1NzJDQTJEMkI4MTFFOEI4NjZGOENERUU3ODgxRDUiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6OTg1NzJDQTNEMkI4MTFFOEI4NjZGOENERUU3ODgxRDUiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz4qWMucAAAABlBMVEX///8AAABVwtN+AAAAJ0lEQVR42mJgAAFGRgYozQijGaHiYAaIgGEoAwIYULRjYQABQIABAAfDACQzzsJJAAAAAElFTkSuQmCC');}.n3{background-image:url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAALCAMAAAB1RTwXAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTQyIDc5LjE2MDkyNCwgMjAxNy8wNy8xMy0wMTowNjozOSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6MEYwMTU0MzBEMkI4MTFFOEJENjFEQUExNjNBNDRCMTYiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6MEYwMTU0MkZEMkI4MTFFOEJENjFEQUExNjNBNDRCMTYiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTggKFdpbmRvd3MpIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6NDkyOTNFRDBEMkI3MTFFODk3RTM4NUQwOTc5NDIzRjIiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6NDkyOTNFRDFEMkI3MTFFODk3RTM4NUQwOTc5NDIzRjIiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz6dBN9tAAADAFBMVEX///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAALI7fhAAAAJUlEQVR42mJg+A8CDAwMCAIMYCwo/R9TBokFZCCbgaQYCAACDAB2QR7inDhrMQAAAABJRU5ErkJggg==');}.n2{background-image:url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAALCAMAAAB1RTwXAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTQyIDc5LjE2MDkyNCwgMjAxNy8wNy8xMy0wMTowNjozOSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6MUZBRDczRUREMkI4MTFFODk3RjZFQTgxQTQxODE4MTAiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6MUZBRDczRUNEMkI4MTFFODk3RjZFQTgxQTQxODE4MTAiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTggKFdpbmRvd3MpIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6REJDQzJCRjlEMkI2MTFFODg2OERBRTM5QTNFMEVDRkYiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6REJDQzJCRkFEMkI2MTFFODg2OERBRTM5QTNFMEVDRkYiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz6S/pB6AAADAFBMVEX///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAALI7fhAAAAHklEQVR42mJgYPgPBAwMIBqBYSQSg3gaAhhgACDAAH45H+Ex5ZAoAAAAAElFTkSuQmCC');}.n1{background-image:url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAALCAMAAAB1RTwXAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTQyIDc5LjE2MDkyNCwgMjAxNy8wNy8xMy0wMTowNjozOSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTggKFdpbmRvd3MpIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjNDNDNDNThDRDJCODExRTg5NDYxRDNENURBNkQzMjhBIiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOjNDNDNDNThERDJCODExRTg5NDYxRDNENURBNkQzMjhBIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6M0M0M0M1OEFEMkI4MTFFODk0NjFEM0Q1REE2RDMyOEEiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6M0M0M0M1OEJEMkI4MTFFODk0NjFEM0Q1REE2RDMyOEEiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz4o8LRQAAAABlBMVEX///8AAABVwtN+AAAAIklEQVR42mJgYGBgZGQAA0YogxHGQEiRwmBkRDIACAACDAAFxQAcZLG29AAAAABJRU5ErkJggg==');}.n0{background-image:url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAALCAMAAAB1RTwXAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTQyIDc5LjE2MDkyNCwgMjAxNy8wNy8xMy0wMTowNjozOSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTggKFdpbmRvd3MpIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOkFFOUJFQ0JCRDJCODExRThCRjkwODZFOTRBODRDM0REIiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOkFFOUJFQ0JDRDJCODExRThCRjkwODZFOTRBODRDM0REIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6QUU5QkVDQjlEMkI4MTFFOEJGOTA4NkU5NEE4NEMzREQiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6QUU5QkVDQkFEMkI4MTFFOEJGOTA4NkU5NEE4NEMzREQiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz6W28UhAAAABlBMVEX///8AAABVwtN+AAAAJElEQVR42mJgYGBgZGQAA0ZGCAtEwjCYxMNAUYgwiAEJAAQYAAf7ACXln2R1AAAAAElFTkSuQmCC');}"
    nw.addStyle(styles);
    nw.addStyle('.i-mock{display:inline-block;width:8px;height:11px;margin-left:1px}.btn-modify{font-size:12px;color:red;cursor:pointer;position:absolute;width:25px;display:block;opacity:0;pointer-events:none; padding:0 2px;top:0;}.btn-modify-price{left:0;}.btn-reset-price{right:0;}.sp-price li:hover .btn-modify{pointer-events:auto;opacity:1;}.price-wrap{display:none;}.custom-price img,.custom-price span{display:none}.custom-price .price-wrap{display:block;}')
  },
  post: function() {
    var script = function() {

      function setPrice(el , price){
        var target = el.find('.price-wrap')
        var html = ''
        for(var i = 0 ; i < price.length ; i++){
          let t = price.charAt(i)
          if( t== '.') t = 'dot'

          html += `<i class="i-mock n${t}"></i>`
        }
        if( target.length ){
          target.html(html)
        }else{
          target = $('<div class="price-wrap">'+html+'</div>')
          el.append(target)
        }
        el.addClass('custom-price')
      }

      function resetPrice(el){
        el.removeClass('custom-price')
      }

      $('.sp-price li').append('<a class="btn-modify btn-modify-price">修改</a><a class="btn-modify btn-reset-price">重设</a>')
      $('body').on('click' , '.btn-modify-price' , function(){
        var price = window.prompt('请输入金额')
        var el = $(this).parent()
        if(/^[0-9\.]+$/.test(price)){
          setPrice(el , price)
        }else{
          alert('请输入有效金额')
        }
      }).on('click' , '.btn-reset-price' , function(){
        resetPrice($(this).parent())
      })
    };

    nw.addScript(';(' + script + '());', 'body');
  }
});

nw.init()