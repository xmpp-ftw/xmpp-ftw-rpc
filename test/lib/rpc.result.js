var should = require('should')
  , Rpc = require('../../index')
  , ltx    = require('ltx')
  , helper = require('../helper')

describe('Rpc', function() {

    var rpc, socket, xmpp, manager

    before(function() {
        socket = new helper.Eventer()
        xmpp = new helper.Eventer()
        manager = {
            socket: socket,
            client: xmpp,
            trackId: function(id, callback) {
                this.callback = callback
            },
            makeCallback: function(error, data) {
                this.callback(error, data)
            },
            _getLogger: function() {
                return {
                    log: function() {},
                    error: function() {},
                    warn: function() {},
                    info: function() {}
                }
            }
        }
        rpc = new Rpc()
        rpc.init(manager)
    })

    describe('Can send RPC results', function() {

        it('Errors if no \'to\' key provided', function(done) {
            var request = {}
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            var callback = function(error, success) {
                should.not.exist(success)
                error.type.should.equal('modify')
                error.condition.should.equal('client-error')
                error.description.should.equal('Missing \'to\' key')
                error.request.should.eql(request)
                xmpp.removeAllListeners('stanza')
                done()
            }
            socket.emit(
                'xmpp.rpc.result',
                request,
                callback
            )
        })

        it('Errors if no \'id\' key provided', function(done) {
            var request = {
                to: 'requester@server.com/desktop'
            }
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            var callback = function(error, success) {
                should.not.exist(success)
                error.type.should.equal('modify')
                error.condition.should.equal('client-error')
                error.description.should.equal('Missing \'id\' key')
                error.request.should.eql(request)
                xmpp.removeAllListeners('stanza')
                done()
            }
            socket.emit(
                'xmpp.rpc.result',
                request,
                callback
            )
        })

        it('Sends expected stanza with no params', function(done) {
            var request = {
                to: 'requester@server.com/desktop',
                id: '123'
            }
            xmpp.once('stanza', function(stanza) {
                stanza.is('iq').should.be.true
                stanza.attrs.id.should.equal(request.id)
                stanza.attrs.to.should.equal(request.to)
                stanza.attrs.type.should.equal('result')
                var query = stanza.getChild('query', rpc.NS)
                query.getChild('methodResponse').should.exist
                query.should.exist

                done()
            })
            socket.emit(
                'xmpp.rpc.result',
                request,
                function() {}
            )
        })

        it('Errors if \'params\' is not an array', function(done) {
            var request = {
                to: 'requester@server.com/desktop',
                id: '123',
                params: true
            }
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            var callback = function(error, success) {
                should.not.exist(success)
                error.type.should.equal('modify')
                error.condition.should.equal('client-error')
                error.description.should.equal('\'params\' must be an array')
                error.request.should.eql(request)
                xmpp.removeAllListeners('stanza')
                done()
            }
            socket.emit(
                'xmpp.rpc.result',
                request,
                callback
            )
        })

        it('Errors if any param doesn\'t have type', function(done) {
            var request = {
                to: 'requester@server.com/desktop',
                id: '123',
                params: [{}]
            }
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            var callback = function(error, success) {
                should.not.exist(success)
                error.type.should.equal('modify')
                error.condition.should.equal('client-error')
                error.description.should.equal('\'param\' must have \'type\' key')
                error.request.should.eql(request)
                xmpp.removeAllListeners('stanza')
                done()
            }
            socket.emit(
                'xmpp.rpc.result',
                request,
                callback
            )
        })

        it('Errors if any param doesn\'t have a value', function(done) {
            var request = {
                to: 'requester@server.com/desktop',
                id: '123',
                params: [{ type: 'int' }]
            }
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            var callback = function(error, success) {
                should.not.exist(success)
                error.type.should.equal('modify')
                error.condition.should.equal('client-error')
                error.description.should.equal('\'param\' must have \'value\' key')
                error.request.should.eql(request)
                xmpp.removeAllListeners('stanza')
                done()
            }
            socket.emit(
                'xmpp.rpc.result',
                request,
                callback
            )
        })

        it('Sends expected stanza with basic param types', function(done) {
            var request = {
                to: 'requester@server.com/desktop',
                id: '123',
                params: [
                    { type: 'i4', value: 'i4value' },
                    { type: 'int', value: 'intvalue' },
                    { type: 'string', value: 'stringvalue' },
                    { type: 'double', value: 'double' },
                    { type: 'base64', value: '34332354f3fve2' },
                    { type: 'boolean', value: true },
                    { type: 'dateTime.iso8601', value: '2013-10-01Z10:10:10T' }
                ]
            }
            xmpp.once('stanza', function(stanza) {
                stanza.is('iq').should.be.true
                stanza.attrs.id.should.equal(request.id)
                stanza.attrs.to.should.equal(request.to)
                stanza.attrs.type.should.equal('result')
                var methodResponse = stanza.getChild('query', rpc.NS)
                    .getChild('methodResponse')
                methodResponse.should.exist
                var paramsParent = methodResponse.getChild('params')
                paramsParent.should.exist
                var params = paramsParent.getChildren('param')
                params.length.should.equal(request.params.length)
                for (var i = 0; i < request.params.length; ++i)
                    params[i].getChild('value')
                        .getChildText(request.params[i].type)
                        .should.equal(request.params[i].value)
                done()
            })
            socket.emit(
                'xmpp.rpc.result',
                request,
                function() {}
            )
        })

        it('Sends expected stanza with array param type', function(done) {
            var request = {
                to: 'requester@server.com/desktop',
                id: '123',
                params: [
                    {
                        type: 'array',
                        value: [
                            { type: 'string', value: 'one' },
                            { type: 'int', value: 2 }
                        ]
                    }
                ]
            }
            xmpp.once('stanza', function(stanza) {
                stanza.is('iq').should.be.true
                stanza.attrs.id.should.equal(request.id)
                stanza.attrs.to.should.equal(request.to)
                stanza.attrs.type.should.equal('result')
                var methodResponse = stanza.getChild('query', rpc.NS)
                    .getChild('methodResponse')
                methodResponse.should.exist
                var params = methodResponse.getChild('params')
                params.should.exist
                var param = params.getChild('param')
                var data = param.getChild('value').getChild('array')
                    .getChild('data')
                    .getChildren('value')
                data.length.should.equal(2)

                data[0].getChildText('string').should.equal('one')
                data[1].getChildText('int').should.equal('2')
                done()
            })
            socket.emit(
                'xmpp.rpc.result',
                request,
                function() {}
            )
        })

        it('Can handle nested arrays', function(done) {
            var request = {
                to: 'requester@server.com/desktop',
                id: '123',
                params: [
                    {
                        type: 'array',
                        value: [{
                            type: 'array',
                            value: [
                                { type: 'int', value: 2 }
                            ]
                        }]
                    }
                ]
            }
            xmpp.once('stanza', function(stanza) {
                stanza.is('iq').should.be.true
                stanza.attrs.id.should.equal(request.id)
                stanza.attrs.to.should.equal(request.to)
                stanza.attrs.type.should.equal('result')
                var methodResponse = stanza.getChild('query', rpc.NS)
                    .getChild('methodResponse')
                methodResponse.should.exist
                var params = methodResponse.getChild('params')
                params.should.exist
                var param = params.getChild('param')
                var data = param.getChild('value')
                    .getChild('array')
                    .getChild('data')
                    .getChild('value')
                data.should.exist
                var childArray = data.getChild('array')
                var childData = childArray.getChild('data').getChild('value')
                childData.getChildText('int')
                    .should.equal('2')
                done()
            })
            socket.emit(
                'xmpp.rpc.result',
                request,
                function() {}
            )
        })

        it('Badly formatted array parameter return error', function(done) {
            var request = {
                to: 'requester@server.com/desktop',
                id: '123',
                params: [
                    {
                        type: 'array',
                        value: true
                    }
                ]
            }
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            var callback = function(error, data) {
                should.not.exist(data)
                error.type.should.equal('modify')
                error.condition.should.equal('client-error')
                error.description.should.equal('Parameter formatting error')
                error.request.should.eql(request)
                xmpp.removeAllListeners('stanza')
                done()
            }
            socket.emit(
                'xmpp.rpc.result',
                request,
                callback
            )
        })

       it('Sends expected stanza with struct param type', function(done) {
            var request = {
                to: 'requester@server.com/desktop',
                id: '123',
                params: [
                    {
                        type: 'struct',
                        value: [
                            { type: 'string', value: 'one', name: 'PageNumber' },
                            { type: 'int', value: 2, name: 'RPP' }
                        ]
                    }
                ]
            }
            xmpp.once('stanza', function(stanza) {
                stanza.is('iq').should.be.true
                stanza.attrs.id.should.equal(request.id)
                stanza.attrs.to.should.equal(request.to)
                stanza.attrs.type.should.equal('result')
                var methodResponse = stanza.getChild('query', rpc.NS)
                    .getChild('methodResponse')
                methodResponse.should.exist
                var params = methodResponse.getChild('params')
                params.should.exist
                var param = params.getChild('param')
                var members = param.getChild('value')
                    .getChild('struct')
                    .getChildren('member')
                members.length.should.equal(2)

                members[0].getChildText('name').should.equal('PageNumber')
                members[0].getChild('value').getChildText('string')
                    .should.equal('one')

                members[1].getChildText('name').should.equal('RPP')
                members[1].getChild('value').getChildText('int').should.equal('2')
                done()
            })
            socket.emit(
                'xmpp.rpc.result',
                request,
                function() {}
            )
        })

        it('Can handle nested structs', function(done) {
            var request = {
                to: 'requester@server.com/desktop',
                id: '123',
                params: [
                    {
                        type: 'struct',
                        value: [{
                            type: 'struct',
                            value: [
                                { type: 'int', value: 2, name: 'PageNumber' }
                            ],
                            name: 'Paging'
                        }]
                    }
                ]
            }
            xmpp.once('stanza', function(stanza) {
                stanza.is('iq').should.be.true
                stanza.attrs.id.should.equal(request.id)
                stanza.attrs.to.should.equal(request.to)
                stanza.attrs.type.should.equal('result')
                var methodResponse = stanza.getChild('query', rpc.NS)
                    .getChild('methodResponse')
                methodResponse.should.exist
                var params = methodResponse.getChild('params')
                params.should.exist
                var param = params.getChild('param')
                var member = param.getChild('value')
                    .getChild('struct')
                    .getChild('member')
                member.should.exist
                member.getChildText('name').should.equal('Paging')
                var childStruct = member.getChild('value').getChild('struct')
                var childMember = childStruct.getChild('member')
                childMember.getChildText('name').should.equal('PageNumber')
                childMember.getChild('value').getChildText('int')
                    .should.equal('2')
                done()
            })
            socket.emit(
                'xmpp.rpc.result',
                request,
                function() {}
            )
        })

        it('Badly formatted struct parameter return error', function(done) {
            var request = {
                to: 'requester@server.com/desktop',
                id: '123',
                params: [
                    {
                        type: 'struct',
                        value: true
                    }
                ]
            }
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            var callback = function(error, data) {
                should.not.exist(data)
                error.type.should.equal('modify')
                error.condition.should.equal('client-error')
                error.description.should.equal('Parameter formatting error')
                error.request.should.eql(request)
                xmpp.removeAllListeners('stanza')
                done()
            }
            socket.emit(
                'xmpp.rpc.result',
                request,
                callback
            )
        })

    })

})