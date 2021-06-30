import { Amounts } from "@gnu-taler/taler-util";
// import { ProviderInfo } from "@gnu-taler/taler-wallet-core/src/operations/backup/index.js";


export interface ProvidersByCurrency {
  [s:string] : any | undefined
}

const list = {
  "trustedAuditors": [],
  "trustedExchanges": [
    {
      "currency": "ARS",
      "exchangeBaseUrl": "http://exchange.taler:8081/",
      "exchangeMasterPub": "WHA6G542TW8B10N3E857M3P252HV7B896TSP1HP6NREG96ADA4MG"
    },
    {
      "currency": "KUDOS",
      "exchangeBaseUrl": "https://exchange.demo.taler.net/",
      "exchangeMasterPub": "FH1Y8ZMHCTPQ0YFSZECDH8C9407JR3YN0MF1706PTG24Q4NEWGV0"
    },
    {
      "currency": "USD",
      "exchangeBaseUrl": "https://exchange.demo.taler.net/",
      "exchangeMasterPub": "FH1Y8ZMHCTPQ0YFSZECDH8C9407JR3YN0MF1706PTG24Q4NEWGV0"
    },
    {
      "currency": "EUR",
      "exchangeBaseUrl": "https://exchange.demo.taler.net/",
      "exchangeMasterPub": "FH1Y8ZMHCTPQ0YFSZECDH8C9407JR3YN0MF1706PTG24Q4NEWGV0"
    }
  ]
}

const status = {
  "deviceId": "thenameofthisdevice",
  "walletRootPub": "83DYRKK262TG72H1SD09CTWXQFC151P2DXF9WYH30J8EQ7EAZMCG",
  "providers": [
    {
      "active": false,
      "syncProviderBaseUrl": "http://sync.demo.taler.net/",
      "paymentProposalIds": [],
      "paymentStatus": {
        "type": "unpaid"
      },
      "terms": {
        "annualFee": "KUDOS:0.1",
        "storageLimitInMegabytes": 16,
        "supportedProtocolVersion": "0.0"
      }
    }, {
      "active": true,
      "syncProviderBaseUrl": "http://sync.taler:9967/",
      "lastSuccessfulBackupTimestamp": {
        "t_ms": 1625063925078
      },
      "paymentProposalIds": [
        "43Q5WWRJPNS4SE9YKS54H9THDS94089EDGXW9EHBPN6E7M184XEG"
      ],
      "paymentStatus": {
        "type": "paid",
        "paidUntil": {
          "t_ms": 1656599921000
        }
      },
      "terms": {
        "annualFee": "ARS:1",
        "storageLimitInMegabytes": 16,
        "supportedProtocolVersion": "0.0"
      }
    }

  ] 
}

export function useProvidersByCurrency(): ProvidersByCurrency {
  const currencies = list.trustedExchanges.map(e => e.currency)
  const providerByCurrency = status.providers.reduce((p, c) => {
    if (c.terms) {
      p[Amounts.parseOrThrow(c.terms.annualFee).currency] = c
    }
    return p
  }, {} as Record<string, any | undefined>)

  
  return providerByCurrency
}

