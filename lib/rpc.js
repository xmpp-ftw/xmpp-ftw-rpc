var builder    = require('ltx'),
    Base       = require('xmpp-ftw/lib/base')
    
var Rpc = function() {}

Rpc.prototype = new Base()

Rpc.prototype.NS = 'jabber:iq:rpc'

Rpc.prototype._events = {
    'xmpp.rpc.perform': 'makeRequest'
}

Rpc.prototype.handles = function(stanza) {
    if (!stanza.is('iq') ||
        !stanza.getChild('query', this.NS)
    ) return false
        
    return true
}

Rpc.prototype.handle = function(stanza) {
    var methodCall = stanza.getChild('query').getChild('methodCall')
    var request = {
        from: this._getJid(stanza.attrs.from),
        command: methodCall.getChildText('methodName'),
        id: stanza.attrs.id
    }
    if (!!methodCall.getChild('params')) this._addRequestParams(
        methodCall.getChild('params'), request
    )
    this.socket.emit('xmpp.rpc.request', request)
    return true
}

Rpc.prototype._addRequestParams = function(params, request) {
    request.params = []
    this._handleParams(request.params, params)
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
        var results = []
        var params = stanza.getChild('query')
            .getChild('methodResponse')
            .getChild('params')
        if (params) self._handleParams(results, params)
        callback(null, results)
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
            var values = type.c('data')
            param.value.forEach(function(value) {
                self._addParam(value, values.c('value'))
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

Rpc.prototype._handleParams = function(results, params) {
    var self = this
    params.getChildren('param').forEach(function(param) {
       results.push(self._parseParam(param.getChild('value')))
    })
}

Rpc.prototype._parseParam = function(param, name) {
    var type = this._getParamType(param)
    var result = { type: type.getName() }
    var self = this
    switch (type.getName()) {
       case 'struct':
           result.value = []
           var members = type.getChildren('member')
           members.forEach(function(member) {
               result.value.push(self._parseParam(
                   member.getChild('value'), member.getChildText('name'))
               )
           })
           break
       case 'array':
           result.value = []
           var values = type.getChild('data').getChildren('value')
           values.forEach(function(value) {
               result.value.push(self._parseParam(value))
           })
           break
       case 'boolean':
           result.value = !!(type.getText())
           break
        case 'i4':
            result.value = parseInt(type.getText(), 10)
            break
        case 'int':
            result.value = parseInt(type.getText(), 10)
        case 'double':
            result.value = parseFloat(type.getText())
            break
        default:
           result.value = type.getText()
           break
    }
    if (name) result.name = name
    return result
}

Rpc.prototype._getParamType = function(param) {
    var type
    var notToMatch = ['value', 'name']
    param.children.some(function(child) {
        if (-1 === notToMatch.indexOf(child.getName())) {
            type = child
            return false
        }
    })
    if (!type) throw new Error('Bad incoming RPC stanza')
    return type
}

module.exports = Rpc