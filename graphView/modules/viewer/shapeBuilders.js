define(function(require) {

    var CircleShape = require('zrender/shape/Circle');
    var StarShape = require('zrender/shape/Star');
    var RectShape = require('zrender/shape/Rectangle');
    var HeartShape = require('zrender/shape/Heart');
    var PathShape = require('zrender/shape/Path');

    return {
        circle : function(size) {
            return new CircleShape({
                style : {
                    x : 0,
                    y : 0,
                    r : size * 2
                },
                scale: [0.5, 0.5]
            });
        },
        star : function(size) {
            return new StarShape({
                style : {
                    x : 0,
                    y : 0,
                    r : 6,
                    r0 : 4,
                    n : 5
                },
                scale : [size / 6, size / 6]
            });
        },
        rectangle : function(size) {
            return new RectShape({
                style : {
                    x : -1 / 2,
                    y : - 1 / 2,
                    width : 1,
                    height : 1
                },
                scale : [size, size]
            });
        },
        heart : function(size) {
            return new HeartShape({
                style : {
                    x : 0,
                    y : - 30 / 3,
                    a : 30 / 1.5,
                    b : 30
                },
                scale : [size / 30, size / 30]
            });
        },
        path : function(size) {
            return new PathShape({
                style : {
                    path : 'M2.368,5.46c-0.691-0.11-0.707-2.01-0.707-2.01s2.03-2.011,2.473-4.713c1.19,0,1.926-2.873,0.735-3.884\
    C4.918-6.21,6.399-13.5-1.095-13.5S-7.109-6.21-7.06-5.146c-1.19,1.011-0.455,3.884,0.735,3.884\
    c0.442,2.703,2.473,4.713,2.473,4.713S-3.868,5.35-4.559,5.46c-2.226,0.354-10.537,4.021-10.537,8.04h28\
    C12.904,9.481,4.592,5.815,2.368,5.46L2.368,5.46z'
                },
                scale : [size / 15, size / 15]
            })
        }
    }

});