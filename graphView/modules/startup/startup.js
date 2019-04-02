define(function(require) {

    'use strict';

    var $ = require('$');
    var xml = require('text!./startup.xml');
    var qpfUtil = require('qpf/util');
    var ko = require('knockout');
    var request = require('qtek/core/request');
    var Module = require('../Module');

    var viewerModule = require('../viewer/viewer');

    var mainUI, startup;

    var inStartup = true;

    var viewModel = {
    }

    function start() {
        mainUI = $("#main").qpf('get')[0];
        startup = qpfUtil.createComponentsFromXML(xml, viewModel);
        startup = startup[0];
        mainUI.children.push(startup);

        $('#startup .examples li').click(function() {
            var url = $(this).data('file');
            request.get({
                url : url,
                onload : function(xml) {
                    open();
                    viewerModule.loadGEXF(xml);
                }
            });
        });

        $("#startup .open").click(upload)
    }

    function open() {
        if (inStartup) {

            mainUI.children.remove(startup);
            viewerModule.start();   

            inStartup = false;
        }
        
        var sidebarUI = $("#sidebar").qpf('get')[0];
        sidebarUI.visible(true);
        sidebarUI.onResize();
    }

    function onSelectFile(e){
        var file = e.target.files[0];
        var fileReader = new FileReader();

        if(file){
            fileReader.onload = function(e){
                fileReader.onload = null;
                open();

                if (file.name.substr(-3).toLowerCase() == 'gdf') {
                    viewerModule.loadGDF(e.target.result);
                }
                else if (file.name.substr(-4).toLowerCase() == 'gexf') {
                    viewerModule.loadGEXF(e.target.result);
                }
            }
            fileReader.readAsText(file);
        }
    }

    function upload() {
        var $input = $("<input type='file' />");
        $input[0].addEventListener("change", onSelectFile);
        $input.click();
    }

    var startup = new Module({
        start : start,

        viewModel : viewModel,

        upload : upload
    });

    return startup;
});