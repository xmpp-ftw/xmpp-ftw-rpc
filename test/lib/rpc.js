var should = require('should')
  , Rpc = require('../../lib/rpc')
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

    describe('Handles', function() {
        
        it('Returns false for any stanza', function() {
            rpc.handles(ltx.parse('<iq/>')).should.be.false
        })
        
    })
    
    describe('Can make RPCs', function() {
      
        it('Errors if no callback provided', function(done) {
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            socket.once('xmpp.error.client', function(error) {
                error.type.should.equal('modify')
                error.condition.should.equal('client-error')
                error.description.should.equal('Missing callback')
                error.request.should.eql({})
                xmpp.removeAllListeners('stanza')
                done()
            })
            socket.emit('xmpp.rpc.perform', {})
        })
        
        it('Errors if non-functional callback provided', function(done) {
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            socket.once('xmpp.error.client', function(error) {
                error.type.should.equal('modify')
                error.condition.should.equal('client-error')
                error.description.should.equal('Missing callback')
                error.request.should.eql({})
                xmpp.removeAllListeners('stanza')
                done()
            })
            socket.emit('xmpp.rpc.perform', {}, true)
        })
            
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
                'xmpp.rpc.perform',
                request,
                callback
            )
        })
        
        it('Errors if no \'method\' key provided', function(done) {
            var request = {
                to: 'rpc.server.com'
            }
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            var callback = function(error, success) {
                should.not.exist(success)
                error.type.should.equal('modify')
                error.condition.should.equal('client-error')
                error.description.should.equal('Missing \'method\' key')
                error.request.should.eql(request)
                xmpp.removeAllListeners('stanza')
                done()
            }
            socket.emit(
                'xmpp.rpc.perform',
                request,
                callback
            )
        })
        
        it('Sends expected stanza with no params', function(done) {
            var request = {
                to: 'rpc.server.com',
                method: 'example.performAction'
            }
            xmpp.once('stanza', function(stanza) {
                stanza.is('iq').should.be.true
                stanza.attrs.id.should.exist
                stanza.attrs.to.should.equal(request.to)
                stanza.attrs.type.should.equal('set')
                var query = stanza.getChild('query', rpc.NS)
                query.should.exist
                query.getChild('methodCall').getChildText('methodName')
                    .should.equal(request.method)
                done()
            })
            socket.emit(
                'xmpp.rpc.perform',
                request,
                function() {}
            )
        })
                
        it('Errors if \'params\' is not an array', function(done) {
            var request = {
                to: 'rpc.server.com',
                method: 'example.performAction',
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
                'xmpp.rpc.perform',
                request,
                callback
            )
        })
            
        it('Errors if any param doesn\'t have type', function(done) {
            var request = {
                to: 'rpc.server.com',
                method: 'example.performAction',
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
                'xmpp.rpc.perform',
                request,
                callback
            )
        })
            
        
        
    })
    
})
