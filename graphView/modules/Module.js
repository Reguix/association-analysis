define(function (require) {

    var notifier = require('qtek/core/mixin/notifier');
    var _ = require('_');

    var Module = function(options) {
        if (options) {
            _.extend(this, options);
        }
    }
    Module.prototype.start = function() {};
    Module.prototype.stop = function() {};

    _.extend(Module.prototype, notifier);

    return Module;
})