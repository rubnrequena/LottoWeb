var useSelect2 = true;
jQuery(window).load(function () {

    "use strict";

});

jQuery(document).ready(function () {

    "use strict";

    //Select2 non mobile
    var body = jQuery('body');

    // Toggle Left Menu
    jQuery('.leftpanel .nav-parent > a').live('click', function () {

        var parent = jQuery(this).parent();
        var sub = parent.find('> ul');

        // Dropdown works only when leftpanel is not collapsed
        if (!jQuery('body').hasClass('leftpanel-collapsed')) {
            if (sub.is(':visible')) {
                sub.slideUp(200, function () {
                    parent.removeClass('nav-active');
                    jQuery('.mainpanel').css({height: ''});
                    adjustmainpanelheight();
                });
            } else {
                closeVisibleSubMenu();
                parent.addClass('nav-active');
                sub.slideDown(200, function () {
                    adjustmainpanelheight();
                });
            }
        }
        return false;
    });

    function closeVisibleSubMenu() {
        jQuery('.leftpanel .nav-parent').each(function () {
            var t = jQuery(this);
            if (t.hasClass('nav-active')) {
                t.find('> ul').slideUp(200, function () {
                    t.removeClass('nav-active');
                });
            }
        });
    }

    function adjustmainpanelheight() {
        // Adjust mainpanel height
        var docHeight = jQuery(document).height();
        if (docHeight > jQuery('.mainpanel').height())
            jQuery('.mainpanel').height(docHeight);
    }

    adjustmainpanelheight();


    // Tooltip
    jQuery('.tooltips').tooltip({container: 'body'});

    // Popover
    jQuery('.popovers').popover();

    // Form Toggles
    jQuery('.toggle').toggles({on: true});

    // Add class everytime a mouse pointer hover over it
    jQuery('.nav-bracket > li').hover(function () {
        jQuery(this).addClass('nav-hover');
    }, function () {
        jQuery(this).removeClass('nav-hover');
    });


    // Menu Toggle
    jQuery('.menutoggle').click(function () {

        var body = jQuery('body');
        var bodypos = body.css('position');

        if (bodypos != 'relative') {

            if (!body.hasClass('leftpanel-collapsed')) {
                body.addClass('leftpanel-collapsed');
                jQuery('.nav-bracket ul').attr('style', '');

                jQuery(this).addClass('menu-collapsed');

            } else {
                body.removeClass('leftpanel-collapsed chat-view');
                jQuery('.nav-bracket li.active ul').css({display: 'block'});

                jQuery(this).removeClass('menu-collapsed');

            }
        } else {

            if (body.hasClass('leftpanel-show'))
                body.removeClass('leftpanel-show');
            else
                body.addClass('leftpanel-show');

            adjustmainpanelheight();
        }

    });

    reposition_topnav();
    reposition_searchform();

    jQuery(window).resize(function () {

        if (body.css('position') == 'relative') {
            jQuery('body').removeClass('leftpanel-collapsed');
        } else {
            jQuery('body').css({left: '', marginRight: ''});
        }
        reposition_searchform();
        reposition_topnav();
    });

    jQuery('.nav-bracket').find('a').click(function (e) {
        if (!$(this).parent().hasClass('nav-parent')) {
            var body = jQuery('body');
            var bodypos = body.css('position');

            if (bodypos == 'relative') {

                if (body.hasClass('leftpanel-show')) {
                    body.removeClass('leftpanel-show');
                }
            }
        }
    });

    /* This function will reposition search form to the left panel when viewed
     * in screens smaller than 767px and will return to top when viewed higher
     * than 767px
     */
    function reposition_searchform() {
        if (jQuery('.searchform').css('position') == 'relative') {
            jQuery('.searchform').insertBefore('.leftpanelinner .userlogged');
        } else {
            jQuery('.searchform').insertBefore('.header-right');
        }
    }

    if (jQuery('.searchform').css('position') == 'relative') {
        useSelect2 = false;
    }

    /* This function allows top navigation menu to move to left navigation menu
     * when viewed in screens lower than 1024px and will move it back when viewed
     * higher than 1024px
     */
    function reposition_topnav() {
        if (jQuery('.nav-horizontal').length > 0) {

            // top navigation move to left nav
            // .nav-horizontal will set position to relative when viewed in screen below 1024
            if (jQuery('.nav-horizontal').css('position') == 'relative') {

                if (jQuery('.leftpanel .nav-bracket').length == 2) {
                    jQuery('.nav-horizontal').insertAfter('.nav-bracket:eq(1)');
                } else {
                    // only add to bottom if .nav-horizontal is not yet in the left panel
                    if (jQuery('.leftpanel .nav-horizontal').length == 0)
                        jQuery('.nav-horizontal').appendTo('.leftpanelinner');
                }

                jQuery('.nav-horizontal').css({display: 'block'})
                    .addClass('nav-pills nav-stacked nav-bracket');

                jQuery('.nav-horizontal .children').removeClass('dropdown-menu');
                jQuery('.nav-horizontal > li').each(function () {

                    jQuery(this).removeClass('open');
                    jQuery(this).find('a').removeAttr('class');
                    jQuery(this).find('a').removeAttr('data-toggle');

                });

                if (jQuery('.nav-horizontal li:last-child').has('form')) {
                    jQuery('.nav-horizontal li:last-child form').addClass('searchform').appendTo('.topnav');
                    jQuery('.nav-horizontal li:last-child').hide();
                }

            } else {
                // move nav only when .nav-horizontal is currently from leftpanel
                // that is viewed from screen size above 1024
                if (jQuery('.leftpanel .nav-horizontal').length > 0) {

                    jQuery('.nav-horizontal').removeClass('nav-pills nav-stacked nav-bracket')
                        .appendTo('.topnav');
                    jQuery('.nav-horizontal .children').addClass('dropdown-menu').removeAttr('style');
                    jQuery('.nav-horizontal li:last-child').show();
                    jQuery('.searchform').removeClass('searchform').appendTo('.nav-horizontal li:last-child .dropdown-menu');
                    jQuery('.nav-horizontal > li > a').each(function () {

                        jQuery(this).parent().removeClass('nav-active');

                        if (jQuery(this).parent().find('.dropdown-menu').length > 0) {
                            jQuery(this).attr('class', 'dropdown-toggle');
                            jQuery(this).attr('data-toggle', 'dropdown');
                        }

                    });
                }

            }

        }
    }

    // Check if leftpanel is collapsed
    if (body.hasClass('leftpanel-collapsed'))
        jQuery('.nav-bracket .children').css({display: ''});


    // Handles form inside of dropdown
    jQuery('.dropdown-menu').find('form').click(function (e) {
        e.stopPropagation();
    });
});


function formReset (form) {
    form.reset();
    $('.form-control',form).first().focus();
    formLock(form,false);
}