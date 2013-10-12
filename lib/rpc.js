var builder    = require('ltx'),
    Base       = require('xmpp-ftw/lib/base')
    
var Rpc = function() {}

Rpc.prototype = new Base()

Rpc.prototype.NS = 'jabber:iq:rpc'

Rpc.prototype._events = {
    'xmpp.rpc.perform': 'makeRequest'
}

Rpc.prototype.handles = function(stanza) {
    return false
}

Rpc.prototype.handle = function(stanza) {
    return false
}

Rpc.prototype.makeRequest = function(data, callback) {
    var self = this
    if (typeof callback !== 'function')
        return this._clientError('Missing callback', data)
    if (!data.to)
        return this._clientError('Missing \'to\' key', data, callback)
    if (!data.method)
        return this._clientError('Missing \'method\' key', data, callback)
    var stanza = new builder.Element(
        'iq',
        { type: 'set', id: this._getId(), to: data.to }
    ).c('query', { xmlns: this.NS})
     .c('methodCall').c('methodName').t(data.method)
     .up().up()
    
    if (data.params &&
        !this._addParams(data, stanza, callback)) return
           
    
    this.manager.trackId(stanza.root().attr('id'), function(stanza) {
        if ('error' == stanza.attrs.type)
            return callback(self._parseError(stanza), null)
        callback(null, true)
    })
    this.client.send(stanza)
}

Rpc.prototype._addParams = function(data, params, callback) {
    if ((typeof data.params !== 'object') ||
        (false === Array.isArray(data.params))) {
        this._clientError(
            '\'params\' must be an array', data, callback
        )
        return false
    }
    var self = this
    data.params.some(function(param) {
        if (!data.type) {
            self._clientError('\'param\' must have \'type\' key', data, callback)
            return false
        }
    })
    

}

module.exports = Rpc