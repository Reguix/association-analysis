(function() {
    require.config({
        paths : {
            knockout : "./thirdparty/knockout",
            'ko.mapping' : './thirdparty/ko.mapping',
            "$" : "./thirdparty/jquery",
            "_" : "./thirdparty/underscore"
        },
        shim : {
            '$' : {
                exports : "$"
            },
            '_' : {
                exports : "_"
            }
        }
    });

    require(['qpf', 'modules/app'], function(qpf, app) {
        app.start();
    });
})()