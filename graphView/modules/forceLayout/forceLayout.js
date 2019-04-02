define(function(require) {

    var ForceAtlas2 = require('../../lib/ForceAtlas2');
    var Module = require('../Module');

    var forceAtlas2 = null;

    var setConfigTimeout;

    var frameTime = 0;

    var time = new Date().getTime();

    // Times update per frame, to keep sync with rendering
    var stepsPerFrame = 1;

    var iterateNumber = 0;

    var forceLayout = new Module({

        // Times update per frame, to keep sync with rendering
        setRenderTime: function(time) {
            if (frameTime == 0) {
                return;
            }

            stepsPerFrame *= Math.max(Math.floor(time / frameTime), 1);

            stepsPerFrame = Math.round(stepsPerFrame);
        },

        getIterateNumber: function() {
            return iterateNumber;
        },

        start: function(graph) {
            if (forceAtlas2) {
                return false;
            }
            
            forceAtlas2 = new ForceAtlas2();

            stepsPerFrame = 1;
            iterateNumber = 0;

            var nodes = graph.getNodes();
            var edges = graph.getEdges();

            for (var i = 0; i < nodes.length; i++) {
                forceAtlas2.addNode(nodes[i]);
            }
            for (var i = 0; i < edges.length; i++) {
                forceAtlas2.addEdge(edges[i]);
            }

            function onupdate() {
                
                iterateNumber++;

                var current = new Date().getTime();
                frameTime = current - time;
                time = current;

                forceAtlas2.update(stepsPerFrame);
            }

            forceAtlas2.onupdate = onupdate;

            forceAtlas2.init();

            forceAtlas2.update();

            return true;
        },

        stop: function() {
            if (forceAtlas2) {
                forceAtlas2.dispose();
            }

            forceAtlas2 = null;
        },

        setConfig: function(config) {
            if (setConfigTimeout) {
                clearTimeout(setConfigTimeout);
            }
            if (!forceAtlas2) {
                return;
            }
            setConfigTimeout = setTimeout(function() {
                setConfigTimeout = 0;

                for (var name in config) {
                    forceAtlas2[name] = config[name];
                }

                forceAtlas2.updateConfig();
            });
        }
    });

    return forceLayout;
});