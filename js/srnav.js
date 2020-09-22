/**
 * Created by Ruben Requena on 15/06/2016.
 */
function Navegador() {
    this.paginas = new EventDispatcher();
    this.root = "inicio";
    this.folder = "paginas";
    this.viewport = "#viewport";
    this.version = vrs || new Date().getTime();
    this.nextDontMove = false

    this.validate = function (page, args) {
        return page;
    };

    var argsSeparator = "|";
    var current_page = "";
    var current_data;
    var me = this;
    var history = [];
    var historyData = [];

    this.current = function () {
        return {
            page: current_page,
            data: current_data
        }
    };

    $(window).bind('hashchange', () => {
        if (this.nextDontMove) {
            this.nextDontMove = false
            return
        }
        var params = window.location.hash.substr(1).split(argsSeparator);
        var page = params.shift();
        me.nav(page, params);
    });

    this.navUrl = function () {
        var params = window.location.hash.substr(1).split("|");
        var page = params.shift();
        me.nav(page, params.length > 0 ? params : null);
    };
    this.nav = function (page, params, fail, context) {
        page = page || this.root;
        page = me.validate(page, params);
        context = context || me.viewport;
        jQuery('#preloader').fadeIn(function () {
            $(context).load(me.folder + "/" + page + ".html?" + me.version, function (data, result) {
                if (result == "success") {
                    if (current_page != "") me.paginas.dispatchListener(Navegador.EXIT, current_page);

                    if (current_page != "login") {
                        addHistory(current_page, current_data);
                    }
                    current_page = page;
                    current_data = params;

                    me.paginas.dispatchListener(Navegador.ENTER, page);
                    //window.history.pushState({pageTitle:page},page);
                    me.paginas.dispatchListener(page, params);
                    me.paginas.dispatchListener(Navegador.COMPLETE, page);

                    jQuery('#preloader').fadeOut();
                } else {
                    if (fail == null) me.nav("404");
                    else fail.call(null, page, params);
                }

            });
        });
    };
    this.setURL = function (page) {
        this.nextDontMove = true
        window.location.hash = page
    }
    this.setUrl = function (page, ...params) {
        this.nextDontMove = true
        window.location.hash = `${page}|${params.join('|')}`
    }
    this.url = function (page, params) {
        page = page || this.root;
        if (params == undefined || params == null) window.location.hash = page;
        else window.location.hash = page + argsSeparator + params.join("|");
    };
    this.back = function () {
        if (history.length > 0) {
            me.url(history.pop(), historyData.pop());
        } else me.url(me.root);
    };

    function addHistory(page, params) {
        if (page != "") {
            history.push(page);
            historyData.push(params);
        }

    }
}
Navegador.ENTER = "page_enter";
Navegador.EXIT = "page_exit";
Navegador.COMPLETE = "page_complete";