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
    
})
