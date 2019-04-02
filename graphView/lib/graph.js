define(function() {

    'use strict';

    var graph = {};

    graph.Graph = function() {

        this._nodesList = [];
        
        this._edgesList = [];

        this._nodesMap = {};

        this._attributesMap = {};
    }

    graph.Graph.prototype = {

        constructor: graph.Graph,

        addNode: function(node) {
            if (node.id) {
                this._nodesMap[node.id] = node;
            }
            this._nodesList.push(node);
        },

        addAttribute: function(attrib) {
            if (attrib.id) {
                this._attributesMap[attrib.id] = attrib;
            }
        },

        addEdge: function(edge) {
            this._edgesList.push(edge);
        },

        getNodes: function() {
            return this._nodesList;
        },

        getNode: function(id) {
            return this._nodesMap[id];
        },

        getAttribute: function(id) {
            return this._attributesMap[id];
        },

        getAttributesMap: function() {
            return this._attributesMap;
        },

        getEdges: function() {
            return this._edgesList;
        }
    }
    
    graph.Node = function(id, label) {
        this.id = id;
        this.label = label || "";

        this.size = 5;
        
        this.position = new Float32Array(2);
        this.position[0] = Math.random() * 500;
        this.position[1] = Math.random() * 500;

        this.color = new Uint8Array(3);
        this.color[0] = 128;
        this.color[1] = 128;
        this.color[2] = 128;

        this.shape = 'circle';

        this.attvalues = {};

        this.edges = [];
    }

    graph.Edge = function(id, label) {
        this.id = id || "";
        this.label = label || "";

        this.source = null;
        this.target = null;

        this.thickness = 1;

        this.color = new Uint8Array(3);
        this.color[0] = 128;
        this.color[1] = 128;
        this.color[2] = 128;

        // 'solid', 'dotted', 'dashed', 'double'
        this.shape = 'solid';
    }

    graph.Attribute = function(id, title, type) {
        this.id = id;
        this.title = title;
        // integer, float, boolean, long, double, string, liststring, anyURI
        this.type = type;
    }


    return graph;
}); 