var builder    = require('ltx'),
    Base       = require('xmpp-ftw/lib/base')
    
var Rpc = function() {}

Rpc.prototype = new Base()

Rpc.prototype.handles = function(stanza) {
    return false
}

Rpc.prototype.handle = function(stanza) {
    return false 
}

module.exports = Rpc
