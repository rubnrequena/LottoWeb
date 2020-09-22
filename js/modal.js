/**
 * Created by Ruben Requena on 21/10/2018.
 */
function askme (title,body,callback,md) {
    if (callback) {
        if (callback.hasOwnProperty('before')) callback.before();
    }
    var modal = md || $('#md-ask');
    var _title = modal.find('.modal-title');
    _title.html(title);

    var _body = modal.find('.modal-body');
    _body.html(body);

    var fm = modal.find('form');
    fm.submit(btnok_clic)

    modal.find('.date').datepicker({
        dateFormat:'yy-mm-dd'
    });

    modal.find('.now').datepicker('setDate',new Date());
    modal.find('.s2').select2({allowClear:true});

    var f = modal.find('form');
    f.submit(function (e) {
        e.preventDefault(e);
        //btnok.off('click',arguments.calle);
        modal.modal('hide');
    });
    /*modal.find('.s2').change(function () {
        $(this).nextAll('.form-control').first().focus();
    });*/

    if (callback) {
        if (callback.hasOwnProperty('after')) callback.after();
        var btnok = modal.find('.md-ask-ok');
        btnok.click(btnok_clic);
    }

    modal.on('hidden.bs.modal', function () {
        modal.off('hidden.bs.modal',arguments.callee);
        btnok.off('click',btnok_clic);
        _title.html('');
        _body.html('');
        if (callback && callback.hasOwnProperty('hidden')) callback.hidden();
    });

    function btnok_clic (e) {        
        e.preventDefault()

        var fm = modal.find('form');
        var data = formControls(fm);
        if (callback.ok(data)!=false) {
            modal.modal('hide');
        }
    }

    modal.modal();
}
function askmenu (title,body,callback,md) {
    if (callback) {
        if (callback.hasOwnProperty('before')) callback.before();
    }
    var modal = md || $('#md-ask');
    var _title = modal.find('.modal-title');
    _title.html(title);

    var _body = modal.find('.modal-body');
    _body.html(body);

    modal.find('.date').datepicker({
        dateFormat:'yy-mm-dd'
    });

    modal.find('.now').datepicker('setDate',new Date());
    modal.find('.s2').select2({allowClear:true});

    var f = modal.find('form');
    f.submit(function (e) {
        e.preventDefault(e);
        //btnok.off('click',arguments.calle);
        modal.modal('hide');
    });
    /*modal.find('.s2').change(function () {
     $(this).nextAll('.form-control').first().focus();
     });*/

    if (callback) {
        if (callback.hasOwnProperty('after')) callback.after();
        var btnok = modal.find('.md-ask-ok');
        btnok.click(btnok_clic);
    }

    modal.on('hidden.bs.modal', function () {
        modal.off('hidden.bs.modal',arguments.callee);
        btnok.off('click',btnok_clic);
        _title.html('');
        _body.html('');
    });

    function btnok_clic (e) {
        if (callback($(e.currentTarget))) modal.modal('hide');
    }

    modal.modal();
}