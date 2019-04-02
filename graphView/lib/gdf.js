// GDF File Parser
// http://guess.wikispot.org/The_GUESS_.gdf_format
// https://gephi.org/users/supported-graph-formats/gdf-format/
define(function(require) {

    var notifier = require('qtek/core/mixin/notifier');
    var request = require('qtek/core/request');
    var qtekUtil = require('qtek/core/util');

    var graph = require('./graph');

    var GraphNode = graph.Node;
    var GraphEdge = graph.Edge;
    var Graph = graph.Graph;
    var Attribute = graph.Attribute;

    var GDF = function() {
        
        this._nodeAttributes = [];
        this._edgeAttributes = [];

        this.graph = null;
    }

    GDF.prototype.load = function(url) {
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

    GDF.prototype.parse = function(str) {

        this.graph = new Graph();

        var lines = str.split('\n');

        var handleFunction = null;
        var items = [];

        for (var i = 0; i < lines.length; i++) {
            var line = trim(lines[i]);
            if (!line) {
                continue;
            }
            var head = line.substr(0, 8);
            if (head == 'nodedef>') {
                this._parseAttributes(line.substr(8), this._nodeAttributes);
                handleFunction = this._parseNode;
            } else if (head == 'edgedef>') {
                this._parseAttributes(line.substr(8), this._edgeAttributes);
                handleFunction = this._parseEdge;
            } else {
                handleFunction.call(this, line, items);
            }
        }

        return this.graph;
    }

    GDF.prototype._parseAttributes = function(line, out) {
        var lineSegs = line.split(',');
        out.length = 0;
        for (var i = 0; i < lineSegs.length; i++) {
            var seg = trim(lineSegs[i]);
            var items = seg.split(/\s+/);
            var attName = items[0];
            if (!attName) {
                continue;
            }
            var attrib = new Attribute(attName, '', '');
            if (items.length > 1) {
                var attType = items[1];
            }
            out.push(attrib);
        }
    }

    GDF.prototype._parseLine = function(line, out) {
        var itemIdx = 0;
        var inText = false;
        var quote = '';
        var itemStr = '';
        for (var i = 0; i < line.length; i++) {
            var ch = line.charAt(i);
            switch(ch) {
                case ",":
                    if (!inText) {
                        out[itemIdx++] = trim(itemStr);
                        itemStr = '';
                    } else {
                        itemStr += ch;
                    }
                    break;
                case "'":
                case '"':
                    if (!inText) {
                        quote = ch;
                        inText = true;
                    } else {
                        if (ch == quote) {  // Close quote
                            inText = false;
                        } else {
                            itemStr += ch;
                        }
                    }
                    break;
                default:
                    itemStr += ch;
            }
        }
        // Last value
        out[itemIdx++] = trim(itemStr);
        out.length = itemIdx;
        return out;
    }

    GDF.prototype._parseNode = function(line, items) {
        this._parseLine(line, items);
        var node = new GraphNode();
        var id;
        for (var i = 0; i < this._nodeAttributes.length; i++) {
            var attValue = items[i];
            var attrib = this._nodeAttributes[i];
            
            switch (attrib.id) {
                case "name":
                    node.id = id = attValue;
                    break;
                case "label":
                    node.label = attValue;
                    break;
                case "x":
                    node.position[0] = parseFloat(x);
                    break;
                case "y":
                    node.position[1] = parseFloat(y);
                    break;
                case "color":
                    var rgb = this._parseColor(attValue);
                    if (rgb) {
                        node.color[0] = rgb[0];
                        node.color[1] = rgb[1];
                        node.color[2] = rgb[2];   
                    }
                    break;
                default:
                    node.attvalues[attrib.id] = this._parseAttValue(attrib.type, attValue);
            }
        }
        if (id) {
            this.graph.addNode(node);
        }
    }

    GDF.prototype._parseEdge = function(line, items) {
        this._parseLine(line, items);
        var edge = new GraphEdge();
        for (var i = 0; i < this._edgeAttributes.length; i++) {
            var attValue = items[i];
            var attrib = this._edgeAttributes[i];
            
            switch (attrib.id) {
                case "node1":
                    edge.source = this.graph.getNode(attValue);
                    break;
                case "node2":
                    edge.target = this.graph.getNode(attValue);
                    break;
                case "color":
                    var rgb = this._parseColor(attValue);
                    if (rgb) {
                        edge.color[0] = rgb[0];
                        edge.color[1] = rgb[1];
                        edge.color[2] = rgb[2];   
                    }
                    break;
                case "weight":
                    edge.thickness = parseFloat(attValue);
                    break;
                default:
                    break;
            }
        }
        if (!edge.source || !edge.target) {
            console.warn("Edge source or target not found");
            return;
        }

        this.graph.addEdge(edge);
    }

    GDF.prototype._parseColor = function(colorStr) {
        var rgb = colorStr.split(/,/);
        if (rgb.length >= 3) {
            for (var i = 0; i < rgb.length; i++) {
                rgb[i] = parseInt(rgb[i]);
            }
            return rgb;
        }
    }

    GDF.prototype._parseAttValue = function(type, val) {
        switch (type) {
            case "integer":
            case "long":
                return parseInt(val);
            case "float":
            case "double":
                return parseFloat(val);
                break;
            case "boolean":
                return val.toLowerCase() == 'true';
                break;
            default:
        }
    }

    function trim(str) {
        return str.replace(/^\s*/, '').replace(/\s*$/, '');
    }

    qtekUtil.extend(GDF.prototype, notifier);


    return GDF;
});