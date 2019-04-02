define(function(require) {

    var glMatrix = require('glmatrix');
    var vec2 = glMatrix.vec2;
    var mat2d = glMatrix.mat2d;
    var eventTool = require('zrender/tool/event');
    var Module = require('../Module');

    var _ = require('_');

    var canvas;
    var ctx;

    var points = [];
    var pointsT = [];

    // PENDING Points on the edges of polygon
    function checkPointInPoly(x, y, poly) {
        var len = poly.length;
        if (len == 0) {
            return;
        }

        var p = poly[len - 1], px = p[0] , py = p[1];
        var found = 0;

        var minx, maxx;
        for (var i = 0; i < len; i++) {
            var q = poly[i], qx = q[0], qy = q[1];

            if (px > qx) {
                minx = qx;
                maxx = px;
            }
            else {
                minx = px;
                maxx = qx;
            }

            if (x >= minx && x <= maxx) {
                if (qx == px) {
                    // point is on the edge
                    if (
                        y <= py && y >= qy || 
                        y >= qy && y <= py
                    ) {
                        return true;
                    } else {
                        continue;
                    }
                }
                var hitY = (qy - py) / (qx - px) * px + py;
                // point is on the edge
                if (hitY == y) {
                    return true;
                }
                // Edge is on the top of the point
                // (Ray points to the top)
                if (hitY < y) {
                    found++;
                }
            }

            px = qx;
            py = qy;
        }

        return found % 2 == 1;
    }

    function start() {
        if (!canvas) {
            canvas = document.createElement('canvas');
            ctx = canvas.getContext('2d');

            var viewport = document.getElementById('viewport');
            viewport.appendChild(canvas);

            _.extend(canvas.style, {
                left: '0px',
                top: '0px',
                width: '100%',
                height: '100%',
                position: 'absolute',
                zIndex: '1'
            });

            canvas.style.display = 'none';
        }
    }

    function enable() {
        canvas.style.display = 'block';

        canvas.addEventListener('mousedown', _mouseDownHander);
        canvas.addEventListener('mouseup', _mouseUpHandler);
    }

    var cx = 0;
    var cy = 0;

    function _mouseDownHander(e) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#C33131';

        canvas.addEventListener('mousemove', _mouseMoveHandler);

        var x = eventTool.getX(e);
        var y = eventTool.getY(e);

        points.length = 0;
        pointsT.length = 0;
        points.push(vec2.fromValues(x, y));
        pointsT.push(vec2.create());

        cx = x;
        cy = y;
    }

    function _mouseMoveHandler(e) {
        var x = eventTool.getX(e);
        var y = eventTool.getY(e);

        points.push(vec2.fromValues(x, y));
        pointsT.push(vec2.create());

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(x, y);
        ctx.stroke();

        cx = x;
        cy = y;
    }

    function _mouseUpHandler(e) {
        canvas.removeEventListener('mousemove', _mouseMoveHandler);

        polygonSelection.trigger('select');
    }

    function disable() {

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        canvas.removeEventListener('mousedown', _mouseDownHander);
        canvas.removeEventListener('mouseup', _mouseUpHandler);

        canvas.style.display = 'none';
    }

    function filter(nodes, transform) {
        if (points.length == 0) {
            return [];
        }

        var invTransform = mat2d.create();
        mat2d.invert(invTransform, transform);

        var min = [Infinity, Infinity];
        var max = [-Infinity, -Infinity];

        for (var i = 0; i < points.length; i++) {
            var p = points[i];
            var pt = pointsT[i];
            vec2.transformMat2d(pt, p, invTransform);
            vec2.min(min, pt, min);
            vec2.max(max, pt, max);
        }

        var filteredIndices = [];

        // Use isPointInPath to handle complex path(edge intersection)
        ctx.beginPath();
        ctx.moveTo(pointsT[0][0], pointsT[0][1]);
        for (var i = 1; i < pointsT.length; i++) {
            ctx.lineTo(pointsT[i][0], pointsT[i][1]);
        }
        ctx.closePath();

        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            var x = node.position[0];
            var y = node.position[1];
            if (
                x < min[0] || y < min[1] ||
                x > max[0] || y > max[1]
            ) {
                continue;
            }
            // if (checkPointInPoly(x, y, points)) {
            //     filteredIndices.push(i);
            // }
            if (ctx.isPointInPath(x, y)) {
                filteredIndices.push(i);
            }
        }

        return filteredIndices;
    }

    var polygonSelection = new Module({
        start: start,

        enable: enable,

        disable: disable,

        filter: filter
    });

    return polygonSelection;
});