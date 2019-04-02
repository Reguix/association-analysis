define(function(require) {

    'use strict';

    var zrender = require('zrender');
    var ko = require('knockout');
    var qpfUtil = require('qpf/util');
    var glMatrix = require('glmatrix');
    var vec2 = glMatrix.vec2;
    var Module = require('../Module');

    var _ = require('_');

    var $ = require('$');
    var LineShape = require('zrender/shape/Line');
    var TextShape = require('zrender/shape/Text');
    var GEXF = require('../../lib/gexf');
    var GDF = require('../../lib/gdf');
    var shapeBuilders = require('./shapeBuilders');

    var xml = require('text!./viewer.xml');
    var propModule = require('../properties/properties');
    var graphModule = require('../graph/graph');

    var polygonSelection = require('../selection/polygonSelection');

    var viewport;
    var zr;

    var graph;

    var edgeShapesMap = {};
    var nodeShapesMap = {};

    var nodeShapesList = [];
    var edgeShapesList = [];

    var textShapesList = [];

    var currentSelectedNode;
    var currentSelectedShape;

    var viewModel = {};

    var selectDisabled = false;

    var onFocusEdgeOpacity = 0.5;
    var outOfFocusEdgeOpacity = 0.01;

    var onFocusNodeOpacity = 1;
    var outOfFocusNodeOpacity = 0.1;

    var normalNodeOpacity = 1;
    var normalEdgeOpacity = 0.1;

    var initializingProperty = false;

    function start() {
        var mainUI = $('#main').qpf('get')[0];
        var root = qpfUtil.createComponentsFromXML(xml, viewModel);
        mainUI.children.push(root[0])

        viewport = document.getElementById('viewport');

        zr = zrender.init(viewport);

        zr.configLayer(0, {
            blendFunc: function(_gl) {
                _gl.blendEquation(_gl.FUNC_ADD);
                _gl.blendFunc(_gl.SRC_ALPHA, _gl.ONE);
            },
            panable: true,
            zoomable: true
        });
        zr.configLayer(1, {
            panable: true,
            zoomable: true,
            onpan: syncTextsPositionAfterPanZoom,
            onzoom: syncTextsPositionAfterPanZoom
        });

        var fpsDom = document.getElementById('fps');
        var timeAccum = 0;
        zr.animation.on('frame', function(frameTime) {
            timeAccum += frameTime;
            if (timeAccum > 100) {
                timeAccum = 0;
                fpsDom.innerHTML = Math.round(1000 / frameTime) + ' fps';
            }
        });

        var viewUI = $('#view').qpf('get')[0];
        viewUI.on('resize', function() {
            zr.resize();
        });
        
        enableDropAdd();

        polygonSelection.start();

        document.body.addEventListener('keydown', handleKeyDown);
        document.body.addEventListener('keyup', handleKeyUp);
    }

    function enableDropAdd() {
        document.body.addEventListener("dragover", function(e){
            e.stopPropagation();
            e.preventDefault();
        }, false);
        document.body.addEventListener("drop", handleDrop, false);
    }

    function handleDrop(e){
        e.stopPropagation();
        e.preventDefault();
        var file = e.dataTransfer.files[0];
        if(file){
            var fileReader = new FileReader();
            fileReader.onload = function(e) {
                if (file.name.substr(-3).toLowerCase().match('gdf')) {
                    loadGDF(e.target.result);
                } else if (file.name.substr(-4).toLowerCase().match('gexf')) {
                    loadGEXF(e.target.result)
                }
            }
            fileReader.readAsText(file);
        }
    }

    function handleKeyDown(e) {
        // Shift
        if (e.keyCode == 16) {
            beginPolygonSelection();
        }
    }

    function handleKeyUp(e) {
        if (e.keyCode == 16) {
            endPolygonSelection();
        }
    }

    function loadGEXF(xml) {
        var gexf = new GEXF();
        var res = gexf.parse(xml);

        if (res) {

            graph = res;

            initGraph();
        }
    }

    function loadGDF(str) {
        var gdf = new GDF();
        var res = gdf.parse(str);

        if (res) {
            
            graph = res;

            initGraph();
        }
    }

    function initGraph() {
        edgeShapesMap = {};
        nodeShapesMap = {};
        nodeShapesList = [];
        edgeShapesList = [];

        zr.clear();

        currentSelectedNode = null;
        currentSelectedShape = null;

        var nodes = graph.getNodes();
        var edges = graph.getEdges();

        nodes.forEach(function(node) {
            nodeShapesList.push(createNodeShape(node));
        });

        edges.forEach(createEdgeShape);

        zr.renderInNextFrame();

        graphModule.viewModel.nodeCount(nodes.length);
        graphModule.viewModel.edgeCount(edges.length);
    }

    function createNodeShape(node) {
        var color = node.color;
        var shape = shapeBuilders[node.shape](node.size);
        shape.style.brushType = 'fill';
        shape.style.strokeColor = [color[0] / 2, color[1] / 2, color[2] / 2];
        shape.style.color = [color[0], color[1], color[2]];
        shape.style.lineWidth = 1;
        shape.zlevel = 1;
        // Using the same instance of node and shape position
        shape.position = node.position;
        shape.edges = [];
        shape.clickable = true;
        shape.onclick = function() {
            if (selectDisabled) {
                return;
            }
            currentSelectedNode = node;
            currentSelectedShape = shape;
            highlightSelectedAndAdjacent();
        }
        zr.addShape(shape);
        nodeShapesMap[node.id] = shape;

        return shape;
    }

    function createEdgeShape(edge) {
        var color = edge.source.color;
        var line = new LineShape({
            style: {
                xStart: edge.source.position[0],
                yStart: edge.source.position[1],
                xEnd: edge.target.position[0],
                yEnd: edge.target.position[1],
                strokeColor: [color[0], color[1], color[2]],
                opacity: graphModule.viewModel.edgeOpacity(),
                // strokeColor: [0, 0, 0],
                // opacity: 0.4,
                lineWidth: edge.thickness * 2
            },
            hoverable: false,
            zlevel: 0,
            isDynamic: true
        });
        line.source = nodeShapesMap[edge.source.id];
        line.target = nodeShapesMap[edge.target.id];
        nodeShapesMap[edge.source.id].edges.push(line);
        nodeShapesMap[edge.target.id].edges.push(line);

        zr.addShape(line);
        edgeShapesMap[line.id] = line;
        edgeShapesList.push(line);
    }

    function showProperties(node) {
        initializingProperty = true;
        if (node instanceof Array) {
            if (node.length == 0) {
                return;
            }
            node = node[0];
        }
        propModule.viewModel.visible(true);
        propModule.viewModel.x(node.position[0]);
        propModule.viewModel.y(node.position[1]);
        propModule.viewModel.label(node.label);
        propModule.viewModel.size(node.size);
        propModule.viewModel.shape(node.shape);
        propModule.viewModel.color(rgbToHex(node.color));
        initializingProperty = false;
    }

    function unSelectAll() {
        if (!currentSelectedNode) {
            return;
        }

        propModule.viewModel.visible(false);

        currentSelectedShape = null;
        currentSelectedNode = null;
        for (var i = 0; i < nodeShapesList.length; i++) {
            nodeShapesList[i].style.opacity = normalNodeOpacity;
        }
        for (var i = 0; i < edgeShapesList.length; i++) {
            edgeShapesList[i].style.opacity = normalEdgeOpacity;
        }

        zr.getLayer(0).markChanged();
        zr.getLayer(1).markChanged();

        zr.delLayer(2);
        textShapesList.length = 0;

        zr.renderInNextFrame();
    }

    function highlightSelectedAndAdjacent() {
        if (!currentSelectedShape) {
            return;
        }
        if (currentSelectedNode instanceof Array) {
            return;
        }

        var shape = currentSelectedShape;
        var node = currentSelectedNode;

        propModule.viewModel.isSingleSelection(true);

        showProperties(currentSelectedNode);

        for (var i = 0; i < nodeShapesList.length; i++) {
            nodeShapesList[i].style.opacity = outOfFocusNodeOpacity;
        }
        for (var i = 0; i < edgeShapesList.length; i++) {
            edgeShapesList[i].style.opacity = outOfFocusEdgeOpacity;
        }
        shape.style.opacity = onFocusNodeOpacity;
        for (var i = 0; i < shape.edges.length; i++) {
            shape.edges[i].style.opacity = onFocusEdgeOpacity;
            shape.edges[i].source.style.opacity = onFocusNodeOpacity;
            shape.edges[i].target.style.opacity = onFocusNodeOpacity;
        }

        zr.getLayer(0).markChanged();
        zr.getLayer(1).markChanged();

        // Show labels
        zr.delLayer(2);

        textShapesList.length = 0;

        for (var i = 0; i < node.edges.length; i++) {
            var source = node.edges[i].source;
            var target = node.edges[i].target;

            var another = source == node ? target : source;

            if (graphModule.viewModel.showLabel()) {
                textShapesList.push(new TextShape({
                    style: {
                        text: another.label
                    },
                    position: Array.prototype.slice.call(another.position),
                    _targetNode: another
                }));
            }
        }

        if (graphModule.viewModel.showLabel()) {
            textShapesList.push(new TextShape({
                style : {
                    text : node.label,
                },
                position: Array.prototype.slice.call(node.position),
                _targetNode: node
            }));

            syncTextsPositionAfterPanZoom();
        }

        for (var i = 0; i < textShapesList.length; i++) {
            var textShape = textShapesList[i];
            textShape.style.color = 'white';
            textShape.style.x = textShape.style.y = 0;
            textShape.style.textAlign = 'center';
            textShape.style.textFont = '14px Arial';
            textShape.hoverable = false;
            textShape.zlevel = 2;

            zr.addShape(textShape);
        }

        zr.renderInNextFrame();
    }

    function highlightSelect() {
        if (!currentSelectedShape) {
            return;
        }
        for (var i = 0; i < nodeShapesList.length; i++) {
            nodeShapesList[i].style.opacity = outOfFocusNodeOpacity;
        }
        for (var i = 0; i < edgeShapesList.length; i++) {
            edgeShapesList[i].style.opacity = outOfFocusEdgeOpacity;
        }
        if (currentSelectedShape instanceof Array) {
            propModule.viewModel.isSingleSelection(false);
            for (var i = 0; i < currentSelectedShape.length; i++) {
                currentSelectedShape[i].style.opacity = onFocusNodeOpacity;
            }
        } else {
            propModule.viewModel.isSingleSelection(true);
            currentSelectedShape.style.opacity = onFocusNodeOpacity;
        }

        showProperties(currentSelectedNode);

        zr.getLayer(0).markChanged();
        zr.getLayer(1).markChanged();
        zr.refreshInNextFrame();
    }

    function syncTextsPositionAfterPanZoom() {
        if (graphModule.viewModel.showLabel()) {
            var textLayer = zr.getLayer(2);
            var circleLayer = zr.getLayer(1);

            circleLayer.updateTransform();
            for (var i = 0; i < textShapesList.length; i++) {
                var shape = textShapesList[i];
                vec2.transformMat2d(shape.position, shape._targetNode.position, circleLayer.transform);
            }

            textLayer.markChanged();
        }
    }

    function updateAndRender() {
        if (!graph) {
            return;
        }
        var nodes = graph.getNodes();
        for (var i = 0; i < nodeShapesList.length; i++) {
            var node = nodes[i];
            var shape = nodeShapesList[i];
            shape.position[0] = node.position[0];
            shape.position[1] = node.position[1];
        }
        for (var i = 0; i < edgeShapesList.length; i++) {
            var edge = edgeShapesList[i];
            edge.setStyle('xStart', edge.source.position[0]);
            edge.setStyle('yStart', edge.source.position[1]);
            edge.setStyle('xEnd', edge.target.position[0]);
            edge.setStyle('yEnd', edge.target.position[1]);
        }
        zr.getLayer(0).markChanged();
        zr.getLayer(1).markChanged();

        zr.renderInNextFrame();
    }

    //-------------------------------
    // Position
    //-------------------------------
    var updatePosition = _.debounce(function(x, y) {
        if (!currentSelectedNode || !zr) {
            return;
        }
        // Is group selection
        if (currentSelectedNode instanceof Array) {
            return;
        }
        // Node and shape position use the same array
        currentSelectedNode.position[0] = x;
        currentSelectedNode.position[1] = y;

        for (var i = 0; i < currentSelectedShape.edges.length; i++) {
            var edgeShape = currentSelectedShape.edges[i];
            if (edgeShape.source == currentSelectedShape) {
                edgeShape.setStyle('xStart', x);
                edgeShape.setStyle('yStart', y);
            } else {
                edgeShape.setStyle('xEnd', x);
                edgeShape.setStyle('yEnd', y);
            }
            zr.modShape(edgeShape.id);
        }

        zr.modShape(currentSelectedShape.id);

        zr.renderInNextFrame();
    }, 10);

    ko.computed(function() {
        var x = propModule.viewModel.x();
        var y = propModule.viewModel.y();

        if (!initializingProperty) {
            updatePosition(x, y);
        }
    });

    //-------------------------------
    // Color
    //-------------------------------
    var updateColor = _.debounce(function(color) {

        if (!currentSelectedNode || !zr) {
            return;
        }

        if (currentSelectedNode instanceof Array) {
            for (var i = 0; i < currentSelectedShape.length; i++) {
                currentSelectedNode[i].color 
                    = currentSelectedShape[i].style.color
                    = hexToRgb(color);
                zr.modShape(currentSelectedShape[i].id);
            }
        } else {
            currentSelectedNode.color 
                = currentSelectedShape.style.color
                = hexToRgb(color);
            zr.modShape(currentSelectedShape.id);
        }

        zr.refreshInNextFrame();
    }, 10);

    ko.computed(function() {
        var color = propModule.viewModel.color();

        if (!initializingProperty) {
            updateColor(color);
        }
    });

    //-------------------------------
    // Size and shapeType
    //-------------------------------
    var updateSizeAndShapeType = _.debounce(function(size, shapeType) {

        if (!currentSelectedNode || !zr) {
            return;
        }
        var shapes = currentSelectedShape;
        var nodes = currentSelectedNode;
        var isSingleSelection = false;

        if (!(currentSelectedShape instanceof Array)) {
            isSingleSelection = true;
            shapes = [currentSelectedShape];
            nodes = [currentSelectedNode];
        } else {
            isSingleSelection = false;
            var newShapeList = [];
        }

        for (var k = 0; k < nodes.length; k++) {
            var node = nodes[k];
            var shape = shapes[k];

            var oldSize = node.size;

            node.shape = shapeType;
            node.size = size;

            if (
                shapeType !== shape.type
                || size != oldSize
            ) {
                zr.delShape(shape.id);

                var newShape = createNodeShape(node);
                newShape.edges = shape.edges;

                nodeShapesList.splice(nodeShapesList.indexOf(shape), 1, newShape);

                for (var i = 0; i < edgeShapesList.length; i++) {
                    var edge = edgeShapesList[i];
                    if (edge.source == shape) {
                        edge.source = newShape;
                    }
                    else if (edge.target == shape) {
                        edge.target = newShape;
                    }
                }

                if (!isSingleSelection) {
                    newShapeList.push(newShape);
                } else {
                    currentSelectedShape = newShape;
                }
            }
        }

        if (!isSingleSelection) {
            currentSelectedShape = newShapeList;
        }

        zr.renderInNextFrame();
    }, 10);

    ko.computed(function() {
        var size = propModule.viewModel.size();
        var shapeType = propModule.viewModel.shape();

        if (!initializingProperty) {
            updateSizeAndShapeType(size, shapeType);
        }
    });

    //-------------------------------
    // Brush type and label
    //-------------------------------
    var updateBrushTypeAndLabel = _.debounce(function(brushType, showLabel) {
        if (!zr) {
            return;
        }
        if (currentSelectedNode) {
            highlightSelectedAndAdjacent();
        }
        for (var i = 0; i < nodeShapesList.length; i++) {
            var nodeShape = nodeShapesList[i];
            nodeShape.setStyle('brushType', brushType);
        }
        zr.getLayer(1).markChanged();
        zr.renderInNextFrame();
    }, 50);

    ko.computed(function() {
        var brushType = graphModule.viewModel.brushType();
        var showLabel = graphModule.viewModel.showLabel();

        updateBrushTypeAndLabel(brushType, showLabel);
    });

    //-------------------------------
    // Edge opacity
    //-------------------------------
    var updateEdgeOpacity = _.debounce(function(normalEdgeOpacity) {
        if (!zr) {
            return;
        }
        outOfFocusEdgeOpacity = normalEdgeOpacity * 0.1;

        for (var i = 0; i < edgeShapesList.length; i++) {
            edgeShapesList[i].style.opacity = normalEdgeOpacity;
        }
        if (currentSelectedNode) {
            highlightSelectedAndAdjacent();
        }
        zr.getLayer(0).markChanged();
        zr.renderInNextFrame();
    }, 10);
    ko.computed(function() {
        normalEdgeOpacity = graphModule.viewModel.edgeOpacity();

        updateEdgeOpacity(normalEdgeOpacity);
    });

    //-------------------------------
    // Edge Blending
    //-------------------------------
    ko.computed(function() {
        var edgeAdditiveBlend = graphModule.viewModel.edgeAdditiveBlend();
        if (!zr) {
            return;
        }
        if (edgeAdditiveBlend) {
            zr.configLayer(0, {
                blendFunc: function(_gl) {
                    _gl.blendEquation(_gl.FUNC_ADD);
                    _gl.blendFunc(_gl.SRC_ALPHA, _gl.ONE);
                }
            });
        } else {
            zr.configLayer(0, {
                blendFunc: null
            })
        }

        zr.renderInNextFrame();
    });

    //-------------------------------
    // Node default color
    //-------------------------------
    var updateNodeDefaultColor = _.debounce(function(defaultColorHex) {
        if (!zr) {
            return;
        }
        if (defaultColorHex == null) {
            var nodes = graph.getNodes();
            // Use the node color it self
            for (var i = 0; i < nodeShapesList.length; i++) {
                nodeShapesList[i].style.color = nodes[i].color;
            }
        } else {
            var rgb = hexToRgb(defaultColorHex);
            for (var i = 0; i < nodeShapesList.length; i++) {
                nodeShapesList[i].style.color = rgb;
            }
        }
        zr.getLayer(1).markChanged();

        zr.refreshInNextFrame();
    }, 10);

    ko.computed(function() {
        var defaultNodeColor = graphModule.viewModel.defaultNodeColor();
        if (graphModule.viewModel.useDefaultNodeColor()) {
            updateNodeDefaultColor(defaultNodeColor);
        } else {
            updateNodeDefaultColor(null);
        }
    });

    //-------------------------------
    // Edge default color
    //-------------------------------
    var updateEdgeDefaultColor = _.debounce(function(defaultColorHex) {
        if (!zr) {
            return;
        }
        if (defaultColorHex == null) {
            var nodes = graph.getNodes();
            // Use the source node color
            for (var i = 0; i < edgeShapesList.length; i++) {
                edgeShapesList[i].style.strokeColor = edge.source.color;
            }
        } else {
            var rgb = hexToRgb(defaultColorHex);
            for (var i = 0; i < edgeShapesList.length; i++) {
                edgeShapesList[i].style.strokeColor = rgb;
            }
        }
        zr.getLayer(0).markChanged();

        zr.refreshInNextFrame();
    }, 10);

    ko.computed(function() {
        var defaultEdgeColor = graphModule.viewModel.defaultEdgeColor();
        if (graphModule.viewModel.useDefaultEdgeColor()) {
            updateEdgeDefaultColor(defaultEdgeColor);
        } else {
            updateEdgeDefaultColor(null);
        }
    });

    //-------------------------------
    // Cancel selection
    //-------------------------------
    ko.computed(function() {
        var visible = propModule.viewModel.visible();
        if (!visible) {
            unSelectAll();
        }
    });

    //-------------------------------
    // Polygon selection
    //-------------------------------
    function beginPolygonSelection() {
        polygonSelection.enable();
        selectDisabled = true;

        zr.configLayer(0, {
            panable: false,
            zoomable: false
        });
        zr.configLayer(1, {
            panable: false,
            zoomable: false
        });
        unSelectAll();

        polygonSelection.on('select', onPolygonSelection);
    }

    function endPolygonSelection() {
        polygonSelection.disable();
        selectDisabled = false;
        zr.configLayer(0, {
            panable: true,
            zoomable: true
        });
        zr.configLayer(1, {
            panable: true,
            zoomable: true
        });
        polygonSelection.off('select', onPolygonSelection);
    }

    function onPolygonSelection() {
        var nodes = graph.getNodes();
        var filteredIndices = polygonSelection.filter(nodes, zr.getLayer(1).transform);

        var filteredNodes = [];
        var filteredShapes = [];

        for (var i = 0; i < filteredIndices.length; i++) {
            var idx = filteredIndices[i];
            filteredNodes.push(nodes[idx]);
            filteredShapes.push(nodeShapesList[idx]);
        }

        currentSelectedNode = filteredNodes;
        currentSelectedShape = filteredShapes;

        highlightSelect();
    }

    //-------------------------------
    // Util functions
    //-------------------------------
    function hexToRgb(value) {
        var r = (value >> 16) & 0xff;
        var g = (value >> 8) & 0xff;
        var b = value & 0xff;
        return [r, g, b];
    }

    function rgbToHex(arr) {
        var r = arr[0];
        var g = arr[1];
        var b = arr[2];
        return Math.round(r) << 16 | Math.round(g) << 8 | Math.round(b);
    }

    var viewer = new Module({
        
        start : start,

        loadGEXF : loadGEXF,

        loadGDF: loadGDF,

        viewModel : viewModel,

        updateAndRender: updateAndRender,

        toXML: function() {
            return (new GEXF()).toXML(graph);
        },

        render: function() {
            if (zr) {
                zr.renderInNextFrame();
            }
        },

        unSelectAll: unSelectAll,

        beginPolygonSelection: beginPolygonSelection,

        endPolygonSelection: endPolygonSelection,

        disableSelect: function() {
            selectDisabled = true;
        },

        enableSelect: function() {
            selectDisabled = false;
        },

        getGraph: function()  {
            return graph;
        }
    });

    return viewer;
});