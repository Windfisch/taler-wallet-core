/*

  This file is part of TALER
  Copyright (C) 2014, 2015 Christian Grothoff (and other contributing authors)

  TALER is free software; you can redistribute it and/or modify it under the
  terms of the GNU General Public License as published by the Free Software
  Foundation; either version 3, or (at your option) any later version.

  TALER is distributed in the hope that it will be useful, but WITHOUT ANY
  WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
  A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

  You should have received a copy of the GNU General Public License along with
  TALER; see the file COPYING. If not, see <http://www.gnu.org/licenses/>


*/


var EXPORTED_SYMBOLS = [
  'TWRhelloWorld',
  'TWRgetValue',
  'TWRgetFraction',
  'TWRgetCurrency',
  'TamountCmp',
  'TWRverifyConfirmation',
  'TWRverifySignKey',
  'TWRverifyDenom',
  'TWRverifyDenoms',
  'TWRALLrsaPublicKeyHash',
  'TWRALLgetEncodingFromRsaSignature',
  'DWRtestStringCmp',
  'TWRmultiplyAmount',
  'TWRmultiplyAmounts',
  'DWRdumpAmount',
  'TWRALLgetAmount',
  'DWRtestString',
  'DWRgetPurpose',
  'TWReddsaVerify',
  'TamountAdd',
  'TamountSubtract',
  'TWRALLmakeEddsaSignature',
  'TWRALLamountAdd',
  'TWRALLeddsaPublicKeyFromPrivate',
  'TWRALLeddsaPublicKeyFromPrivString',
  'TWRALLeddsaPrivateKeyFromString',
  'TWRALLeccEcdh',
  'TWRALLhash',
  'TWRALLecdhePublicKeyFromPrivateKey',
  'TWRALLrsaPublicKeyDecodeFromString',
  'GCeddsaSign',
  'TWRALLmakeWithdrawBundle',
  'GCALLrsaSignatureDecode',
  'GCrsaSignatureEncode',
  'TWRALLsignDepositPermission',
  'GCALLrsaPublicKeyDecode',
  'GCALLrsaPublicKeyEncode',
  'WRALLeddsaPublicKey',
  'GCALLeddsaKeyCreate',
  'WRALLecdhePublicKey ',
  'GSALLdataToStringAlloc',
  'TWRgnunetFree',
  'GSstringToData',
  'TWRALLgetCurrentTime',
  'TWRgetFancyTime',
  'GChash',
  'getHashedArray',
  'TWRALLsignTest',
  'GCALLecdheKeyCreate',
  'GCecdheKeyGetPublic',
  'WRALLecdhePublicKey',
  'WRverifyTest',
  'GCeccEcdh',
  'TWRALLgenSymmetricKey',
  'TWRALLgenInitVector',
  'GCsymmetricDecrypt',
  'GCsymmetricEncrypt',
  'TWRALLgenKeyFromBlob',
  'GCALLrsaPrivateKeyGetPublic',
  'GCALLrsaPrivateKeyCreate',
  'GCALLrsaBlindingKeyCreate',
  'GCrsaBlindingKeyFree',
  'GCrsaPublicKeyFree',
  'GCrsaPrivateKeyFree',
  'GCALLrsaBlind',
  'GCALLrsaUnblind',
  'GCALLrsaSign',
  'GCrsaVerify',
  'GCrsaSignatureFree',
  'GCeddsaKeyGetPublic',
  'WRALLmakePurpose',
  'GChkdf',
  'emscMalloc',
  'emscFree'
];

/* The following definition is needed to make emscripted library to remain
  'alive' after its loading. Otherwise, the normal behaviour would be:
  loading -> look for a 'main()' -> if one is found execute it then exit,
  otherwise just exit. See https://kripken.github.io/emscripten-site/docs/getting_started/FAQ.html
  DO NOTE: this definition MUST precede the importing/loading of the emscripted
  library */

/* FIXME
getLastWindow().Module = {

  onRuntimeInitialized: function() {

  }

};
*/

/* According to emscripten's design, we need our emscripted library to be executed
  with a 'window' object as its global scope.
  Note: that holds on emscripten's functions too, that is they need to be *explicitly*
  run with some 'window' object as their global scope. In practice, given a function
  'foo' pointing to some emscripted function, that is accomplished by the mean of 'call()'
  or 'apply()' methods; so, being 'someWin' a 'window' object, the statements

  foo.call('someWin', arg1, .., argN) or foo.apply('someWin', ['arg1', .., 'argN']) will
  execute foo(arg1, .., argN) with 'someWin' as its global scope.
  See http://www.bennadel.com/blog/2265-changing-the-execution-context-of-javascript
  -functions-using-call-and-apply.htm. */

/* The naming convention is such that:
  - 'GCfunctionName' takes its code from GNUNET_CRYPTO_function_name
  - 'GCALLfunctionName' takes its code from GNUNET_CRYPTO_function_name and returns
     a pointer that must be deallocated using 'WRgnunetFree' (that takes its code from
     'GNUNET_free' in the wrapper)
  - 'GSfunctionName' and 'GSALLfunctionName' comply to the same convention respect to
    GNUNET_STRINGS_* realm.
  - 'TWRfunctionName' takes its code from 'TALER_function_name' in the wrapper.
  - 'TWRALLfunctionName' takes its code from 'TALER_ALL_function_name' in the wrapper
    and returns a pointer that must be deallocated using 'TWRgnunetFree' (or a function
    provided by some emscripted routine) (the 'wrapper' is an additional layer written in
    C that does some struct(s) manipulations where that is uncovenient to do from JavaScript.
    Currently located at '../../emscripten/testcases/wrap.c')
  - The same applies to 'TfunctionName' and 'TALLfunctionName', to indicate that the
    respective functions come from (the emscripted version of) TALER_* realm. */


// shortcut to emscr's 'malloc'
function emscMalloc(size) {

  var ptr = Module._malloc(size);
  return ptr;

}

/* shortcut to emscr's 'free'. This function is problematic:
  it randomly stops working giving 'emscFree is not a function'
  error */
function emscFree(ptr) {

  Module._free(ptr);

}

var getEmsc = Module.cwrap;

var TWRhelloWorld = getEmsc('TALER_WR_hello_world', 'void', []);

var TWRverifyConfirmation = getEmsc('TALER_WR_verify_confirmation',
                                    'number',
                                   ['number',
                                    'number',
     		                    'number',
                                    'number',
				    'number',
				    'number',
                                    'number',
                                    'number',
                                    'number',
                                    'number',
                                    'number']);
var TWRgetValue = getEmsc('TALER_WR_get_value',
                          'number',
			 ['number']);

var TWRgetFraction = getEmsc('TALER_WR_get_fraction',
                             'number',
			    ['number']);

var TWRgetCurrency = getEmsc('TALER_WR_get_currency',
                             'string',
			    ['number']);


var TWRmultiplyAmounts = getEmsc('TALER_WR_multiply_amounts',
                                 'number',
			        ['number',
			         'number'] );

var TWRmultiplyAmount = getEmsc('TALER_WR_multiply_amount',
                               'number',
			      ['number',
			       'number'] );

var TWRALLrsaPublicKeyHash = getEmsc('TALER_WRALL_rsa_public_key_hash',
                                     'number',
				    ['number']);

var TWRverifyDenom = getEmsc('TALER_WR_verify_denom',
                             'number',
                            ['number',
                             'number',
		             'number',
                             'number',
                             'number',
                             'number',
                             'number',
                             'number',
                             'number',
			     'number',
			     'number']);

var TWRverifyDenoms = getEmsc('TALER_WR_verify_denoms',
                              'number',
			     ['number',
			      'number',
                              'number',
			      'number',
                              'number']);

var TWRverifySignKey = getEmsc('TALER_WR_verify_sign_key',
                               'number',
                              ['number',
			       'number',
			       'number',
                               'number',
			       'number',
			       'number']);


var TWRALLgetEncodingFromRsaSignature = getEmsc('TALER_WRALL_get_encoding_from_rsa_signature',
                                                'number',
                                               ['number']);

var TamountCmp = getEmsc('TALER_amount_cmp',
                         'number',
			['number',
			 'number']);

var DWRdumpAmount = getEmsc('DEBUG_WR_dump_amount',
                            'void'
			   ['number']);

var DWRtestStringCmp = getEmsc('DEBUG_WR_test_string_cmp',
                               'number',
			      ['number',
			       'string']);

var TWRALLgetAmount = getEmsc('TALER_WRALL_get_amount',
                              'number',
			     ['number',
			      'number',
			      'number',
			      'string']);

var DWRgetPurpose = getEmsc('DEBUG_WR_get_purpose',
                            'number',
			   ['number']);

var TWReddsaVerify = getEmsc('TALER_WR_eddsa_verify',
                             'number',
			    ['string',
			     'number',
			     'number',
			     'number']);

var TWRALLmakeEddsaSignature = getEmsc('TALER_WRALL_make_eddsa_signature',
                                       'number',
				      ['number',
				       'number']);

var TWRALLamountAdd = getEmsc('TALER_WRALL_amount_add',
                              'number',
			     ['number',
			      'number',
			      'number',
			      'number',
                              'number',
			      'number',
			      'string']);

var TamountSubtract = getEmsc('TALER_amount_subtract',
                              'number',
			     ['number',
			      'number',
			      'number']);

var TamountAdd = getEmsc('TALER_amount_add',
                         'number',
			['number',
			 'number',
			 'number']);
var TWRALLeddsaPublicKeyFromPrivate = getEmsc('TALER_WRALL_eddsa_public_key_from_private',
                                              'number',
                                             ['number']);

var TWRALLeddsaPublicKeyFromPrivString = getEmsc('TALER_WRALL_eddsa_public_key_from_priv_string',
                                                 'number',
                                                ['string']);

var TWRALLsignDepositPermission = getEmsc('TALER_WRALL_sign_deposit_permission',
                                          'number',
					 ['number',
					  'number',
                                          'number',
					  'number',
					  'number',
					  'number',
					  'number',
					  'number',
					  'number',
					  'number']);

var TWRALLeddsaPrivateKeyFromString = getEmsc('TALER_WRALL_eddsa_private_key_from_string',
                                              'number',
					     ['string']);

var TWRALLrsaPublicKeyDecodeFromString = getEmsc('TALER_WRALL_rsa_public_key_decode_from_string',
                                                 'number',
						['string']);

var TWRALLecdhePublicKeyFromPrivateKey = getEmsc('TALER_WRALL_ecdhe_public_key_from_private_key',
                                                 'number',
						['number']);

var TWRALLeccEcdh = getEmsc('TALER_WRALL_ecc_ecdh',
                            'number',
			   ['number',
			    'number',
			    'number']);

var TWRALLmakeWithdrawBundle = getEmsc('TALER_WRALL_make_withdraw_bundle',
                                       'number',
				      ['number',
				       'number',
				       'number',
				       'number',
				       'number',
				       'number']);

var WRALLmakePurpose = getEmsc('WRALL_make_purpose',
                               'number',
			      ['string',
			       'number',
			       'number',
			       'number']);

var GCALLrsaSignatureDecode = getEmsc('GNUNET_CRYPTO_rsa_signature_decode',
                                      'number',
				     ['number',
				      'number']);

var GCALLrsaSignatureEncode = getEmsc('GNUNET_CRYPTO_rsa_signature_encode',
                                      'number',
				     ['number',
				     'number']);

var GCALLrsaPublicKeyEncode = getEmsc('GNUNET_CRYPTO_rsa_public_key_encode',
                                      'number',
				     ['number',
				      'number']);

var GCALLrsaPublicKeyDecode = getEmsc('GNUNET_CRYPTO_rsa_public_key_decode',
                                      'number',
				     ['number',
				      'number']);

var GCALLrsaPrivateKeyGetPublic = getEmsc('GNUNET_CRYPTO_rsa_private_key_get_public',
                                          'number',
					 ['number']);

var GCALLrsaPrivateKeyCreate = getEmsc('GNUNET_CRYPTO_rsa_private_key_create',
                                       'number',
				      ['number']);

var GCALLrsaBlindingKeyCreate = getEmsc('GNUNET_CRYPTO_rsa_blinding_key_create',
                                        'number',
				       ['number']);

var GCrsaBlindingKeyFree = getEmsc('GNUNET_CRYPTO_rsa_blinding_key_free',
                                   'void',
				  ['number']);

var GCrsaPublicKeyFree = getEmsc('GNUNET_CRYPTO_rsa_public_key_free',
                                 'void',
				['number']);

var GCrsaPrivateKeyFree = getEmsc('GNUNET_CRYPTO_rsa_private_key_free',
                                  'void',
				 ['number']);

var GCALLrsaBlind = getEmsc('GNUNET_CRYPTO_rsa_blind',
                            'number',
			   ['number',
			    'number',
			    'number',
			    'number']);

var GCALLrsaUnblind = getEmsc('GNUNET_CRYPTO_rsa_unblind',
                              'number',
			     ['number',
			      'number',
			      'number']);

var GCALLrsaSign = getEmsc('GNUNET_CRYPTO_rsa_sign',
                           'number',
			  ['number',
			   'number',
			   'number']);

var GCrsaVerify = getEmsc('GNUNET_CRYPTO_rsa_verify',
                          'number',
			 ['number',
			  'number',
			  'number']);

var GCrsaSignatureFree = getEmsc('GNUNET_CRYPTO_rsa_signature_free',
                                 'void',
				['number']);

var GChkdf = getEmsc('GNUNET_CRYPTO_hkdf',
                     'number',
		    ['number',
		     'number',
		     'number',
		     'number',
		     'number',
		     'number',
		     'number',
		     'number']);

var TWRALLgenKeyFromBlob = getEmsc('TALER_WRALL_gen_key_from_blob',
                                   'number',
				  ['string',
				   'number',
				   'number']);

var DWRtestString = getEmsc('DEBUG_WR_test_string',
                            'void',
			   ['number',
			    'number',
			    'string']);

var GCsymmetricDecrypt = getEmsc('GNUNET_CRYPTO_symmetric_decrypt',
                                 'number',
				['number',
				 'number',
				 'number',
				 'number',
				 'number']);

var GCsymmetricEncrypt = getEmsc('GNUNET_CRYPTO_symmetric_encrypt',
                                 'number',
				['number',
				 'number',
				 'number',
				 'number',
				 'number']);

/* returns a pointer to a symmetric session key strucure and takes a salt, a
  (pointer to) binary data used to generate the key, and the length of that
  data */
var TWRALLgenSymmetricKey = getEmsc('TALER_WRALL_gen_symmetric_key',
                                    'number',
				   ['string',
				    'number',
				    'number']);

/* returns a pointer to a init. vector strucure and takes a salt, a
  (pointer to) binary data used to generate the key, and the length of that
  data */
var TWRALLgenInitVector = getEmsc('TALER_WRALL_gen_init_vector',
                                  'number',
				 ['string',
				  'number',
				  'number']);

// return key material from ECC keys
var GCeccEcdh = getEmsc('GNUNET_CRYPTO_ecc_ecdh',
                        'number',
		       ['number',
		        'number',
			'number']);

// return a pointer to a freshly allocated EddsaPublicKey structure
/* var WRALLeddsaPublicKey = getEmsc('WRALL_eddsa_public_key',
                                     'number'); */

// return a pointer to a freshly allocated EcdhePublicKey structure
/* var WRALLecdhePublicKey = getEmsc('WRALL_ecdhe_public_key',
                                     'number'); */

/* generates a new eddsa private key, returning a pointer to EddsaPrivateKey
  structure */
var GCALLeddsaKeyCreate = getEmsc('GNUNET_CRYPTO_eddsa_key_create',
                                  'number');

/* extract eddsa public key from a pointer to a EddsaPrivateKey structure
  and put it in second argument */
var GCeddsaKeyGetPublic = getEmsc('GNUNET_CRYPTO_eddsa_key_get_public',
                                  'void',
				 ['number',
				  'number']);

/* generates a new ecdhe private key, returning a pointer to EcdhePrivateKey
  structure */
var GCALLecdheKeyCreate = getEmsc('GNUNET_CRYPTO_ecdhe_key_create',
                                  'number');

/* extract eddsa public key from a pointer to a EddsaPrivateKey structure and
  put it in second argument */
var GCecdheKeyGetPublic = getEmsc('GNUNET_CRYPTO_ecdhe_key_get_public',
                                  'void',
				 ['number',
				  'number']);

// what to sign, the reason to sign, the location to store the signature
var GCeddsaSign = getEmsc('GNUNET_CRYPTO_eddsa_sign',
                          'int',
			 ['number',
			  'number',
			  'number']);

/* get reference to the emscripted primitive: the first parameter is a
  pointer (note that it points to the emscripten's heap) to the data being
  encoded, the second is its length */
var GSALLdataToStringAlloc = getEmsc('GNUNET_STRINGS_data_to_string_alloc',
                                     'number',
				    ['number',
				     'number']);

// import GNUnet's memory deallocator
var TWRgnunetFree = getEmsc('TALER_WR_GNUNET_free',
                            'void',
			   ['number']);

// GNUnet's base32 decoder
var GSstringToData = getEmsc('GNUNET_STRINGS_string_to_data',
                             'number',
			    ['number',
			     'number',
			     'number',
			     'number']);

// get absolute time. Returned value has to be freed by gnunetFree
var TWRALLgetCurrentTime = getEmsc('TALER_WRALL_get_current_time',
                                   'number');

// prettyfy time
var TWRgetFancyTime = getEmsc('TALER_WR_get_fancy_time',
                              'string',
			     ['number']);

var TWRALLhash = getEmsc('TALER_WRALL_hash',
                         'number',
			['number',
			 'number']);

/* computes the hashcode of the value pointed to by 'val' and sets the
  pointer to the location holding the hashcode (which has to be previously
  allocated and is a reflection of GNUNET_HashCode type). The returned
  pointer has to be freed by gnunetFree.
  Its interface is hash('val', 'valSize', 'hashedBuf') */
var GChash = getEmsc('GNUNET_CRYPTO_hash',
                     'void',
		    ['number',
		     'number',
		     'number']);

/* this test just takes the private key to sign a dummy hardcoded
  message. Return a pointer to the signed message (to be freed) */
var TWRALLsignTest = getEmsc('TALER_WRALL_sign_test',
                             'number',
			    ['number']);

/* this test just takes the public key and the signed dummy
  message. Return GNUNET_OK (=1) if it succeeds, otherwise
  GNUNET_SYSERR (=-1) */
var WRverifyTest = getEmsc('WR_verify_test',
                           'number',
			  ['number']);
