/*
 This file is part of GNU Taler
 (C) 2021 Taler Systems S.A.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

/**
*
* @author Sebastian Javier Marchano (sebasjm)
*/

import { MerchantBackend } from '../declaration';
import { Props } from './ShowOrderDetails';


const defaultContractTerms: MerchantBackend.ContractTerms = {
  order_id: 'XRS8876388373',
  amount: 'USD:10',
  summary: 'this is a short summary',
  pay_deadline: {
    t_s: new Date().getTime() + 6 * 24 * 60 * 60 * 1000
  },
  merchant: {
    name: 'the merchant (inc)',
    address: {
      country_subdivision: 'Buenos Aires',
      town: 'CABA',
      country: 'Argentina'
    },
    jurisdiction: {
      country_subdivision: 'Cordoba',
      town: 'Capital',
      country: 'Argentina'
    },
  },
  max_fee: 'USD:0.1',
  max_wire_fee: 'USD:0.2',
  wire_fee_amortization: 1,
  products: [],
  timestamp: {
    t_s: new Date().getTime()
  },
  auditors: [],
  exchanges: [],
  h_wire: '',
  merchant_base_url: 'http://merchant.base.url/',
  merchant_pub: 'QWEASDQWEASD',
  nonce: 'NONCE',
  refund_deadline: {
    t_s: new Date().getTime() + 6 * 24 * 60 * 60 * 1000
  },
  wire_method: 'x-taler-bank',
  wire_transfer_deadline: {
    t_s: new Date().getTime() + 3 * 24 * 60 * 60 * 1000
  },
};

const inSixDays = new Date().getTime() + 6 * 24 * 60 * 60 * 1000
const in10Minutes = new Date().getTime() + 10 * 60 * 1000
const in15Minutes = new Date().getTime() + 15 * 60 * 1000
const in20Minutes = new Date().getTime() + 20 * 60 * 1000

export const exampleData: { [name: string]: Props } = {
  Simplest: {
    order_summary: 'here goes the order summary',
    contract_terms: defaultContractTerms,
  },
  WithRefundAmount: {
    order_summary: 'here goes the order summary',
    refund_amount: 'USD:10',
    contract_terms: defaultContractTerms,
  },
  WithDeliveryDate: {
    order_summary: 'here goes the order summary',
    contract_terms: {
      ...defaultContractTerms,
      delivery_date: {
        t_s: inSixDays
      },
    },
  },
  WithDeliveryLocation: {
    order_summary: 'here goes the order summary',
    contract_terms: {
      ...defaultContractTerms,
      delivery_location: {
        address_lines: ['addr line 1', 'addr line 2', 'addr line 3', 'addr line 4', 'addr line 5', 'addr line 6', 'addr line 7'],
        building_name: 'building-name',
        building_number: 'building-number',
        country: 'country',
        country_subdivision: 'country sub',
        district: 'district',
        post_code: 'post-code',
        street: 'street',
        town: 'town',
        town_location: 'town loc',
      },
    },
  },
  WithDeliveryLocationAndDate: {
    order_summary: 'here goes the order summary',
    contract_terms: {
      ...defaultContractTerms,
      delivery_location: {
        address_lines: ['addr1', 'addr2', 'addr3', 'addr4', 'addr5', 'addr6', 'addr7'],
        building_name: 'building-name',
        building_number: 'building-number',
        country: 'country',
        country_subdivision: 'country sub',
        district: 'district',
        post_code: 'post-code',
        street: 'street',
        town: 'town',
        town_location: 'town loc',
      },
      delivery_date: {
        t_s: inSixDays
      },
    },
  },
  WithThreeProducts: {
    order_summary: 'here goes the order summary',
    contract_terms: {
      ...defaultContractTerms,
      products: [{
        description: 'description of the first product',
        price: '5:USD',
        quantity: 1,
        delivery_date: { t_s: in10Minutes },
        product_id: '12333',
      }, {
        description: 'another description',
        price: '10:USD',
        quantity: 5,
        unit: 't-shirt',
      }, {
        description: 'one last description',
        price: '10:USD',
        quantity: 5
      }]
    } as MerchantBackend.ContractTerms
  },
  WithProductWithTaxes: {
    order_summary: 'here goes the order summary',
    contract_terms: {
      ...defaultContractTerms,
      products: [{
        description: 'description of the first product',
        price: '5:USD',
        quantity: 1,
        unit: 'beer',
        delivery_date: { t_s: in10Minutes },
        product_id: '456',
        taxes: [{
          name: 'VAT', tax: 'USD:1'
        }],
      }, {
        description: 'one last description',
        price: '10:USD',
        quantity: 5,
        product_id: '123',
        unit: 'beer',
        taxes: [{
          name: 'VAT', tax: 'USD:1'
        }],
      }]
    } as MerchantBackend.ContractTerms
  },
  WithExchangeList: {
    order_summary: 'here goes the order summary',
    contract_terms: {
      ...defaultContractTerms,
      exchanges: [{
        master_pub: 'ABCDEFGHIJKLMNO',
        url: 'http://exchange0.taler.net'
      }, {
        master_pub: 'AAAAAAAAAAAAAAA',
        url: 'http://exchange1.taler.net'
      }, {
        master_pub: 'BBBBBBBBBBBBBBB',
        url: 'http://exchange2.taler.net'
      }]
    },
  },
  WithAuditorList: {
    order_summary: 'here goes the order summary',
    contract_terms: {
      ...defaultContractTerms,
      auditors: [{
        auditor_pub: 'ABCDEFGHIJKLMNO',
        name: 'the USD auditor',
        url: 'http://auditor-usd.taler.net'
      }, {
        auditor_pub: 'OPQRSTUVWXYZABCD',
        name: 'the EUR auditor',
        url: 'http://auditor-eur.taler.net'
      }]
    },
  },
  WithAutoRefund: {
    order_summary: 'here goes the order summary',
    contract_terms: {
      ...defaultContractTerms,
      auto_refund: {
        d_us: 1000 * 60 * 60 * 26 + 1000 * 60 * 30
      }
    },
  },
}
