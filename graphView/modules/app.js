define(function(require) {

    var _ = require('_');
    var ko = require("knockout");
    var XMLParser = require("qpf/core/XMLParser");

    var appXML = require("text!./app.xml");

    // var viewerModule = require('./viewer/viewer');
    var propertiesModule = require('./properties/properties');
    var startupModule = require('./startup/startup');
    var graphModule = require('./graph/graph');
    var toolbarModule = require('./toolbar/toolbar');

    function start(){

        var dom = XMLParser.parse(appXML);

        document.body.appendChild(dom);
        
        ko.applyBindings({}, dom);

        // Start modules
        // viewerModule.start();
        graphModule.start();
        propertiesModule.start();
        startupModule.start();
        toolbarModule.start();
    }

    return {
        start : start
    }
});