/**
 * Created by Ruben on 27-03-2016.
 */
function NetEvent () {}
NetEvent.SOCKET_OPEN = "socket_open";
NetEvent.SOCKET_CLOSE = "socket_close";
NetEvent.SOCKET_ERROR = "socket_error";
NetEvent.DATA_CHANGE = "socket_change";
NetEvent.LOGIN = "login";
NetEvent.MESSAGE = "socket_message";

function EventDispatcher () {
    this.socketEvent = {};
    this.addListener = function (event,handler) {
        if (this.socketEvent.hasOwnProperty(event)) {
            var listeners = this.socketEvent[event];
            var index = listeners.indexOf(handler);
            if (index === -1) listeners.push(handler);
        } else {
            this.socketEvent[event] = [handler];
        }
        return this.socketEvent[event].length;
    };
    this.removeListener = function (event,handler) {
        if (this.socketEvent.hasOwnProperty(event)) {
            if (handler==null) {
                delete this.socketEvent[event];
            } else {
                var listeners = this.socketEvent[event];
                var index = listeners.indexOf(handler);
                if (index !== -1) listeners.splice(index,1);
            }
            var _listeners = this.socketEvent[event];
            if (_listeners.length===0)
                delete this.socketEvent[event];
        }
    };
    this.removeListeners = function (event) {
        if (this.socketEvent.hasOwnProperty(event)) {
            delete this.socketEvent[event];
            return true;
        }
        return false;
    };
    this.dispatchListener = function (event,data) {
        if (this.socketEvent.hasOwnProperty(event)) {
            var listeners = this.socketEvent[event];
            for (var i = 0; i < listeners.length; i++) {
                listeners[i].call(this,event,data);
            }
            return i;
        }
        return 0;
    };
}

function Net (url,ob) {
    ob = ob==undefined?true:ob;

    this.url = url;
    this.socketEvent = {};
    this.bytesIn=0;
    this.bytesOut=0;
    var m = this;

    this.addListener = function (event,handler) {
        if (this.socketEvent.hasOwnProperty(event)) {
            var listeners = this.socketEvent[event];
            var index = listeners.indexOf(handler);
            if (index === -1) listeners.push(handler);
        } else {
            this.socketEvent[event] = [handler];
        }
        return this.socketEvent[event].length;
    };
    this.removeListener = function (event,handler) {
        if (this.socketEvent.hasOwnProperty(event)) {
            if (handler==null) {
                delete this.socketEvent[event];
            } else {
                var listeners = this.socketEvent[event];
                var index = listeners.indexOf(handler);
                if (index !== -1) listeners.splice(index,1);
            }
            var _listeners = this.socketEvent[event];
            if (_listeners.length===0)
                delete this.socketEvent[event];
        }
    };
    this.removeListeners = function (event) {
        if (event==undefined) {
            this.socketEvent = {};
            return true;
        }
        if (this.socketEvent.hasOwnProperty(event)) {
            delete this.socketEvent[event];
            return true;
        }
        return false;
    };
    this.dispatchListener = function (event,data) {
        if (this.socketEvent.hasOwnProperty(event)) {
            var listeners = this.socketEvent[event];
            for (var i = 0; i < listeners.length; i++) {
                listeners[i].call(this,event,data);
            }
            return i;
        }
        return 0;
    };

    this.connect = function () {
        this.socket = new WebSocket(this.url);
        this.socket.onopen = function () {
            m.dispatchListener(NetEvent.SOCKET_OPEN)
        };
        this.socket.onmessage = function (message) {
            var raw = message.data.replace(/[\u0000\u00ff]/g, '');
            if (ob) raw = obfuscate(raw);
            var msg = JSON.parse(raw);
            m.dispatchListener(msg.command,msg.data);

            m.bytesIn += getUTF8Size(message.data);
            m.dispatchListener(NetEvent.MESSAGE);
            m.dispatchListener(NetEvent.DATA_CHANGE);
        };
        this.socket.onclose = function () {
            m.dispatchListener(NetEvent.SOCKET_CLOSE,false);
        };
        this.socket.onerror = function () {
            m.dispatchListener(NetEvent.SOCKET_ERROR)
        }
    };
    this.close = function () {
        this.dispatchListener(NetEvent.SOCKET_CLOSE,true);
        this.socket.close();
        this.socketEvent = {}
    };
    this.sendMessage = function (command,data,callback) {
        if(this.socket != null) {
            var message = {
                command: command,
                data: data
            };
            if (callback!=null) {
                this.addListener(command,callback);
                this.addListener(command,function (e,d) {
                    this.removeListener(e,callback);
                    this.removeListener(e,arguments.callee);
                })
            }
            var msg = JSON.stringify(message);
            if (ob) msg = obfuscate(msg);
            this.socket.send(msg);

            m.bytesOut += getUTF8Size(msg);
            m.dispatchListener(NetEvent.MESSAGE);
            m.dispatchListener(NetEvent.DATA_CHANGE);
        }
    };

    function obfuscate(s) {
        var i=0, j=0;
        var x="",r="";
        for (j = 0; j < s.length; j++, i++) {
            x += s.charAt(j);
            if (i==10) {
                r += x.split("").reverse().join("");
                x = ""; i=0;
            }
        }
        r += x.split("").reverse().join("");
        return r;
    }
    function getUTF8Size ( str ) {
        return str.split('')
            .map(function( ch ) {
                return ch.charCodeAt(0);
            }).map(function( uchar ) {
                // The reason for this is explained later in
                // the section “An Aside on Text Encodings”
                return uchar < 128 ? 1 : 2;
            }).reduce(function( curr, next ) {
                return curr + next;
            });
    }
}

Net.parseBytes = function (bytes) {
    if (bytes<1024) return bytes+"b";
    else return parseInt(bytes/1024)+"kb";
};