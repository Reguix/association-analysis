define(function(require) {

    'use strict';

    var $ = require('$');
    var xml = require('text!./graph.xml');
    var qpfUtil = require('qpf/util');
    var ko = require('knockout');
    var Module = require('../Module');

    var sidebarUI;
    var root;

    var viewModel = {

        // Statistic
        nodeCount: ko.observable(0),
        edgeCount: ko.observable(0),

        brushType: ko.observable('fill'),

        // Label
        showLabel: ko.observable(true),

        // Edges
        edgeOpacity: ko.observable(0.1),

        edgeAdditiveBlend: ko.observable(true),

        // Default edge and node style
        useDefaultEdgeColor: ko.observable(false),

        defaultEdgeColor: ko.observable(0x888888),

        useDefaultNodeColor: ko.observable(false),

        defaultNodeColor: ko.observable(0x888888),

        forceAtlas2: {

            autoSettings: ko.observable(true),
            
            barnesHutOptimize: ko.observable(true),
            barnesHutTheta: ko.observable(1.2),

            linLogMode: ko.observable(false),
            gravity: ko.observable(1),
            scaling: ko.observable(1),
            edgeWeightInfluence: ko.observable(1),

            jitterTolerence: ko.observable(0.1),

            preventOverlap: ko.observable(false),

            strongGravityMode: ko.observable(false)
        }
    }

    viewModel.forceAtlas2.manualSettings = ko.computed(function() {
        return !viewModel.forceAtlas2.autoSettings();
    });

    function start() {
        sidebarUI = $("#sidebar").qpf('get')[0];
        root = qpfUtil.createComponentsFromXML(xml, viewModel);

        sidebarUI.children.push(root[0]);
    }

    var graph = new Module({
        start : start,

        viewModel : viewModel
    });

    return graph;
});