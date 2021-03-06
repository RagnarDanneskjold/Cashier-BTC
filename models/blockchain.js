/**
 * Cashier-BTC
 * -----------
 * Self-hosted bitcoin payment gateway
 *
 * License: WTFPL
 * Author: Igor Korsakov
 * */

var bitcore = require('bitcore-lib')
var config = require('../config')

var provider = require('../models/provider/bitcore')

exports.create_transaction = function (to_address, btc_amount, miner_fee, WIF, callback) {
  if (miner_fee === false) miner_fee = 0.0001
  var pk = new bitcore.PrivateKey.fromWIF(WIF)
  var from_address = (pk.toPublicKey()).toAddress(bitcore.Networks.livenet)
  var total_satoshis = 0

  var transaction = new bitcore.Transaction()

  provider.fetch_transactions_by_address(from_address, function (txs) {
    for (var i = 0, l = txs.length; i < l; i++) { // iterating all transactions on that address
      var out = false

      for (var ii = 0, ll = txs[i].out.length; ii < ll; ii++) { // iterating all outs on transaction to find then one we own (from_address)
        if (txs[i].out[ii].addr == from_address && typeof txs[i].out[ii].spent_by === 'undefined') {
          out = txs[i].out[ii]
                    // console.log("+1 unspent out", out);
        }
      } // end for

      if (!out) continue

      transaction.from({ 'address': from_address,
                 'txid': txs[i].hash,
                 'vout': out.n,
                 'scriptPubKey': out.script,
                 'satoshis': out.value
            })

      total_satoshis += out.value

      if (total_satoshis >= (parseInt(btc_amount * 100000000) + parseInt(miner_fee * 100000000))) break // we have enough outs
    } // end for

    transaction
                .to(to_address, parseInt(btc_amount * 100000000))
                .fee(parseInt(miner_fee * 100000000))
                .change(from_address)
                .sign(pk)

    callback(transaction)
  }) // end fetch transactions
}//  end create_transaction

exports.get_address = provider.get_address
exports.fetch_transactions_by_address = provider.fetch_transactions_by_address
exports.broadcast_transaction = provider.broadcast_transaction
