define(function(require) {

    'use strict';

    var $ = require('$');
    var xml = require('text!./properties.xml');
    var qpfUtil = require('qpf/util');
    var ko = require('knockout');
    var Module = require('../Module');

    var sidebarUI;
    var root;

    var viewModel = {
        x: ko.observable(0),
        y: ko.observable(0),
        size: ko.observable(0),
        label: ko.observable(''),
        shape: ko.observable('circle'),
        color: ko.observable(0xffffff),

        visible: ko.observable(false),

        isSingleSelection: ko.observable(true),

        cancel: function() {
            viewModel.visible(false);
        }
    }

    function start() {
        sidebarUI = $("#sidebar").qpf('get')[0];
        root = qpfUtil.createComponentsFromXML(xml, viewModel);

        sidebarUI.children.push(root[0]);
    }

    var properties = new Module({
        start : start,

        viewModel : viewModel
    });
    return properties;
});