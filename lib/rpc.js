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
     .up()
    
    if (data.params &&
        !this._addParams(data, stanza, callback)) return
           
    
    this.manager.trackId(stanza.root().attr('id'), function(stanza) {
        if ('error' == stanza.attrs.type)
            return callback(self._parseError(stanza))
        callback(null, true)
    })
    this.client.send(stanza)
}

Rpc.prototype._addParams = function(data, stanza, callback) {
    if ((typeof data.params !== 'object') ||
        (false === Array.isArray(data.params))) {
        this._clientError(
            '\'params\' must be an array', data, callback
        )
        return false
    }
    var params = stanza.c('params')
    var self = this
    var validParams = true
    data.params.some(function(param) {
        if (!param.type) {
            self._clientError('\'param\' must have \'type\' key', data, callback)
            validParams = false
            return false
        }
        if (!param.value) {
            self._clientError('\'param\' must have \'value\' key', data, callback)
            validParams = false
            return false
        }
        if (!self._addParam(param, params.c('param').c('value'))) {
            self._clientError('Parameter formatting error', data, callback)
            validParams = false
            return false
        }
    })
    return validParams
}

Rpc.prototype._addParam = function(param, stanza) {
    if (!param.type || !param.value) return false
    var type = stanza.c(param.type)
    var self = this
    switch (param.type) {
        case 'array':
            if ((typeof param.value !== 'object') ||
              (false === Array.isArray(param.value))) return false
            param.value.forEach(function(value) {
                self._addParam(value, type.c('data'))
            })
            break
        case 'struct':
            if ((typeof param.value !== 'object') ||
              (false === Array.isArray(param.value))) return false
            var validStruct = true
            param.value.some(function(value) {
                if (!value.name) {
                    validStruct = false
                    return false
                }
                var member = type.c('member')
                member.c('name').t(value.name)
                self._addParam(value, member.c('value'))
            })
            if (!validStruct) return false
            break
        case 'boolean':
            param.value = (param.value) ? '1' : '0'
        default:
            type.t(param.value)
    }
    return true
}

module.exports = Rpc