// GEXF File Parser
// http://gexf.net/1.2draft/gexf-12draft-primer.pdf
define(function(require) {
    
    'use strict';

    var notifier = require('qtek/core/mixin/notifier');
    var request = require('qtek/core/request');
    var qtekUtil = require('qtek/core/util');
    var graph = require('./graph');

    var GraphNode = graph.Node;
    var GraphEdge = graph.Edge;
    var Graph = graph.Graph;

    var Attribute = graph.Attribute;

    var GEXF = function() {
        this.graph = null;
    }

    GEXF.prototype.load = function(url) {
        var self = this;
        request.get({
            url : url,
            onload : function(str) {
                var res = self.parse(str);
                if (res) {
                    self.trigger('success', res);
                } else {
                    self.trigger('error');
                }
            },
            onerror : function() {
                self.trigger('error');
            }
        });
        return this;
    }

    GEXF.prototype.parse = function(xml) {
        this._attributesMap = {};

        this.graph = new Graph();
        
        var parser = new DOMParser();
        var doc = parser.parseFromString(xml, 'text/xml');
        if (!doc || doc.getElementsByTagName("parsererror").length) {
            return null;
        }

        var gexfRoot = doc.firstChild;

        if (!gexfRoot) {
            return null;
        }

        var graphRoot = this._getChildByTagName(gexfRoot, 'graph');

        this._parseAttributes(this._getChildByTagName(graphRoot, 'attributes'));
        this._parseNodes(this._getChildByTagName(graphRoot, 'nodes'));
        this._parseEdges(this._getChildByTagName(graphRoot, 'edges'));

        return this.graph;
    }

    // https://developer.mozilla.org/en-US/docs/How_to_create_a_DOM_tree
    GEXF.prototype.toXML = function(graph) {
        var doc = document.implementation.createDocument('', '', null);
        var gexfRoot = doc.createElement('gexf');
        doc.appendChild(gexfRoot);
        gexfRoot.appendChild(this._createAttributesDom(doc, graph));
        gexfRoot.appendChild(this._createNodesDom(doc, graph));
        gexfRoot.appendChild(this._createEdgesDom(doc, graph));

        return doc;
    }

    GEXF.prototype._parseAttributes = function(parent) {
        if (!parent) {
            return;
        }
        var attributeDomList = this._getChildrenByTagName(parent, 'attribute');
        for (var i = 0; i < attributeDomList.length; i++) {
            var attributeDom = attributeDomList[i];
            var id = attributeDom.getAttribute('id');
            var title = attributeDom.getAttribute('title');
            var type = attributeDom.getAttribute('type');

            var attribute = new Attribute(id, title, type);
            this.graph.addAttribute(attribute);
        }
    }

    GEXF.prototype._parseNodes = function(parent) {
        var nodeDomList = this._getChildrenByTagName(parent, 'node');
        for (var i = 0; i < nodeDomList.length; i++) {
            var nodeDom = nodeDomList[i];

            var id = nodeDom.getAttribute('id');
            var label = nodeDom.getAttribute('label');

            var node = new GraphNode();
            node.id = id;
            node.label = label;

            this.graph.addNode(node);

            var vizSizeDom = this._getChildByTagName(nodeDom, 'viz:size');
            var vizPosDom = this._getChildByTagName(nodeDom, 'viz:position');
            var vizColorDom = this._getChildByTagName(nodeDom, 'viz:color');
            var vizShapeDom = this._getChildByTagName(nodeDom, 'viz:shape');

            var attvaluesDom = this._getChildByTagName(nodeDom, 'attvalues');

            if (vizSizeDom) {
                node.size = parseFloat(vizSizeDom.getAttribute('value'));
            }
            if (vizPosDom) {
                node.position[0] = parseFloat(vizPosDom.getAttribute('x'));
                node.position[1] = parseFloat(vizPosDom.getAttribute('y'));
                // z
            }
            if (vizColorDom) {
                node.color[0] = parseInt(vizColorDom.getAttribute('r'));
                node.color[1] = parseInt(vizColorDom.getAttribute('g'));
                node.color[2] = parseInt(vizColorDom.getAttribute('b'));
            }
            if (vizShapeDom) {
                // node.shape = vizShapeDom.getAttribute('shape');
            }
            if (attvaluesDom) {
                var attvalueDomList = this._getChildrenByTagName(attvaluesDom, 'attvalue');

                for (var j = 0; j < attvalueDomList.length; j++) {
                    var attvalueDom = attvalueDomList[j];
                    var attId = attvalueDom.getAttribute('for');
                    var attValue = attvalueDom.getAttribute('value');
                    var attribute = this.graph.getAttribute(attId);

                    if (attribute) {
                        switch (attribute.type) {
                            case "integer":
                            case "long":
                                attValue = parseInt(attValue);
                                break;
                            case "float":
                            case "double":
                                attValue = parseFloat(attValue);
                                break;
                            case "boolean":
                                attValue = attValue.toLowerCase() == 'true';
                                break;
                            default:
                        }
                        node.attvalues[attId] = attValue;
                    }
                }
            }
        }
    }

    GEXF.prototype._parseEdges = function(parent) {
        var edgeDomList = this._getChildrenByTagName(parent, 'edge');

        for (var i = 0; i < edgeDomList.length; i++) {
            var edgeDom = edgeDomList[i];

            var id = edgeDom.getAttribute('id');
            var label = edgeDom.getAttribute('label');

            var sourceId = edgeDom.getAttribute('source');
            var targetId = edgeDom.getAttribute('target');

            var sourceNode = this.graph.getNode(sourceId);
            var targetNode = this.graph.getNode(targetId);

            var edge = new GraphEdge();
            edge.id = id;
            edge.label = label;
            edge.source = sourceNode;
            edge.target = targetNode;

            this.graph.addEdge(edge);

            sourceNode.edges.push(edge);
            targetNode.edges.push(edge);

            var vizThicknessDom = this._getChildByTagName(edgeDom, 'viz:thickness');
            var vizColorDom = this._getChildByTagName(edgeDom, 'viz:color');
            var vizShapeDom = this._getChildByTagName(edgeDom, 'viz:shape');

            if (vizThicknessDom) {
                edge.thickness = parseFloat(vizThicknessDom.getAttribute('value'));
            }
            if (vizColorDom) {
                edge.color[0] = parseInt(vizColorDom.getAttribute('r'));
                edge.color[1] = parseInt(vizColorDom.getAttribute('g'));
                edge.color[2] = parseInt(vizColorDom.getAttribute('b'));
            }
            if (vizShapeDom) {
                edge.shape = vizShapeDom.getAttribute('shape');
            }
        }
    }

    GEXF.prototype._getChildByTagName = function(parent, tagName) {
        var node = parent.firstChild;

        while (node) {
            if (
                node.nodeType != 1 ||
                node.nodeName.toLowerCase() != tagName.toLowerCase()
            ) {
                node = node.nextSibling;
            } else {
                return node;
            }
        }

        return null;
    }

    GEXF.prototype._getChildrenByTagName = function(parent, tagName) {
        var node = parent.firstChild;
        var children = [];
        while (node) {
            if (node.nodeName.toLowerCase() == tagName.toLowerCase()) {
                children.push(node);
            }
            node = node.nextSibling;
        }

        return children;
    }

    GEXF.prototype._createAttributesDom = function(doc, graph) {
        var attributesDom = doc.createElement('attributes');
        var attributesMap = graph.getAttributesMap();
        for (var name in attributesMap) {
            var attribute = attributesMap[name];
            var attribDom = doc.createElement('attribute');
            attribDom.setAttribute('id', name);
            attribDom.setAttribute('title', attribute.title);
            attribDom.setAttribute('type', attribute.type);
            attributesDom.appendChild(attribDom);
        }
        return attributesDom;
    }

    GEXF.prototype._createNodesDom = function(doc, graph) {
        var nodesDom = doc.createElement('nodes');
        var nodes = graph.getNodes();
        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            var nodeDom = doc.createElement('node');
            nodeDom.setAttribute('id', node.id);
            nodeDom.setAttribute('label', node.label);

            var vizSizeDom = doc.createElement('viz:size');
            var vizPosDom = doc.createElement('viz:position');
            var vizColorDom = doc.createElement('viz:color');
            // var vizShapeDom = doc.createElement('viz:shape');
            vizSizeDom.setAttribute('value', node.size);
            vizPosDom.setAttribute('x', node.position[0]);
            vizPosDom.setAttribute('y', node.position[1]);

            vizColorDom.setAttribute('r', node.color[0]);
            vizColorDom.setAttribute('g', node.color[1]);
            vizColorDom.setAttribute('b', node.color[2]);

            var attvaluesDom = doc.createElement('attvalues');

            for (var name in node.attvalues) {
                var attvalueDom = doc.createElement('attvalue');
                attvalueDom.setAttribute('for', name);
                attvalueDom.setAttribute('value', node.attvalues[name]);
                attvaluesDom.appendChild(attvalueDom);
            }

            nodeDom.appendChild(vizSizeDom);
            nodeDom.appendChild(vizPosDom);
            nodeDom.appendChild(vizColorDom);
            nodeDom.appendChild(attvaluesDom);

            nodesDom.appendChild(nodeDom);
        }

        return nodesDom;
    }

    GEXF.prototype._createEdgesDom = function(doc, graph) {
        var edgesDom = doc.createElement('edges');
        var edges = graph.getEdges();
        for (var i = 0; i < edges.length; i++) {
            var edge = edges[i];

            var edgeDom = doc.createElement('edge');
            edgeDom.setAttribute('id', edge.id);
            if (edge.label != null) {
                edgeDom.setAttribute('label', edge.label);
            }
            edgeDom.setAttribute('source', edge.source.id);
            edgeDom.setAttribute('target', edge.source.id);

            // TODO
            // var vizThicknessDom = doc.createElement('viz:thickness');
            // vizThicknessDom.setAttribute('value', edge.thickness);
            // edgeDom.appendChild(vizThicknessDom);

            // var vizShapeDom = doc.createElement('viz:shape');
            // vizShapeDom.setAttribute('shape', edge.shape);
            // edgeDom.appendChild(vizShapeDom);

            // var vizColorDom = doc.createElement('viz:color');
            // vizColorDom.setAttribute('r', edge.color[0]);
            // vizColorDom.setAttribute('g', edge.color[1]);
            // vizColorDom.setAttribute('b', edge.color[2]);
            // edgeDom.appendChild(vizColorDom);

            edgesDom.appendChild(edgeDom);
        }

        return edgesDom;
    }

    qtekUtil.extend(GEXF.prototype, notifier);

    GEXF.Node = GraphNode;

    GEXF.Edge = GraphEdge;

    return GEXF;
});