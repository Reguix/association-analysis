define(function(require) {

    var $ = require('$');
    var xml = require('text!./toolbar.xml');
    var qpfUtil = require('qpf/util');
    var ko = require('knockout');
    var Module = require('../Module');

    var startupModule = require('../startup/startup');
    var viewerModule = require('../viewer/viewer');
    var forceLayoutModule = require('../forceLayout/forceLayout');
    var graphModule = require('../graph/graph');

    var runningLayout = false;

    var time = new Date().getTime();
    var renderTime = 0;

    var _updateAndRender = function() {
        var current = new Date().getTime();
        renderTime = current - time;
        time = current;

        if (!runningLayout) {
            return;
        }

        // Wait the force layout warm up
        if (forceLayoutModule.getIterateNumber() > 5) {

            forceLayoutModule.setRenderTime(renderTime);

            viewerModule.updateAndRender();
        }

        requestAnimationFrame(_updateAndRender);
    }

    var layoutConfig = {};

    ko.computed(function() {
        for (var name in graphModule.viewModel.forceAtlas2) {
            layoutConfig[name] = graphModule.viewModel.forceAtlas2[name]();
        }

        forceLayoutModule.setConfig(layoutConfig);
    });

    var viewModel = {
        upload: function() {
            if (runningLayout) {
                viewModel.toggleLayout();
            }
            startupModule.upload();
        },
        toXML: function() {
            var oSerializer = new XMLSerializer();
            var doc = viewerModule.toXML();
            if (doc) {
                var xmlString = oSerializer.serializeToString(doc);

                var blob = new Blob([xmlString]);

                saveAs(blob, "out.gexf");
            }
        },
        toggleLayout: function() {
            if (!runningLayout) {

                var graph = viewerModule.getGraph();
                if (!graph) {
                    return;
                }
                
                viewerModule.disableSelect();

                viewerModule.unSelectAll();

                var res = forceLayoutModule.start(graph);

                forceLayoutModule.setConfig(layoutConfig);
                
                if (!res) {
                    return;
                }

                requestAnimationFrame(_updateAndRender);

            } else {

                viewerModule.enableSelect();
                forceLayoutModule.stop();
            }

            runningLayout = !runningLayout;

            this.icon(runningLayout ? 'pause' : 'play');
        }
    }

    function start() {
        var topbarUI = $('#topbar').qpf('get')[0];

        var toolbar = qpfUtil.createComponentsFromXML(xml, viewModel);
        topbarUI.children.push(toolbar[0]);
    }

    var toolbar = new Module({
        
        start: start,

        viewModel: viewModel
    });

    return toolbar;
});