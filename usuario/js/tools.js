/**
 * Created by Ruben Requena on 05/05/2016.
 */
var _scripts = [];
function getScript (url,callback) {
    var name = url.split("/").pop();
    if (_scripts.hasOwnProperty(name)) callback.call(null,true);
    else {
        $.getScript(url, function (d, r) {
            if (r=="success") {
                _scripts[name] = true;
                callback.call(null, true);
            } else {
                callback.call(null, false);
            }
        })
    }
}
function formControls (form) {
    var formFields = $('.form-control',form);
    var o = {};
    for(i =0; i < formFields.length; i++) {
        var input = formFields[i];
        if (input.type=="text") o[input.name] = input.value;
        else if (input.type=="number") o[input.name] = parseFormItem(input.value);
        else if (input.type=="bool") o[input.name] = input.value=="true";
        else o[input.name] = parseFormItem(input.value);
    }
    return o;
}
function formSet (formFields,data) {
    for(i =0; i < formFields.length; i++) {
        var input = formFields[i];
        input.value = data[input.name];
    }
}
function copyTo (from,to) {
    for (var s in from) {
        to[s] = from[s];
    }
}
function parseFormItem (val) {
    if ($.isNumeric(val)) {
        if (val.indexOf(".")>-1) return parseFloat(val);
        else return parseInt(val);
    }
    return val;
}
function jsrender (script,data,helpers) {
    data = data || {};
    helpers = helpers || _helpers;
    return $.templates({markup:script}).render(data,helpers);
}
function findBy (campo,valor,data) {
    var len = data?data.length:0;
    for (var i=0;i<len;i++) {
        if (data[i][campo]==valor) return data[i];
    }
    return null;
}
function exploreBy (campo,valor,data) {
    var len = data?data.length:0;
    var d = [];
    for (var i=0;i<len;i++) {
        if (data[i][campo]==valor) d.push(data[i]);
    }
    return d;
}
function findIndex (campo,valor,data) {
    var i = data.length;
    while (--i>=0) {
        if (data[i][campo] == valor) return i;
    }
    return -1;
}
function setDatePickers (dates,date) {
    date = date || new Date();
    dates.datepicker('update', date);
    dates.datepicker('update');
}
function select2w (element,params) {
    params = params || {};
    if (useSelect2) element.select2(params);
}
function restrictCharacters(myfield, e, restrictionType) {
    if (!e) var e = window.event;
    if (e.keyCode) code = e.keyCode;
    else if (e.which) code = e.which;
    var character = String.fromCharCode(code);

    // if they pressed esc... remove focus from field...
    if (code == 27) {
        this.blur();
        return false;
    }
    // if the pressed enter... perform submit
    if (code == 13) {
        return true;
    }

    // ignore if they are press other keys
    // strange because code: 39 is the down key AND ' key...
    // and DEL also equals .
    if (!e.ctrlKey && code != 9 && code != 8 && code != 36 && code != 37 && code != 38 && (code != 39 || (code == 39 && character == "'")) && code != 40) {
        if (character.match(restrictionType)) {
            return true;
        } else {
            return false;
        }

    }
}

var digitsOnly = /[1234567890]/g;
var integerOnly = /[0-9\.\+\-]/g;
var alphaOnly = /[A-Za-z]/g;

// DATEFORMAT
var dateFormat = function () {
    var token = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g,
        timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g,
        timezoneClip = /[^-+\dA-Z]/g,
        pad = function (val, len) {
            val = String(val);
            len = len || 2;
            while (val.length < len) val = "0" + val;
            return val;
        };

    // Regexes and supporting functions are cached through closure
    return function (date, mask, utc) {
        var dF = dateFormat;

        // You can't provide utc if you skip other args (use the "UTC:" mask prefix)
        if (arguments.length == 1 && Object.prototype.toString.call(date) == "[object String]" && !/\d/.test(date)) {
            mask = date;
            date = undefined;
        }

        // Passing date through Date applies Date.parse, if necessary
        date = date ? new Date(date) : new Date;
        if (isNaN(date)) throw SyntaxError("invalid date");

        mask = String(dF.masks[mask] || mask || dF.masks["default"]);

        // Allow setting the utc argument via the mask
        if (mask.slice(0, 4) == "UTC:") {
            mask = mask.slice(4);
            utc = true;
        }

        var _ = utc ? "getUTC" : "get",
            d = date[_ + "Date"](),
            D = date[_ + "Day"](),
            m = date[_ + "Month"](),
            y = date[_ + "FullYear"](),
            H = date[_ + "Hours"](),
            M = date[_ + "Minutes"](),
            s = date[_ + "Seconds"](),
            L = date[_ + "Milliseconds"](),
            o = utc ? 0 : date.getTimezoneOffset(),
            flags = {
                d: d,
                dd: pad(d),
                ddd: dF.i18n.dayNames[D],
                dddd: dF.i18n.dayNames[D + 7],
                m: m + 1,
                mm: pad(m + 1),
                mmm: dF.i18n.monthNames[m],
                mmmm: dF.i18n.monthNames[m + 12],
                yy: String(y).slice(2),
                yyyy: y,
                h: H % 12 || 12,
                hh: pad(H % 12 || 12),
                H: H,
                HH: pad(H),
                M: M,
                MM: pad(M),
                s: s,
                ss: pad(s),
                l: pad(L, 3),
                L: pad(L > 99 ? Math.round(L / 10) : L),
                t: H < 12 ? "a" : "p",
                tt: H < 12 ? "am" : "pm",
                T: H < 12 ? "A" : "P",
                TT: H < 12 ? "AM" : "PM",
                Z: utc ? "UTC" : (String(date).match(timezone) || [""]).pop().replace(timezoneClip, ""),
                o: (o > 0 ? "-" : "+") + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4),
                S: ["th", "st", "nd", "rd"][d % 10 > 3 ? 0 : (d % 100 - d % 10 != 10) * d % 10]
            };

        return mask.replace(token, function ($0) {
            return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
        });
    };
}();

// Some common format strings
dateFormat.masks = {
    "default": "ddd mmm dd yyyy HH:MM:ss",
    shortDate: "m/d/yy",
    mediumDate: "mmm d, yyyy",
    longDate: "mmmm d, yyyy",
    fullDate: "dddd, mmmm d, yyyy",
    shortTime: "h:MM TT",
    mediumTime: "h:MM:ss TT",
    longTime: "h:MM:ss TT Z",
    isoDate: "yyyy-mm-dd",
    isoTime: "HH:MM:ss",
    isoDateTime: "yyyy-mm-dd'T'HH:MM:ss",
    isoUtcDateTime: "UTC:yyyy-mm-dd'T'HH:MM:ss'Z'"
};
// Internationalization strings
dateFormat.i18n = {
    dayNames: [
        "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat",
        "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
    ],
    monthNames: [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
        "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
    ]
};
// For convenience...
Date.prototype.format = function (mask, utc) {
    return dateFormat(this, mask, utc);
};

// FORMAT NUMBERS
function formatNumber (n, c, d, t){
    c = isNaN(c = Math.abs(c)) ? 2 : c;
    d = d == undefined ? "," : d;
    t = t == undefined ? "." : t;
    s = n < 0 ? "-" : "";
    i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + "";
    j = (j = i.length) > 3 ? j % 3 : 0;
    return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
}
Number.prototype.format = function (c,d,t) {
    return formatNumber(this,c,d,t);
};

// PADDING
var padding = function (val, len) {
    val = String(val);
    len = len || 1;
    while (val.length < len) val = "0" + val;
    return val;
};
Number.prototype.pad = function (len) {
    return padding(this,len);
};

// REMOVE WHITESPACE
var collapseString = function (s) {
    return s.split(" ").join("");
};
String.prototype.collapse = function () {
    return collapseString(this);
};

// ESCAPE HTML
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// POOL
function Pool (classType,len) {
    var _pool = [];
    var _cls = classType || Object;

    len = len || 0;
    while (len-- > 0) {
        _pool.push(new classType());
    }

    this.fromPool = function () {
        if (_pool.length==0) return new _cls();
        else return _pool.pop();
    };
    this.toPool = function (obj) {
        _pool.push(obj);
    };
    this.clear = function () {
        _pool.length = 0;
    }
}

var _helpers = {
    formatNumber:formatNumber,
    formatDate:dateFormat,
    padding:padding,
    toString: function (v) { return v?escapeHtml(JSON.stringify(v)):""},
    rnd: function (pad) {
        pad = pad || 1000000;
        return parseInt(Math.random()*pad);
    },
    collapse:function (s) { return s.split(" ").join(""); },
    banca: function (id) { return findBy("ID",id,$bancas) },
    bFHC: function (fhc) {
        var f = fhc.slice(0,8);
        var h = fhc.slice(8,-2);
        var c = fhc.slice(-2);
        return f+" "+h+" #"+c;
    }
};