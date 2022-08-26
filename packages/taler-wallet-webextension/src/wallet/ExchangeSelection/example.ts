/*
 This file is part of GNU Taler
 (C) 2022 Taler Systems S.A.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

import { ExchangeListItem } from "@gnu-taler/taler-util";

/**
 *
 * @author Sebastian Javier Marchano (sebasjm)
 */

export const bitcoinExchanges: ExchangeListItem[] = [
  {
    exchangeBaseUrl: "https://bitcoin1.ice.bfh.ch/",
    currency: "BITCOINBTC",
    tos: {
      acceptedVersion: "0",
      currentVersion: "0",
      contentType: "text/plain",
      content:
        'Terms Of Service\n****************\n\nLast Updated: 09.06.2022\n\nWelcome! The ICE research center of the Bern University of Applied\nSciences in Switzerland (“we,” “our,” or “us”) provides an\nexperimental payment service through our Internet presence\n(collectively the “Services”). Before using our Services, please read\nthe Terms of Service (the “Terms” or the “Agreement”) carefully.\n\n\nThis is research\n================\n\nThis is a research experiment. Any funds wired to our Bitcoin address\nare considered a donation to our research group. We may use them to\nenable payments following the GNU Taler protocol, or simply keep them\nat our discretion.  The service is experimental and may also be\ndiscontinued at any time, in which case all remaining funds will\ndefinitively be kept by the research group.\n\n\nOverview\n========\n\nThis section provides a brief summary of the highlights of this\nAgreement. Please note that when you accept this Agreement, you are\naccepting all of the terms and conditions and not just this section.\nWe and possibly other third parties provide Internet services which\ninteract with the Taler Wallet’s self-hosted personal payment\napplication. When using the Taler Wallet to interact with our\nServices, you are agreeing to our Terms, so please read carefully.\n\n\nHighlights:\n-----------\n\n   * You are responsible for keeping the data in your Taler Wallet at\n     all times under your control. Any losses arising from you not\n     being in control of your private information are your problem.\n\n   * We may transfer funds we receive from our users to any legal\n     recipient to the best of our ability within the limitations of\n     the law and our implementation. However, the Services offered\n     today are highly experimental and the set of recipients of funds\n     is severely restricted. Again, we stress this is a research\n     experiment and technically all funds held by the exchange are\n     owned by the research group of the university.\n\n   * For our Services, we may charge transaction fees. The specific\n     fee structure is provided based on the Taler protocol and should\n     be shown to you when you withdraw electronic coins using a Taler\n     Wallet. You agree and understand that the Taler protocol allows\n     for the fee structure to change.\n\n   * You agree to not intentionally overwhelm our systems with\n     requests and follow responsible disclosure if you find security\n     issues in our services.\n\n   * We cannot be held accountable for our Services not being\n     available due to any circumstances. If we modify or terminate our\n     services, we may give you the opportunity to recover your funds.\n     However, given the experimental state of the Services today, this\n     may not be possible. You are strongly advised to limit your use\n     of the Service to small-scale experiments expecting total loss of\n     all funds.\n\nThese terms outline approved uses of our Services. The Services and\nthese Terms are still at an experimental stage. If you have any\nquestions or comments related to this Agreement, please send us a\nmessage to ice@bfh.ch. If you do not agree to this Agreement, you must\nnot use our Services.\n\n\nHow you accept this policy\n==========================\n\nBy sending funds to us (to top-up your Taler Wallet), you acknowledge\nthat you have read, understood, and agreed to these Terms. We reserve\nthe right to change these Terms at any time. If you disagree with the\nchange, we may in the future offer you with an easy option to recover\nyour unspent funds. However, in the current experimental period you\nacknowledge that this feature is not yet available, resulting in your\nfunds being lost unless you accept the new Terms. If you continue to\nuse our Services other than to recover your unspent funds, your\ncontinued use of our Services following any such change will signify\nyour acceptance to be bound by the then current Terms. Please check\nthe effective date above to determine if there have been any changes\nsince you have last reviewed these Terms.\n\n\nServices\n========\n\nWe will try to transfer funds that we receive from users to any legal\nrecipient to the best of our ability and within the limitations of the\nlaw. However, the Services offered today are highly experimental and\nthe set of recipients of funds is severely restricted.  The Taler\nWallet can be loaded by exchanging fiat or cryptocurrencies against\nelectronic coins. We are providing this exchange service. Once your\nTaler Wallet is loaded with electronic coins they can be spent for\npurchases if the seller is accepting Taler as a means of payment. We\nare not guaranteeing that any seller is accepting Taler at all or a\nparticular seller.  The seller or recipient of deposits of electronic\ncoins must specify the target account, as per the design of the Taler\nprotocol. They are responsible for following the protocol and\nspecifying the correct bank account, and are solely liable for any\nlosses that may arise from specifying the wrong account. We may allow\nthe government to link wire transfers to the underlying contract hash.\nIt is the responsibility of recipients to preserve the full contracts\nand to pay whatever taxes and charges may be applicable. Technical\nissues may lead to situations where we are unable to make transfers at\nall or lead to incorrect transfers that cannot be reversed. We may\nrefuse to execute transfers if the transfers are prohibited by a\ncompetent legal authority and we are ordered to do so.\n\nWhen using our Services, you agree to not take any action that\nintentionally imposes an unreasonable load on our infrastructure. If\nyou find security problems in our Services, you agree to first report\nthem to security@taler-systems.com and grant us the right to publish\nyour report. We warrant that we will ourselves publicly disclose any\nissues reported within 3 months, and that we will not prosecute anyone\nreporting security issues if they did not exploit the issue beyond a\nproof-of-concept, and followed the above responsible disclosure\npractice.\n\n\nFees\n====\n\nYou agree to pay the fees for exchanges and withdrawals completed via\nthe Taler Wallet ("Fees") as defined by us, which we may change from\ntime to time. With the exception of wire transfer fees, Taler\ntransaction fees are set for any electronic coin at the time of\nwithdrawal and fixed throughout the validity period of the respective\nelectronic coin. Your wallet should obtain and display applicable fees\nwhen withdrawing funds. Fees for coins obtained as change may differ\nfrom the fees applicable to the original coin. Wire transfer fees that\nare independent from electronic coins may change annually.  You\nauthorize us to charge or deduct applicable fees owed in connection\nwith deposits, exchanges and withdrawals following the rules of the\nTaler protocol. We reserve the right to provide different types of\nrewards to users either in the form of discount for our Services or in\nany other form at our discretion and without prior notice to you.\n\n\nEligibility and Financial self-responsibility\n=============================================\n\nTo be eligible to use our Services, you must be able to form legally\nbinding contracts or have the permission of your legal guardian. By\nusing our Services, you represent and warrant that you meet all\neligibility requirements that we outline in these Terms.\n\nYou will be responsible for maintaining the availability, integrity\nand confidentiality of the data stored in your wallet. When you setup\na Taler Wallet, you are strongly advised to follow the precautionary\nmeasures offered by the software to minimize the chances to losse\naccess to or control over your Wallet data. We will not be liable for\nany loss or damage arising from your failure to comply with this\nparagraph.\n\n\nCopyrights and trademarks\n=========================\n\nThe Taler Wallet is released under the terms of the GNU General Public\nLicense (GNU GPL). You have the right to access, use, and share the\nTaler Wallet, in modified or unmodified form. However, the GPL is a\nstrong copyleft license, which means that any derivative works must be\ndistributed under the same license terms as the original software. If\nyou have any questions, you should review the GNU GPL’s full terms and\nconditions at https://www.gnu.org/licenses/gpl-3.0.en.html.  “Taler”\nitself is a trademark of Taler Systems SA. You are welcome to use the\nname in relation to processing payments using the Taler protocol,\nassuming your use is compatible with an official release from the GNU\nProject that is not older than two years.\n\n\nLimitation of liability & disclaimer of warranties\n==================================================\n\nYou understand and agree that we have no control over, and no duty to\ntake any action regarding: Failures, disruptions, errors, or delays in\nprocessing that you may experience while using our Services; The risk\nof failure of hardware, software, and Internet connections; The risk\nof malicious software being introduced or found in the software\nunderlying the Taler Wallet; The risk that third parties may obtain\nunauthorized access to information stored within your Taler Wallet,\nincluding, but not limited to your Taler Wallet coins or backup\nencryption keys.  You release us from all liability related to any\nlosses, damages, or claims arising from:\n\n1. user error such as forgotten passwords, incorrectly constructed\n   transactions;\n\n2. server failure or data loss;\n\n3. unauthorized access to the Taler Wallet application;\n\n4. bugs or other errors in the Taler Wallet software; and\n\n5. any unauthorized third party activities, including, but not limited\n   to, the use of viruses, phishing, brute forcing, or other means of\n   attack against the Taler Wallet. We make no representations\n   concerning any Third Party Content contained in or accessed through\n   our Services.\n\nAny other terms, conditions, warranties, or representations associated\nwith such content, are solely between you and such organizations\nand/or individuals.\n\nTo the fullest extent permitted by applicable law, in no event will we\nor any of our officers, directors, representatives, agents, servants,\ncounsel, employees, consultants, lawyers, and other personnel\nauthorized to act, acting, or purporting to act on our behalf\n(collectively the “Taler Parties”) be liable to you under contract,\ntort, strict liability, negligence, or any other legal or equitable\ntheory, for:\n\n1. any lost profits, data loss, cost of procurement of substitute\n   goods or services, or direct, indirect, incidental, special,\n   punitive, compensatory, or consequential damages of any kind\n   whatsoever resulting from:\n\n   1. your use of, or conduct in connection with, our services;\n\n   2. any unauthorized use of your wallet and/or private key due to\n      your failure to maintain the confidentiality of your wallet;\n\n   3. any interruption or cessation of transmission to or from the\n      services; or\n\n   4. any bugs, viruses, trojan horses, or the like that are found in\n      the Taler Wallet software or that may be transmitted to or\n      through our services by any third party (regardless of the\n      source of origination), or\n\n2. any direct damages.\n\nThese limitations apply regardless of legal theory, whether based on\ntort, strict liability, breach of contract, breach of warranty, or any\nother legal theory, and whether or not we were advised of the\npossibility of such damages. Some jurisdictions do not allow the\nexclusion or limitation of liability for consequential or incidental\ndamages, so the above limitation may not apply to you.\n\nOur services are provided "as is" and without warranty of any kind. To\nthe maximum extent permitted by law, we disclaim all representations\nand warranties, express or implied, relating to the services and\nunderlying software or any content on the services, whether provided\nor owned by us or by any third party, including without limitation,\nwarranties of merchantability, fitness for a particular purpose,\ntitle, non-infringement, freedom from computer virus, and any implied\nwarranties arising from course of dealing, course of performance, or\nusage in trade, all of which are expressly disclaimed. In addition, we\ndo not represent or warrant that the content accessible via the\nservices is accurate, complete, available, current, free of viruses or\nother harmful components, or that the results of using the services\nwill meet your requirements. Some states do not allow the disclaimer\nof implied warranties, so the foregoing disclaimers may not apply to\nyou. This paragraph gives you specific legal rights and you may also\nhave other legal rights that vary from state to state.\n\n\nIndemnity and Time limitation on claims and Termination\n=======================================================\n\nTo the extent permitted by applicable law, you agree to defend,\nindemnify, and hold harmless the Taler Parties from and against any\nand all claims, damages, obligations, losses, liabilities, costs or\ndebt, and expenses (including, but not limited to, attorney’s fees)\narising from: (a) your use of and access to the Services; (b) any\nfeedback or submissions you provide to us concerning the Taler Wallet;\n(c) your violation of any term of this Agreement; or (d) your\nviolation of any law, rule, or regulation, or the rights of any third\nparty.\n\nYou agree that any claim you may have arising out of or related to\nyour relationship with us must be filed within one year after such\nclaim arises, otherwise, your claim in permanently barred.\n\nIn the event of termination concerning your use of our Services, your\nobligations under this Agreement will still continue.\n\n\nDiscontinuance of services and Force majeure\n============================================\n\nWe may, in our sole discretion and without cost to you, with or\nwithout prior notice, and at any time, modify or discontinue,\ntemporarily or permanently, any portion of our Services. We will use\nthe Taler protocol’s provisions to notify Wallets if our Services are\nto be discontinued. It is your responsibility to ensure that the Taler\nWallet is online at least once every three months to observe these\nnotifications. We shall not be held responsible or liable for any loss\nof funds in the event that we discontinue or depreciate the Services\nand your Taler Wallet fails to transfer out the coins within a three\nmonths notification period.\n\nWe shall not be held liable for any delays, failure in performance, or\ninterruptions of service which result directly or indirectly from any\ncause or condition beyond our reasonable control, including but not\nlimited to: any delay or failure due to any act of God, act of civil\nor military authorities, act of terrorism, civil disturbance, war,\nstrike or other labor dispute, fire, interruption in\ntelecommunications or Internet services or network provider services,\nfailure of equipment and/or software, other catastrophe, or any other\noccurrence which is beyond our reasonable control and shall not affect\nthe validity and enforceability of any remaining provisions.\n\n\nGoverning law, Waivers, Severability and Assignment\n===================================================\n\nNo matter where you’re located, the laws of Switzerland will govern\nthese Terms. If any provisions of these Terms are inconsistent with\nany applicable law, those provisions will be superseded or modified\nonly to the extent such provisions are inconsistent. The parties agree\nto submit to the ordinary courts in Bern, Switzerland for exclusive\njurisdiction of any dispute arising out of or related to your use of\nthe Services or your breach of these Terms.\n\nOur failure to exercise or delay in exercising any right, power, or\nprivilege under this Agreement shall not operate as a waiver; nor\nshall any single or partial exercise of any right, power, or privilege\npreclude any other or further exercise thereof.\n\nYou agree that we may assign any of our rights and/or transfer, sub-\ncontract, or delegate any of our obligations under these Terms.\n\nIf it turns out that any part of this Agreement is invalid, void, or\nfor any reason unenforceable, that term will be deemed severable and\nlimited or eliminated to the minimum extent necessary.\n\nThis Agreement sets forth the entire understanding and agreement as to\nthe subject matter hereof and supersedes any and all prior\ndiscussions, agreements, and understandings of any kind (including,\nwithout limitation, any prior versions of this Agreement) and every\nnature between us. Except as provided for above, any modification to\nthis Agreement must be in writing and must be signed by both parties.\n\n\nQuestions or comments\n=====================\n\nWe welcome comments, questions, concerns, or suggestions. Please send\nus a message on our contact page at legal@taler-systems.com.\n',
    },
    paytoUris: ["payto://bitcoin/bc1q2u448s4zay6u6l4vucaye4l75vwzd629hhu5qx"],
    auditors: [],
    wireInfo: {
      accounts: [
        {
          payto_uri:
            "payto://bitcoin/bc1q2u448s4zay6u6l4vucaye4l75vwzd629hhu5qx",
          master_sig:
            "KQEGHATMDQ0400PJ03HB2CRCS6BDG5ZAP54642ZBNZG8GBJVHQ50QGQJRMY9R42QCF03DTXJWK1QWQVVYCSHAYEXA9BWFEB5P93NP0R",
        },
      ],
      feesForType: {
        bitcoin: [
          {
            closingFee: {
              currency: "BITCOINBTC",
              fraction: 30000,
              value: 0,
            },
            endStamp: {
              t_s: 1672531200,
            },
            sig: "4DEZCA5TD6QGHMXQN5QX9SX328ZJP6W4Z3AH7JQ6VK9RY4C27RQ7KRAERTVA3C9GX51XVG5F3Q1GM9E3KBBAAAX451SS3JS588ZAY10",
            startStamp: {
              t_s: 1640995200,
            },
            wireFee: {
              currency: "BITCOINBTC",
              fraction: 20010,
              value: 0,
            },
            wadFee: {
              currency: "BITCOINBTC",
              fraction: 0,
              value: 1,
            },
          },
          {
            closingFee: {
              currency: "BITCOINBTC",
              fraction: 30000,
              value: 0,
            },
            endStamp: {
              t_s: 1704067200,
            },
            sig: "7YPEYGW952GV1PQKKAXJD162Z5GZ1KGSDJWD17DPRKQ72VWFMAKF9W8A6EFGH8MQG6TKEW3F2BSPAP0YPE26RE458RK0FYYRMGFVC38",
            startStamp: {
              t_s: 1672531200,
            },
            wireFee: {
              currency: "BITCOINBTC",
              fraction: 20010,
              value: 0,
            },
            wadFee: {
              currency: "BITCOINBTC",
              fraction: 0,
              value: 1,
            },
          },
        ],
      },
    },
    denominations: [
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XXA12JYJK2JBJM2VRMTT16GPE180NNE7H7HKVPCMYEKPR24P6X52WANBAJHMPM97THM4EQ3F0AYTTWENWWRA4HMTQ3V0H8XKCMKRC27Z7AD4WNVEYA0EYPET0VWYWCNJV5VTVJ9AJ6JC9KG9PQQ26MBTSZTKVAMBV6EDMJJM7G4SB9M1YXH2JM4SJH7TRXAKMR41N7ZRTBSFX5PYMYZAB3574N30S5WTHASSGBRYEBD46M20YKQZ53H9Q1BERY4KBNJ0MMJ0396SW2JW9HR1RPGF03XDW1R9TZBRD270F7RQTB4KR24PJHQANQMR6HYG8KE70YJ0P36K9VH3GTWK95NTK08126BFCA1EM9RFV4AJPQAJ1FNDDJ7RG9FQYJMDRB33K5TNJ1VGSJXVDSWE6VGZSX04002",
          age_mask: 0,
        },
        denomPubHash:
          "02YJHRRW4RXEP2RDWV3KH9DVJQYPJMQ2G33VD95H3M9NQ926D57Q6F0JHS3ARSRWBBHC6F4CB7NEM61WJS6GRDGFP9PDPKZ52EABF88",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 2,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 3,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 4,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "2W5E32M036ZNX1QE52SRSKDHDY6YHAJ5FZEFVDZ3PZRGQ85XYHJ9PNN6HDENMN5Z5X03AKQV4MK2FMGMKNJ65VWAE1XKKZY72YKYJ18",
        stampExpireDeposit: {
          t_s: 1691858048,
        },
        stampExpireLegal: {
          t_s: 1754930048,
        },
        stampExpireWithdraw: {
          t_s: 1676306048,
        },
        stampStart: {
          t_s: 1668530048,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 128,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000Y1HW2F7YXKQ7WRER1XTKS9QFXEAZ71H3SEARW21D993Z7JV344EB1QHP78QAYBJ1HK64G3BDYYP0TAEVH9D7YXC6DX3DJV2KGMTF2Q0GBCVAZ1PAKJEEF1MAP93WSBW5E31G2QMGY7PF9FRH7A7AR0GP3ZVNTJX8GMVHPFA0ZH3JKJZPDWZC3BF5T9VR277QXZFQCJWCY9NERBPR1B15C8QDA2PBS2KJV9XZ1WSKNRS0P0VED47MXD60VRS5H27SXFJ7RC515BKQ491AEQ38FV2RS5Q8FKSJTJHP08M63QFVQCF1R9T2BPFMQFZP05MRGYWK2XW2RF9A6917JEGQH8FKSXTD21RY314GGRTFFZF1KR79ZDW72RBENM3RY6B1EQKSYWZA1Z0RYWVDXZGB0R4ME904002",
          age_mask: 0,
        },
        denomPubHash:
          "0H42MY3CCB516DMXHYYWE6225A580W2HV8WV7CE06BCJX92RVDJFN27ARYJN9PX48QHJ4MNS0ANC5FB6TE7HGHDBW89FNVG51SGXYV8",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 2,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "DHNX9CEMCS4DMA3R2H1PYHTGGRCBS7ZZ52K2G6VDP47H7JHRRZXR0BNE907SYN717PGQNVBND6AE6HMXA4310BNKZ4VQ7RP1S8CT020",
        stampExpireDeposit: {
          t_s: 1691858048,
        },
        stampExpireLegal: {
          t_s: 1754930048,
        },
        stampExpireWithdraw: {
          t_s: 1676306048,
        },
        stampStart: {
          t_s: 1668530048,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 1048576,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000WPR1A5WK48FYTQFN3KQZZ5JB0ABH1NTSYCAG41E8QN79H7FSSETS6SC4STE21HV1MC31JCEEQQT4PM01GQ5B8JK4XGHFG6KHD5NRW0WNP8DJSM34BHMTGX0G1YFJRKNT2SPJSVMC8YZM1XB26M851SZP4N9CSVCNWR0GXXHFF87XKRA2CRG9Y3DXT4XAA07QWM69DGD97898R7EKXEFAT0Q7X840N15BS203R7AYAJFGEPXADYTSV2CBRADGC2TA6Q1QWJ7BZZT4Y3WRGNCTZT3Y0EX7BYDTAK8TZ8A46P2JVHSQ2NQ7CBEHPV4HM9CNNWR2BFW2JJTTCBRXNXT53F4EKJ222SZPRGNHRYVYBEB21JW21RNE01Q55492CBGVJGGKZC12SWBT06DWTFK1JPEGBN04002",
          age_mask: 0,
        },
        denomPubHash:
          "1A1JE5A239TJC5SSDR1RJ8R0R38GJTDFEMFC8XF6T8VZ235Z1M723YW17MXGN5CMDQRS5EKYSC2EY503GW2J3QDFQXQTP7R47ZD26SR",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "6JB7K5DPASWST0NA9R1H6W2MZ3XCZZDBSZEQFVR17RMMY3C43P5W03JBD65PVR2XKH0S25M6BGDFV6GPRFCEFX4YW6V2Y7X6SFNSP0R",
        stampExpireDeposit: {
          t_s: 1684082348,
        },
        stampExpireLegal: {
          t_s: 1747154348,
        },
        stampExpireWithdraw: {
          t_s: 1668530348,
        },
        stampStart: {
          t_s: 1660754348,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 16386,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000X320J31F7AP98VENBXSARB07ANWMB3BC18HGS91F4KZ4K9RE39WSMGN7RKA34WH5Y1GDW6VN6F92DY1Y11CYHD0NVKQNVXWR44SFGKKBE3P21APW30B5E79JHXKWS7DBDF3X590YS417HEK2NKGTCTY2D8AND7QT8C6G1DQ5MW6Z8365YFA1N6SR6VBFR2NYJ1GAXMCKPDBKK3VQ0HBS33ABZX14NFWC8AJW4QVGBTAG7QCMXKMST04BA48ECNH4TR8XHJ1X8T336ZV30FMBTBTWM2CC5529R8HY3SF47KT8CSQ0RP6228DZWMQ9T7BD47C195CSQ49YWDPV2Q8TFY04RAPXN93W7DA599ABSHGGD7TPQZM96EYV0JC2KZAVGCA2GQWT2NRZ5JKY763W68WNJF04002",
          age_mask: 0,
        },
        denomPubHash:
          "1FFHCV2PTZ7NDXMA5JAA3ZGB9VPE33MSJCK3NH9W2JC26FSM6QEGQK7ZVFTHDJN41AE0C4SX3GY1P0XGPZ9QA621HXY7GSDB13ZYH60",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "TPMNFXB6D0ZWHG9K2CPEH5VM0KQFRWPFC21P0H6RHJVCSYCPBZ31C5CHKAHE37R0QCKRQMG82XZ457WPT7B9D6F9RVG6FR86KRENM30",
        stampExpireDeposit: {
          t_s: 1699633748,
        },
        stampExpireLegal: {
          t_s: 1762705748,
        },
        stampExpireWithdraw: {
          t_s: 1684081748,
        },
        stampStart: {
          t_s: 1676305748,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 4,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000Y7ENWVKA8ST5K2F2T7ATPA3J1E8V9EWQMK080M0M6WCVSHMQ0GWPXT9XVQ6TMGW3886YRNQP58Z40747GAYRFMJT4GYSH1A7JTH1XDADQZXFRD050GESX6NK57DM1FNPY4C7PXRRQPGSMXS8KZR613SJYSRV6FB3GYM0H3WC1AR2DWJFQT9CTWNSP49PB8A9655YSN1E07XFEMKWGEN5DARJJ499AX5GR4Y3QQEMGZ8J3Y9AV6PG76QFTSJFYWS9JRRMGXFFCZ7TEYB6EYBMMX20E1W38HYR15QVGXY8PCDFCXGDRFRZ8CQMFCHPQ0YDKGW7K4HZV6EBYXEYV28FQ67W5JMHVPJ1ZT10M8571JVBCNJBQWRXPG1ZYWATPAAHB2GRYEP540Z65WHFPYY88RXR2D04002",
          age_mask: 0,
        },
        denomPubHash:
          "1NKJ2NP62QKAYWDNFM00MGXQ5750VV2541T2P2YX1EKMZCP30N5H18TTFC43MFRN9CSDMPR6M59Q4059WAJMEA8CZ6T73JFB4DVV7MG",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "9K335SE0G1Z8NYB91XHMG1614W5S1XT54CT940DVT8DP50433QRFETSPEP7F79PNN8YQHQJARJX3T4PBQEGDDWFS8QNVXDXQ8VS7M1R",
        stampExpireDeposit: {
          t_s: 1684082348,
        },
        stampExpireLegal: {
          t_s: 1747154348,
        },
        stampExpireWithdraw: {
          t_s: 1668530348,
        },
        stampStart: {
          t_s: 1660754348,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 131072,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XQ9SC8TGJR506DQCPFWCYSAY34H25YEX40PAPWGY4Z82MTJY1XX0EANYQX069TJRPVXVEW7WV2Y3DDYC02W1W0T3CX6Z94S28N8YR74NY907V8E9024BW5GS56GMB3YYCSGQVNN9HEB4AJZRNX6CA5ZF95TZSBWRFWATVASBCBME34MWD7F2GT3TAETRX1CM058YY7FA6FXZ2ZM39503BCE2Y5XEG14RE5QRN7JG39RE4ABF8PWXGMAYTC225K3REW77Q3NYR3J2QNSKMYK915V7M6SB5ETNF6Q0JV9326GVZAR57FRTFC8JTT6G9BT7EMHA8VXTXBRHMDTKAZGBFQ7BSFYT9S7M6HX9TENH8JV25CSXYCEX02G27KTT09VZJ16M7ECDPCSHCBF88GFF4AEE2D04002",
          age_mask: 0,
        },
        denomPubHash:
          "1XZV3WDN03R343D4M9AEBDZBQ5ZWCWK8FTRZTVBBSYKVG5MH1M4KZ3E4H3YA1R6VA1Y6RBJERF1WPP0TT4VS15Y2EF5MTKD4RR89ZS8",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "WHP0GFT1T7PHBMS29XGZSDGVXFM786H8682WVZTS3WABANAZCYD287J7YKSJFVTXRNDX3BXXRK1P01S12Y77QW84B0C3B6V2MFEG828",
        stampExpireDeposit: {
          t_s: 1676306648,
        },
        stampExpireLegal: {
          t_s: 1739378648,
        },
        stampExpireWithdraw: {
          t_s: 1660754648,
        },
        stampStart: {
          t_s: 1652978648,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 131072,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000WTBZZFDBBS30G6GDBYGJ352KW1V44RJ5QJSTZP014WJMHXAC829WFE2RE2A7QVSXRZ9YKRCH62Y7VAK5YYCQXAZRFEYTMWMBMXHWSWCK0JA3388GPPHB5DW7C7Y4JEV189YHACXKBSWG6B872E2NEWN6DYK5TRR0H1TKBBSGZ5FWYDAQMZD03M5PH1AJ01BKECBN07E5WZPG2BYM8NK3DB3B7EQYB2960G72QCMSV02M5CRB3RXDZKXB6A4MRA1GQ5EYZC5E56YGHA2JZVZVD4F966763QNA7A8XAZ556JD475W3MQR3AWVTGJDVEMBNXYE3XSW5J2WZR83BS0F9Z9TXT7QH7ZFQPECV6SS2SFFW2DAWK5N1CKVJJK63F5FFYQPZYXC9D5SFD084Z67W2MGPKF04002",
          age_mask: 0,
        },
        denomPubHash:
          "2PHDMTG81MC7ADG2336ESZYMDNBWNCSJS109ARV7VKH2ZS36RVAZZ53FQEHQ1CJ1TGTY2V21X5Q48MFK91V3WCZ5K7MRAWFY6Z8VB18",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "86NQZPTV2YZ6GZ4QB368RXM50MSBSQ7CXQQPJN1EA5PVMVXKWXJT5HJAXWFPRACHFP9WEAM49W5YV1S2R5C1QRX8WQ25V3TK21KMR0R",
        stampExpireDeposit: {
          t_s: 1684082348,
        },
        stampExpireLegal: {
          t_s: 1747154348,
        },
        stampExpireWithdraw: {
          t_s: 1668530348,
        },
        stampStart: {
          t_s: 1660754348,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 524288,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000Y75N9KDEBK0NEK2MPEJSNMAYSM802PESEJ3JKQKQCR1MX228V8NZ9W5QPTKKZKQQQHRAXJZ7CXK6XCFQX8NB1ZPYS36GD8Q37K7GHEVYWDBY7FYW5WRTF34FH7QX11N34VV7K7YD2ZQA2A1KPF3DKW5AF405Z8WN5SPB5A7XMNNZN819XXFRY0PK1ZZ8FVEQF7C8E9PHK01DDTKNBGY77G48HBN33JAMBEQ64JESJHPV7C87MF97BHQG3MYY97HN7R6GF5ZWRZ0G4Y03R2JEW3E33Q0488STPCEXR0ZD8ZZGPCAG1XH3FTAHMGXHH76AKFD638X7V3KKAXNNPD8VBRDPG81RNTRPT3WJXQZ7VQ3FPJY2B5AKK9X265TH45XZ065WVR8NBEGG9HJQ9XD3WHWERD04002",
          age_mask: 0,
        },
        denomPubHash:
          "33F49ES5CFMH8TQCFVZ75G3TB9XDXQ1R7ZBWBV0EEG3M0QMQ28ESFG05A4DMF6W9GS9PGM7XASS6BTH5JG53S4T57MZHP6DQWH66RV0",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "BV3SB05ZQ7YCFZ85V16CFT31P9G2FTQY84AWMF3XYDB2YRP1T5TZZHTQYTMWWNPVKC8J9D3BGPC0YR3T7ZG2K66S10V9428834GZ208",
        stampExpireDeposit: {
          t_s: 1684082348,
        },
        stampExpireLegal: {
          t_s: 1747154348,
        },
        stampExpireWithdraw: {
          t_s: 1668530348,
        },
        stampStart: {
          t_s: 1660754348,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000YBYY5T4KM7GXX6CACF02F8ZE8NE11HCYQY1CERFABAXE8ZXZTV338D76ETEFTFAD5ANMGNST2DZERK8MMS5FVE89ACGHG2EMJJT18E1PVB2W8HSWV9F3F9W56DFH9BV155E2358VGEN5WN0WFGZCY9P7EVZR30F9GTBS2TW9EGRWQRXYS433MJ2F83B2ZSV30N08AJC9DZR5F91939SPK19WQEPBWJB00QF55ER5ZK6Y4382F0TETVD0J5AKEVRS1511ZW004QES3AYYPFTJVTEZE45B95WSR25ZF5CB4VN2NMCYBCK17539H07J95X4AQ8BNVCGKY0K7FD0VTA1W15QXGP8MWQFWGA5H8P7FYJR8H1V5HS58KXKZYTNW3NNX5XXGRDVFBP7D13KX4J4VF352304002",
          age_mask: 0,
        },
        denomPubHash:
          "38ZJ5A2JQ18F6AZNXY29GYFK9XZC4QXHJ8BHZ07S118W3VME4XH1RHJQTS2PRASDRX6S5P4TN29R73FG8FP5SVNVP8F6DDWT2PK8F50",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "91S0VKJVAZ8K169988Y9HWDJMC4N6E7WXMR3XKF55QF6J7V1MTYRQB36YRDHKGEY4KYJ3D4KNEK45D051FFXN3AFJD7N8A4ZYSX4808",
        stampExpireDeposit: {
          t_s: 1676306648,
        },
        stampExpireLegal: {
          t_s: 1739378648,
        },
        stampExpireWithdraw: {
          t_s: 1660754648,
        },
        stampStart: {
          t_s: 1652978648,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 1048576,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000YN6C8EMT56VZ79KGHRMT0DYCNCNAJ6T9XFZEBQA0C8JHN4KKTKJFX6TQQT73KKVSE86PE4KCFZF1X1DEMJQ08Q3M93M37NZQX9MFRQPN0AX3SGGP653HCS9QK16T4DTDDCY4B3C4PCJFA6BXM928WEHWYXA40EP0P54D1JGCHRVKXWT7ESDE6SKJPWR2VBRBHZZ1DPMPAV8T482Q2DMTV77YR0F55V1CD7MXMQ9AEYMN2XMQEA8YKQBMA3GTZFREQR35TAXMCV81MC41S4TTVEKW6WWM7SRQZ4DK7QAPMHQXVDYFV760E183MZPC8G9XAZ17J07W89A2DNSPNSS99B6Z4032Z5MKP7HV9591Y49CD6JJ27R6SZA59XN009B4BZF6DCAXEAV9BZFMRP6J53REB104002",
          age_mask: 0,
        },
        denomPubHash:
          "3KJMR4DK6NRE1Q0E9Q88J6P0F5KH5HRC58WDM444ES5CXHXDWACYE5SN3NVM8A6790BK38YER8S2E8M63CYS84YT382MK3H132AFY98",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "RBYNV0Z25GXK0N1WGPPEBN9V91DYBJR0YNQGC1T3K7TPMRSHR8QDZ2QQRVB8PBJHS4NM3AHTECAXATFJRX2M1GEEEAX4RSPM8RC6P2G",
        stampExpireDeposit: {
          t_s: 1691858048,
        },
        stampExpireLegal: {
          t_s: 1754930048,
        },
        stampExpireWithdraw: {
          t_s: 1676306048,
        },
        stampStart: {
          t_s: 1668530048,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 4,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000YR7Z6DGTZXP3PT9TFVDYZBSXJ4M8RGV69TZSS4C2SJ5TZF48Y96BKMKWM4S8X7025EQK4NTGX20J2R3XV2A4ZME70W1C6QD82X8NJ7VKZ8X19M3VRMSBX165JCXG6XEMA4Q7XR8DE4NSVZKK091XSYHE2P9B94YDKVFBKKP8JPG44K00939XVFT3FGKVRDC9JD4VPQVFVPH3SMW5MF9RYNJ9Z69WJM7N1CZNFKMBYHR67RGPKXBHPBVNSS9XW755VJ5G53AT17QBD3CYD49FR9KG3N1GCTRJ272EGBN0B75A3Y8VT2PAB20HM4FNCH9ZQ9C269JD33C96DJ3QCEBE5KM6BW4MPTPDYG7AV7TTNX69N3HCEN4Y4YA9MXX3HQJPW8528M4GR1KW69V80DMG15RD504002",
          age_mask: 0,
        },
        denomPubHash:
          "42G0MVK452MX3KWX9W5FVYEJBREAMJ2HQMGR3QXDKS07G3D99ETGYDK9VWYXJ1R9QXGB7JSP641NZP2EHYCWQ9YK7467SMWDFQHH7S8",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "V76AXMV8J8SREBSF304V280PPS4KRBKSGQ03ESSDAWQG58NAW1AC1K07E4FSWF999RW544D1GQBH7NG5G6HXZNSX6TEGA04B5M3YG0R",
        stampExpireDeposit: {
          t_s: 1691858048,
        },
        stampExpireLegal: {
          t_s: 1754930048,
        },
        stampExpireWithdraw: {
          t_s: 1676306048,
        },
        stampStart: {
          t_s: 1668530048,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 64,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000YDAKRSGYJXB72G4303X8PJY94FHDY9P4E200Q4JEF0XTBYZH4Q2WSCC11B9FFC1J48YVASXNS3GQ1CS7WC2HR79EBCMPVG6A9VMM6B2T2D2RCKX1ZFS80VKVGX7CCKMRKKYWNF59JJVGC3M1VJ61QDM99FGDDE3FPC68ECDE659Z8V4QMPSEPBZYR87C0FSNC2ZPQ5VK1BEPY6WCNVD57VBV5Q67HW6YZ6CHQW7YV60F1VX93P8VCWBFFADN8SJBTKPH578VV2680B2EBFSY7XRWEC7G2RS2G10H517ZTEHYG8VNRF25C8D2478D98YN37E0PR2SSHZYDPZ8C4ZPSVQ4H95ZRT8D2HCQJ7DCYFJ117TX0FJ1GW422TSQ3SQTWD38BJHW5RP0GHRN1VVTMFMS3K04002",
          age_mask: 0,
        },
        denomPubHash:
          "49ACHG2PZWCQ4A9SD13SNTCWAFT6JNT61X4RQFYBCTMNRCHAKRSMBX713VHEZPSGJAHETBH6MS4DG28RS1M2VDCQ9KXKEJ6SKC812T8",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 3,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "4ZZ1HSWQ777BW7YQXKMHXB0AQYHNSW0S8DTC7N784HFS3CVYA9M9YH5SEW39AYBYM4CVW6VHJY54R339RHV0NH3ZDVVNMR62XPSVR00",
        stampExpireDeposit: {
          t_s: 1691858048,
        },
        stampExpireLegal: {
          t_s: 1754930048,
        },
        stampExpireWithdraw: {
          t_s: 1676306048,
        },
        stampStart: {
          t_s: 1668530048,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 1024,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000X8ZNQXV1XQSY8KG2MQ68PQE5RHJJZB1T8XF3CZG9P2QAMYGA9FS1BC3WAEC7EBPKNXBTQC53HWVY2NVPYZY0VH8HWR8TD56ZX7YA3JVZBQGJEP7Z6SM6E3P2YF4PCSF8FCCPWF500219XHH16CFSBT4PPJE8N93Y0999GB3F0SZ9H7AA5EDE0V6R496GC35X83ZNEZJDBQF13G26B6C2TB943JJKP15QBH6XCN3Q8Z2Y5AEPENTK0J2S572FYCCTP78M1XRBZP10MQXF3KZQ48GZN3HMCAZ2DGMF81P48CJ804V27SKN7JR5FJVDG7V1KD4VZEHTJS8AQ1DN9QMB559W19T1F82SEDQXT0N4G0AVBWH4TS51JQFBV73G4DXXGDNQM4M0GZXHGSKM30S2RKD3YD04002",
          age_mask: 0,
        },
        denomPubHash:
          "4AKZ10GPNRNJ728AN25AD4161060S89S91T6YXSZATQ9GMKCGJ5DTBBT2AD18XHVSZ062EME6Y43GS9BTN4W2QFVN7KEGKSXTW760A8",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "3KZ033DPBYPRAHDW73WCY8BWK5EVZJ2W9TMARRZ65DKZB8544RW8407TT6SX21WR7HR6SW31B2NQGG75RSF4G8Q653MZSYVG5FZ9C20",
        stampExpireDeposit: {
          t_s: 1707409448,
        },
        stampExpireLegal: {
          t_s: 1770481448,
        },
        stampExpireWithdraw: {
          t_s: 1691857448,
        },
        stampStart: {
          t_s: 1684081448,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 65536,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000YC6G2B00FFEP8QDQMHNQWNKWT80ANKWSCJD63NKBTQ80X9NNAXKTS87D6NXT6NABTHV69VK2GQHCPCYAQZ6MYEGET6E7GDK2N9YEXC81SKJD71RN5EHX4Q44M4989ACSEF6H872JSAPKFR7DV8YBB50BYPTBJ0N9QX9MZG74JBE85XFBN55WFQJ9FPGEDZ82SCH6S6AMQ4F14FFTRAB5C9M5C70GXPQCS957KYP12S7CARW1MTFHEKA9EC3MDSWXWK2ZAZEZGYTRQEG43V4NBA42GNY7W83CNB7CQ8S182J1BJC9KDVQHE04RN8M784FN0JCDAJ4EXDFMMNCDGN1QSPS8TM4HFKZKRHX4TDP9EWVJ65AJSPGZ78FTJM6GGGSW095QDX9MXQW6FW6A24QBWTEYX04002",
          age_mask: 0,
        },
        denomPubHash:
          "4AY807RS1X16SYPEKZ1ZH1450Q5JBVVK9XHBVBSDX9K04Z0M5KBPD4EDHJM9SQYEMMYS4FFZCK63J440TXSJ3Y95GSVPS6Y4E4HSKF8",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "7VG84867XJ1267TEJ47ARDTWP65QPBTKJE89C044B8G3DS46Y87V6V7Y0KSBAR2W8X183FQ52F335GT5CGY514BKEEB8ARSCJHS7Y20",
        stampExpireDeposit: {
          t_s: 1676306648,
        },
        stampExpireLegal: {
          t_s: 1739378648,
        },
        stampExpireWithdraw: {
          t_s: 1660754648,
        },
        stampStart: {
          t_s: 1652978648,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 128,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XMHQKXSFPA03N1ZRSGS3ST63ZNNEHSGA71E7WXZ1P9KYK3B01SNDXNTNFF72QP0JKXPSD389469N3H70V0K9HGGGA0S03F59BBN5FHA0E86RJ850N4KNJV2E6S90PQ56QY6S64318N9RGXBZF3KRR159ZR0YSERFNJ9VPBD0MYGDR5YK7K0GFMYXWQZV7H4V9MK94JVCAZCQPDTV4GT7DSF1YRP75QK4B26XSGWSRN3FEQ2HS47C3F3QYQMETEHY700P59XEAYADWB37BF7V70X9ZGN0CJJQFYV4EBADSHVRQ9RNH9XMAFPVY4755HXKP9AMM7AKJ2NKZFF9Z27PTRX2CY9PHT1H7YYZ5M6APMY3FJW05F6RZ3TH24F7E93KVS989G7K0C594E82VJ4K218HKS04002",
          age_mask: 0,
        },
        denomPubHash:
          "4PSE2D4J7NCZC4SPAA93BWAWQMVE8YRM1D466K32G1MZBGGKKDFK3ADH08EYN66H8WSNE84CTS2MAS8F9JXSGMBRA479SC4TKV2VKZ8",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "WZ2BHYSF8CH8A058GS86DD9BBRX5HVKVQQQFECBCE66JRRDEBB2D732XNMHW0SXAZJE9EGW4XPN63XYRN3PGHHQBM11YCC42HGRCY3R",
        stampExpireDeposit: {
          t_s: 1707409448,
        },
        stampExpireLegal: {
          t_s: 1770481448,
        },
        stampExpireWithdraw: {
          t_s: 1691857448,
        },
        stampStart: {
          t_s: 1684081448,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 4096,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000YS1WM2RV00X5TKHT5YBAGK33TQYS3DPJCZB4363AZ92TSXWMEZ6B0FMH1950Q8MB8SW6742QDW1BP64BADCP8PKRY670ED034XACXQQCHWP8X7AMNAW8F07ZW5ZBXZQWF9RZ19CFXJHP20A25SRGX7AVW5WQR3EZDYV90NRBHSE85EDNG1MZZY3J9VBTRCMTFXWCJHS4R4K5QVSB5REJHTYRR51E6VMS9REBH18CXNV8GWZM5C895SPRDZFHDG2F4ADVSR8TYVYCJS5BWZ54BJY0K1CA998YS2GYHRR7478G7TSGNJV3K0MNQGYG4Y5738NE89TKV0M01T9GWNNHRRVZJSWRC3593HTM531FVWH59BRESJQPGSYHN69QY693MW9EADBH9732NA4DGK3RGX783S04002",
          age_mask: 0,
        },
        denomPubHash:
          "51EGPX2B16K5AH35N0FE738MRYNZHA2J4BEXC7BKEFX87QRZJQS909V5FGCXERBX74RTCS6WAFXKQPT7HEJV5P5QH3CE90ZHBCAYNN0",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "G66MN8NM14D80X2XMSKBJ1PWFHY00T8WX5JAPYDSB7ZHP4PGXKH5HY06YPZ89SAZY4XRQJCN3NDJA0QYV3WNH72G1YYSSCCVEQSV02R",
        stampExpireDeposit: {
          t_s: 1691858048,
        },
        stampExpireLegal: {
          t_s: 1754930048,
        },
        stampExpireWithdraw: {
          t_s: 1676306048,
        },
        stampStart: {
          t_s: 1668530048,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 32,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000WWMJ4A7APX8J1GGPDCFX3RWDZVP5W4480XY8K9GW7FGMH5W3X0F60BCSAFKMT1KEFVPJAKBGHF6XV5W5F3BEHFYSEQZ6GVQ992V79FY4ZHQR9NN76Y1C6PNXXQE0C82MJT3DW7RERZHHEWYGWE00E0V0MA35MGDD8K918AXKVSKKQDJ9P7G7JPGSPKBJBG6Q34C2PQGE53TVKH2GZR4QDM8FAS1X7CECSP4Z7PEWXZ5655EGRECF48PR9KE66C5XBJP90Z25RRFGE8ZA4C5JJB6PNXSFYDV4Q10VT94SY7JG3JZH15CKQFHB8X4BFDZ3H34WD7JK5WXC7YRN17WQMDSXMZV561F3E1ZSC1EN2867ZW054K4RD5THEB0DNXVNMPD8C0PVD2FRSSYZMATMT1KRYK04002",
          age_mask: 0,
        },
        denomPubHash:
          "5WMDWYV3RCHN33C0YNHC428518TCP2C9DTBDV446DV8W5C97C1JZS4G0ZRTMTK7160GSNJZAT9N1JX8KZZXFT7FFM8R3CGZE372FJ8G",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 4,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "7BYWB5HB2982K9Z8KYXD756WHTGD8ASNMM7MEKJG1RA5ARA0635TR2DPDBKAZT4RNW1P8BS8969FQAC6C3F8GWFEVTXDY2GEWSTJC0G",
        stampExpireDeposit: {
          t_s: 1707409448,
        },
        stampExpireLegal: {
          t_s: 1770481448,
        },
        stampExpireWithdraw: {
          t_s: 1691857448,
        },
        stampStart: {
          t_s: 1684081448,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 1024,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000Z9C5FKM2YRNES20BD5CQA19SMVS7JAK03PGBZXX1QHK6F729FH7JJST3JSA4BQCQFM2V106TZ1PHY3J1EV6BX1VSV29ZRWEZJXRR44MFEDVK6JVGF0WPS74Z15ET04038HDPG23XATSKHAS0V9RJ5NZ7QH2Y9S2N5T5WB0JYFY782QSE9ND9H1X6H4BJJ9QCH6M2Q79C0RPB75J8TV49JDNWCY5EE04SB1H8S3FVKY34M29VH3XP0M3S2ME8YFJQ5BKEKTBHBS0MGDNPJ8HHFPPJGWYJ8XGMEEN0WRDETB19MGATKKSG5EZ48S335C5YD1X9ZBMT6P5DS1CSJGF4N3AY0YYZ9E7S9QAY6QBRPZSN6M25FG7GDMJK3N3G0AJ3F8PF9YQGSBEC4GRXK4BDN3E11904002",
          age_mask: 0,
        },
        denomPubHash:
          "5XCSKX2PNDNJY5JAPES1FXF5VVAGBCAP48QNJ9SWWFCN0C6Q3YBPK6ZT8RSQ5GG62CN505RE1G0CHEM0Q4DW9BYGBV32Q36YEWB6CEG",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "VWAD0D88YHDYSSGVWTGNG0ZY3H2F2NRXPXHRPZRXPP10AP71NCQ80R9JGQ5FVA5N0NV8K05ZRVDAGNNY5P9JEX0GK45NXF7ZHK09R0R",
        stampExpireDeposit: {
          t_s: 1676306648,
        },
        stampExpireLegal: {
          t_s: 1739378648,
        },
        stampExpireWithdraw: {
          t_s: 1660754648,
        },
        stampStart: {
          t_s: 1652978648,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 512,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XE8VRR6Y8YQC39MNVYT5TCDH83K88SG9CASZ3B69S34ZDG4H4NZXKKSTVCVTEK257HF91J6A6KY34ST8ZH6QCCGQHEHDJPZXVMKVJD588TN1FB3HB626DM0H146C7FZ63PT2FH9TBR2VCNW17Z0YBPDDBD96K1EDH5W7XAJKH64C7K8MTFGTXWJJW2E0MS3237CTK7Q4NJNDVP1D07WY8P7XSRRC7J69SZ655VGEWATJMRE87VRRHKK9KERJ2RMQJG127RPJE1BEWDXXX5QQSJ9ZEKEW6QQ9P8C8GTHZJNP3X3YX0QHPTS18XAPCPZHWBY6HA5S57943F7JKPGY30K9P7FRP6VDNKN8X5MZSWWX06K4FQZK6542JP4AG4KDMKSZG1FXPF8YNQWG6QZFM2S4Z7S04002",
          age_mask: 0,
        },
        denomPubHash:
          "6C8M550YVAWPA5X43HZA9NJ49E9ZZQ6PPG6NSXJDYEJ55F6PG0GRRR5WVEXDMYBCNGW3E3FXKKFWP62K6D879A44EG21THPVHD50ZKG",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "G37XK59GQHC00Z4WW3Z1RWMAKBV912GWRXG6XX9DP8PA3T8B8655AYJTZAR1WA390YSCXGBMKDY5GB7C3ZBEERPKD41VV1A4TY6NT28",
        stampExpireDeposit: {
          t_s: 1684082348,
        },
        stampExpireLegal: {
          t_s: 1747154348,
        },
        stampExpireWithdraw: {
          t_s: 1668530348,
        },
        stampStart: {
          t_s: 1660754348,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 128,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000ZEETGYYX4KZEPE9D20AWY6J1VBDSE12E7RD6MM6YA66SHN574E4DH28ADTQQQSG1Y975YEJW8FKP1V58MTH5DBZVMRRDMD0YX071MSFKR97BYJ4PCJ8HDVPQ666FSG3F4K7G4X9BMY2AKG4X1FA6ZXQPSA17CCN9PNTFEZY7N9X3NZA58VHMY0KVZ7MS3H1F67RDHDQR26E4AFZYXX2S40RFPQPYWJ2XSBPB25C7BMCK0FCY1BJNH8BHJY6RRN45725C0JB3QQRYD0XY6J50V5DV84F1VFWCNW5MF9WANZ1NSVYN58YSYBMHK8FQ2R2PK8R8VT8X0WJYE8EMRCDBBVBYZJJRPHH8VPGK1NTP72V7PQ48XB85GVADQ1PSAPNTHGWCW24GYB9BFSJ3ZW34NHXYXV04002",
          age_mask: 0,
        },
        denomPubHash:
          "6FCWS9WQCM9ZKJDVP295S6K338J1P1YWAYYV58R2HYJYR4FXWZGHQJEHDRS87X8RV127SFY09FQFDBHF2XET83JSAQ9TFETM2N31QV8",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "W6S2QEVWZ9N9AQHNCSS9PPSXS51BNTKYQVFCMT5HD4AJQABKWM3EFR6YN5QCQX29YXDSGWZDXYBY6QK8HK20T0JY49CGKFMA8CDFG1R",
        stampExpireDeposit: {
          t_s: 1684082348,
        },
        stampExpireLegal: {
          t_s: 1747154348,
        },
        stampExpireWithdraw: {
          t_s: 1668530348,
        },
        stampStart: {
          t_s: 1660754348,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 512,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000Y4FPGQGNC94KA9RK82FMXNJM2SBE5ZV5KZRN90HP6T7D5GFPX2C457CA17AKPFFHFDX02R53DC8D2CJNFK5DVFMBGTGBEB9C98R5AZTE82SA8KAPS73WMYBJSK58MSV9S0J5PSGVRNJJWGSN9M9CCRCNFPX1EWY6V0P6KAAGTTAF0XYKFESSFC5P5P2ZSCRCJDJY24R2ZARWX1YNY3KXXKMFPGWE3QAQ4TSRWMJ0VD3WTCG5ZBVF2YD82MFFMD65ECDBY8GRTJ9D6GG7S8GT6MK7X1CTB8SX63FWRWJ40HY79EN3CQEW42X1EKH0442RA29V2CDK763E7Q84CCM35B25RBTTJ3KSKWR5PHBTEYVZPW53JK46BZMB0DVJ9KFKRTCS68N8GWDGFR4CAK354C4GTZ04002",
          age_mask: 0,
        },
        denomPubHash:
          "6FH03DKB4Q7HBC6QMM3AGDWN7S8GX00MHDV6PK40VEFS00KD5XVYJ7VHPRWZW41KS1E7VXWEW9PYPPWVV33BW82SH1MT35C10DSZBN0",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "YTSHPFBBXEEGJENHD5STZ0Q2HQ7CQEC9CYRAXQQKS0GX67HT4MW2S3H0BGMGH1ZBKFPSS4RZJE0T541F2BD647M8ZPVKJCGBXC6Z00G",
        stampExpireDeposit: {
          t_s: 1707409448,
        },
        stampExpireLegal: {
          t_s: 1770481448,
        },
        stampExpireWithdraw: {
          t_s: 1691857448,
        },
        stampStart: {
          t_s: 1684081448,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 16386,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XF6Z6BWWR4RDPM3E2WRNHEA8W4B2BPJDNEKKTP9QKFTPDHY2X6JV67F94CHCQD417FCPDMJFF432A90J4PTQ5PDM3YMTDFA83VVB4K60021V33Y9M0D473QT7DJ7H4ZYNMDPRBBN8F87XZQ9TDBDMRY187EWFG0YPGCWM28YNWZ984A4ZYMR2SAX7H96D517EDEPBEYNYD9N9VKVEQ6RFBMCYSES76SRQKR2V5PNPWQGDRDNMT925GX3QEP5RNPK2XFA7SWGBSH89Z7EJWYTP5MZT3JJT6EG2VJF4T2C52QM9Q1V42F0BWE5XNA9KM8K7M0FZKT5R1NW5FPFJXY59KMDHR7J2PET9240TGRR3KWGV07PEGXJD9XMB8M1Z3SA9NKGK4BD6GCAV4BDSGRYSTQJDS04002",
          age_mask: 0,
        },
        denomPubHash:
          "6MRTS4RM6K0XV8RMAC01FMVQDC1RYXQQBTZHYX3S4ZZDN5TBS6YGX3NA917JH6NKM2GFJWSQJB78P20VZV7DNJVKRJ1XJTNE4EY7M18",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "E9DC21CZ73PX8N57VDKZCA9AHB7NASV7GG90A197H9MT7Y0BDD4SXKQCT14D36N18V11K0S0S016R8CXDV51QTF8CMDCE0YMGQ0462G",
        stampExpireDeposit: {
          t_s: 1684082348,
        },
        stampExpireLegal: {
          t_s: 1747154348,
        },
        stampExpireWithdraw: {
          t_s: 1668530348,
        },
        stampStart: {
          t_s: 1660754348,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 1024,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000X3G6GBFKFKE0MYB2WK2CRV5G47CD8ST3TY78V422Y9W30TBV8NRZBQ3N1HKDEG1Z64CKXRPDAS1HTW4DEWA753EE1Q79ZXGPFK4NBA6CHKBKNGE3NY04SGTD4M5X09KR1B2925N7KMEX9EG2Y700AZE4GW9KVTXWB9MA4CRBJD08CW0Z7HN3RZN7JSP5YVAA4QZTVZHDPFJ14VKJD0J3N9QP4761YWBYT7GMGBHY8BRYKDJEY05QZYV962K17MGNCGS9173HA2ZVFS0DWVASXBWZMXZ78K2B9ZZVSDMTTMWYM7TEX61X5MPAK5XYN0JVSK2N7E95EWN9WWV108YYGCTTEZPW7ZKX154ZZERE779V1E0GR9ZWW7K2AA5DKVR25MT1TGWQQE082Q751FYZHFTTMH04002",
          age_mask: 0,
        },
        denomPubHash:
          "6NM0VKYB4FNJD6DJKSX8CETJD7GGW1QYGPRMTFSDZ662YFAEV7GC7H11RXTTPNTP4S1N008S3QEZZ4Z8W8D1SMJEJT1KQ7DJWSTTKC0",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "XT3BXRP5MA3DB43P6HK4ZAGMWPAR438J11RT99V6NVM16NE9W9C93KCE50PAPNE9H1N1B5A5GKB5J8PA5K1FTZVD8M2QHEZTMM5XJ10",
        stampExpireDeposit: {
          t_s: 1707409448,
        },
        stampExpireLegal: {
          t_s: 1770481448,
        },
        stampExpireWithdraw: {
          t_s: 1691857448,
        },
        stampStart: {
          t_s: 1684081448,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 32,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000YYKSTJGNW57CJNJJXEKJG81RFCJ8DXVQQGAJRNFJ2V755SRC12TXHKC5X1TZMV56RBHNHKD7YER2H05W9ZEZSWYQYB9KZVGSVPHP5NZ55EWXYMWNX76VEXMF5QFKKQRK7V2VPF8ABVP6SRXC3WJZREWNZ2WXWD24NY2WQMNSHDK53VJQ1QYXNTGJCFNQJ42NQHTEA5B4SM4GA2N3NF39HE6QZW3CBFTBKVZ2Y6JSR55RF5ZXTVHJQS8AW2BTS6503RRR8T4W8GCKHHJ7MJPX88HHPR2FAFGSDQRH4EVAKNEBK18YZ9R0WRQ85Z1GBN5GVPBJJ4K9DNDMFSVC0F2XSF0QSW3596VK7FM8FYGDYCGRA4V23BDZQFXNMRWV7412WMA7B0EVVA4NYPCYF65938V1ED04002",
          age_mask: 0,
        },
        denomPubHash:
          "75VRHSWK5XCYFDV7R96QPSPWEDCEC6D3KGHEDK2EC86BPCPPH84A6S2ZPA93Z66BCWYY401NEHPSY2Z331XZVBH851WP738TV360FB0",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "C1XDY32WWVGVP09ZSJPT1MHMSXHQNPXJXGC68PX9AFPEAC34AP39NPB9074DR94GJRE9DQMC15NG72JKTGA7R6TS5DDAKB7ZXTTMT28",
        stampExpireDeposit: {
          t_s: 1676306648,
        },
        stampExpireLegal: {
          t_s: 1739378648,
        },
        stampExpireWithdraw: {
          t_s: 1660754648,
        },
        stampStart: {
          t_s: 1652978648,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 4,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XTJDEYRYP4WWJA2C3NYTPHK0R8VBMQ1ZCK39ESKYJ3HXDG3A9X67HHQVFM43S5MPVQ7J05JTFCNW21EM7Q0A9GQD0107YGRNCE4SWEQ2VCYR94P33HMKGDMYPWBF18Q3MZ90NY5CZ7PSQMSKKM3JFNMX5V91C2JGVJR7G8JHZVB6HHJE6AEYDCQN48Q8CY8WS2A9B88203YBMC4RB9GX388YRSBFFZ3E93AY7R9MX2MT780DSEK73CBS334JAZCWW5D4ZGTNVFTHGFZE2SBQDDNGPMX5N6SD5VWHC1Z90A47R7RCTCP8TAXJ64SM277WT0SWYCVD2KHFCE0ERNWBVEWPZ6Z2175HT3N4C72D9MSTQ6ETNDVCKDQETV2BQY5KHKWBJR9G1YQ19BM15VEK36YJAS04002",
          age_mask: 0,
        },
        denomPubHash:
          "81NSVWYMSQZCW3FAJ8WY1AEDPBPHAHGR166QT7AHKHW55SKF8HXM25XQYY9E47363EB4J6SP0TYH4SAN52P9AMMQ11JPK3F3NVH547R",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "A05G3RKDM7E8JWGJG7TQNFGAE3KC1XGWJQK9BQ9S14XAHR46YQY9T6WASAFGGG703CKZ8M8KW71197AS7Z6SS5W71P77A62NCQDN03G",
        stampExpireDeposit: {
          t_s: 1676306648,
        },
        stampExpireLegal: {
          t_s: 1739378648,
        },
        stampExpireWithdraw: {
          t_s: 1660754648,
        },
        stampStart: {
          t_s: 1652978648,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 16386,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XV1KCQJ6CV7ZK2WD5RHM61BA086MH87KSKZFE34J548ANAR054XQ00T1CXDTXQDPPHC18J8NEGQN4H71B9E4KJS8E5VBNDF5GNK1Q9Z60WV6E149KPKKA8H5N76R5WG9Q3D1EP909R1FRZK1R89AVFHV7Z56WQMMP6XCPM92KBY88FEYZ9MGPGV3VCK1SHQ8SHN277MZH6W8EHR3K30HBRSF81M30FGMDCP43YAECSQB3CAXD2F0H372MRR1DX3ZNPP9K8TBM67YWZC51MJTKEQ6M4X3PYH4EG695ZK1ZMPD0A3F6P5X11SSZNGYF9H95AC3RZA1V44J97VT8ZQZPE43YNE7AC2RA0P5EZ9DJFX73D21Z61WSKM8G99WN6H7Y40JMHS5MMGDT0917215DCM86F04002",
          age_mask: 0,
        },
        denomPubHash:
          "8EXMW6C2F93MJ4RSATDTA9E28R236N9CT6N5Y37VGSN5FWEGA7725D2FYB7JAV3JTMRSDAPA4NQNZ8C7QP9MYKE3NR67X8CQS8EKQ7R",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "3N18HVB69S08T54ZA2PX6BYKKJZ6PE7H74RZV5PRNEV6WKP16T9JNKQ4A86KH9DMT96D0P2VG6FYFV60VW332HPRGHMNYWDCV2GWT18",
        stampExpireDeposit: {
          t_s: 1699633748,
        },
        stampExpireLegal: {
          t_s: 1762705748,
        },
        stampExpireWithdraw: {
          t_s: 1684081748,
        },
        stampStart: {
          t_s: 1676305748,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 1024,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000X7D1JCCS855C43QVWVN5KMD10E26DWTFS1MJ4731SMR3DTQ7JSMJJPYHJ0X00EVK5167938VEE9KS6KP466A5GZ59GR8K8MF0BFCP6V6WARD2FZEN3QMVJYA6BNB93W8RVVDRJTV045KQ1E6HT6W10MW2GH8DEWYHEJXDGK2RNFE1ENAZ7SAKMDP6QFARQ0MJ0MDJ8N17C5NVTB51GM0VXRB8VTSZ57KPW8QQAE3JW98C3WZ3W9W5CTNYQK9KM89XEF5PMV90XNKBNS77GWSKQDQNWN3ZXP9EAHWF4KF4Q1R0QP97XVCVD5ZSG1GF8C2BFYMZ09CBHBA0TJTP16B4VY9TD3EZ1BZPV5R6STAT8BWN3PRQYFB5CYMYWFE8R6G6B8FSPWK9J5MWG58Q6AGW5A6YZ04002",
          age_mask: 0,
        },
        denomPubHash:
          "8QSGYQXTTABG8238JBT4DDM9SN0G0T63WZ2DZWGVGH2JY7JTWNZ6WQKV44NYZ3FVBQ1967GFYYWD4D6MW6VKG0RG47QZMR2WKTR2MA0",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "G32H6KPR2VA4XCPVAKFKA25JAV08KJ813ASFHNNYNKAD651YB6SR9KFGJSRGCDPDZR9V23J7ZJRXRPDXD8AP217WQS2BT6HP6TXGE38",
        stampExpireDeposit: {
          t_s: 1699633748,
        },
        stampExpireLegal: {
          t_s: 1762705748,
        },
        stampExpireWithdraw: {
          t_s: 1684081748,
        },
        stampStart: {
          t_s: 1676305748,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 4096,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000Y91SMA2HFHSV3PZJ7D05RGGTM9APJM89A9PFK0QYQYYRBRGQVXS4HEP9G696E3J13KAVC1YNRETPRGJTXJ0XVB7P213D68C1216ZG36946A3GQZX315XGMYEVYDXC7AGJHS8CWRXYHDN22CFA0TFS69DKS4V6T57EPV7S2B1T56FZGXZGSHD2VESV7MYGNAW9QQ3JGAYJGG8YHQYM4E71A0JFPKJ7WW2HGD8QZ5DP2TNWXD1XDHSQ3KRRQNK0EG711PQHSDJMFTFG4K720T5CQB3JB2XYPPH2GJX2RH02S553CS3KPWVGXTR06E6YN5AS9RY5P40Y822VTSV5Q1V4R01F7TGXPFKX3E3ZXZNK9TZ9Q5EJ0VHW9PN0W0E8A4FMQZVTR0YSS9NYRCS4JX8W990F104002",
          age_mask: 0,
        },
        denomPubHash:
          "9FSRXFW7BTGRVYY37STMM33FP3F07FQ0X09X3N2HCYR6HC6WNWT0M7NDF1EYH1E274RM3D8ZKMDSNGN5TYSJPAQZSZB83SF3GN78RZ8",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "303S4QMDXHGBWWVJNPQ8MHG7JCF52N8JKHGZW26SVR3QZAZ027GM45H25W0Z99WRAHQPR2M20YWKM344D901ZQX5R8FTWWZGS29PE38",
        stampExpireDeposit: {
          t_s: 1707409448,
        },
        stampExpireLegal: {
          t_s: 1770481448,
        },
        stampExpireWithdraw: {
          t_s: 1691857448,
        },
        stampStart: {
          t_s: 1684081448,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 262144,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XHT19P2JY7783A0EAR9EX2K2VJZD68AKRMRWJ2B8HTHV3X2X1WQ4QV5TETHXKH0JYZVXB4S46JDRR20561ETKQFEHT3217CHM0A6AK3SMVQK2F7VHZRFKAD6HMBBGTB6J3ATZVVQ4S6GQ9A7FB6Z69S7TTY0CX4E3JA35CVXV05S8SZWBABJTQRC1WJ3JV44XAQ24RD0C415603D2K038ASGEJH89VQ6VK9C6JMS7EVRGNTQ39SZSVF233CDTRVSZT677R4QDKAYQWE81PK106F1B3Z14T1NYN84D0BCR34A607FG4P2TA2MN64CDXC1M5WAR184F1VPHVZD7PK8SN3S8VPVWMXJXD85JZ4977RRD7Y8J90AZH1JCZ98WXXBRNY3QWWTKESC2Z3ATDJH13XHJH04002",
          age_mask: 0,
        },
        denomPubHash:
          "9KD8XPMB5N6ST9E71TQ6RSP5T2M7NP7VM19SW2JKBDBT3NA0MHX4DN18WVC7MHRQ1NT45577S363G82VFQYDWF4BF7JVTAQ6GK52QW8",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "SMA83AG52P4JAGRJAZD3GE4SG4EAF8KHA2D46RB4RR5K7RX3688QBF9X5RBJ6XAB67WBFBJNY76KSCT2NX0MPSRRXZRE2DJ1K30TA30",
        stampExpireDeposit: {
          t_s: 1684082348,
        },
        stampExpireLegal: {
          t_s: 1747154348,
        },
        stampExpireWithdraw: {
          t_s: 1668530348,
        },
        stampStart: {
          t_s: 1660754348,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 32768,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XWG9MKF7F7BW52TYMQV7K5B3JB9NAQBGNJAPN5T3ZE7Z1KY0YAF5Y9GW94MFHCQB70QK7YGAH1XYS16H5KN5RX8NN5BK58NB15BQEM65NQ97HFE2NBA06KYPJH91M10WPEYQ8X0J9FYXDPNVQY2613BTFGSPDPX8DMPDZNGYRHTGA40H46MAVH4FYVRS1JPHE7MCKMJ72AGXE866QTNVREHMBJHMMEVFAPHRTNS5CE6YC7M7P11CVR5CEMHTQ0A3FSNA926WJY3K4H1AKWQEGP9CFNH0VN76F8NYRBFJMAMXNR2ZVJWBWQ0639SGKJ5K61D5FYP2RHR9SFR299WTGV70AZRQYZB0T04EDAPCV69N04ZCT1RSZQABSEMA804SFRH0RYKVWPEN0D8RN39C2QPPE104002",
          age_mask: 0,
        },
        denomPubHash:
          "9QN3BR9GM9KNAW0JZZ35WQT3Z49P5PK497848H9TMGRVH1XF18B8S6640B9QK8XQ5W9VSKJW946CNMCXWZD05S6073VEN9JAMMVW6D8",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "531NM2DN6W8ZMYR233JP5CQ09YDG1XW7JSYC1W8ZQ2ME688AVZ67G2X807ZFQBS5ST72TEGT05DQY57BB8CW8CRQXDBSPVR8AFB960R",
        stampExpireDeposit: {
          t_s: 1707409448,
        },
        stampExpireLegal: {
          t_s: 1770481448,
        },
        stampExpireWithdraw: {
          t_s: 1691857448,
        },
        stampStart: {
          t_s: 1684081448,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 128,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000YR62A5A1H96Q0BN7TM3MYBFZ167B9ZRPKRTEFMBA5GQNYE8Q4VS7XJC86HW4ZQ20KPKR555RGX0AN61PBMAENG79D5T3SZFYDNKFSP6JHEAVTZ6JG3RN1NCW5JQGKRAW0A7F7H12PF0431ZS4VAJHJ9CZS3X8A8XPM1YMG7C2TNA4ZV6EBNAP8FRHTFMQF8XE6GPR3P7T4BHZF7Y57B0YE609MG9NVHFDVRD1V1CZ1N32WY6633ZS3GH2R2CZRAVP4G1MX5BJKY0NW4H36QPSTJPAZ61TDS9B03ZCCPZP62TF5ZX02Z4XRG8GJ1Z2KSVA9H3GECWCQHC4AJXVZKDC53CD5BBYSAT2PQQDTQA8R9GPBHW9B9WMY7F56STDDPEBH65ZXNK2RGKK5SNGMWPYM51FF04002",
          age_mask: 0,
        },
        denomPubHash:
          "A3WP2RFFM2TJ0SJ8Q51PQZDZ1X8QD8FPXEHEJK1YNZS3CXTDMMH52FQ7CBA363RNRA695C05GFBSWZ3RHJ1H3SF45KPM0JB7TRAHD7R",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "F0FW6HJV5W0PKZA3DR5QJER0EVZA57J2N8CV93PZPA2ZCTPZ37Z9N0CRPNT5SSD7JKH0HDP86CDG01BED8JJ2PQY9NV2VKKVM2EQW00",
        stampExpireDeposit: {
          t_s: 1691858048,
        },
        stampExpireLegal: {
          t_s: 1754930048,
        },
        stampExpireWithdraw: {
          t_s: 1676306048,
        },
        stampStart: {
          t_s: 1668530048,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 16386,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XM3P5GM1TKQDPWA3E2FD7KK6XPX5BRM7ZQM7VT8146Q3NWYQTNTD74S31V1DBRC567PW9JDAPJC4MZ445RRRS3QSA7BREGTY07BR5CQSZ7HDZK334GPW3N6R7J79R0AZC5P05426BWC7AKCYRTMZ0F7RBD81MB8G77V2TYFXEMNW5HNJ2FK7DMFXG7CNJY65NPYNJ8PDZ1T7455XSTP8MEZZR7RQ8R0M25V4N76W4275MNHEMZ5XPF9CB54AXEKSZ492WYGCGQ56KSMZ2XHJMDS1TWPJ7P2MY17YPGV0W4J30XPE4RPB24Z7R74SYK04FE4NY3CPG5TCNDH7T2129KQEJ15NZEG268RYTD5PCBP0R95FV8B719MZ5XA1J99XW17S37CBRC12M3QGRHYARQ6RZ704002",
          age_mask: 0,
        },
        denomPubHash:
          "AC2QVXBWH4769B4BQ7T1DNZET5S2HKSMP6PY2JTXN6CP4Z3E86FQ0VQ6FNEQ9A86FVCKAJ8ASZA9G1VS6ZH7FYY29FPB3V3EQ1EKC2R",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "QVAHMEGA3QBJ08D2CM5ZATBABHB98VZJQX031P3Z6M6ZMTJG7QYV5H6YPWN5EQRY12WBWX121YYKFC339PNJVXP59M8Y2GY41XVWT30",
        stampExpireDeposit: {
          t_s: 1699633748,
        },
        stampExpireLegal: {
          t_s: 1762705748,
        },
        stampExpireWithdraw: {
          t_s: 1684081748,
        },
        stampStart: {
          t_s: 1676305748,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 131072,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000Y8J7T0C307Q53WTB9VSN5EZYQ04F7ATBDK2GTQPQE9FH5MTA9DGD2PSY0P9826BMS9M1ATR456KKMGESC70MTR6M673QPVH4X69E3ZAW9ZYMQZVX12H8KV5MBNPVQNFXN5R00YQKMQQKXXDD34Q0JGK9FZH0SEXERHHM89G2ZRX8FT6TBNJSFKS42P280WDJQ84A16P4Z1KVR4J5WK45NHSJRTS2VCC56ZRZD4VJ413WEKZ9BYWRMDCDKDJTKBGTT5J5Z2T1GBB9TVVWW06CYPDC2R3KQ7H8PPAJT2GRH1WT7K0JGNRYT9ERXGW11WEAR8FA2W48PHA73PF0QSE39P53D5R8K4NZES3M6RZN5FXPGABVFYP8ZBFK1YCA1CSHWMFFHA9PCGNPG59943V2527P9104002",
          age_mask: 0,
        },
        denomPubHash:
          "AKP4WVQJP3EE9F7FXV6S0XYVP5PWDRG3YWDNSFSFCM8BT0A58H32EC9C32WMESXHA2WJWGWB2QJDB8D03PY2K3ACG7FQPASXQ45AM60",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "9RNNQ6MXSWBXTGBY8EVCQ7B5N1EXM6JVTASGEMM7FG6WDCX4RV8TEVT5M2F0ANMFC47498VG6G635DQQ9HM93ZKY3Y14TDW3GXGGE28",
        stampExpireDeposit: {
          t_s: 1691858048,
        },
        stampExpireLegal: {
          t_s: 1754930048,
        },
        stampExpireWithdraw: {
          t_s: 1676306048,
        },
        stampStart: {
          t_s: 1668530048,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 4096,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XG907A8GNKFJJC9R7KV43HZC1V8GZ2ECQ7WEJVT4AXHBJYYTZY48EA373X392J4FBHJY9DM6Q1V4THTDSM8GZ2QQBEKASSWBHNN0H8GMQ90K8SFR74PFD2VW16HDGE3NXQ4YYFHDV1GBDCYDND9Q5FV49D7YCQ9MNJW1FB6WETVD4Z4V7YWMGV86CCJ743CVAAXDDKZTRR0911VMPH0J9B3WJJTE82ZMQPGKMKVW5FJS2RCN6P559ZTV53C813HSPPXA59990QWTC4NZ8X42NVEQETWY6QM64G39E7GT1QQGH2QYDR1AR11FCZZZH2H4V2261Z6NDM4DEGGVTV4DN38CTM80VQVYTVS94MS2NP5WD9CR2SV8HTHV9TQCKQFTWMDZK70P1QF1GBD0T54XEQQXQD04002",
          age_mask: 0,
        },
        denomPubHash:
          "AM3DWEV2EKAWFAJAXZYM5GGPWQDNJC8T2BQR1YN9KZE9WK2A0YMJ47PT1F0WYJBW0PG1TP3SKRVRG00N188M98Q19VZ7AJF4W9GCZJG",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "9NDPJB0EYW03JBTKF4X98HG365Q53682P573487G31T44KHYWGGNWXXX43EFJG45JVZ57NF3JVQGXNYCSHF1PB6EVW0312FMZTXK810",
        stampExpireDeposit: {
          t_s: 1684082348,
        },
        stampExpireLegal: {
          t_s: 1747154348,
        },
        stampExpireWithdraw: {
          t_s: 1668530348,
        },
        stampStart: {
          t_s: 1660754348,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 262144,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000YFHYSPVASCRCPQMREY9RM2NG67GS5JX6AQRMJJ9ZP2ZC0460XE7CJ82T1X1Y55HEBJ2WGKJ56Q64MW16SX2PMT87YYQ37G5XWGRRNACRHC3Y4JK8J2MWA6D8PN8BYQ9HN2491GF8W4R2NG522TS6BSZJXPRKJXWDEM5M0PG629A7WB53X9DZSFBRNZ3RGVKCWC5PB7X76AS69SV94MKSPJQ2TD3FRN4DXGY4F6GW0H7P79KPEZTSHCNM0W3T9HF07CQW6ZD1CR2PRGM0MJ7DRGHYT8Z630KKQS00996MCJ01BYW7WDZY31VW27NG5H725CFY86ZRX4EQ9G6ABCR9311BF3C0H4ACGF06KAV01G3HAPS3KF2GW377F71KRKBFASKS64ZX2168J7PM2K9YVFTTS904002",
          age_mask: 0,
        },
        denomPubHash:
          "B112X95RCC6Q81VQEY4M6VPY5JXPPCQDCYJK52727S5DS2NGQV29CMXBA300G7PVV2FVM40K00FSDRPWVRT0Z1GXT4P466J5KBNR800",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "TSDDE3RPN6GJSX69KJ6T1H93CF5ZBPNXM06HGWJM3R4S424ZJQF605676GAQ8239T1HH4XPW3CTC7G38XMCND3KE91GWYM8EAGKJE38",
        stampExpireDeposit: {
          t_s: 1676306648,
        },
        stampExpireLegal: {
          t_s: 1739378648,
        },
        stampExpireWithdraw: {
          t_s: 1660754648,
        },
        stampStart: {
          t_s: 1652978648,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000Y1KVZ28HRJHYE0ZYNN9DZ1Y8PGNQVQ0FXNE9K3WXKJJAWP8S6NNHV3P484TH6E0SAW6TEHXTX1N2R7H3VE1AJBJGDQAYJ1EHER8X9M064BSYKJAHPK3CN4JWC81HN02KPFG2W0JJJF1VQK17SNAHM03AKTPNDBE6A15Z9RFWYQAHTHYFJDWGFFRVA9CJ7CAFZAE9N2QS9BWKFPHC2H85E35JG1Y8JTKGVRDY01CZD71E64XJBGDGT14H50VYRQAXM32BZWQG219XB5G5Y3TVWM05C8EV1ZSD8RKECMDQM4N9T51XFCB4D3ZZYTF2CT16Z0XZKJ77749076KE7N92RD093T8THN3SME2MN0N8D36GF2E3GEBH79S6GBFSZ2SP0A5YJTN22EM6F96H61MWGG0ZWB04002",
          age_mask: 0,
        },
        denomPubHash:
          "BQB4YXY626B2P8AGK2H78FQPGYXWX10M2HCSBT504NMRCKK5KJ7QMBH3RMWRQZ4FPBQ8613JR273E83HQPEFCBQM9QQQRB94EYVY96G",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "XH6KSW0V1TAAB7GE30WA5976A694070DTNBPATZGJ046DW66FTPSJ9SC3Q8QS0D54YN8ZP8DQ5Z5CNRK16D8K6BYK1PFV8YWDGFBT3G",
        stampExpireDeposit: {
          t_s: 1699633748,
        },
        stampExpireLegal: {
          t_s: 1762705748,
        },
        stampExpireWithdraw: {
          t_s: 1684081748,
        },
        stampStart: {
          t_s: 1676305748,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000YPDAMMV694NF7N6Z9SXQ9168M51QD2MAW9Y4XM2RASHCAPN6XFG8VEYK4TSX7T55ZSHXM781Q8Z2MH2Q2286ST9NBVTXE51GXQQ2BMZ9KXGEZSYSY0NJ0GBE1SKF2F908V833C0P21P9P3XVV03PBCH42SGRPPFA3GX6A1K1CVNE71NZPY9Z1X4ECB9G9GTJ88VFPNJZDWFT2STDX7K5070D3YQBECMEE1F9KEH8VMKE6Y3F9192VSTG3RMR0W495D5GPTAZEFZEWBV6VE4K732N331FBKGYPFWR1ZEJR0NH95E3FRCDENB97CPBZWNF55FX53P0CHEATXXQW7A2FVPGY23FKVM9F9PP0JNZF5557PCCMWSSTR9S0WYTBYE7JZND4DXTMM5480NRYR4GEACV4104002",
          age_mask: 0,
        },
        denomPubHash:
          "BSG0VFJ9QXM3QCNAMPKFFJXH4GDE1ZXTC1DCDHM1JRYRQE7KVBNQD84XXFS45HZG6M98SY9J7FZ917VQ8KEW2DRH71S9F28KZGSSZYR",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "C9072K8V733WHWB5KP0TQZP3CGZ44PXFC97BVJ0Y6930G3WQH0QNJKWSSPYG32TZ5V5XTK6TZ87V018FEE2QATK1NGMWGJ00BXEPA3R",
        stampExpireDeposit: {
          t_s: 1676306648,
        },
        stampExpireLegal: {
          t_s: 1739378648,
        },
        stampExpireWithdraw: {
          t_s: 1660754648,
        },
        stampStart: {
          t_s: 1652978648,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 262144,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000X2THEJAFX43C6QRKV8M2Z30AZ91K5KR5V3TB4J07XF109AR71ASA1YXWJFJAQE5031F9WWEW11YD5NXZ94MQRH6ZPPWMP1DSQP4KNR0NDBZXGK94RS2GNGJJV7CACDMMW3346NKMP1DTSTSEGYGTSPET4RZBC2C9T2Q90XXDKAFWD0JYFJ0KRHJGEP7CC7JSJCT240XN90752CYG40ZBWJFNFS311P7D207C6GXSEMA0QPT2JZF3Y6VXM4TVKW2JYCB1CDKPT88CNF9H8NSZE76Y3WGVD9K0BNJEP96CXDD1ZXABYSBZZZJ454W7CEJ5TE5QTV802X0MD7244XF8435KJCS4JFPE0XM9DSG6NR0W2CYSD56H5MYT1077FFTW9EE25KQY47WHQMSMKRYN8SJQZX04002",
          age_mask: 0,
        },
        denomPubHash:
          "BV11RXWDDHSWCHASZJTGQ4E8167KVGVX1WNZCXXNTW3FW7NCRG4GCV39PFJ0XP7B4RVBVRDTJVQ2CVQ29NZ4AM9JPTGF1HDQRFJWRPR",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "HXCX8D084CTBGSXTCPY8P0X0MRKVDT61PAJ2D0HG5S5HF7B5FDSEJT6AXXF1390YKHBN6QHH6FMV69SHRYZ0ZEVMWKJ213E6WEP5R0G",
        stampExpireDeposit: {
          t_s: 1699633748,
        },
        stampExpireLegal: {
          t_s: 1762705748,
        },
        stampExpireWithdraw: {
          t_s: 1684081748,
        },
        stampStart: {
          t_s: 1676305748,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 64,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XEAPNRRT47F0SGZAFY8A78W5XECJ41TS79KQCXC25WG6KXFX7HGWKGCNP3QQB8PV9PR8HP1966MSD5K50EWF3Q0W991VCD7J0KQJ68Z07MYXSJ6KYB1C970QEK1AKH96Z0SHV76B1C6Q91SQFSXT71BZQ1R56K7FHZ006WBFQX78KA5DTXS2A4KE120CGV4HK0DDS5K6SX8QWCX7VQKPFKH8XRYPQHZZBM3A4P6KT38DAWRQWCP70R8F290M03060C9VB00RQ1EYN5Q8KZCDFS9XXGW7AZBAR0F3Y011NZM10FQS0YY2HHT2CT7BXSJM0JB36C8BYGQXH1C58VWP10QKT534G44Z28FXR9T0J1F5C8TEVKR6Q23J0Q8TGNQSZNZYJBQ50VPY0CVYRCPQ0ZB62N04002",
          age_mask: 0,
        },
        denomPubHash:
          "CBJZ9S6NDACHB91RKXR4THY0A4VWG1V3K33JA128H1T3THF3ZNCVVGATSNYTCFVW0SZPQD8MJAJYS1D327F1W1PNW6EJEDHW3834V4G",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "E9W8YACKF9JAB5CXRVQ61B36D1W5HS0BJ5GJCNDRA14309KZZ3EWHDSY12G42NT0RVTXRMA1EZ78Q4Z86QD1YREY6RCN38MN5XM3T08",
        stampExpireDeposit: {
          t_s: 1699633748,
        },
        stampExpireLegal: {
          t_s: 1762705748,
        },
        stampExpireWithdraw: {
          t_s: 1684081748,
        },
        stampStart: {
          t_s: 1676305748,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 512,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XTR2EJ44HCH7VGEBVASH43R6HWEWV1H51MBDXPXVE49KJHGN3911J1QQRQQR17Z0YB42QC28SHGBC0CVR6ZRN1RH5ZD2Q9A62V24A5JCAMF0R0AMDS9Z3JWYCS7APKT2E7YGNPPVYG814P0XEWPF2CPV6MHK0SJVCFP771ZW8YWXTJYNCJS3A5GWYRJ3MKH6K1S09301K3GX6YAADMD5N3Z0YT2C7RVZ7TZCWA7CXZCDF1BN7E4V6Z51NEJE9QMD16ZM7824WKX3TGKJKTGBGDFQRHQZN7A27011H6M3MDARG347YQGRD7NCMYW1GHYF5FD07TXFG34VB7P7NHQF9BSM6TPA2EAZD4JTDJY5A6HSSD0VATZERAM1SR4RPK7KN189HG70FFFCZCNYBF0J679B4704002",
          age_mask: 0,
        },
        denomPubHash:
          "CF3VCR90H08W7Z8VMHF8ZW369173J7HB2GQV6T14KP32AVXQ8YJG9VVF507G6QC6NXYJRPE7M9FJS7MZD714HVVT3VY1627NRDR6N00",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "33T126PBW4980H4K56VER24H2HQXQVCKX5MRAT26QD68ZGP6EHPSDSDEMRTMCBKVM6RRBR5JMHP61P0KDNXGPV389324C03EG36HY0R",
        stampExpireDeposit: {
          t_s: 1707409448,
        },
        stampExpireLegal: {
          t_s: 1770481448,
        },
        stampExpireWithdraw: {
          t_s: 1691857448,
        },
        stampStart: {
          t_s: 1684081448,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 2,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000WVG1ARHCEZK8ZVZ5PCHWJ6Q7MC3JVK5EJP4WHQDKFZS8M9XWRWVK8HF5KMT0HEFWZPZRKGKRH5PZKV0EK0A80HM13GFD5SBPKHQ66TYQ8BNCK5YWBJGA55Q5QKTZS8NN4VF5V46HT6F50QHK01X8V83H8Z2TVRX11N6X4R4TT5ATTW8W7RAEE9D6Q0HNCPDHQZ9E61902SGY2J5NY58766T9KSMKE8RZ30P1G23DG0HWSAC9Q85QE78M1XDG5YXVHGHSGTK14W4R7MEFZ7KQ3Y1RGEAJ6DCVPXM3KY7PEHZMPN8B3W3H4XKT2VJ9P036GW2TBW49JXXMDJPHYD2PHDFYTCKB3AWYG0CVWQC6FN900VEB797A79251XGSXQC903HVG0HXR49GJ46T7CTHJFWBN704002",
          age_mask: 0,
        },
        denomPubHash:
          "CPNAS39Q674W4E3DE78FTQY6X9K58D1F4HEZXT1Q5S948KHEKZHJFF4K8DKB40WNH2V180ZYMCKC7KKT1MGKXX6JM4H9H2MH7D7YCA0",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "N5T7W1HWQPEQE7FBK6CBXDBFJJ6XPXB2NZFDT8A52JFF1S0YS36S3HVCM01SHS3336EY3NJ6PH9A60DEDR5RPNSNC3ZJ8ZQ1DRMZR20",
        stampExpireDeposit: {
          t_s: 1691858048,
        },
        stampExpireLegal: {
          t_s: 1754930048,
        },
        stampExpireWithdraw: {
          t_s: 1676306048,
        },
        stampStart: {
          t_s: 1668530048,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 32768,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000YC0CDQKJCH3QFN5V9TPEZTAA4821XZHA8MM7D3FP6X2Q38ZS3TC5TPSQY2RM7MTMGSHXMPH1S0HNFRKARQZ6P81QJ57Q99GAV533GDN0XYY50ANRK0ETNNKSZX75GKYT4765MGP8B1F5DC9KR7QFHBMNETF56CCA59TNN85PRBB794VXZB5BZ5J9KR5R3B34G7C5718QEDD35Q36NPKY432YT32MN7ZZQMT1ZMAVAG31PZ8M32W2KQ2CYVDH3G2Z799JAXPPR5TFZ7PAKWGSBEPRY6XS3HX1F8TE3QK2JW9JQPV6C6JRZMDRK6YDKPWYEKYT576VDCZHP7P7WS7WZ2DRCJA4HANPW0JGEEW1R5A5PQMN8580HEWQ4VGG1Z4DFPSXXRD9B9GP6P2355J375Q6YX04002",
          age_mask: 0,
        },
        denomPubHash:
          "D4P0Y0H0WRBS1MRCAD8WXCFDZ92H54V9CTVS0FBZ2MGEM9S2G695DHTJ9NZ0XXVGF6GSZST4C857947XBPA7F6HD255DWPNY51SC6GR",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "3ZVAY55PVPXA24AP5YR86JE97H4A5JNPJKK3E1NHAPSF2HY8D6CGMDNR8K857XM3MCAM8PT2CDBARXSHG81Q7R3KJ9BDW15GGR29C3G",
        stampExpireDeposit: {
          t_s: 1676306648,
        },
        stampExpireLegal: {
          t_s: 1739378648,
        },
        stampExpireWithdraw: {
          t_s: 1660754648,
        },
        stampStart: {
          t_s: 1652978648,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 524288,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000Y1H8Y9F460KEZMHE9BWW49BRQMY209KJ8TYVRZNJ7ND7BDQD48KFXDYJZYDRJ2RS39S8S8ZBJD4F88M9CNSC4NHZMQV52VAKCH5WXNBM56B2QK8PVS26EJS5P4339P62V2WXEKQXX6BBF3G08BXMDE689990ZP90HWY1M1163FJ3GYAQQ1JDGRQBZ0G4S4MPH96J4QGMZ9H0QKT6XMBQQHH968VFPNATJPCGWSJQAQ3AJB37G8X225Y2EZHSA91DSH7G0TQR995QVT7TXEJHZGS2Z7QVV243YMZ0C1KSYASD445S2AR0NN3JE2FV6YYGHMM36XW39ZJ5QK89JY728NZ3162EKRXRTES0HVG8Y2NMMR20451PR291BN0TEB5CXJ21WM8AEVWMBX01DXQJBESK9904002",
          age_mask: 0,
        },
        denomPubHash:
          "DKQDG5JPWBVKKW8YCFQRDZW4YV5EYGMNZ8WF9VVQ1KFCQ1J4A05APWXNNQAKW21M5G19SSXBRD6C5ED4B7TE6Y3GB6B19KW6JN8BS70",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "7RQ8QVRWMDAMNYDBNY3WWN1J3ERKCCH6YB7R9M7A54QMD58BMNYV9ERT7NA9BXJGR8275JFN1ST1QGRKQKXFN95HWYM30PN4765KJ2G",
        stampExpireDeposit: {
          t_s: 1691858048,
        },
        stampExpireLegal: {
          t_s: 1754930048,
        },
        stampExpireWithdraw: {
          t_s: 1676306048,
        },
        stampStart: {
          t_s: 1668530048,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 2048,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XZ4D41AZG1XVA5ZX86R13NF2N6X7CWM071HFE5BEWSDEBCXZ40KRXMFBS4V3GTHGBBGV0CHC2NSQJ2Y54PTYXM17F511T8Q8XTNJDD7XN6P5S8NWGB32VM4H87M01H4H25B05NEY061PARKA1SH94C52P89W6QQEBJVN1RE1QPJRAK66JDE41KZZBJ6Q78VJZ5JC7CK5XEY0QMHFFY08457GVH9TJ7W5Q87QH81WQB6CWVV4Z5GPBYGKD0Q1QQSF2HQ0D9PAV6JR8HTY5QCCEB84SEYSVDZJ5K0VX4K2W4MFA079MDEC898Y8CPE9R42BRMGB6X33JQW56C5EGWPDNDCTNA42YYW38YWTBZD39ZDJ1JDC0FZQTF221A5721FACK8D7N601PGQD4G0Y4YJEC1MZ04002",
          age_mask: 0,
        },
        denomPubHash:
          "DVG6Y6YQNWPPEYG1D07CYYTYJRWRZDRAYAZW30PH6GFCG3YR0DBNWP0X2T5Y3N0EPMEE2VZJJ1DSWBC43EC5PTRWWNJ4M5WY5T79XR0",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "PFF67BX24D2Q2WMN99BJ6C3WQYAEECG292283SBQ6EVH73P752BX9CJYX4R8930F3JD9VZEPB2CBCXJ8FKC4N3ANKAVV99H9FX8YA1G",
        stampExpireDeposit: {
          t_s: 1699633748,
        },
        stampExpireLegal: {
          t_s: 1762705748,
        },
        stampExpireWithdraw: {
          t_s: 1684081748,
        },
        stampStart: {
          t_s: 1676305748,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 16,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000YK6C2ZSD4PKW29B2DEATHJMG7G8YPPY5AEJEMDW7FFHFNVC2D7T834FTNE9WKFNFXZJ60DCKEVMQFNBW7FJTYG6S62N6ZDEW7CKP5P1N2K0X1K3G4B78RTRYJBY71PDHSQJYFMKJK5XJVT4VXQ4082R49KWPV7E55RW4BZ1TF4E7TNVN6BMVB7W1SHHZ2PRRMKHDAQSMPVMAD4RPTP8Y46YTEAJ8XC0VJ65C1FZB30DMC4E3V6EMV9RC5X0BBGF143R4T3H8MS53NHBXAYBPCAC463FASA30V892VQV7Z5ZW3K7FSJAN0CKD0RPSNHRZ7J8SVSRZKWE2SX9XPKG2XR9D0XP4T11B310CE86VRB28FWAGVQ3AMW2V72Y4ZM02CKE4YEAVHPY7BSC914AA9WZKA904002",
          age_mask: 0,
        },
        denomPubHash:
          "DVPAF8KSMDXBQKRJQBXJA0DV6ZF80WHD6XEQVJVD9VT76H1RK0011R4CH505FRHSYZP1Q46C79NDJ093XB6S3N2SWTCK9K3TDZZVP2R",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "JRFV89G4EDVVFY1EZFGAS9CCAYQ5XMSD5ZX3SK4JKA0Z905HGHNNJYC3CZ2D2TR1Y1N29GPWH9BAD7X46MWSGGHV211M7TQKS8Z5C08",
        stampExpireDeposit: {
          t_s: 1676306648,
        },
        stampExpireLegal: {
          t_s: 1739378648,
        },
        stampExpireWithdraw: {
          t_s: 1660754648,
        },
        stampStart: {
          t_s: 1652978648,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 2048,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XX3W2677WE10FY6MZ70F68TSNBGQEE6D9388W4ZXPAWT0B9XF4TD6WNJ6KV7NS0VBS3YRXEMCEN9A1XX82H1QB0YGGGQKE02866N2KJHDPTT69FAGH0EJ4JFAHS89HCKDPNGQG2P8FKNH9MF2JWVYCKY88660SQ03E3GYP01AM8QZEGS419T1E6APDGZQAZVWVS4GHGGRG9KS9YB10KMWY05085K4E3ZW95F43VXR95YQY49ENT17EXEQP013T4KFX3EZSMGXN54DS30Y2NMH08F18VN3GS5V7CZ9J2PQK2YCZQHTAN2W03TYH4R26HM8ZJR21BF9RTSFFVTSVT2X3D2H3JNQQ4A6XDQ00WP91XDF6F0JKWXTXAK0NBFR7W1YQV4PP5TETKF99M4QYVY710DD504002",
          age_mask: 0,
        },
        denomPubHash:
          "DX6Q1C7SHYSJDGCHV7PDBFS8BT92TPN890Q16PSZMF4CHYGCP1H4GBG4VNZZBNECP3JXAFDMS8WPN3QJ2S9T2E8596JW808FAMJ5FBG",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "TBG2YY8Z4FKP5XARX2RY5DA8BW29SKTFWEHF93PX9PHWVMDZXZ07B50NQ18MNDTYPMMZAR9J1ZHA5BH8A5YPA5FFJHQF9PWCQZPTC1G",
        stampExpireDeposit: {
          t_s: 1699633748,
        },
        stampExpireLegal: {
          t_s: 1762705748,
        },
        stampExpireWithdraw: {
          t_s: 1684081748,
        },
        stampStart: {
          t_s: 1676305748,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 16386,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XVN9D87820WD2EQ3R15EFJ22N7C375PMR6GBT60A4TJ30PK49M8NAFRC9N55V29B0Q8HKDH13JW27BY3P32N3ZFN0H0P04DVS92HGG6KMG2XA5C64J7G8PWR7C7717DPA31P05ZKAV5TJ2ZXHE6GTVSB4N6CJZVZ4GZN9R9A3BSG63NTBEYNTPHHDQAKP8ADDZS5N1X8VDF7XHTB1TPA87QC4H280X2GH6WQWNQYHKAB9Y4B1MHY11QXGY2HCDTKTDZEX6YQWNQRZTD6H9WNV4397SW6Q10NGC6DF0SM4CE9AC5RA08Y981037CAF8PMEP8HQA4EGQFPW7VW3VZZK3H42RK38MAB3PMZ9DZTE709S9DXXCVACAAS9G663CK5VDD3BQNYA526ZRP29SM19STZP504002",
          age_mask: 0,
        },
        denomPubHash:
          "EAHNEBG8MTJM94TCB9VESFW0P8714HAES9RD9GK5R9VGQ2TWP778G067HXJRRH399HQ1WBTCZ2Q6SKX0QQ3K94SFZJ5379FFGEZEYE0",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "SQVXDKM2ZCDFPA98RAARAJYJC49ZWYZ5G0TTJP5E67FCBFS9FXHZX8H02PEEQBADR2A735KJMX5XPV1FE4G2YM625WEJPQJP04CM23G",
        stampExpireDeposit: {
          t_s: 1691858048,
        },
        stampExpireLegal: {
          t_s: 1754930048,
        },
        stampExpireWithdraw: {
          t_s: 1676306048,
        },
        stampStart: {
          t_s: 1668530048,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 8192,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XR1576Y11HJGKVSAFJ4TQNBX4J1N4FGYTGPGXQ6B7DZ4RH5G3KPWCHJ98RKJBHJK29F90G22F8CJVFMH03WHFEZFH72C7SY6D95AJW94M5SYYFP5MZSEVA4KSNR3HPAEK98JSSHHNXX6B6DBJ15CXPHQ47Z5YJAY0GCGX50V69NPM89XW984H40WAV59VYEHWRVMF07TX5XQEH2QAR6479ZGZ3W5SW4WWAPEMRRZ1VNHNRM8BRGJBANE0BNC6TRDH8XJMY07K435WXXX5Q4CRET2A4J2N79BZSER7PHK7AA5HP4HXSN6TRY6P82K6P199277SB778GTEQMV646NXSVPY540SPQ89DCS77V695DZD2G7VA5A5BTWJFH4BS6GJBYC09H9C87SMBN2CJX47HCBC1Z04002",
          age_mask: 0,
        },
        denomPubHash:
          "EDG0JP9M6PM566SSB1K7VZM0XSGMRV998N0D0VE0QPM3QV3Q55XBY9YG9M832GYQAVA1JQ2TYRFMP2N2A9XQQK5DJ5MPGWG34Y6C1Z8",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "4302M5FERDX36GW4SMZ3YGWAJY9JS204626CNAHX19JYM5YG34AK0PAX25CCBMN92RAHEY5KX9HS28PGZ855725AJEAD8S6NJPTP630",
        stampExpireDeposit: {
          t_s: 1707409448,
        },
        stampExpireLegal: {
          t_s: 1770481448,
        },
        stampExpireWithdraw: {
          t_s: 1691857448,
        },
        stampStart: {
          t_s: 1684081448,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 1048576,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000Y4TYKJ1D7VF83WKM5C8GWGYGEZ3AD7JNF189EB1QP4M9P07QM2EJ039C4AE3C4GYPRBXGAN5DAXJJXSF81976B56FN62BDDXBQXN5NJWA0H2KWS4244SYPJC3QGXN63ZXGRV1N4GTME07AP02HGCB7S3W88G4D4CSB798X07SAYQSA2Z1H6FDHSS5TKJ4R4VECFMAFYBKQ16DN7PAVE6XBBY3E1V3FCDP3GN8GMHNESF620P7SY9YA43GR2R75BHESNA6V16FSFACFJ6PZM5X80WYY99Y9E0352BVBHC5G86NFC71KBYQDEACS8H8T4VWWAVZD7NKCFXJRMB1E4CX2WTTB6F3HW8J1GW6AW15BYMXHMW1F6WGYBFY0FZY2MXKPE1RFHE9VD449E0F5PJD7F6AH04002",
          age_mask: 0,
        },
        denomPubHash:
          "EN3MSEP1VV2VNQHDHMVBAHMTK43ZNJS7WVSMN3PNX8WM3P9A379HSCX39N0QQFMVCH5RQK60E5S5338JFBHMXE9RAN0KX8N7MGXQB7G",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "735NB61N156F47244BWB3AQ41GS9TNZGF7R9HCXJWZEQ87PD8YR9MN586XETD3DTHS3H975SDPHQJPBKG67ASWAY2GKBTE8AXZN7018",
        stampExpireDeposit: {
          t_s: 1684082348,
        },
        stampExpireLegal: {
          t_s: 1747154348,
        },
        stampExpireWithdraw: {
          t_s: 1668530348,
        },
        stampStart: {
          t_s: 1660754348,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 2,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000Y47J85AXZVCVFPSJZPZ8THN1XSB8JSGBKAAWFNZZB1YAVKZY1C8SNRZ8J6NEQ0YY7R8W3JPJ4Q6NYJHE2CRCEBCRS3EKZPDY4AAATKVFY4MDBCTXZZAM6ABD8D180N5XXS702RM7W0N1QPE7HW661J2BHG6RT1EJJKBQZJ06EDJ5CEWQ8P90N5ZDZW4DK0KPPY8ZA15NDT97TDG1DGD9GAQMN4GAE2S5P0SQJE7SPPFP8W2M8PYXF995BH5QJ70W44NF434SND5K1ZJX7CCEZE38STA6777ZFQC5PKWJDK840DW3PRVNA6TNTE9PVY1FQFA16FKWJFVAN86VBHQ1NBWVKBFQ48XY4C3BBF5ZS0YATTRQ2RKBE4Z6WV5MYFK912GKBXT4VMR4MJRTM49T92CYSD04002",
          age_mask: 0,
        },
        denomPubHash:
          "EQFK63S4SB9APG91K5Z54XNP2VVVAEH4TBCJTESKENGM0GYREVACD4NGTGDGEFPR6P8938NQNYR6NE8BN2WGS4W7HDYDPKSTF6KZXQR",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "23FRAVDXRSDPMM60Q48E6GGP02ZZCVY9VQNWQDHJCG7F4YSTX95P9BX7FXNKXHY3Z169SQAD5GVQH5CKS4GDKNKSTYJE877KV8C381G",
        stampExpireDeposit: {
          t_s: 1684082348,
        },
        stampExpireLegal: {
          t_s: 1747154348,
        },
        stampExpireWithdraw: {
          t_s: 1668530348,
        },
        stampStart: {
          t_s: 1660754348,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 32,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XJB3KDZ32BS3BR845VMEDK9DYH4PQ10T58CHYYN9XJ4ERBNTZKQQ85YHDNV1RKB8JMG8KDPF9NWGPGJN5S0SV56ET3XWA9YVGY4KGT3W07FENHXMKYMXX8ZPJ0DX5FYG0Z5Y94MK7H7X9KZ6MEKMF5Y1G4FKK2SH5WS2MQ5FHD3DPKRYGQHSJWX0JTBQQKJQEMK6QT9XCC5J7VCJT304JVFBBXGX6YTC77TGFVWVP6R8MFHD4K9HH6TX3ZZ76BT37B5GTVTFHTWNXMHTY3E663G6Z7ZE6TGBPJ75A09GPW48Z29R5EKRF38X7RHEWVXVHGZ42RB3V786XF7BBXYCV499WBJZ1HH512XB82630F4JGBG1ZQKZY7FRHAJKGZXA93QV7XX016PN2CKPZ8R6CF3D8H04002",
          age_mask: 0,
        },
        denomPubHash:
          "EXB3JJAGEMM9ZYKP5VFJBBTETRJN7E08PE5ZQ6XQY2444BGMPYPXV1M4WAKKW6SFHSSH8V6DAX440199Q99QCJGKQEBYVPTPXC2EHF8",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "59DGYN32JXP4AEY28ABF2RXE4A2Z2DTQ9GMC1C50JA2HMD2DRY1DWB4PRK2889831BAC0QV0348RD9CF2H2WKNX6EQ1J455Q0PB6Y30",
        stampExpireDeposit: {
          t_s: 1691858048,
        },
        stampExpireLegal: {
          t_s: 1754930048,
        },
        stampExpireWithdraw: {
          t_s: 1676306048,
        },
        stampStart: {
          t_s: 1668530048,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 262144,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000YRJM1KTJ35RXF5PDVF0HR15XDD5VXCC6GND37H7GTF12ZY5C0NXSKXS2HH0NTHA9X0RMT12K5XVX52PEJ67XQYT8FK0HP2QXX4W0QBYR1MDC6JF8DZM72HFPMKRJAW979C3GNMCZ1PW3G0H4MSH47BP3117WY9DZ7SB0RQZ23CZHGZHCKVQ3PAWBEWEKJTSV9EB05HR14GMGS0WAT9QS5DCMWZ5CVVFEM5064TSHGR0VVNSSAQ6PQQ23DFDT0XD4MBJBTK1SHJTGWE6160KYW57C0V56MYEPSMVNDRRMR46GRNT5D4CZFQNZNJ30F8H385JE5S5ATDTNPJGTMTFJYW0S7YKJEPE8P58WHMZGN34KG7PD3726M9GT3F18968Y9ASBRNH9ZMDPMHK361K5ZMNJGS04002",
          age_mask: 0,
        },
        denomPubHash:
          "F909KXX28Y8RNM0T6K458771X8GF0MDDWJ9S30FJF3K3GFPS8B763VW1X8329X7W0KF06VNSF25F9N303CWVNWDAY1MDM7SBJQ5DSW0",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "T03J0H6T6VM6XARVT68PYJYVZSQPC5X5T6SKRBA2EHW4B75APGSZHTE5F5S63X0FMH58NYXNZFQNRH687R157ZR93MTQZSNE4RYJA30",
        stampExpireDeposit: {
          t_s: 1676306648,
        },
        stampExpireLegal: {
          t_s: 1739378648,
        },
        stampExpireWithdraw: {
          t_s: 1660754648,
        },
        stampStart: {
          t_s: 1652978648,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 64,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XAD37E6SBV59BBATWY4KY47WHVBHMCYTZN4JTM04FGR0P5AD206JCKCMTVWJSEXZJWD7X7ARERHBWMG0XJ8Z1AH3EFK4VFHH8J4HP2KW5MBEB002HCNN633DRND1V0RJ0B9YC2SVAC27RE5R9KST9BGBD5P3VN6X0HNZ2854F5ZQCFZDQYEZFDQHN0X6859B43PRSHHVQ20R45ZX443NATVGV45X9DN61FNGHKQ2CAJTT5YWJMK2VRZAX16HFGK5SXWQ0MR7XX60H0B3J2K846DM7ZRXE04MTWY0VXBDGDKVGMEZRAGZNFCJDYNR0ZFTM5RCY9ER36SJ7M56EQ6TBDMKA77ZJ0A9170X6RHYWKXFEA3A2T9Y0FHJ9CGDJZZVE7NXB6VZ5VRVQW6SSZ0J9XC0V904002",
          age_mask: 0,
        },
        denomPubHash:
          "FFMYK6BNXSDQXW11N4VF45ZBSKFNXHFN0FY5DKAE1ZWS66GZTH4ZMMZ65NSZXEJF6CD1E05B0EHNMQDYNTN867J2ZG03B8ZCM9VKEY0",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "9YSD8YAYHS0PXVWDM96AMP9892QS4FBTNK603XZ2CZMFYCQVF19PMT3RT986B9K2VBNNQKJXDMGJPRA35KEPP67Z4GCZ06J12V2NM0G",
        stampExpireDeposit: {
          t_s: 1707409448,
        },
        stampExpireLegal: {
          t_s: 1770481448,
        },
        stampExpireWithdraw: {
          t_s: 1691857448,
        },
        stampStart: {
          t_s: 1684081448,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 2048,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000YBS4GSFSFBZ6C81NK9SSBNPW1YK7KD178YVN43ZCGN69XTY0SNE6ST5Q66J8DFFJ5X2A11Q3CBCXMHJVQKE745BAG9PZ5Z1WE6M91D8V5F16WEE3CM9G5TV4FWHV91ZJCR7K8Y7HJPAJGYV2THFJJE84193VP50BEYND92W253G3WD932EYV42X6XKZK4CDCAWMN24SSVN1Q6WKWYFTFS2DVR0MF7HKHSQX08D084K92JQ87TJYQRQP74XJPJ8AFHWSESTAJ74NNB4VZ3GWWPR3CJ3KB6THXZKHNTYZWJN1J2DYA2MV7E1H3N45M5C92ZE3QNK7T2E5W4XAGPZTTPT0J6FGX0G6QYPTY1PJ9KASQTMPJECKXGCFMZFRE8TJA6R2TW6A8CW2S713XJCCX3XE6SV04002",
          age_mask: 0,
        },
        denomPubHash:
          "G3KDRJ4X4VKHV8DQ62K9276XGQJ8BJ208QZ6DVC9RVW2V8K8VNQSMSA9TN7F2XPRP3BHK4DJKZJGWJ9NZ98ST4WMGCM9A45BB4375C0",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "9YPKYKX29GJJ641P1XSDA4WY4SXN587EGQ43EAZ82AR6PJ3QEQV1K9TSYGEPYWF5WYKTDKNJNBCD2CJSPGD508SWG6023A8XEWXNC38",
        stampExpireDeposit: {
          t_s: 1684082348,
        },
        stampExpireLegal: {
          t_s: 1747154348,
        },
        stampExpireWithdraw: {
          t_s: 1668530348,
        },
        stampStart: {
          t_s: 1660754348,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 65536,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000Z5Z7M5ZVNM2YWWA2QABYGHAT71MACS90D2TZ5V4PP1HXS3FB4WB11HVK8YAACKRK5G85K35T7HWVEZB84X9WZ4PWZQCJ041GRYPDQG41V306QBWF2TFWZVYEXKBK2N2VVZR3CXNNP5KTHS53Y4ZAJ7DAD1275S4V24KAQWQF6476YG1RP1FYA8Q6BDNX80MB25T6HV5N3V8DC9P7MAXSPGY3PY958P6H92H54RVQPHD55TX5CWDEE188A67RM5PNCM3ZTWEGCF87SHM5HQRFH276PAFSHAMXY7MZ74FQTGM102EE6YCRBBXE9D51BEA6XZV657ND69XX6NA2HWDE1GETCXZQ0CSD7WK5J70KGEKYAYE41MM6G6WVZ2NRZMG5AS3H6TK8JQ9Z0GRBEF5HCESB4H04002",
          age_mask: 0,
        },
        denomPubHash:
          "GMDQ4R4YR352H6WMF629FZWEPVBCA9H4Z8BBRS82QZ1N4T9TK9JG6XKH066ZR2W9EJ9WNV3DB17GWS7KBBNDX46DT1FB2A0WXCVZYM0",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "PRG2YPFXYR8VNNVDJY9FKJJXW4E3XEKJ4NRT6AC7BCC6M3Z751WARJXWQGJY9KY20NYGM4FXH34825TAPM154MZ4W5QBWCE3MH37W28",
        stampExpireDeposit: {
          t_s: 1691858048,
        },
        stampExpireLegal: {
          t_s: 1754930048,
        },
        stampExpireWithdraw: {
          t_s: 1676306048,
        },
        stampStart: {
          t_s: 1668530048,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 65536,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000YATXXTJNMXY6DAHXNK0BFPANQB0200GRVAPF0P565WQ0A16DND9PAMJY398NHTZC8EYWJW4689E00QVX5NSHT4TEYA5SHXJEP1GB8R86K2K3PWW4S1X8N7JQJC8CDY5S3H0XD3WDQ45QM6YFMRQ9EZ8KJ1SP71AV5Q650TJS492P689SZJ71AEFP4BY4WSK40W5BAPDK8AWCEF1A9JMX8MF4MRZ1BJM8YZME63X6M9B9T97PTPMD6PKQT396PK5YC4264BFJ9SYR03C1FFERGMGGK6F89DS8HNNB5237K1X5MKEBZJEQSMPG4PS7QS483PK8W3GYGD73VEH0XTX9J71QNMKYHTQ4860FJP38ZGHV2PHSZWEEF0ECDQAXEG5VSVZ9SA4T7BZ885R24RTK9FGSQ304002",
          age_mask: 0,
        },
        denomPubHash:
          "GN2PZCM23K44GA44GTFWDK3YWXHSD2RQH44HMBZKMD43YGDTKB2VX0VZPPEJ6QS3HQ8WNWCRKYCSX3J98N2835VHC0ECDT7QVSJ7F5R",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "MZJ7MGJ74W2HAV692JRWCX8MBRV7PJB2Q9X30Y1XC70Z6W71BCNJWAB502WSEMJG5K6WF8Q1AJ45C782JTWKM6DAC6XQWPFKG6CT02G",
        stampExpireDeposit: {
          t_s: 1676306648,
        },
        stampExpireLegal: {
          t_s: 1739378648,
        },
        stampExpireWithdraw: {
          t_s: 1660754648,
        },
        stampStart: {
          t_s: 1652978648,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 2,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000X4A0F6A8CQS717XF4GRW230S9B8XZC4R8A8QPXESM8MC71G6CTAAJTW8TYPZQHMQTM763QAAMVZZYTJ2TY8Q9DHBJ5E690WWP1KAANRCY8NGAN63XWWXBPXT1B6141G4YG95PVZ8T9Q54PFS6YEFKD2XENCE2Q32ZDV8TTEGFKJ73Z4KAC7WE78HB007V9PSVQXV475T61TXTHRGATHGQBFCE746FCX1KQWKWJVEB8TDSWH6J8F98MYGKF5GTHJ33YC7ABN3SNNR00KR5XZHM0QH0A5EEDBQR236A02APBP18T9BFYAMAQWXMNKD0XGNHP88SFTFNHXQ203CT3NB893T91V91Q0DBX3RDT9JYPF83JXSF3HC9E2R6BG96XQ6451FW8PS1BN8WKRM77VR1Y4V5V04002",
          age_mask: 0,
        },
        denomPubHash:
          "H36YXHAAMBW58BF2NJAB01T2T6K4NKMTGPNHPEBZGQ87TG8AJ7SWBE2G70EVDP2XX6960SS4GBR2A7M8KM3A93WPYKSQE0S7M0Y55X8",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "DCCNBBFAQADJWY46NDGYWBH7Z16XKRH520N0F20VZKDE25F8X31S61DRFVT18PHV8JXCAMC00SZN16RY1RRYP1PGYT145MAYG00E638",
        stampExpireDeposit: {
          t_s: 1691858048,
        },
        stampExpireLegal: {
          t_s: 1754930048,
        },
        stampExpireWithdraw: {
          t_s: 1676306048,
        },
        stampStart: {
          t_s: 1668530048,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 131072,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XHQBGNQQ8HXB8V22AWHGDAM21PC8EVQ62AVJ5Z7AW2C6CDZTTWEQZQ6YNNT777BRG4H6WZ8BG42236ZDEPBVYKFFB438ACA5PBHNYJT3RHAFA8SZNTPF1ZRMVD33VA4MVYTH3Y4DTWCMFTW7ENS4XZ8SE10SG6CC14X12WXEYPQZEB84CBQEC863DM84M32KW19AJQG0XNRKHH0D23QQV535Z4J278XPHGNWM025BJMFTFM2H5NJW7HJJMQHXYJJ25WDYY7ZCHZ69QX0DDE3GV1JVS4WRRDN9210GKMR3MMS9Y5N6ZFKE2PJ1R25RA7MDEH9FSZWFG0ZCKS5F7QVEB09XXDDSXH2J0DGKSPVWR4ARBV41D0XQMVZD6FP6A8HXJBAGVKE6ZZK6GCW7X2F1237DK04002",
          age_mask: 0,
        },
        denomPubHash:
          "J7XTNDZQ7K70RPENXKTA9AFSFSACTC9J85EQ7YDHEWXECDRAGHYPKQVYT324SGS4YGE802KBWP903AWERTP6BHMSFEJQEQ8J5ZYZFVR",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "TQKQNWGMRPA3SD66MV9W8R7XZM7VEBKAN27BY8Y6VFN4QY9K9D8V45HWZZC5DRPQNBY2ZGDTWB4Z6EFZSA0C1J50BEXYZWKP7FDCA30",
        stampExpireDeposit: {
          t_s: 1707409448,
        },
        stampExpireLegal: {
          t_s: 1770481448,
        },
        stampExpireWithdraw: {
          t_s: 1691857448,
        },
        stampStart: {
          t_s: 1684081448,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 32768,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000ZARCT99YQ8AXKQZA6CZYXV76YPZ6AN7FKME84QA99PJJ5GRZJ6APT3M6P1KN9G6TN3BV61F38M9279290QWPNCX1V5N1VH5QGC0DEMMVKXC3CVH4852RTFCG26JKTZE14MB3PWB4GXYQ1DNA6C6D5F963AGJ7D3WZ4CQHCAFWECAXT1M72S8BEH4B3GPJB11KA90SPWVG22HXNG3JRFMYYHKM2W21X24W3AR1JZ9Z1TB8WFA1MRAP98EKFNSGFAX2H7Q90NFXN2P7TRNCVS955BTEYBPF8FWRW78SZPRW9QFQ1BGXCG6812N9714222277PMN4VA7ACJRTS65HTPRDEKE3YSDF7ZH6EYCAREAJN982XZFSD4HF2YRMDTRXGJZ4CPWFG210S12J3N06DJ2TXA1304002",
          age_mask: 0,
        },
        denomPubHash:
          "J9VD576SJQ08A7KSHNF4VWNXWG2PHTH3DXHRRNJE0YJ27B8A5BT067M3G8Q83W8GPKD2TJARJ986Z1ZTKY37PE6G411F00D2RY34E3R",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "V74GFJ4X5XY7GKWVRBG82RJHH8WQ4Y0Q20RHHJSQERBCQHAQRPRD3JD98E9ZQPQ1M0TMWNGA0YD0DK4E0DDTVM88M2BDZ91N23EZY08",
        stampExpireDeposit: {
          t_s: 1699633748,
        },
        stampExpireLegal: {
          t_s: 1762705748,
        },
        stampExpireWithdraw: {
          t_s: 1684081748,
        },
        stampStart: {
          t_s: 1676305748,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 2048,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000YWTG5JNDTQ13N9R2PFAGECYWY7V4BJ4F03DWS99ZM3T4AR9MNTZ0W92N4ZB2DRPNT9QHP6B8HZJTFA88JZXEKPPD0W64F8GZA64DXJB4H7VZAH5Z6V8K6VGF1XTHVRH1PS52V5GMB9BERPA3RZX86RPMK2G4BJ5ZSH29CSGZXGQQ4SXH4JKNK17HVFQB7FKNBYB1X42FJ6V0PBGRHD3B4WR3AEQ90ZQVYVB8S3BAH5F1CZKV21MKMCMSZGBN355V20C6C1BJC453B84XWT7F35EPYC0P8XBYJRQ03N1DN49QDF85WMMFSKQKHT500P4WWKXV5S000H5B5AG7B4FM73J2D6BEDEXE77M3V8CWFAWF2J1KRYPQQYDXM33CVHTDRADD7H5PAB7KV1KVJMGFGCEEAD04002",
          age_mask: 0,
        },
        denomPubHash:
          "KP09R6T2QGH82KX2GF8C8ZXQCD3GYV4AV35FDD6BZ1VWKZEGXJPZ4NN978BRZ6P0FS81P4103YB2PWD5T5CAMCE0PE685TMD7V12AH0",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "JQYJR16991BN3B8CS1Q0YKKK7GZF169B0A1RN8PEZCMHNH63WT7ECYMTPXESJTMKDVN34CGN374JXVHVQAFS46AEPAEPQAYMN5H3A08",
        stampExpireDeposit: {
          t_s: 1676306648,
        },
        stampExpireLegal: {
          t_s: 1739378648,
        },
        stampExpireWithdraw: {
          t_s: 1660754648,
        },
        stampStart: {
          t_s: 1652978648,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 8192,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XGKGKV1GY8Z1G72VSQPF27C29A46DJP34TJYNCBH6VV32S81125X7QKZM7SEZ886X6RR1JVP8XA98XC58JXT80Y91RG2ZM2M7QQ5KY3TC7A0ST7M3G3R56YY3BNNK2WMDFJVAAPE878HE1P7BYART5ESMHX8YHM2DN5H3GTQDS2DQY21VRZHJ9CS2PT58H4DTFBGFRWRPYD5EG46Z807H53G3AYAATD7VB8NZ1FH18AP7Q4NZC62QEW0S8K4Y7WQGBJ59D0S0EJA0W5NFF0MNZTMRMZA1HB9KGGKPCRWE1NH4H3GCAAD2PCGDZ1NE3P7QBWGMVAD9M50ZVPMT9NH0HST43AREHXDXTJRJCG4VV1645KT9NKT2N1WD6MRG8ZKVKANACPSPQJW0RGT8CMYQ4X92B04002",
          age_mask: 0,
        },
        denomPubHash:
          "M19GBTQP89BM6HYAEAV8Q27JE6T119SYVFDVR9FKY180NJX8R5BVXPYZN89BSA8NVKM62662K35ZF029GF8P54EQWPSVQEPAVDEVN3G",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "K37PWV4PDRQXAJ9169KTQ9ZGBZ2N1BVYK7SET99JKRD0KRFA8V2C4WBSR2VXDYQ2QP71B5QNAVRQ5Y59VMT3R3RMNXEXA975CMXF01G",
        stampExpireDeposit: {
          t_s: 1699633748,
        },
        stampExpireLegal: {
          t_s: 1762705748,
        },
        stampExpireWithdraw: {
          t_s: 1684081748,
        },
        stampStart: {
          t_s: 1676305748,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 2,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XZ2BMX8JZXSHS0MJ0ZZ85264TNBTP06C2P7HCDM0TC944P6C6JZYZ4Z632QXJA2F5XCY36G3ZZPV41A95QXQX7ACK5MR9F3B2JQKPB6JGBAP23X7J6VQWWWXX3FNXERDFB2MKZN1T56JH1TDQWKSP3M2WH6VEF4M3XRXAYP9ZZCX4TCXTB34ZXYJGY5HVPXK5SZP5XJ2511J7GE8GQDF3XGB96K4NDDS3WGRK0F5NB0C9SVRWC9JWSZKYH90H8VRR0YNADTP8YS2XVX8VF1RKJWD1QESANZ0DNHK8X4GW2N14NDNXJ0GF290GJ97EC9WQSP65NTVM3D83Q8WWNN2G6T5HGX03RZKYCAEJ187QBYJ4X4Y1AGCHTNJP49B7BZXA4A88XEJD1GNTXKP3BNSS34CWX04002",
          age_mask: 0,
        },
        denomPubHash:
          "MD5PAR7H0ZB5PJKM09DHFPF1JFW1DK4MKK1W88RQMJAVZJHTNC7ZEHWN2HZ8WE7WJNTQ8CPC0MQRWM00REH1N5JRHX6BZC1P1V2A9K8",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "PMQR80NT67MGV3W5NBYZYD568SZ9S2FMS55ZYY6DGYP1K9F39TXPMQ9AC1B4E4QJY6PJ20NPMC022MJPNHDKB7FRW2SZ7CX4YHH542G",
        stampExpireDeposit: {
          t_s: 1676306648,
        },
        stampExpireLegal: {
          t_s: 1739378648,
        },
        stampExpireWithdraw: {
          t_s: 1660754648,
        },
        stampStart: {
          t_s: 1652978648,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 8,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XP5W3T6PN7S132S28QZ2NHEEP0JD6H46GXNT7F77WSPE8CN3N71S0MKTSYCMZDP4Q20NPPP9K6XAA59CY8G84DXCC6KQPBFN45HHA7ZQ0507MQDAFBSZ0ZF927DWF5XWTF5J8RNK639P36M9ZWEA8FZ1N2N2G6Y2QK1PARJAR4ZRQ71PBD6AMEKPYPMSXW4NZBZ2GM1MVGAVB9JTBWDCCC4X4BEART7QKK6C3YWYYS0HCXNKDXG0N76TBT48F6CTBS3SKXXEV3EHE1KV0HJMKCMYTGQTYS8MJBQXHCXS11CD8W8FFK8C921N1EH6BJNBNHPA587RQ28R5B3FBNSQY4KDX1JPY8HA5Q2M5657RWTPNNHS19K4SFCASFN0B9SSJ44X8E289TS0QF4SJJNFY766WK04002",
          age_mask: 0,
        },
        denomPubHash:
          "MH2F49X0Q5Q46ZC0J6CDJZ9S99J9NEC29C2FSYZTG3H2PKTMQS6S0HBHN3Q7JXZM6CMRT41ACWQD5V2BSEADR1Q395RF378S0XJ7XQR",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "MN5Y2T4Y9X8AQNS3MT3B03GAC24JAJBA7S7DAB3KB865T78G1FTCG74K4KKADPNSV3RPCR2WMQAY4XSMTA59VMRQ4RM69P9SK4ANC28",
        stampExpireDeposit: {
          t_s: 1707409448,
        },
        stampExpireLegal: {
          t_s: 1770481448,
        },
        stampExpireWithdraw: {
          t_s: 1691857448,
        },
        stampStart: {
          t_s: 1684081448,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 64,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000YCR92ACFEN7BMV2750MNFB3P1DDF8KA620N3XZS9TYT3TR619N5K3ZBT35N26G400R4E4E63C2SWTGAXDA9BFC8FXZPQFPVRG3SB3XGS1MTK5ZSFTCEW3T2PRAZSNR8KCVE42K65QS7MB4TVPHP9K81PPCPV445T1KJ450VQX2P3MJ6RK2G1E3JYMCM27HNGFY49G6JWZ6CNX2XB89FCKWRXF2M93S8FQG39GEAPEWS1Y7KHNN2XD4HKTFPJHYDH3WVDXNDBA8MN254C8GQ7RNKJN67R03MFP4R78V432T42J3FQTYFKECRVRYD3TGFPY3RBCGGHJ19DWGAY5Q60XZM6AT61446NEGVVTWZXT9EBTNE342DNPPA3HFZ8TN2S7CJDD83S7MH7Y85VPTZ6A2MK4Q04002",
          age_mask: 0,
        },
        denomPubHash:
          "MR1ZBMDQX04ZXZ2TPPKNEPJHVM55FCRZZ1QPCEMPDZD51PG0GQR16DX49KB6Y7HZ0NM1J1AMJCKG44W4P71ENB61J3H3SNAPYJ2DV9G",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "WCZFG533FFGN80Z672WEG9X6V8RRQZCV262VQYBW7E2WFNB07XYZK1CMKH6KY4GEK6QYDDEDE7DZFE9CD3EGBZDMSFNBMQF4TTNEM1R",
        stampExpireDeposit: {
          t_s: 1699633748,
        },
        stampExpireLegal: {
          t_s: 1762705748,
        },
        stampExpireWithdraw: {
          t_s: 1684081748,
        },
        stampStart: {
          t_s: 1676305748,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 8192,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XDGZ6TQJN4EAF15NHTE9YSZR0T0ZYYPD93ZJ3M4C0QMY4WP4ZPM93W5RV6YPFNJJ602AS22XYVFDHMW74B6PW88NBA87WGJXY22C84RRTG40ZEZ5KBXCF60VTFCX3HPT1SADY44AEHXNC8JEA5KPQGW7YHXNDJR8JA08RTMH3H5GCEM4YSV6C2B4T3QHEMWT6GDH7X1PBNGYMKP6BJEFGQDJ6YPPXZ5XB51QCQG0Z914DTP648Z328Y372BHDRAENW88WWR786TV8XFRYBZSX6MY4WDHJ9PGTX61JB2S6E8JM4AK4XFS45WTTM8789JH433GZQ7T078236ET9KGE2QMK230KWYYSNFGZYXWVMP3KYYRNXG2BYZ923RMJBV717P99QBQ6NKBBDFPA77PXVEQJXD04002",
          age_mask: 0,
        },
        denomPubHash:
          "MS7BMYCZSBJCDPV036TDNXG39172YBK80FEFN0A9DVV9T83RR2S4KARP6X6CWKC799GTEYXQXN4BMRQNMREPEZ5P8Q74QG3N6FZQ9N0",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "WGY7WW6JF9EK6DBMC5JXHK1HXKGHV6V2RP66SB4Z3BP5YD964S6VVFPQVY83YHRCQ3R954K39SKPXTH24H7MR8YJSPCNK6RYEEYJ63R",
        stampExpireDeposit: {
          t_s: 1699633748,
        },
        stampExpireLegal: {
          t_s: 1762705748,
        },
        stampExpireWithdraw: {
          t_s: 1684081748,
        },
        stampStart: {
          t_s: 1676305748,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 524288,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000X2M2RZQEQGPDAPWSSX468T9YT4E2EVX02P11HWM398589CHGCB1SRFM8K957C0CF7JYF74RCANYW5A17CW504W4NHTAZCPHZJJX5TQ29Q4TEAQ8VRJNYEMHQRBQ563YJECJ5WB1HM41Z382SHJ3JZ1FC69ESCM6Q3RKKP3YFZH83NHFBXHR836VXQVS329F753RQ2Q359ABB1QFEE64F4SPT66GVYRYFF2V76VQZ9EW4C0C8D76P8FZTGWEPMJJZCVYFNB8K4TNAC0PYQK8MYTVGZDP7SEJDXC062C2EHMCARK1JSMT9EZPX76YZASDG3SVY0P9HDGTCJN76EJ4HT1YH1RHMMAYWH3Y0VF5HSPQB7NZW2TFDA3CXB5YHKF0064DX86V3W18ZKJ7M707FZWX0C104002",
          age_mask: 0,
        },
        denomPubHash:
          "MV12BFTVBWQXQT023CYMTETZ7Z7PT5P1RK4S8RB0ZW67E1188HXKBKEVHQBCJZAENWF0XGEYZXFHE1Z5472V00Y9AVS53K5B719RFBR",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "25YN7KW5PPGT3YY91C0JGC5F8GNT5T1HDGD8VB2PXMEW7VFC1SA9R8G3NZB3JMBTQMVCZPV4249GKYJ4SSEGP918YQAW5P3HWT2N82R",
        stampExpireDeposit: {
          t_s: 1676306648,
        },
        stampExpireLegal: {
          t_s: 1739378648,
        },
        stampExpireWithdraw: {
          t_s: 1660754648,
        },
        stampStart: {
          t_s: 1652978648,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 32768,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000WVZJ4VN7JYDCRN64QSTZPGRA78R3Z8273DSC8HZ6H9SQ79TAPEBF24XG9VW6N0QVNYY764JNSNG6M0KH53A413M1JVHPDMTX4C73S9GYTHR23EFYJ68PXK523781AAW3FBXTHHEJDWR99V1PX2BD21DZ81P3HDJRHXK5ZH6PD87TMG6QJ8KE8W85XYEQMHXGJ2YRN6Z4FH7C3ZM7PK2J1QW7Y95GY6DVSAH2344FT8HDEHQKFMB8BSXWBS7M3RATA0H0AQBDVSKMT8YJZDQ8T5WBJDYX637JDTRMR1F9KA0B5DHESKS5S9PE396YE9RBPYWVZB3SFQWNZSFFFJCYZ6MRM2W7FB7T4XZXT788V6KVSKV6CY1X61CR7N24BMTWQWE0NSRQF5TYRWS84FV5NNGGTQ04002",
          age_mask: 0,
        },
        denomPubHash:
          "N2HPHPHG974TSESZCTC24G1CSZSFGC0K3ZK8CGE0PHJE4EVT539A14GCNASMGVSET4KRH8VTPB5TGFSDWTD5SZBQ7J5J9BBXCMTKPG0",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "NHCKNCPSRCV15C1CF8T0K05F1NPCKJ740748AW0F3V8FEHBWXAYQYH81RKQW7F0JCHDF9K2TRFCSJP1E1FFY1BK1V2BSM55MYEX302R",
        stampExpireDeposit: {
          t_s: 1699633748,
        },
        stampExpireLegal: {
          t_s: 1762705748,
        },
        stampExpireWithdraw: {
          t_s: 1684081748,
        },
        stampStart: {
          t_s: 1676305748,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 65536,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000Z6YH0507MQC8N3P2JH71PWGFW2W24FMBNTMBXDMQX10NW8QEEXP1KBD0QN8PJS6M7DP806JY1ZM1NHS61DHEAACBBEY0FHC1YAHD1J5P5ZY0DD1P6MABVX61E25M7MBAHFEFAPVHE9AFZ3EJTDS9NE0YHAQA3M0FMC100CEJ7J9H9DMYT3G646QD347XN2WDVFCPSRN9CDS3999FJ8B2EVD1444ZWXPGXJ9RTB3P1513Q74K546GB9SX2NM5NN1BMMSNRZCMNS3PD6KY4QX7GP6K62466PF82WAEE2WCR6AGGF3JP9ZZEBBK7Y5XCG67A87A4T9MGFV2S2TZTSEW62TTF02CS5BD8F3WMJW9ANW1Q0CYGA5PSQFFNNJR2K6SHMFWNHVXBMJRGZ46MY826Z1E3B04002",
          age_mask: 0,
        },
        denomPubHash:
          "NSC7159V6BVF147ZZST45KZ23A6TQJ4RZC0YJ6KR54Z4GHTX8XJH37M8T6JPA13JFF8A9DQZT4MJM678BC3BA5DSQ1WWSXMHFE32J90",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "9YKXKPS4JYAZY7Y7T0GGZEC36Z45K0T2P0K4JS2AB3ZSV4YYBBXM0TP02RXNWA6TVNRD1W7FNC9C081ANDR87EYZWV7HH2YJDSC8820",
        stampExpireDeposit: {
          t_s: 1676306648,
        },
        stampExpireLegal: {
          t_s: 1739378648,
        },
        stampExpireWithdraw: {
          t_s: 1660754648,
        },
        stampStart: {
          t_s: 1652978648,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 16,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XAREJKB18A2H5JX0PY18GD4GK7BQ8WAPJ0CSP7MHWJD00EVP334R7TZ0D3JJV8DVJ62PZZBGTJ18CV2EFEDPE9T71MM3V25GWTBFF9BC2XCM7NMGD9JQ70Q6QPW34146BYFX1X8WE1MCT91NMVPVCZ95PJ83BHWB3MXBBV38ZW01RXHNZ90NY8M099TX810ADD6QW9XM1465H5NFB39YNSBGR73F2DEDB7A3YF2FHZRSHWKK64M99R8SM8V59B4K20CHYK8CCJN00JB9QCVCKV9AYCBMPWJK4F98JJ02BJWKQ222H3C159XED9NE90K1P86GXR4AJSGGBJVZK09DEVKAX1FWETFHF978JHRQTFC8BVR8X7K50J04EC5H69HHMT4MWSSC0YCB87F9G1YES6VJR704002",
          age_mask: 0,
        },
        denomPubHash:
          "PAVD5GR3KEZZMB5M2MW5X86GS7XXD3FB0D5H1RFFPRXMT94K5YA406KVC1GR69AW00390XTBRFZK1WES2Y3WBZ8689KWRQG5E4PAACR",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "P3BTKW4Y6P6YADHN4PG5GWJFZ6N7F7FXH6RTFASH7PS4G68A47JSH4ANKG7W4YZDED6QYT2D8V5NJD9JYT90QSKPXCVDW8DBWRZMJ20",
        stampExpireDeposit: {
          t_s: 1699633748,
        },
        stampExpireLegal: {
          t_s: 1762705748,
        },
        stampExpireWithdraw: {
          t_s: 1684081748,
        },
        stampStart: {
          t_s: 1676305748,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 262144,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XACSY8M2AJ9X5SJDHVQFX63PBH5958RX48898JC0R6PRJAPTNE5Y1QR6XYH6MY7ENGZTJ8V73QFR3GFMBTMYS54M3R8YNW5AYQ4TR73AQMMW7TW13WXDSTYGZQGV032MNP6QQ7TD29WBRAHJW1X53XR0ZX7G75FV60K2NBGK8BGD4XD5PNB167VTP9ZAMFQQKJ3P8JXQZQ5TRZYEB5FVWF7FFEXXREBPF67JPMJTTWH2AXHSHVYSQ2ZKAMCHYH9XR1KP20WVPXFEFTJWTH7MBJ1V8JT7KQHYB5ZA3SHNBAJ6RW4FQ690MGNR9XWAA8WXBKDFY15EP2H60DE785X8P7877KE6EFHKP9BBFHQBXX36H5RNBRGRHE0P57XQVFB1YB3DJ9ZT0E1ZVJ7ZX4M6PDS8F104002",
          age_mask: 0,
        },
        denomPubHash:
          "PEJB53RQH8XXZ003F5018RPF2VRZQG179WFC6YX7MH0TF00E7SNFSXAFJ1YBE7Z9BKANCC1NAK3DGBAWGNC26D21VA52GHNMV950SFG",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "2TB2C54AKG040Z2TMV279XJSPWC052N4AP371VF2G11CP6TZ1QQ5RDNVAH0NZRRJEWTPRR4MWWFW74QTF4PDQPM8RZWWCD55V4GBJ3G",
        stampExpireDeposit: {
          t_s: 1684082348,
        },
        stampExpireLegal: {
          t_s: 1747154348,
        },
        stampExpireWithdraw: {
          t_s: 1668530348,
        },
        stampStart: {
          t_s: 1660754348,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 4,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000YNT8CTN883Q7J6566GN35CNB37AAN0WJHJ0SFQRZ5EZRMJP4MCDXM9TTF95R2V8EDRX8QJFZ6DNXY74JF2F05HMS6T18BR78CZ8PMFR0T9WDSNPSFNT67DESR9Q9HGKWHKXZ60MC7M63QF62NCYJB8XSGEARNABQ9FYW3YHS1T4NXHF49MA1KFCESKE2XGZ37J7JEH8B1X5P2943N69JMAMMHJ1Y6G7KNSRZ4VJGNHJ51AF1W7C35E8VR8MGYKDCMGTSG0TG00W394S0TBGT989FVSHA3B4T1DF4G0BGG4GYVDQ74J9QN4TMN0K7TE8VFJ89BPQJYW6GJXPT7FS2KA8C1TT791VTKYSQX6X1Q5DHB8NX35J8ET3XDV7PNDYAW7PA4QBD6TRMH3TJ9X74A9XSX904002",
          age_mask: 0,
        },
        denomPubHash:
          "PGYDP1DTM0N5G0CA3YPN22M7P7B6CN1R6A26GJF6QCEMVNF9NGN0M84VWJ20Z4SDVJSBS34WC39HG3E4TGZAYFQEAFBFF3J8KDJ7H78",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "DT6HVF6E7F1JJEF48C6S3MMDR0Y7RCFRD60KBB833JQYPF32VC11K4D3N3HAYYKRDD61VWNR6THQ08ZHA4GEAAK5NVKCSG8P2KAX008",
        stampExpireDeposit: {
          t_s: 1676306648,
        },
        stampExpireLegal: {
          t_s: 1739378648,
        },
        stampExpireWithdraw: {
          t_s: 1660754648,
        },
        stampStart: {
          t_s: 1652978648,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 65536,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000YR6JCA7Z7B59S95YPVAZ6B31DWHF2V8N7AG0HA0JXF91DCTRXNP8MNF7ZHS8AR980DJCWFSETZVKP8T7FM0E5Q4X0R2CEWNQRCK0SQB26DENK2KYZEZSEQ3GR6DMSRDSH63VPYF563VXJE23VTZFBH3QZ3AJZ853M9A672G0PQY1P4MYZCZHMB6VKVEVGVGG4P7S4H7MCP9HZHAB41ZMGR1PPZZYMJBJN3W2NNT1SE5HHSDV1ZE10NYASZ5R2032TKZZPC4HCW22YFEEEAJR30JGJJDKNZ4WPQA12D045PCTKTPJT3DQM4V9YAJJHNNQ5D9YPRC57W3YADN0WGYNVQ245A78E7KR7VDS6G98EECKQZBGQ5E52F01NENSSGFAY645Q5DQJ03B48YHSJB0MDN62V04002",
          age_mask: 0,
        },
        denomPubHash:
          "PQY6ZPXEQXD75NM5KQMESGK1Q1VH08099QPWC38NAX3C5J83NKG0V40W7T1038MTAVEH6560170T2BZ0ZSY98AZEJC79A3KGV1DVRW8",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "ZD0MP0EACAJ0WJQCZW4GX7FFXSXYP2W9FDC699S8WCNZ7EAR974E0TMDCM2NSSEDSRN78QCR0H8QSV1SFJ8F97P71RBPJAZ27P6GR3R",
        stampExpireDeposit: {
          t_s: 1691858048,
        },
        stampExpireLegal: {
          t_s: 1754930048,
        },
        stampExpireWithdraw: {
          t_s: 1676306048,
        },
        stampStart: {
          t_s: 1668530048,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000Z580QT1TJP8J176XE7AW3BWJFRB9AK4ZC8E9YZR687PZPWEWWDS8764S5VKX0SX8ZR4FMPFFZ581GSA9P4S7GT2245XS3B5JFF4KQ65MSRDFA2TBGN0H48K7KXD8FQ20CVBPYH1WE2G5M6AEVHAFBJWYPCKFS6G48N3ANFKXN5ENSY0X5747ZYQMP9KDAF4019F5GH87P5A67T05WQEQC9KP8XN9H197E7GHA44S3KAJXYEB43AACC18JY17V3X7D2FFGWPDDXAX6DETFPM3FFVVH0MFJ30XWSQCX1TZS4HGN9CMB28HYFEW2PXE7C47JF4BTZMP0N65WK9JH4F3R7D1T43FF316AYS9SRDYGZ412C3XJJ8G91Q1ENNM9W4QPC19J9NMCX3YK19AE3GMSKF6DB04002",
          age_mask: 0,
        },
        denomPubHash:
          "PZQ3CHEXGTS8RBPFD06XD5TDEV52CADW5Y8V92D281595X60QWPHFH6PP1GYZ9CPC9R79794RY3XGQ8CVKTDE974Q2DW755S3Y6NTBR",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "6HZ4THJWDBDK6E8S4HFFVVFFC85B0V36KZ9JFP3EMBGHSG9MKQCGFD76YFJ3Q51FDP7PV08WE85KM2MJE8RYRR4D5SYJGRPFGMYRM38",
        stampExpireDeposit: {
          t_s: 1699633748,
        },
        stampExpireLegal: {
          t_s: 1762705748,
        },
        stampExpireWithdraw: {
          t_s: 1684081748,
        },
        stampStart: {
          t_s: 1676305748,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 32,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XVXG0K020DS1CMJGR6XQZ5FCZDHG9HJQPVETR4J68NB9TB3PJZ3EHHDVGY26WYAZ3KSA89BD3JR4HVJMP6EVN3YB0173VH85EHH9HPVRQ4BYX2F2SACDJ8QT6TKTEFJF34WDXHH1DP7474J12BMJW6YG886EYKZM7196FMVTDSXKRHYCDW1WFQCCB5PZFHAG7VEW3W6XD964XEJQPRWARV0M99VX789KQ74T6V64KZX28TBA2SC94P6BF7QBFAPMX9MAD8JHSTQFBQW379076W3G36X428E7YSMKYCDTZ6T4SRJ07TGXCRRS4GJHZ5ERR4JVZA2EV7RQWZR246TCSB3N2YBGVA4NGSRST4WJCMYFPKTAN3S8YH3BAXB3TRHN6TGYZ9S287PD2VAC313ESN61Y704002",
          age_mask: 0,
        },
        denomPubHash:
          "Q6PSM1D22TN8CG99BZAWYXDAW504QRHSF9YGEKAVS1H1RZJ5GNNMF0613EY5F97ZHG4XXXJE3WWPJGRDK9BYQSZZ0JEGTZHH45S3S48",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "D19GSMQECKQV3NZQCB2E715JBBDY7CHKKR2TY04RW148V5P72RD388TK770ZTM0FVW4H3MQ3YR7SX9WX7F60FVYK3CSZJY4992H020G",
        stampExpireDeposit: {
          t_s: 1691858048,
        },
        stampExpireLegal: {
          t_s: 1754930048,
        },
        stampExpireWithdraw: {
          t_s: 1676306048,
        },
        stampStart: {
          t_s: 1668530048,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 16,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000X8DBXYPB4GWRATX5AQZZPRAB6GBEJGZVKFHJGCEW33965XNX6P6SNERCAQ0NK8V93D4XRPEJ0F060SP2BPP4A521BAEEZ3R361G8V62KF0DQPZJWCVVE52EKJ9VWM5W5F4Z2ERB1NZQ7JCR5G84YZAC4N9VFF083RV02WTG7QS8SBTK98H0MMBDTP8944PMJZDTEKFD8BMWGAPXBBXDYXQARXE9AZ14P4P3XS5T9RE5W79Q23X582ZW5HHGQHKEDYGYSZ7JHFPT1B2M27SQ64XPMSPFMV9YK30E6CJPDT8T1S5VMFB820TXK0248QZDZ4CNR42FZAPCZRV4K25J342MQ674REY76K59QF4T3DEYEGYSBJ363TK7B5ZXR480CX0MDC139REK7PNSWEV0SM3C0CV04002",
          age_mask: 0,
        },
        denomPubHash:
          "QAJTB04Z1BFPJMFHQT639T7V40N56JNDK34AYR48NX1J2C2CBKNRAWY0DXEKPDFDWH1YK0VB1AD27DW7BKCYPX8PGSXZ1CQZZGADAMG",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "VK1HYAK0PE180FEGJXS24FYKMQ03YDND6V00TJW6TY9DWTQ5BHR3G772YCXP4FMNQFZJW6PDRM5P7CRNE1RV8RD3RQDER4B1ESWZC08",
        stampExpireDeposit: {
          t_s: 1684082348,
        },
        stampExpireLegal: {
          t_s: 1747154348,
        },
        stampExpireWithdraw: {
          t_s: 1668530348,
        },
        stampStart: {
          t_s: 1660754348,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 2048,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000WTG4R61ZNM68T7KF57736JK5F28SGD3HEETGCYKXZ2Q44AVT1MP6JS5B0W961VTWH0HG9H799Z7SBY619WCRS90DA79WB0TPSJ0HD73Y46XN35E5C09Z7QS85CFTXZ3SVCBF17QVXGXHN9Y8YA0GQA2WPYCQDVNAMN99P67WJHQ8DQ9Q01JK1S8HGGXW4RRMVV7W7QAKVEJXZBRFTVFPJTVKGZC84B0KF4HD4VJ372XSYEPWRX1D7KKSWNAKN98V44JKVE0ZZ1NR5DHP7DG4410HXXF6K7HDS3QZWQ6SFP4N391PG49M29FGDGJ034TB5TE18N67D7ZG634M276B5MVMQW79NNXD0ATYAAP0XPSGW1ZQ6MJRE5Q3ZAQCFZ4RQB8QHGYSGA4ZTZRF2GJ90DF75K04002",
          age_mask: 0,
        },
        denomPubHash:
          "QS8F486F060SCA7294V0H9HCVCNJGJ084AWWS24042G3VNTF9F6ER9PZ1YC5PTE2TXCVQRSYDHEG1NKBWM6JRXHEFDPFE78WD1CVZV8",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "GPZCCD4EK6TXWRPYQR1D1ATQVGQGJ2CRJGEECPX2B23V46ZYF508WQE5NSJSTG3JAXV0PBTRC7TKAKSK994J0TXXMBYT3KPPH3MXC20",
        stampExpireDeposit: {
          t_s: 1707409448,
        },
        stampExpireLegal: {
          t_s: 1770481448,
        },
        stampExpireWithdraw: {
          t_s: 1691857448,
        },
        stampStart: {
          t_s: 1684081448,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 512,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XZPT83F4A3VH385PD9PPMJXD8VN4TZ30HS5CMH8A0R27RWPDH38VHSBYA7Z02ZCVDMY3K46EAEG3F3G7S1Q1VH9D2MQY1D15EFD0F0FD3WTDVSZVMTFJYVD7QXEF25PNA3V4KQ7SP7GEZ28YNSAQYDRBZVXK5VFSS1HH5GH456K76ZJPSQ5ZD9SB4ZE12V0B1PW6TKPVK9TJN298SJ0F41X3SCDJJBSDYY1C03K82KX7VW0EKZ6284SCF6GRT1GMNAA4HR16RSGG21J2QMSZHJNPQ13K8CTT412FQRNDG60XN2W2QDDTH44XZPQC5MB5BJTR12B5PMC3MSBKM7WJA4H6G151PKQ3FYG3MH3RRJHRQAQKZ2YWJZVANFJZ2ZV79Q2NVFNS9JQ0E952809F42SKAN04002",
          age_mask: 0,
        },
        denomPubHash:
          "R41YY7QCCGMJYRF9VKVQZ4RW2WPRYCST19SC514W3E2HC0B944GYHTWK5YS54JP079ZZ1FCX2383QGYTNG00CVTTQRPNZSYJSA9MJMR",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "77TG68MD0FJCP9G55Z7R9XHE2T6KVY49NKYV65S2DZ18KXDTBZTXW99VDV3J7NN4GNQ99X8Q5FMA7G935TGFE50ZSF55AJPJWX8YP10",
        stampExpireDeposit: {
          t_s: 1676306648,
        },
        stampExpireLegal: {
          t_s: 1739378648,
        },
        stampExpireWithdraw: {
          t_s: 1660754648,
        },
        stampStart: {
          t_s: 1652978648,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 32,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XWS94YEXSZFXQW9T0T7TDT3KAS1AM01DHWDYX994JV6KA40AG1MNDVACAS37H2C43V4PG11NR2X761P8A9FJA1D4QD2X71GXE18VM5CAS3G9HXTS5EYHYMPZ5M9MN4Q3NVXN5W5MN0DYSGZ75C4W5CSE24R780J1A0DJ0H6JGBRQ9V5AA17K8FS4GXAHAVPQY1BQSYG0Y27RY1FDVV9XN8203VN1HTKF0B1N0P7B77GNE9K4S4P9X15B16VM68M2FQKFHYXGGFEF3T1EK3KDXYA2WY91D1HAFDAX93W5ZWJ8H6K3XP0KMDWC47K8NGHZTZGYWXBT6D1F0N1ZF7CSYGW05C66GT3JRAQPVJZQKYVW9FNY5P60AVN1QRN3WT0S57D437T58E3TCJ86RZXH66GSMS04002",
          age_mask: 0,
        },
        denomPubHash:
          "R8FBJNRK7YFRGKCG0A3G9SR8Z8E1TZ52NTCZQ3WK4PZ8D08J6N73423B9CJJPYSBEXZ0GD93Q7KMS1J44PKGS8XSC2104GP2NM7EY28",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "5RBAT4K873CRN05XAAVJ8J7QA3BTDPDC4S97NEDF39NQGK0Q9HNY29A9TDYT1KTX19K6AYD38BJE73CHN8PRVTX0P2574AYBWWKVT10",
        stampExpireDeposit: {
          t_s: 1699633748,
        },
        stampExpireLegal: {
          t_s: 1762705748,
        },
        stampExpireWithdraw: {
          t_s: 1684081748,
        },
        stampStart: {
          t_s: 1676305748,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 8,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000YSJ10QTTCPAMCWG0C0T93DJYXD29HXJS52AX4S9VXQWJ9CRQ1GGYNQB79FAN1CX9W32YYKCM31SJRW8CFDXM8WQSG6SNBQTNF87J55WQQXR5DWHVSTECB3C6WY8BXVMTAYK1JPQ0D240M73M779RAA0ZR8A0G64ES5HMP67HXT358FPQM0TDQ7JQJD46YJ5DAPF5B5ZYQA3S43JGWC2EEWMCGH3VESF50S1SEYXSA7TKEEAAQVRFNGD7F6FM7QX54Z1CJK0CFGKM6H0TZBZRTQQZG0HFDHDTGE54X0G53FEZEWQWWYG1V2VZX6AKSYD8MVHK0R0Q02871ZFHZD48PMVP0V1Q1KNQY4KRDCG8TT5XZF5CAF57RBZWZWCF6RA07T34PMQ3Z2TRRNJ7BG1330MHAD04002",
          age_mask: 0,
        },
        denomPubHash:
          "RA4XM6TBY4CB3561Y3N80QGNFHS0NB2DWWDG990BV31CDYNV7AX6B6YN8PBYQ9DN8FKAWXG71S2QDNGEHNKTS4KM12YJR58JH2K4CCR",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "D11EQTVPC20T4WZW17XSV2DAQDA99G90151T7CAN7E3DBY7VHYHAGF1RE6BJMPT1TGAEEEXYE63ECQ98EFPKY02X3XXKTT251W9D61R",
        stampExpireDeposit: {
          t_s: 1707409448,
        },
        stampExpireLegal: {
          t_s: 1770481448,
        },
        stampExpireWithdraw: {
          t_s: 1691857448,
        },
        stampStart: {
          t_s: 1684081448,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 8192,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000YBNW9JPA1N79QHW6THETSBAZSZ0DPF15WAS1RTSW91XG3MER1304V8T81DPG4ZSDD4K3EKW2RTJ3PMNZ49CDKCKJKDCE2YNRJTS6KW6QFNG0MCJ2R5G2JP0EF1BTAXKTGBHGTF2VSDS86275B9H1B482Q2Y837R07VY4KDJBFQG3ZSHDGVCNDKRAJ84P4F3A63HJDH9B48A8884GV5YNQMB699ZDWKEWZAJ40P2NQZNG3M2TXDW3TSQDH2E4PDD1JJD3WQF0QAWB2TRFCAY7568X2QB0QRQ5K77YDYT2MC9440ECKDK9W89EE63H53ZM1Z8KHXB5V3G7YYFD3X5NA27C4PZGKNT4SZVQR2EACZMGWXQ3HS9G6CSA8WFXGK4RWPRXSBJQBT6CYW0PYHWHZ5ZZEB04002",
          age_mask: 0,
        },
        denomPubHash:
          "RG2HA68MAE1DMK77WH0MC8PQ0J5HRPQ6HDMT64WPCZ0DZC9JKDFZ6F4QT4PN6MD7ZNBQ8YXAH4GD1YYBXTX99NPW4EKNK760CCD2XGG",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "S9AWJV3EHWC0DVA95YZKS74XYQZVT7MWFMYDPTJWRZ1AWVK81QB8WX3YRS79M5M053HYPGAVRA15611R05CNBNVXTCYJ17KENMPS018",
        stampExpireDeposit: {
          t_s: 1684082348,
        },
        stampExpireLegal: {
          t_s: 1747154348,
        },
        stampExpireWithdraw: {
          t_s: 1668530348,
        },
        stampStart: {
          t_s: 1660754348,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 16,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XM4EW6WZ9AYZPYDFVT8C8H6R7AKTZQS3J5XTX7T317R1XDKSNJTFBJ83V76JFV1C92A90FTVHSWBGR610PMM8W6P4QPKVY94PM9CXVCGXHESKF5HF4H8QT6PH6S62Q2H29FRXY9H0P7QGMJYH079V8SY2RVJP95D4748R6K44Y3WP662G3YVTNXSDS38CRHNJK8PV3JKRFEHM4YWTXJ16VMMZDB16JSXP64MMHTFHH11MBTNWC2E6EZ6XAZB517KHVKZ27YBD0RBZH864PY04R4WAD6RT22F4YADN264JRFKTSA7MG32E0PA20C5DN1VETMZAS1418F1KY3Y255QNEQ3XQYHNTVY1YVK7SJKG2603XZ8G4FTS1F98QWN21H3T9YHENV5R51710YATPDT8JSA7304002",
          age_mask: 0,
        },
        denomPubHash:
          "RVPFTDQDY4CA1VGM3YZVSKR2GKMANJX7K03AJNC5NPVP7S3D7NNHB9EP4BG4N3XFNNGFXR1MWZ62VCZ6PQ08PGP63BVH44EP2SKT1PR",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "4D2XQV8AP38PXSSN88HDPB6ST7HKHYTKX26SXHMD8TG76AVVQQW5BW9X5S9WFE10QTD8E83R3DCDC1AY2AWNXDZ7ZYRFGXNSD9P7T00",
        stampExpireDeposit: {
          t_s: 1691858048,
        },
        stampExpireLegal: {
          t_s: 1754930048,
        },
        stampExpireWithdraw: {
          t_s: 1676306048,
        },
        stampStart: {
          t_s: 1668530048,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 512,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000X6C186ZV3TAWHXCTEZQNZAD72KPM3KHRQ87RNRSF4MA0W4HWBCKYCWKG7BBFHC5KSK2M9D1PXKGX7TWYGJ9TFTCS2TQYF2FCAQJYZRZZCZZ3PCXZE6SGYCGWZR1M79VMDSMK92XBCG82MP07KVJ5ZPVD4SHF5CCD9BP6ASDJZP7S5RQKYJVYVTY2GGTJF8342F32SDZ4RA90ASPFKWK4RMQHA14DH39Q0NNM2WN4M1EWRZV7TZ0VZQ1BNV84K625SHMRKYDJ0X3M4HWFN0QVB8T6P9QTZAVW2KT1BJCEPSSEZH3N4CGFA5XV91EMM36VRSKK8BKX79T6XJBWS2N319QMA0XMTG7CZ22PV7ZFQQS0PK4ZAWT5TTPASX270VGH6WT550M3E4F6B2KHGHF2WS31H704002",
          age_mask: 0,
        },
        denomPubHash:
          "RW3NXHJNMM6X9HV664KZAXVN299X8RJZCXCRKCX16753EHAGH2JCK2CVG5QC1NM9J65812JA4R582V8Z92JGYPPXE4CZCS1KJNAP4W0",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "7JJ2B8MZ2WJBQ9P6F6CKYTGC8DSRW1BVS6MNMT8C9124NZ91H74VH0AV84PVV8Q6P3KCM28HB8JW0N7XXYAE8H6ZV34D89ZQWDF2008",
        stampExpireDeposit: {
          t_s: 1707409448,
        },
        stampExpireLegal: {
          t_s: 1770481448,
        },
        stampExpireWithdraw: {
          t_s: 1691857448,
        },
        stampStart: {
          t_s: 1684081448,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 131072,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XNGPDRJHB1SX6H2KHT64KWYT4S5DGKDG4JC95ZSEJD836CMYFTFK6JQ64AS3K04FJ3TMZ7YBG1F7FTV7WH941CB158C5875SBD5754SNMDTYEX7YQN3QC4MTSCNF37W8XG885YNFTPR770G5KMAKF4TAY0XAKKE1YA1F83PM309BCX07JSPR12GHXT89BC0C1QQP2NG4VJS12621E390N060169NWM0DK3NP3ENB7W6SGAETGYC4ASNBMYDY7H45TZY7X3TG2PNZXFPSK07141XX0K99Y59BD0PCYP2PD9XYW1EGFRA3ZM5MJDVJVSEGV4ZF2FRP6J83MAGK4YN7QF85CKX8XS4T5MYBBNQV4EN76MJ9889Q9GGZEEDQ2WW654D4ZS20AKCWV14RHY5PC2S68X04002",
          age_mask: 0,
        },
        denomPubHash:
          "S0A68JXE3GH8MMCE9JJH1820HY6CG1Y7VQ3AGGT9X8PVZHFFG78PH6210JDC19PNTXWVV50BN75F0428CT9T02YFPEXTJ8XN0MJPPQG",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "9ZZXT1ET04C4FG2R3YRDMTDQEJQYE5XR2YYD0XAYKWT9XR5Y5APDC6YNH2EFV3SWM5ZHM5Q9EEDBSA3X2FP7EBWF02945WN7XHSAY18",
        stampExpireDeposit: {
          t_s: 1707409448,
        },
        stampExpireLegal: {
          t_s: 1770481448,
        },
        stampExpireWithdraw: {
          t_s: 1691857448,
        },
        stampStart: {
          t_s: 1684081448,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000YHS2A207D2HNYHQ06T908YDNEBF68V4NCXPVVKY3RQE0B65F6R1CCV8JGPQSSAA0TV4DR6VKZDNYX66VCXG2S6N3KHXKH1ZDG86ZPV7AM87SEY2V9VVKY36GZF1FW2KHZ5T924VPJ9YT96H9Q0XMAN0VWYS0HBAT76MW9CP58G25FT2SRGF1GCQ1NGQGFGCW1MMWFMBBCJH2S0PSA7JQPZM21QJWD5G6B7GB1HZ4KZHCKRWMZ5S6D33C0A1XR2082JARS86N4QVN8K4Q8YFDDCHE4BN5ZKNYQ965MR9KJV400KW8F2NQ7VYN8JMK1038MTM58D7Y1A59JTGZT1R6YEQQABF1N7CVRGFDAYBZRWJGAFR9SVWCPWFF91CEQ3S2RG4G8YC67P5GQTEBYH91C6VDZB04002",
          age_mask: 0,
        },
        denomPubHash:
          "SKF9V38PM7QAEHPKF56SZ5R81NCTESVDQ57J3CCYHJ4KQ3SYDY3CQQ5EM0MH5SBXQMRKHVRHT8V9TG91HEN2HRFCYRQ4AD45TAETMG8",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "1RVKBV2TQFBG19GCPEHDZVA3MAS8CY0AWZ6K2ENZ8HPQBSKWB1AYQX2EYB8TGWN3ACDMGK96K05D1FH15YTWFXP1TMBHPTFQCG5FJ0R",
        stampExpireDeposit: {
          t_s: 1699633748,
        },
        stampExpireLegal: {
          t_s: 1762705748,
        },
        stampExpireWithdraw: {
          t_s: 1684081748,
        },
        stampStart: {
          t_s: 1676305748,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 128,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000X2VE95PA9PJ8Q3GWYYJNZJJPA7GN9N9YBP2CWKJYXPRS23BVR8CBJ6YKFTS7Q36J8578EGX508RJDD994PFNFXVATH29AZXCZB0S1FE20WPSEBBFTCKVZGKD454H6MPAVJE73VSYPDN9GGMMX7PBKX035HE0NZVNNV3GSKYKP0VFXTD5KAV943KKN4TPFBTK355ETAH9PQ9KN1V0QKBPX59QGX5AN91P3V49RSQW8VKBFZ00Z8MD9JV3CNNFDS5SFMC6AS9Z9WXR9ADS0XT7Q8ZMH49JR61NHZBMPZSV60HTWP13BWTX5PXM1XYKQJJPHQJDAYNG5HK8AW787EN2SC3BQBCB8AGK1D6CZJGDJHDTW830TSBDA9ZBKEFK849GA5QT7JDZHNV14R9HPVEGG3NVXB04002",
          age_mask: 0,
        },
        denomPubHash:
          "T5DXW0C65EZH5WYD53QWCCVX0SG3SMJ3A8Q1KZRAKMSSJ4P6CCS36EYJF0XR84QJ3CBYDJFVMVQ4D2MFPDDYG1BGKQSC8MYX5MCZ29R",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "3TGB4ZBRMT6HPGDYHYZQG9AHK4KNBV3JR9D8MRVQ38TS306P13RVQ7CTZ4JD8Y97Q5SNDXN1RMYB3DZXJDA45KDV655XYEB51PNV238",
        stampExpireDeposit: {
          t_s: 1676306648,
        },
        stampExpireLegal: {
          t_s: 1739378648,
        },
        stampExpireWithdraw: {
          t_s: 1660754648,
        },
        stampStart: {
          t_s: 1652978648,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 1024,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000YX34FHZT0C5AGW7EX9YEZ43YPJ5KJBM5J4BC4KD78A0Z1TY62DV7G1EWTEHQDNZ9B7R02TJDW81GZ66C1KW6DTVNHR5DSSGAZTKXM01YEW3VHKYGVNX7KDZ3NES0XNSWZS4YG4SEQTMF6X0XDYSQ5A7QH183KMT5ASJZ7Q7E0Z0RFSS3W5FV7XFA57DJ6NMJV8A7H0C3BQF3B04C3K70B8444M3K1JPTQ2776FJ3NHYG3C9WTPEJ55TV5V8NS8QFASD82F65JJVY9157G8KRD8DFFY1BCFHBZN61ECM827TNES9FXYVAJ54HJAE977X3F1KJZHFHRHKX8G0S5SVKYBAT47J5MWXF2JJVXW3M4TCGMY5BK11EVJJGAQF9FNXTS9QQM9JW8T3BKX8BQ3AJPESD8304002",
          age_mask: 0,
        },
        denomPubHash:
          "TKEAVANX0AWBNT4ZARKSXXHTFYY2753A0YSS15VD32K8DDW8ZYNAFNJ81H5R3A3EJMCB704XRA498C1M6N01YCQ6EQDW9Z0XKYVY0N0",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "75TST9AA9R4D0K4ZJD2MQKC46H7S1QGVXB36BHC32TJP98WXV8C1TA6TAWJAV9KN6T12W9S6PEYF6SKKTMENHFEXP08QF95DKM8Y200",
        stampExpireDeposit: {
          t_s: 1684082348,
        },
        stampExpireLegal: {
          t_s: 1747154348,
        },
        stampExpireWithdraw: {
          t_s: 1668530348,
        },
        stampStart: {
          t_s: 1660754348,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 8192,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XPT4DATEBE8PDK04TE8QHNY425BJ4KYVCM959YV4Z5QSED3PG7PACHZ2SJS7M35P6WJRC921RDK5NFGE8RDRQK8DRP56ATGYPH68CTB7G9JCGET86FEGA5JPCQN5ZKP87NJ9MGRYQ3S0FRN1N71WS6BFEEHGFZH50GCRCXKV10TE03AJD4TA5CFHJZRJTKZYXZST3P0SMBTSRG3E23NW8777HWPCP3FFE6G2M65TJSEXW7QYXVPP0SDG1Z6BPRV6P1EBY9NXNFW96JX08MGGDV5B4Z8JPB58NGM8H59J7T3JJ0ZQK714Q0T1DTKJN5NDC19JANR8XBW1GW1JQG7PSVYWMG8GTR8M3CGAWBCDR105MCYX92C7DQP0DVNCP4JMEP39VP7S5ES2PC6AEX41JGPPMS04002",
          age_mask: 0,
        },
        denomPubHash:
          "TRQPEK0DJKP005JF62J00XK6J5SX3XYQSPTG7VNJ196HD1CC9MG7D8GX77TPD2DJB7R58N3XB7XC2PRGST2JQMEW3Q1D53PSHFBS6YR",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "43WP2EGW2M131SHGT86JZ043QVDWZCMX03XBYSEV0WBJPME0EF1CZHZVSYPERC8XEKH3SF5ZGCZ5B3Y2WNQ0R39976KQW53J42T6T18",
        stampExpireDeposit: {
          t_s: 1684082348,
        },
        stampExpireLegal: {
          t_s: 1747154348,
        },
        stampExpireWithdraw: {
          t_s: 1668530348,
        },
        stampStart: {
          t_s: 1660754348,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 8,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000YZTP0ZC2X96CMNRCEN1KZ20X6H55EXN9RS4A2J1NHBMWKAR8DR146EVT47YMFJTRQWSJCVX5HMCGA2F793GVYK8851WRHRJQX1QSSVPZ024TWWYD1DW7HTQ8Z1M0NF3VQCVP0E7MGRXC6N4E37ZM0GBEBY6SGF2PF01PM764NJN2PSPDKXG012WBZMJ8E0YB0A1NFD3Z0N4X2JJ787CC2M2G63SC8RGWBRV90VN4258Q96BXCAF62DMJTS5Y9J00WHX5HRM2XH0GEP4452GGWH07P7HPHWFVBD1N5A14HS22XX26S6PMV74TP0P2R69REP0YTN38GGSYDA6CZ7Z8PX9FMSSVR9NRANYJ20FNDQCPN194D70VDDWHZGXC11KS72SWQR587HE7X8B1W00DTHFC4V04002",
          age_mask: 0,
        },
        denomPubHash:
          "V6PP4DDX9FQQEBR08364HVFZVBCDEMYT5P74JVGN5G4YAZY6KHGC59HZX1KDBKGP6Q6AF7NQ1EDTXQ1V4BTVQ3CDP95YV8ZPNYBTV70",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "E1Q95WWJXP4Q4S02J9AC9TB1GE2FDV5CWRJQKGKS2KP9BA7BKC0Q3AEJKXTQEJRA2GKYP1BX6146RYZ9Z0XG1A4P82GBJRDQYZ6T60G",
        stampExpireDeposit: {
          t_s: 1684082348,
        },
        stampExpireLegal: {
          t_s: 1747154348,
        },
        stampExpireWithdraw: {
          t_s: 1668530348,
        },
        stampStart: {
          t_s: 1660754348,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 64,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000Y4TJ75D7NPAX0TF5SGDV96PGMG1E8DDHV84QTBCMCBVJ791QK5MHYK0ECKTAZKBJXMW29V7WYNFTTFHC5X87RZX1NN6Z5JSPF9GD3T6MENQ6PA32MVE51SR4RYYNW511NF20Q0B9S1TPFMJZ0M10FRQHC1JTJWNVWGN29Y5CMQTF1MS9RBSME2QP7EWS1MEEPBDF1SPAERCJ93HW9F91NPFFXTRFDMMEA7NP6A78HP68BKEPF404H5PPG88BY0SCC7JVXWJEH8B0D8WHQ931BG9ZYEBDJY9K6Z8XC8Q3FAZZJVM7ZFV2TFS22MDE8BVY9FCCHCW2H9ENV12EKDYTP9HMZ8QE44961P7FTNR32NFAWPF6RDK08G4V0EVBFYM4CAQ1FWPGAWZDNRY1KWKPSKDTQZ04002",
          age_mask: 0,
        },
        denomPubHash:
          "VYJNC6S0HQ4A2QRFTE4N64DB2QX339KQ0FC87F87H2H7Y6Z76XRT3CRZ9BRR72B71JAJ5YZNJDA8NKFD6D7XB7F1YYA3TK2S3T13978",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "491KS8FPZ0X39BR864JBTFYHR13CHNSJN5YGAG5GY6MCKAK5DSV788XBBMP7V0N4VAAKJ9PVJBNVR7RHYK0F5678YWF9E0C3MHWJE00",
        stampExpireDeposit: {
          t_s: 1691858048,
        },
        stampExpireLegal: {
          t_s: 1754930048,
        },
        stampExpireWithdraw: {
          t_s: 1676306048,
        },
        stampStart: {
          t_s: 1668530048,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 524288,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XXCPVGMQ385HZTC2V3M5Z8WS7Y19RDTP6JVJ2VGY9XY5Z42YW7RSV2JMK0FJMVNG4E5M3Q08V7E99GE1Q8VNVR53HG2WACSDSJM4NT61KFSAHAVE627B4Y6DR563MK6QHZR0YPFV97Z2MEVFCP4MFHK400VFV94KBN6V2PJ6W542NS1V25WRBAFHPYD7H5FRFQAKMR15JJYHFT7J6ATV9XP5HVR0ZD53YST4760FYPHD1M5X7DTGBHARSHAG8PWECJFFD6YW49PBHNCE8TS374PK8J0MAN5KJJ689RY1ZDXZX1KPHS47C51TCGB00Y4HGPTDVDC4PB226X3PV1X51ZVPEDTTDAB9NR4YP36PJ4PKDKXWAM58QTXNACD9P3TSWSPG7XV2Q87V3NR2JRJ8HDMM6704002",
          age_mask: 0,
        },
        denomPubHash:
          "W2T9DWXZKXHD97A20NH1VVNYHAEQW08VZPWB69SQPBEXQDXCSTNSTPHR6PZSHMN37ZV8ZGK2GV8NT1R5G1HRF8CXRKV09RT9TPK9JCR",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "6GMBSXHZTVHZ82ZSVH170NTCMZHJN7JCNYRWCP7MHWFHT02V91KWY9TWWQ5ETQ7ENBM6BPVW0G35QW0WH0152B32M4VDT0FCZSA4E38",
        stampExpireDeposit: {
          t_s: 1707409448,
        },
        stampExpireLegal: {
          t_s: 1770481448,
        },
        stampExpireWithdraw: {
          t_s: 1691857448,
        },
        stampStart: {
          t_s: 1684081448,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 524288,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000Y1J87YWTWR54RC2KE061Y26WY44RGK07ZGW8BWPPR6XA9YQQ70ABD2ACZB4M3KYG61GQPVC65BGYFKWEE5DBJCYSARRTYNMBRTWR57AJBN4R6FZ6Q6GXCVKEZWGR1YP36MPZK5DMWBEXJ9A9G5SDSPKCFBB7QHZ6MDEYZAS99H2NVWR2M87WXSTS8PQ3WHDB66R19VQZYSQGT2P21NDRG5Z9NTWSQFPW3WM679D7EKZ5NBGMMBMV5PZ8SN1TF9VFXZGFZWEHH4V47YB679B25CT4AM2NR9XA61K8QKNH6KBKCET7MZ8VZYF9NR1N2KYM8CA1S853ANK01T4HY88D3K1W4JF332C8AXRK7NE5XKW5CJ4A80905XX1S3DGWPVA6T7J8PP86GSD131ZN2C3T1HEFN04002",
          age_mask: 0,
        },
        denomPubHash:
          "W2VH6V55RJ1TFE0RQ32GYK1XC5R9P081YDEXZC9S0VDM8DQCMM4S1HEK1JV0B12QDXWTRJP0R5TBH6A23D0D1ZCJTQNQ0DTFP0040E0",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "YK4Y1BDX54HD23559TEDRNWET4PE24G6YVJRRMQBEWZNDBB7EDZJ9QMC4ZWKH3X5ATJ4HR2TQ5AC0QWNACT5QHBZVBHEF4586TNFC20",
        stampExpireDeposit: {
          t_s: 1707409448,
        },
        stampExpireLegal: {
          t_s: 1770481448,
        },
        stampExpireWithdraw: {
          t_s: 1691857448,
        },
        stampStart: {
          t_s: 1684081448,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 16,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000Y7Y3KA4DCWFVVPYVGR4VKNGAHCAY7Z01JQJXZV7CXGWY8QT808FXR8NNGPVGP654RFYNQFEYVH6HNRNGNW8T0VCWEBPSGNH41KJ70NC4W7H5QA1YRKNEX66PE1M8BSYS5N1X4HXJAKC9VYHX484WDAYJ2J1ZS7T3MD677DGZG0M54BM22D6JQP8NMWWFN29YC4F1SQM4EKBWCVZFVF44SMZW7Y7MBB7N6WJM1EG6G8KDYTG99PZEN75HX7Y3MW50JYY41WJT2N61R1WGRBP8QSDAZCQ6RKA8W9EVHEATD5QJVF01451WJQ83KXWEV91SHG9WJH03K5TDT104ZTVXD4M737YEENJGJC8F0AMC0P03EVN2MJ29CKHT9HDQFDWJNBGEW8E74C0ZB82P664M41K4NV04002",
          age_mask: 0,
        },
        denomPubHash:
          "W69JBFAGJRD4FBFSTZD124H157V84SMQTEH6WNJZER07BWS1BWVNZAAGBWQF0YT90EQSXXVW5V0MKRTWQEDTM1026QZJYY4RV43ZZNG",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "90QEVDT0TK7FD6VPNRP7XVARWPZ1RF13W9VNKW4B4P6MHR5W6YES7TG16AE0Y9B1G06APJNKH3NYK3212Q8AD6M44ZW1QCHW0MN0230",
        stampExpireDeposit: {
          t_s: 1684082348,
        },
        stampExpireLegal: {
          t_s: 1747154348,
        },
        stampExpireWithdraw: {
          t_s: 1668530348,
        },
        stampStart: {
          t_s: 1660754348,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 4096,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000Y020EQ54PKEN0P1PNHJ584WX466K0AS2M15BH2P3SHPKWTAFJ5118KQG7R938B97G0C7NNM5AA5D0D20QMHQRJSFFXM62TARA0BEYPSBBTNHJNCTAKQHGXD9YTSRZF91STNB079EF4KE7PN6QPGC1PVAS4H05DBT88KZW44XR9F1KGT4VM0WXDYVP0JJEECTD4NY6NW82N2MFGVM6CD8KY79F8SA679X69EFX99BS50DJ7YTCZVDPJGKTWAJSDZ8QV9T2H2P3D6VJ17J54YZG5T774ZQ6D90F3EQG1F6MD4P0PA8AHFG565XX19Z0XQQH2XFWK802XP6FCXNTEVQ3RVHM95PQRBA7CW4DRR5GRKDB61MAW117VJFZ8B2M5MWQSK0TCZTBBE75G3BEWFQWCDD5N04002",
          age_mask: 0,
        },
        denomPubHash:
          "WE6C9EAEXBVBX15WRCZEJ939N4VXS16WTH5RVNM5DYJASZRGXFDR1VKFNPJGXWFGVACRHC0A6JJW2QHE236G4PCQW7DWN1H5VN9MVK8",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "Y5Q1ND84QKC7GQVQHWG6GSQ0XTKCV8AJ02ZR9XSQ8AW51SKK2VPYQ136SKBKZGB66GQKK34J83EHFG626J4GTFSS680X9Y3AEJ8GM0G",
        stampExpireDeposit: {
          t_s: 1691858048,
        },
        stampExpireLegal: {
          t_s: 1754930048,
        },
        stampExpireWithdraw: {
          t_s: 1676306048,
        },
        stampStart: {
          t_s: 1668530048,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 2,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XZAJ6XW6WC6YW356M9EAK4Y6S66YXCT7XC7M404624PFP6NYKHAQH7HM22M7JJDK7V4AWNPY3XPTDBFPJWSAF9CKMAYRQM54B2TKZ0QD6GB2FFEXW1WGFQNMFM54MH57HXZTA21DFCR7CF46T5QZ2J2JN6BAXXY99J6CGJF0CXG7WN0F4Y2KZ45WMQ0ZV9PWE61S4XBHA9QVCHKFZJHX08D68ZJBG8P61NEYPNV6BVK011T98MFX989VACEFSGKN95G4J4FDCME1PQVK2Z266WS7KBAJW39NND3V1H1RRQFC6Q2QS4AZ6CY3Q28DMZBB2NSANJKYHXXEBZDJKZH55R9GCG1EM0Q1SWTDBENH10QD6ZWZGTGB49CRSXP6NFRJ31C46V052ARETBEEKHHYN6YMR104002",
          age_mask: 0,
        },
        denomPubHash:
          "WTW0N2G7KF4W1E3PECJFRSVCH4BVTCSAYA3JHJJ83HFFEMXR3GP5DRZ2BBTJD6NRZ13HW4BBP5AS1JAEQWED7C45TFPKW71KNWN3JMR",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "5Y6MS8BCHX9DMAAQPJ15DHKYKBPMAMP3482ZEQQDD3FAR8EKFCEEY408JQTS9X7PEEKTAAJGW9TWQDYG7V1FSTNVMRS5NY86N3MK218",
        stampExpireDeposit: {
          t_s: 1707409448,
        },
        stampExpireLegal: {
          t_s: 1770481448,
        },
        stampExpireWithdraw: {
          t_s: 1691857448,
        },
        stampStart: {
          t_s: 1684081448,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 8,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XCA65H5YXSZD1S578YJRK9B29PG4JSYZ0WYG75AA657EVV05KCN0VK2335D2V6S5PVAR6238YH5P6B8RV5FX1NBXGG390BR04AYWC9C5Q12JAY6Z822G95Z2D2S36N8HWCDE5K28HMG1344JAKQ9KDP2AV87PKE1ACHNZ18HRXY06XV8D32MS62G1Z3AEGR7PRWFJ7DVHP811SH80NFAPF568JEV1MXNZKQA4V77QQMX4TFQEZ1EQFP2FA8WBRQ8N1D0MFDPJVGMWVATG0Z663YEYF0HKT1SXX4E2Q390J4QYS27PNPEWNGSGGYR94QYMFJQZ70B16828N2BGVHXEGRMF2QWVS55HK6PDY7YN7FTVRDYZ9ZV478T3S1GA5FT9075ZR9T9MZP5PDRK32826N4VF04002",
          age_mask: 0,
        },
        denomPubHash:
          "X7WVRHZAY64TST4M92WKB7HWST911YX809ZH15DPGA4QZ6FD4CA7CG8ESWG0MW5RD6741VHP2E3ANB4D58E66M8XR4QKZPQNZM8ZNNR",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "JT8M8HGH93BNT63RB1B3K9C6XHA7F3ARYMZFARTA9ES9XVY6561WAH5SCEKTP3Q9DHW4EZCA4YZJ9XTAAZS8Y6F5V8FHC1N2ZNXP230",
        stampExpireDeposit: {
          t_s: 1699633748,
        },
        stampExpireLegal: {
          t_s: 1762705748,
        },
        stampExpireWithdraw: {
          t_s: 1684081748,
        },
        stampStart: {
          t_s: 1676305748,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 1048576,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000YESJNG9NQH12C64QD8X1F84064VC79QR2D2AT8DZ2QME2K3X3PM2RCH7HAS7DAMYAMYC2EHVYNERW8CXFXXHSW9BA10Z8XZD4EDHSDP5WPAC5RVBTB9XV2PAG4SMRY4VCF1MZXAWVQGF40W3CHMVM4A58WPWW5Y353Y6F7FM6K4BYY296XVKVF9FP6DKW7VESX0QS67CNCWJ2KW12T4CY26J8GG5SQ05G6QG79BJ4Q9NEQDNND7RYXZKJ8HFD4NB9ZHBCMEZGJ0P721JX5KFB0HK4AEBW6BR5H2B48075T3VJDQPMPTGWDMN79NABWZ1MYX30JVGYKGD789HC30W5RD5YVC70E2TCRHEPQZEJ9YWYY2314ZZ0ZSAPC9CACAWQ14EN246CWSM0YDHDB6GAXENZS04002",
          age_mask: 0,
        },
        denomPubHash:
          "XCYZARWSTHA7E5F28J9M78M66GET3VCFA92YWRSV8RN47Z9Z39ENS0MX6H7TC5DB3FTA7KF3WN6D0X9Y0QJNKBM1C5EGZ0RGN8KDJN8",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "DP8Y39Z0F2W5NV6GGG8Z6DDAFR0N6NVV976YHGM8BVB8AA82NNTA1SA58M5EMJ1J4EVPXAB1QECPG265JZYHFYWBB8GW202YY1J7P08",
        stampExpireDeposit: {
          t_s: 1684082348,
        },
        stampExpireLegal: {
          t_s: 1747154348,
        },
        stampExpireWithdraw: {
          t_s: 1668530348,
        },
        stampStart: {
          t_s: 1660754348,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 1048576,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XCJV04HK7YNN2ZCG4984GAG0CSEGFXT1N0FYTMC0C3XSP54ZSKGBSMAG6EQHWH23XDWYX917BR207QEHJTYM56WMGXF7HEM5QCZQ4CBQ69MF7XH0VA7WQ29SDH5C80RPWZ4KXJB2GP1H34SEECCMT4X4YHC7C7JPYND5F88EG99Y807M8BTZ185Q1HPWQGT4G12M2KVVNT3C03DAT18RAWMYMHNVBKFM079K6T1NF8DKQ6A0D7RMAYTPRTFCS1DTPX7M3XSTD9M2C6JMWHRVM0DN4APG1KW0HNBVYRKA5F9KB2MGWWMZTFCNFBCZR0AQ9Z6T59CZH9K1NBYQ3RPJVZET7DRM34MC1E2HPARF28TRYMREAJDDACPNAEFZZM0RJHATNK9SCTXJ16HVB0KR9C5GH904002",
          age_mask: 0,
        },
        denomPubHash:
          "YKH2MAZY87PGTSAQQXJ8JG86K84SSVXW6N0KBHTYWBDJT2WRPAGH92BMQ3N3XEPZG4NQA7C5BJJMD5S0RVC82KRJ2Q5Q803KT89AMHG",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "72J1146CXEZDSB5GF1RH9ZNHRH5D8MFYWFTDNFKZXDXDN8V7P7SRHBN589GCHAGDXH47QAFP9WWZ9X84MRY8P456YYJFGS755KTH40R",
        stampExpireDeposit: {
          t_s: 1676306648,
        },
        stampExpireLegal: {
          t_s: 1739378648,
        },
        stampExpireWithdraw: {
          t_s: 1660754648,
        },
        stampStart: {
          t_s: 1652978648,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 4096,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000Y6RDVM995JYT242N7H2BV1WHVB3X39S7MPN4XH7QRXRR78RDKH2MVRFTK2QZEVPQCEBDR2P9NG0B8MT3392H88E2W3NPAR8NMSXRV0MKNVCJZPJAC65VB7FZ469QTGTWD3PDPDFPRN82WPBXCW06VRNJMAQD8WF5HM34RR5EWG84PTD7TQAT2MGGQX3MFKEGEK9HDYAR4MQVY489QNZT2JM4ZM77BZDD7BZF24FWJ2T2NTTMXDC6F13GS02BMNFY3VYBKSTTR7A6NNT2EZMQV33ABYGKG8D6X383JWAG1WT0ZFT1SENAEMST1PHC48QA7D1VKH8M33AYDT5BWVGKH92AM3N7RKCWYW92QB2ZZYAQ0CZ1ZD7D36BS20J8G4RGP3PRKVK8SMTXCABFMRQXPBJPJN04002",
          age_mask: 0,
        },
        denomPubHash:
          "YX2GBWZ5BKP3PY24W1BBCNH3VZ6W4VJXEXW5JT2WXG456KX14HAPE9B20NP3AAB5G58T912BG86S57QHSQ8SCG3GMN2K8RF72Q45FA0",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "EM34QEQ7V541GMA7BYGBX6CCWMGJ5Q4XG1S4MP4CX36ANFD2PWJAFGJ5F98JYKX9AJ1AEW85ARD54KM6YTZVYZMEA4SW42M1APW3J38",
        stampExpireDeposit: {
          t_s: 1699633748,
        },
        stampExpireLegal: {
          t_s: 1762705748,
        },
        stampExpireWithdraw: {
          t_s: 1684081748,
        },
        stampStart: {
          t_s: 1676305748,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 32768,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000WT2S8QPQ6G6DAG4MX8E4286H6MSTWZ494AZDK5AQYSWP0ZWA68MDBE6F2S58WC1KE7GVKYWWW0624E5F9335VG7113MF9CQZJTQSWY4Y6FX1QW23HY5AJRH0ED1NK09KQ7J91F8DPNKW16M5RTR14G8SMY066QVZ2ZGWB4HMR7EKG49C6YM1EAQZ0DJS60D5PY47CZ64WPVT7QJ6D69WF923Z9F7A0F12ETE1BDJY2C6DT7FGS1JQTY2JBEF3CH7HB8XGRCM7ZY6MFDMS6RVXXZ3Z6EZPCA0DRN2WHXFZXQHE9G7R3S53E2DRT4YA4G9Z0SFPXGYCKPNATERQCYCQYN0C8ZTWNDDQM4NV68P3MMCQYXKERY8GGHAHT70WSSDA9QGMK5V2H59CZGFAATKZTKKYD04002",
          age_mask: 0,
        },
        denomPubHash:
          "Z6KH2GVKNP5Z0XJJF6FKPGHAFVTYH7C68QYXA19KHR586779AY3D6V8MYTZNX6WD1W0B1NPT43E6FKZCKFWEMAN3VDB5NB6ZSACE2Z8",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "0KY1C7YBTCT94SXDK0AYVDBGH2MBX79B8572G2WGQWYB6N95CWH2JZAG8REY541Y06B8MRD6VBAGK3HFRJ8RYA6V51KZ0A26BN6NW0R",
        stampExpireDeposit: {
          t_s: 1691858048,
        },
        stampExpireLegal: {
          t_s: 1754930048,
        },
        stampExpireWithdraw: {
          t_s: 1676306048,
        },
        stampStart: {
          t_s: 1668530048,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 8,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000YNCQMRWRFWWE8CEW7GYBGMC4376PMYZ898JFSEYHS3D9KZTQF32TKFTWA6YSAB6FN8T8CZJ5WRC3NZJ9XSFFGD0KX6GREDFYWBXRZQZTX7ZTW4VH0PABEA94B2E76P1J9G8Q60VC7F6MB3VRN8FMZ8G21R03R945VTAFKY1HR49QXZF756CRN73TXQCFAKDP82M7B8VG3S162YW1MS8VC02JB74CJ0RMF43WZ1DBXA77WAHEPR3744B5N494CR8ZQ5R9AP817XN5WZ300XW8S0MQDTGABXXHHKFJDNZ3SFZBHEHSWX6B2DHPCYSDF35MSH958X7DXPGNZBEV5P4XR88K9F46QQWEAJGF343Q7DEFEF4HPK8TD5CA141BV90H2ZF3JF6B3AX1V0F5AGTBC9H5MB04002",
          age_mask: 0,
        },
        denomPubHash:
          "ZNXFAT509Z2KDBNCZP0178V654CYBW5SQXCBN35S0A2H1RHK03JEA6AF1NAWH4NATVFKNWP95RJKQDKM2X0VH1DKNHAR4HJZ469Y7VG",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "JTNGKHSWF386MG4XYYD4ZZK9ASG2QVXRJSDGBWVZPPKBM53TPY51W107N4Z6H19R695SFP3GMCDZ0HBDW57XZRHSVSYEHFZKR3D0J3G",
        stampExpireDeposit: {
          t_s: 1707409448,
        },
        stampExpireLegal: {
          t_s: 1770481448,
        },
        stampExpireWithdraw: {
          t_s: 1691857448,
        },
        stampStart: {
          t_s: 1684081448,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 4,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
    ],
  },
  {
    exchangeBaseUrl: "https://bitcoin2.ice.bfh.ch/",
    currency: "BITCOINBTC",
    tos: {
      acceptedVersion: "0",
      currentVersion: "0",
      contentType: "text/plain",
      content:
        'Terms Of Service\n****************\n\nLast Updated: 09.06.2022\n\nWelcome! The ICE research center of the Bern University of Applied\nSciences in Switzerland (“we,” “our,” or “us”) provides an\nexperimental payment service through our Internet presence\n(collectively the “Services”). Before using our Services, please read\nthe Terms of Service (the “Terms” or the “Agreement”) carefully.\n\n\nThis is research\n================\n\nThis is a research experiment. Any funds wired to our Bitcoin address\nare considered a donation to our research group. We may use them to\nenable payments following the GNU Taler protocol, or simply keep them\nat our discretion.  The service is experimental and may also be\ndiscontinued at any time, in which case all remaining funds will\ndefinitively be kept by the research group.\n\n\nOverview\n========\n\nThis section provides a brief summary of the highlights of this\nAgreement. Please note that when you accept this Agreement, you are\naccepting all of the terms and conditions and not just this section.\nWe and possibly other third parties provide Internet services which\ninteract with the Taler Wallet’s self-hosted personal payment\napplication. When using the Taler Wallet to interact with our\nServices, you are agreeing to our Terms, so please read carefully.\n\n\nHighlights:\n-----------\n\n   * You are responsible for keeping the data in your Taler Wallet at\n     all times under your control. Any losses arising from you not\n     being in control of your private information are your problem.\n\n   * We may transfer funds we receive from our users to any legal\n     recipient to the best of our ability within the limitations of\n     the law and our implementation. However, the Services offered\n     today are highly experimental and the set of recipients of funds\n     is severely restricted. Again, we stress this is a research\n     experiment and technically all funds held by the exchange are\n     owned by the research group of the university.\n\n   * For our Services, we may charge transaction fees. The specific\n     fee structure is provided based on the Taler protocol and should\n     be shown to you when you withdraw electronic coins using a Taler\n     Wallet. You agree and understand that the Taler protocol allows\n     for the fee structure to change.\n\n   * You agree to not intentionally overwhelm our systems with\n     requests and follow responsible disclosure if you find security\n     issues in our services.\n\n   * We cannot be held accountable for our Services not being\n     available due to any circumstances. If we modify or terminate our\n     services, we may give you the opportunity to recover your funds.\n     However, given the experimental state of the Services today, this\n     may not be possible. You are strongly advised to limit your use\n     of the Service to small-scale experiments expecting total loss of\n     all funds.\n\nThese terms outline approved uses of our Services. The Services and\nthese Terms are still at an experimental stage. If you have any\nquestions or comments related to this Agreement, please send us a\nmessage to ice@bfh.ch. If you do not agree to this Agreement, you must\nnot use our Services.\n\n\nHow you accept this policy\n==========================\n\nBy sending funds to us (to top-up your Taler Wallet), you acknowledge\nthat you have read, understood, and agreed to these Terms. We reserve\nthe right to change these Terms at any time. If you disagree with the\nchange, we may in the future offer you with an easy option to recover\nyour unspent funds. However, in the current experimental period you\nacknowledge that this feature is not yet available, resulting in your\nfunds being lost unless you accept the new Terms. If you continue to\nuse our Services other than to recover your unspent funds, your\ncontinued use of our Services following any such change will signify\nyour acceptance to be bound by the then current Terms. Please check\nthe effective date above to determine if there have been any changes\nsince you have last reviewed these Terms.\n\n\nServices\n========\n\nWe will try to transfer funds that we receive from users to any legal\nrecipient to the best of our ability and within the limitations of the\nlaw. However, the Services offered today are highly experimental and\nthe set of recipients of funds is severely restricted.  The Taler\nWallet can be loaded by exchanging fiat or cryptocurrencies against\nelectronic coins. We are providing this exchange service. Once your\nTaler Wallet is loaded with electronic coins they can be spent for\npurchases if the seller is accepting Taler as a means of payment. We\nare not guaranteeing that any seller is accepting Taler at all or a\nparticular seller.  The seller or recipient of deposits of electronic\ncoins must specify the target account, as per the design of the Taler\nprotocol. They are responsible for following the protocol and\nspecifying the correct bank account, and are solely liable for any\nlosses that may arise from specifying the wrong account. We may allow\nthe government to link wire transfers to the underlying contract hash.\nIt is the responsibility of recipients to preserve the full contracts\nand to pay whatever taxes and charges may be applicable. Technical\nissues may lead to situations where we are unable to make transfers at\nall or lead to incorrect transfers that cannot be reversed. We may\nrefuse to execute transfers if the transfers are prohibited by a\ncompetent legal authority and we are ordered to do so.\n\nWhen using our Services, you agree to not take any action that\nintentionally imposes an unreasonable load on our infrastructure. If\nyou find security problems in our Services, you agree to first report\nthem to security@taler-systems.com and grant us the right to publish\nyour report. We warrant that we will ourselves publicly disclose any\nissues reported within 3 months, and that we will not prosecute anyone\nreporting security issues if they did not exploit the issue beyond a\nproof-of-concept, and followed the above responsible disclosure\npractice.\n\n\nFees\n====\n\nYou agree to pay the fees for exchanges and withdrawals completed via\nthe Taler Wallet ("Fees") as defined by us, which we may change from\ntime to time. With the exception of wire transfer fees, Taler\ntransaction fees are set for any electronic coin at the time of\nwithdrawal and fixed throughout the validity period of the respective\nelectronic coin. Your wallet should obtain and display applicable fees\nwhen withdrawing funds. Fees for coins obtained as change may differ\nfrom the fees applicable to the original coin. Wire transfer fees that\nare independent from electronic coins may change annually.  You\nauthorize us to charge or deduct applicable fees owed in connection\nwith deposits, exchanges and withdrawals following the rules of the\nTaler protocol. We reserve the right to provide different types of\nrewards to users either in the form of discount for our Services or in\nany other form at our discretion and without prior notice to you.\n\n\nEligibility and Financial self-responsibility\n=============================================\n\nTo be eligible to use our Services, you must be able to form legally\nbinding contracts or have the permission of your legal guardian. By\nusing our Services, you represent and warrant that you meet all\neligibility requirements that we outline in these Terms.\n\nYou will be responsible for maintaining the availability, integrity\nand confidentiality of the data stored in your wallet. When you setup\na Taler Wallet, you are strongly advised to follow the precautionary\nmeasures offered by the software to minimize the chances to losse\naccess to or control over your Wallet data. We will not be liable for\nany loss or damage arising from your failure to comply with this\nparagraph.\n\n\nCopyrights and trademarks\n=========================\n\nThe Taler Wallet is released under the terms of the GNU General Public\nLicense (GNU GPL). You have the right to access, use, and share the\nTaler Wallet, in modified or unmodified form. However, the GPL is a\nstrong copyleft license, which means that any derivative works must be\ndistributed under the same license terms as the original software. If\nyou have any questions, you should review the GNU GPL’s full terms and\nconditions at https://www.gnu.org/licenses/gpl-3.0.en.html.  “Taler”\nitself is a trademark of Taler Systems SA. You are welcome to use the\nname in relation to processing payments using the Taler protocol,\nassuming your use is compatible with an official release from the GNU\nProject that is not older than two years.\n\n\nLimitation of liability & disclaimer of warranties\n==================================================\n\nYou understand and agree that we have no control over, and no duty to\ntake any action regarding: Failures, disruptions, errors, or delays in\nprocessing that you may experience while using our Services; The risk\nof failure of hardware, software, and Internet connections; The risk\nof malicious software being introduced or found in the software\nunderlying the Taler Wallet; The risk that third parties may obtain\nunauthorized access to information stored within your Taler Wallet,\nincluding, but not limited to your Taler Wallet coins or backup\nencryption keys.  You release us from all liability related to any\nlosses, damages, or claims arising from:\n\n1. user error such as forgotten passwords, incorrectly constructed\n   transactions;\n\n2. server failure or data loss;\n\n3. unauthorized access to the Taler Wallet application;\n\n4. bugs or other errors in the Taler Wallet software; and\n\n5. any unauthorized third party activities, including, but not limited\n   to, the use of viruses, phishing, brute forcing, or other means of\n   attack against the Taler Wallet. We make no representations\n   concerning any Third Party Content contained in or accessed through\n   our Services.\n\nAny other terms, conditions, warranties, or representations associated\nwith such content, are solely between you and such organizations\nand/or individuals.\n\nTo the fullest extent permitted by applicable law, in no event will we\nor any of our officers, directors, representatives, agents, servants,\ncounsel, employees, consultants, lawyers, and other personnel\nauthorized to act, acting, or purporting to act on our behalf\n(collectively the “Taler Parties”) be liable to you under contract,\ntort, strict liability, negligence, or any other legal or equitable\ntheory, for:\n\n1. any lost profits, data loss, cost of procurement of substitute\n   goods or services, or direct, indirect, incidental, special,\n   punitive, compensatory, or consequential damages of any kind\n   whatsoever resulting from:\n\n   1. your use of, or conduct in connection with, our services;\n\n   2. any unauthorized use of your wallet and/or private key due to\n      your failure to maintain the confidentiality of your wallet;\n\n   3. any interruption or cessation of transmission to or from the\n      services; or\n\n   4. any bugs, viruses, trojan horses, or the like that are found in\n      the Taler Wallet software or that may be transmitted to or\n      through our services by any third party (regardless of the\n      source of origination), or\n\n2. any direct damages.\n\nThese limitations apply regardless of legal theory, whether based on\ntort, strict liability, breach of contract, breach of warranty, or any\nother legal theory, and whether or not we were advised of the\npossibility of such damages. Some jurisdictions do not allow the\nexclusion or limitation of liability for consequential or incidental\ndamages, so the above limitation may not apply to you.\n\nOur services are provided "as is" and without warranty of any kind. To\nthe maximum extent permitted by law, we disclaim all representations\nand warranties, express or implied, relating to the services and\nunderlying software or any content on the services, whether provided\nor owned by us or by any third party, including without limitation,\nwarranties of merchantability, fitness for a particular purpose,\ntitle, non-infringement, freedom from computer virus, and any implied\nwarranties arising from course of dealing, course of performance, or\nusage in trade, all of which are expressly disclaimed. In addition, we\ndo not represent or warrant that the content accessible via the\nservices is accurate, complete, available, current, free of viruses or\nother harmful components, or that the results of using the services\nwill meet your requirements. Some states do not allow the disclaimer\nof implied warranties, so the foregoing disclaimers may not apply to\nyou. This paragraph gives you specific legal rights and you may also\nhave other legal rights that vary from state to state.\n\n\nIndemnity and Time limitation on claims and Termination\n=======================================================\n\nTo the extent permitted by applicable law, you agree to defend,\nindemnify, and hold harmless the Taler Parties from and against any\nand all claims, damages, obligations, losses, liabilities, costs or\ndebt, and expenses (including, but not limited to, attorney’s fees)\narising from: (a) your use of and access to the Services; (b) any\nfeedback or submissions you provide to us concerning the Taler Wallet;\n(c) your violation of any term of this Agreement; or (d) your\nviolation of any law, rule, or regulation, or the rights of any third\nparty.\n\nYou agree that any claim you may have arising out of or related to\nyour relationship with us must be filed within one year after such\nclaim arises, otherwise, your claim in permanently barred.\n\nIn the event of termination concerning your use of our Services, your\nobligations under this Agreement will still continue.\n\n\nDiscontinuance of services and Force majeure\n============================================\n\nWe may, in our sole discretion and without cost to you, with or\nwithout prior notice, and at any time, modify or discontinue,\ntemporarily or permanently, any portion of our Services. We will use\nthe Taler protocol’s provisions to notify Wallets if our Services are\nto be discontinued. It is your responsibility to ensure that the Taler\nWallet is online at least once every three months to observe these\nnotifications. We shall not be held responsible or liable for any loss\nof funds in the event that we discontinue or depreciate the Services\nand your Taler Wallet fails to transfer out the coins within a three\nmonths notification period.\n\nWe shall not be held liable for any delays, failure in performance, or\ninterruptions of service which result directly or indirectly from any\ncause or condition beyond our reasonable control, including but not\nlimited to: any delay or failure due to any act of God, act of civil\nor military authorities, act of terrorism, civil disturbance, war,\nstrike or other labor dispute, fire, interruption in\ntelecommunications or Internet services or network provider services,\nfailure of equipment and/or software, other catastrophe, or any other\noccurrence which is beyond our reasonable control and shall not affect\nthe validity and enforceability of any remaining provisions.\n\n\nGoverning law, Waivers, Severability and Assignment\n===================================================\n\nNo matter where you’re located, the laws of Switzerland will govern\nthese Terms. If any provisions of these Terms are inconsistent with\nany applicable law, those provisions will be superseded or modified\nonly to the extent such provisions are inconsistent. The parties agree\nto submit to the ordinary courts in Bern, Switzerland for exclusive\njurisdiction of any dispute arising out of or related to your use of\nthe Services or your breach of these Terms.\n\nOur failure to exercise or delay in exercising any right, power, or\nprivilege under this Agreement shall not operate as a waiver; nor\nshall any single or partial exercise of any right, power, or privilege\npreclude any other or further exercise thereof.\n\nYou agree that we may assign any of our rights and/or transfer, sub-\ncontract, or delegate any of our obligations under these Terms.\n\nIf it turns out that any part of this Agreement is invalid, void, or\nfor any reason unenforceable, that term will be deemed severable and\nlimited or eliminated to the minimum extent necessary.\n\nThis Agreement sets forth the entire understanding and agreement as to\nthe subject matter hereof and supersedes any and all prior\ndiscussions, agreements, and understandings of any kind (including,\nwithout limitation, any prior versions of this Agreement) and every\nnature between us. Except as provided for above, any modification to\nthis Agreement must be in writing and must be signed by both parties.\n\n\nQuestions or comments\n=====================\n\nWe welcome comments, questions, concerns, or suggestions. Please send\nus a message on our contact page at legal@taler-systems.com.\n',
    },
    paytoUris: ["payto://bitcoin/bc1q2u448s4zay6u6l4vucaye4l75vwzd629hhu5qx"],
    auditors: [],
    wireInfo: {
      accounts: [
        {
          payto_uri:
            "payto://bitcoin/bc1q2u448s4zay6u6l4vucaye4l75vwzd629hhu5qx",
          master_sig:
            "KQEGHATMDQ0400PJ03HB2CRCS6BDG5ZAP54642ZBNZG8GBJVHQ50QGQJRMY9R42QCF03DTXJWK1QWQVVYCSHAYEXA9BWFEB5P93NP0R",
        },
      ],
      feesForType: {
        bitcoin: [
          {
            closingFee: {
              currency: "BITCOINBTC",
              fraction: 30000,
              value: 0,
            },
            endStamp: {
              t_s: 1672531200,
            },
            sig: "4DEZCA5TD6QGHMXQN5QX9SX328ZJP6W4Z3AH7JQ6VK9RY4C27RQ7KRAERTVA3C9GX51XVG5F3Q1GM9E3KBBAAAX451SS3JS588ZAY10",
            startStamp: {
              t_s: 1640995200,
            },
            wireFee: {
              currency: "BITCOINBTC",
              fraction: 20010,
              value: 0,
            },
            wadFee: {
              currency: "BITCOINBTC",
              fraction: 0,
              value: 1,
            },
          },
          {
            closingFee: {
              currency: "BITCOINBTC",
              fraction: 30000,
              value: 0,
            },
            endStamp: {
              t_s: 1704067200,
            },
            sig: "7YPEYGW952GV1PQKKAXJD162Z5GZ1KGSDJWD17DPRKQ72VWFMAKF9W8A6EFGH8MQG6TKEW3F2BSPAP0YPE26RE458RK0FYYRMGFVC38",
            startStamp: {
              t_s: 1672531200,
            },
            wireFee: {
              currency: "BITCOINBTC",
              fraction: 20010,
              value: 0,
            },
            wadFee: {
              currency: "BITCOINBTC",
              fraction: 0,
              value: 1,
            },
          },
        ],
      },
    },
    denominations: [
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XXA12JYJK2JBJM2VRMTT16GPE180NNE7H7HKVPCMYEKPR24P6X52WANBAJHMPM97THM4EQ3F0AYTTWENWWRA4HMTQ3V0H8XKCMKRC27Z7AD4WNVEYA0EYPET0VWYWCNJV5VTVJ9AJ6JC9KG9PQQ26MBTSZTKVAMBV6EDMJJM7G4SB9M1YXH2JM4SJH7TRXAKMR41N7ZRTBSFX5PYMYZAB3574N30S5WTHASSGBRYEBD46M20YKQZ53H9Q1BERY4KBNJ0MMJ0396SW2JW9HR1RPGF03XDW1R9TZBRD270F7RQTB4KR24PJHQANQMR6HYG8KE70YJ0P36K9VH3GTWK95NTK08126BFCA1EM9RFV4AJPQAJ1FNDDJ7RG9FQYJMDRB33K5TNJ1VGSJXVDSWE6VGZSX04002",
          age_mask: 0,
        },
        denomPubHash:
          "02YJHRRW4RXEP2RDWV3KH9DVJQYPJMQ2G33VD95H3M9NQ926D57Q6F0JHS3ARSRWBBHC6F4CB7NEM61WJS6GRDGFP9PDPKZ52EABF88",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "2W5E32M036ZNX1QE52SRSKDHDY6YHAJ5FZEFVDZ3PZRGQ85XYHJ9PNN6HDENMN5Z5X03AKQV4MK2FMGMKNJ65VWAE1XKKZY72YKYJ18",
        stampExpireDeposit: {
          t_s: 1691858048,
        },
        stampExpireLegal: {
          t_s: 1754930048,
        },
        stampExpireWithdraw: {
          t_s: 1676306048,
        },
        stampStart: {
          t_s: 1668530048,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 128,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000Y1HW2F7YXKQ7WRER1XTKS9QFXEAZ71H3SEARW21D993Z7JV344EB1QHP78QAYBJ1HK64G3BDYYP0TAEVH9D7YXC6DX3DJV2KGMTF2Q0GBCVAZ1PAKJEEF1MAP93WSBW5E31G2QMGY7PF9FRH7A7AR0GP3ZVNTJX8GMVHPFA0ZH3JKJZPDWZC3BF5T9VR277QXZFQCJWCY9NERBPR1B15C8QDA2PBS2KJV9XZ1WSKNRS0P0VED47MXD60VRS5H27SXFJ7RC515BKQ491AEQ38FV2RS5Q8FKSJTJHP08M63QFVQCF1R9T2BPFMQFZP05MRGYWK2XW2RF9A6917JEGQH8FKSXTD21RY314GGRTFFZF1KR79ZDW72RBENM3RY6B1EQKSYWZA1Z0RYWVDXZGB0R4ME904002",
          age_mask: 0,
        },
        denomPubHash:
          "0H42MY3CCB516DMXHYYWE6225A580W2HV8WV7CE06BCJX92RVDJFN27ARYJN9PX48QHJ4MNS0ANC5FB6TE7HGHDBW89FNVG51SGXYV8",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "DHNX9CEMCS4DMA3R2H1PYHTGGRCBS7ZZ52K2G6VDP47H7JHRRZXR0BNE907SYN717PGQNVBND6AE6HMXA4310BNKZ4VQ7RP1S8CT020",
        stampExpireDeposit: {
          t_s: 1691858048,
        },
        stampExpireLegal: {
          t_s: 1754930048,
        },
        stampExpireWithdraw: {
          t_s: 1676306048,
        },
        stampStart: {
          t_s: 1668530048,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 1048576,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000WPR1A5WK48FYTQFN3KQZZ5JB0ABH1NTSYCAG41E8QN79H7FSSETS6SC4STE21HV1MC31JCEEQQT4PM01GQ5B8JK4XGHFG6KHD5NRW0WNP8DJSM34BHMTGX0G1YFJRKNT2SPJSVMC8YZM1XB26M851SZP4N9CSVCNWR0GXXHFF87XKRA2CRG9Y3DXT4XAA07QWM69DGD97898R7EKXEFAT0Q7X840N15BS203R7AYAJFGEPXADYTSV2CBRADGC2TA6Q1QWJ7BZZT4Y3WRGNCTZT3Y0EX7BYDTAK8TZ8A46P2JVHSQ2NQ7CBEHPV4HM9CNNWR2BFW2JJTTCBRXNXT53F4EKJ222SZPRGNHRYVYBEB21JW21RNE01Q55492CBGVJGGKZC12SWBT06DWTFK1JPEGBN04002",
          age_mask: 0,
        },
        denomPubHash:
          "1A1JE5A239TJC5SSDR1RJ8R0R38GJTDFEMFC8XF6T8VZ235Z1M723YW17MXGN5CMDQRS5EKYSC2EY503GW2J3QDFQXQTP7R47ZD26SR",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "6JB7K5DPASWST0NA9R1H6W2MZ3XCZZDBSZEQFVR17RMMY3C43P5W03JBD65PVR2XKH0S25M6BGDFV6GPRFCEFX4YW6V2Y7X6SFNSP0R",
        stampExpireDeposit: {
          t_s: 1684082348,
        },
        stampExpireLegal: {
          t_s: 1747154348,
        },
        stampExpireWithdraw: {
          t_s: 1668530348,
        },
        stampStart: {
          t_s: 1660754348,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 16386,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000X320J31F7AP98VENBXSARB07ANWMB3BC18HGS91F4KZ4K9RE39WSMGN7RKA34WH5Y1GDW6VN6F92DY1Y11CYHD0NVKQNVXWR44SFGKKBE3P21APW30B5E79JHXKWS7DBDF3X590YS417HEK2NKGTCTY2D8AND7QT8C6G1DQ5MW6Z8365YFA1N6SR6VBFR2NYJ1GAXMCKPDBKK3VQ0HBS33ABZX14NFWC8AJW4QVGBTAG7QCMXKMST04BA48ECNH4TR8XHJ1X8T336ZV30FMBTBTWM2CC5529R8HY3SF47KT8CSQ0RP6228DZWMQ9T7BD47C195CSQ49YWDPV2Q8TFY04RAPXN93W7DA599ABSHGGD7TPQZM96EYV0JC2KZAVGCA2GQWT2NRZ5JKY763W68WNJF04002",
          age_mask: 0,
        },
        denomPubHash:
          "1FFHCV2PTZ7NDXMA5JAA3ZGB9VPE33MSJCK3NH9W2JC26FSM6QEGQK7ZVFTHDJN41AE0C4SX3GY1P0XGPZ9QA621HXY7GSDB13ZYH60",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "TPMNFXB6D0ZWHG9K2CPEH5VM0KQFRWPFC21P0H6RHJVCSYCPBZ31C5CHKAHE37R0QCKRQMG82XZ457WPT7B9D6F9RVG6FR86KRENM30",
        stampExpireDeposit: {
          t_s: 1699633748,
        },
        stampExpireLegal: {
          t_s: 1762705748,
        },
        stampExpireWithdraw: {
          t_s: 1684081748,
        },
        stampStart: {
          t_s: 1676305748,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 4,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000Y7ENWVKA8ST5K2F2T7ATPA3J1E8V9EWQMK080M0M6WCVSHMQ0GWPXT9XVQ6TMGW3886YRNQP58Z40747GAYRFMJT4GYSH1A7JTH1XDADQZXFRD050GESX6NK57DM1FNPY4C7PXRRQPGSMXS8KZR613SJYSRV6FB3GYM0H3WC1AR2DWJFQT9CTWNSP49PB8A9655YSN1E07XFEMKWGEN5DARJJ499AX5GR4Y3QQEMGZ8J3Y9AV6PG76QFTSJFYWS9JRRMGXFFCZ7TEYB6EYBMMX20E1W38HYR15QVGXY8PCDFCXGDRFRZ8CQMFCHPQ0YDKGW7K4HZV6EBYXEYV28FQ67W5JMHVPJ1ZT10M8571JVBCNJBQWRXPG1ZYWATPAAHB2GRYEP540Z65WHFPYY88RXR2D04002",
          age_mask: 0,
        },
        denomPubHash:
          "1NKJ2NP62QKAYWDNFM00MGXQ5750VV2541T2P2YX1EKMZCP30N5H18TTFC43MFRN9CSDMPR6M59Q4059WAJMEA8CZ6T73JFB4DVV7MG",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "9K335SE0G1Z8NYB91XHMG1614W5S1XT54CT940DVT8DP50433QRFETSPEP7F79PNN8YQHQJARJX3T4PBQEGDDWFS8QNVXDXQ8VS7M1R",
        stampExpireDeposit: {
          t_s: 1684082348,
        },
        stampExpireLegal: {
          t_s: 1747154348,
        },
        stampExpireWithdraw: {
          t_s: 1668530348,
        },
        stampStart: {
          t_s: 1660754348,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 131072,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XQ9SC8TGJR506DQCPFWCYSAY34H25YEX40PAPWGY4Z82MTJY1XX0EANYQX069TJRPVXVEW7WV2Y3DDYC02W1W0T3CX6Z94S28N8YR74NY907V8E9024BW5GS56GMB3YYCSGQVNN9HEB4AJZRNX6CA5ZF95TZSBWRFWATVASBCBME34MWD7F2GT3TAETRX1CM058YY7FA6FXZ2ZM39503BCE2Y5XEG14RE5QRN7JG39RE4ABF8PWXGMAYTC225K3REW77Q3NYR3J2QNSKMYK915V7M6SB5ETNF6Q0JV9326GVZAR57FRTFC8JTT6G9BT7EMHA8VXTXBRHMDTKAZGBFQ7BSFYT9S7M6HX9TENH8JV25CSXYCEX02G27KTT09VZJ16M7ECDPCSHCBF88GFF4AEE2D04002",
          age_mask: 0,
        },
        denomPubHash:
          "1XZV3WDN03R343D4M9AEBDZBQ5ZWCWK8FTRZTVBBSYKVG5MH1M4KZ3E4H3YA1R6VA1Y6RBJERF1WPP0TT4VS15Y2EF5MTKD4RR89ZS8",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "WHP0GFT1T7PHBMS29XGZSDGVXFM786H8682WVZTS3WABANAZCYD287J7YKSJFVTXRNDX3BXXRK1P01S12Y77QW84B0C3B6V2MFEG828",
        stampExpireDeposit: {
          t_s: 1676306648,
        },
        stampExpireLegal: {
          t_s: 1739378648,
        },
        stampExpireWithdraw: {
          t_s: 1660754648,
        },
        stampStart: {
          t_s: 1652978648,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 131072,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000WTBZZFDBBS30G6GDBYGJ352KW1V44RJ5QJSTZP014WJMHXAC829WFE2RE2A7QVSXRZ9YKRCH62Y7VAK5YYCQXAZRFEYTMWMBMXHWSWCK0JA3388GPPHB5DW7C7Y4JEV189YHACXKBSWG6B872E2NEWN6DYK5TRR0H1TKBBSGZ5FWYDAQMZD03M5PH1AJ01BKECBN07E5WZPG2BYM8NK3DB3B7EQYB2960G72QCMSV02M5CRB3RXDZKXB6A4MRA1GQ5EYZC5E56YGHA2JZVZVD4F966763QNA7A8XAZ556JD475W3MQR3AWVTGJDVEMBNXYE3XSW5J2WZR83BS0F9Z9TXT7QH7ZFQPECV6SS2SFFW2DAWK5N1CKVJJK63F5FFYQPZYXC9D5SFD084Z67W2MGPKF04002",
          age_mask: 0,
        },
        denomPubHash:
          "2PHDMTG81MC7ADG2336ESZYMDNBWNCSJS109ARV7VKH2ZS36RVAZZ53FQEHQ1CJ1TGTY2V21X5Q48MFK91V3WCZ5K7MRAWFY6Z8VB18",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "86NQZPTV2YZ6GZ4QB368RXM50MSBSQ7CXQQPJN1EA5PVMVXKWXJT5HJAXWFPRACHFP9WEAM49W5YV1S2R5C1QRX8WQ25V3TK21KMR0R",
        stampExpireDeposit: {
          t_s: 1684082348,
        },
        stampExpireLegal: {
          t_s: 1747154348,
        },
        stampExpireWithdraw: {
          t_s: 1668530348,
        },
        stampStart: {
          t_s: 1660754348,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 524288,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000Y75N9KDEBK0NEK2MPEJSNMAYSM802PESEJ3JKQKQCR1MX228V8NZ9W5QPTKKZKQQQHRAXJZ7CXK6XCFQX8NB1ZPYS36GD8Q37K7GHEVYWDBY7FYW5WRTF34FH7QX11N34VV7K7YD2ZQA2A1KPF3DKW5AF405Z8WN5SPB5A7XMNNZN819XXFRY0PK1ZZ8FVEQF7C8E9PHK01DDTKNBGY77G48HBN33JAMBEQ64JESJHPV7C87MF97BHQG3MYY97HN7R6GF5ZWRZ0G4Y03R2JEW3E33Q0488STPCEXR0ZD8ZZGPCAG1XH3FTAHMGXHH76AKFD638X7V3KKAXNNPD8VBRDPG81RNTRPT3WJXQZ7VQ3FPJY2B5AKK9X265TH45XZ065WVR8NBEGG9HJQ9XD3WHWERD04002",
          age_mask: 0,
        },
        denomPubHash:
          "33F49ES5CFMH8TQCFVZ75G3TB9XDXQ1R7ZBWBV0EEG3M0QMQ28ESFG05A4DMF6W9GS9PGM7XASS6BTH5JG53S4T57MZHP6DQWH66RV0",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "BV3SB05ZQ7YCFZ85V16CFT31P9G2FTQY84AWMF3XYDB2YRP1T5TZZHTQYTMWWNPVKC8J9D3BGPC0YR3T7ZG2K66S10V9428834GZ208",
        stampExpireDeposit: {
          t_s: 1684082348,
        },
        stampExpireLegal: {
          t_s: 1747154348,
        },
        stampExpireWithdraw: {
          t_s: 1668530348,
        },
        stampStart: {
          t_s: 1660754348,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000YBYY5T4KM7GXX6CACF02F8ZE8NE11HCYQY1CERFABAXE8ZXZTV338D76ETEFTFAD5ANMGNST2DZERK8MMS5FVE89ACGHG2EMJJT18E1PVB2W8HSWV9F3F9W56DFH9BV155E2358VGEN5WN0WFGZCY9P7EVZR30F9GTBS2TW9EGRWQRXYS433MJ2F83B2ZSV30N08AJC9DZR5F91939SPK19WQEPBWJB00QF55ER5ZK6Y4382F0TETVD0J5AKEVRS1511ZW004QES3AYYPFTJVTEZE45B95WSR25ZF5CB4VN2NMCYBCK17539H07J95X4AQ8BNVCGKY0K7FD0VTA1W15QXGP8MWQFWGA5H8P7FYJR8H1V5HS58KXKZYTNW3NNX5XXGRDVFBP7D13KX4J4VF352304002",
          age_mask: 0,
        },
        denomPubHash:
          "38ZJ5A2JQ18F6AZNXY29GYFK9XZC4QXHJ8BHZ07S118W3VME4XH1RHJQTS2PRASDRX6S5P4TN29R73FG8FP5SVNVP8F6DDWT2PK8F50",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "91S0VKJVAZ8K169988Y9HWDJMC4N6E7WXMR3XKF55QF6J7V1MTYRQB36YRDHKGEY4KYJ3D4KNEK45D051FFXN3AFJD7N8A4ZYSX4808",
        stampExpireDeposit: {
          t_s: 1676306648,
        },
        stampExpireLegal: {
          t_s: 1739378648,
        },
        stampExpireWithdraw: {
          t_s: 1660754648,
        },
        stampStart: {
          t_s: 1652978648,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 1048576,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000YN6C8EMT56VZ79KGHRMT0DYCNCNAJ6T9XFZEBQA0C8JHN4KKTKJFX6TQQT73KKVSE86PE4KCFZF1X1DEMJQ08Q3M93M37NZQX9MFRQPN0AX3SGGP653HCS9QK16T4DTDDCY4B3C4PCJFA6BXM928WEHWYXA40EP0P54D1JGCHRVKXWT7ESDE6SKJPWR2VBRBHZZ1DPMPAV8T482Q2DMTV77YR0F55V1CD7MXMQ9AEYMN2XMQEA8YKQBMA3GTZFREQR35TAXMCV81MC41S4TTVEKW6WWM7SRQZ4DK7QAPMHQXVDYFV760E183MZPC8G9XAZ17J07W89A2DNSPNSS99B6Z4032Z5MKP7HV9591Y49CD6JJ27R6SZA59XN009B4BZF6DCAXEAV9BZFMRP6J53REB104002",
          age_mask: 0,
        },
        denomPubHash:
          "3KJMR4DK6NRE1Q0E9Q88J6P0F5KH5HRC58WDM444ES5CXHXDWACYE5SN3NVM8A6790BK38YER8S2E8M63CYS84YT382MK3H132AFY98",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "RBYNV0Z25GXK0N1WGPPEBN9V91DYBJR0YNQGC1T3K7TPMRSHR8QDZ2QQRVB8PBJHS4NM3AHTECAXATFJRX2M1GEEEAX4RSPM8RC6P2G",
        stampExpireDeposit: {
          t_s: 1691858048,
        },
        stampExpireLegal: {
          t_s: 1754930048,
        },
        stampExpireWithdraw: {
          t_s: 1676306048,
        },
        stampStart: {
          t_s: 1668530048,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 4,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000YR7Z6DGTZXP3PT9TFVDYZBSXJ4M8RGV69TZSS4C2SJ5TZF48Y96BKMKWM4S8X7025EQK4NTGX20J2R3XV2A4ZME70W1C6QD82X8NJ7VKZ8X19M3VRMSBX165JCXG6XEMA4Q7XR8DE4NSVZKK091XSYHE2P9B94YDKVFBKKP8JPG44K00939XVFT3FGKVRDC9JD4VPQVFVPH3SMW5MF9RYNJ9Z69WJM7N1CZNFKMBYHR67RGPKXBHPBVNSS9XW755VJ5G53AT17QBD3CYD49FR9KG3N1GCTRJ272EGBN0B75A3Y8VT2PAB20HM4FNCH9ZQ9C269JD33C96DJ3QCEBE5KM6BW4MPTPDYG7AV7TTNX69N3HCEN4Y4YA9MXX3HQJPW8528M4GR1KW69V80DMG15RD504002",
          age_mask: 0,
        },
        denomPubHash:
          "42G0MVK452MX3KWX9W5FVYEJBREAMJ2HQMGR3QXDKS07G3D99ETGYDK9VWYXJ1R9QXGB7JSP641NZP2EHYCWQ9YK7467SMWDFQHH7S8",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "V76AXMV8J8SREBSF304V280PPS4KRBKSGQ03ESSDAWQG58NAW1AC1K07E4FSWF999RW544D1GQBH7NG5G6HXZNSX6TEGA04B5M3YG0R",
        stampExpireDeposit: {
          t_s: 1691858048,
        },
        stampExpireLegal: {
          t_s: 1754930048,
        },
        stampExpireWithdraw: {
          t_s: 1676306048,
        },
        stampStart: {
          t_s: 1668530048,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 64,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000YDAKRSGYJXB72G4303X8PJY94FHDY9P4E200Q4JEF0XTBYZH4Q2WSCC11B9FFC1J48YVASXNS3GQ1CS7WC2HR79EBCMPVG6A9VMM6B2T2D2RCKX1ZFS80VKVGX7CCKMRKKYWNF59JJVGC3M1VJ61QDM99FGDDE3FPC68ECDE659Z8V4QMPSEPBZYR87C0FSNC2ZPQ5VK1BEPY6WCNVD57VBV5Q67HW6YZ6CHQW7YV60F1VX93P8VCWBFFADN8SJBTKPH578VV2680B2EBFSY7XRWEC7G2RS2G10H517ZTEHYG8VNRF25C8D2478D98YN37E0PR2SSHZYDPZ8C4ZPSVQ4H95ZRT8D2HCQJ7DCYFJ117TX0FJ1GW422TSQ3SQTWD38BJHW5RP0GHRN1VVTMFMS3K04002",
          age_mask: 0,
        },
        denomPubHash:
          "49ACHG2PZWCQ4A9SD13SNTCWAFT6JNT61X4RQFYBCTMNRCHAKRSMBX713VHEZPSGJAHETBH6MS4DG28RS1M2VDCQ9KXKEJ6SKC812T8",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "4ZZ1HSWQ777BW7YQXKMHXB0AQYHNSW0S8DTC7N784HFS3CVYA9M9YH5SEW39AYBYM4CVW6VHJY54R339RHV0NH3ZDVVNMR62XPSVR00",
        stampExpireDeposit: {
          t_s: 1691858048,
        },
        stampExpireLegal: {
          t_s: 1754930048,
        },
        stampExpireWithdraw: {
          t_s: 1676306048,
        },
        stampStart: {
          t_s: 1668530048,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 1024,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000X8ZNQXV1XQSY8KG2MQ68PQE5RHJJZB1T8XF3CZG9P2QAMYGA9FS1BC3WAEC7EBPKNXBTQC53HWVY2NVPYZY0VH8HWR8TD56ZX7YA3JVZBQGJEP7Z6SM6E3P2YF4PCSF8FCCPWF500219XHH16CFSBT4PPJE8N93Y0999GB3F0SZ9H7AA5EDE0V6R496GC35X83ZNEZJDBQF13G26B6C2TB943JJKP15QBH6XCN3Q8Z2Y5AEPENTK0J2S572FYCCTP78M1XRBZP10MQXF3KZQ48GZN3HMCAZ2DGMF81P48CJ804V27SKN7JR5FJVDG7V1KD4VZEHTJS8AQ1DN9QMB559W19T1F82SEDQXT0N4G0AVBWH4TS51JQFBV73G4DXXGDNQM4M0GZXHGSKM30S2RKD3YD04002",
          age_mask: 0,
        },
        denomPubHash:
          "4AKZ10GPNRNJ728AN25AD4161060S89S91T6YXSZATQ9GMKCGJ5DTBBT2AD18XHVSZ062EME6Y43GS9BTN4W2QFVN7KEGKSXTW760A8",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "3KZ033DPBYPRAHDW73WCY8BWK5EVZJ2W9TMARRZ65DKZB8544RW8407TT6SX21WR7HR6SW31B2NQGG75RSF4G8Q653MZSYVG5FZ9C20",
        stampExpireDeposit: {
          t_s: 1707409448,
        },
        stampExpireLegal: {
          t_s: 1770481448,
        },
        stampExpireWithdraw: {
          t_s: 1691857448,
        },
        stampStart: {
          t_s: 1684081448,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 65536,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000YC6G2B00FFEP8QDQMHNQWNKWT80ANKWSCJD63NKBTQ80X9NNAXKTS87D6NXT6NABTHV69VK2GQHCPCYAQZ6MYEGET6E7GDK2N9YEXC81SKJD71RN5EHX4Q44M4989ACSEF6H872JSAPKFR7DV8YBB50BYPTBJ0N9QX9MZG74JBE85XFBN55WFQJ9FPGEDZ82SCH6S6AMQ4F14FFTRAB5C9M5C70GXPQCS957KYP12S7CARW1MTFHEKA9EC3MDSWXWK2ZAZEZGYTRQEG43V4NBA42GNY7W83CNB7CQ8S182J1BJC9KDVQHE04RN8M784FN0JCDAJ4EXDFMMNCDGN1QSPS8TM4HFKZKRHX4TDP9EWVJ65AJSPGZ78FTJM6GGGSW095QDX9MXQW6FW6A24QBWTEYX04002",
          age_mask: 0,
        },
        denomPubHash:
          "4AY807RS1X16SYPEKZ1ZH1450Q5JBVVK9XHBVBSDX9K04Z0M5KBPD4EDHJM9SQYEMMYS4FFZCK63J440TXSJ3Y95GSVPS6Y4E4HSKF8",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "7VG84867XJ1267TEJ47ARDTWP65QPBTKJE89C044B8G3DS46Y87V6V7Y0KSBAR2W8X183FQ52F335GT5CGY514BKEEB8ARSCJHS7Y20",
        stampExpireDeposit: {
          t_s: 1676306648,
        },
        stampExpireLegal: {
          t_s: 1739378648,
        },
        stampExpireWithdraw: {
          t_s: 1660754648,
        },
        stampStart: {
          t_s: 1652978648,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 128,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XMHQKXSFPA03N1ZRSGS3ST63ZNNEHSGA71E7WXZ1P9KYK3B01SNDXNTNFF72QP0JKXPSD389469N3H70V0K9HGGGA0S03F59BBN5FHA0E86RJ850N4KNJV2E6S90PQ56QY6S64318N9RGXBZF3KRR159ZR0YSERFNJ9VPBD0MYGDR5YK7K0GFMYXWQZV7H4V9MK94JVCAZCQPDTV4GT7DSF1YRP75QK4B26XSGWSRN3FEQ2HS47C3F3QYQMETEHY700P59XEAYADWB37BF7V70X9ZGN0CJJQFYV4EBADSHVRQ9RNH9XMAFPVY4755HXKP9AMM7AKJ2NKZFF9Z27PTRX2CY9PHT1H7YYZ5M6APMY3FJW05F6RZ3TH24F7E93KVS989G7K0C594E82VJ4K218HKS04002",
          age_mask: 0,
        },
        denomPubHash:
          "4PSE2D4J7NCZC4SPAA93BWAWQMVE8YRM1D466K32G1MZBGGKKDFK3ADH08EYN66H8WSNE84CTS2MAS8F9JXSGMBRA479SC4TKV2VKZ8",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "WZ2BHYSF8CH8A058GS86DD9BBRX5HVKVQQQFECBCE66JRRDEBB2D732XNMHW0SXAZJE9EGW4XPN63XYRN3PGHHQBM11YCC42HGRCY3R",
        stampExpireDeposit: {
          t_s: 1707409448,
        },
        stampExpireLegal: {
          t_s: 1770481448,
        },
        stampExpireWithdraw: {
          t_s: 1691857448,
        },
        stampStart: {
          t_s: 1684081448,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 4096,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000YS1WM2RV00X5TKHT5YBAGK33TQYS3DPJCZB4363AZ92TSXWMEZ6B0FMH1950Q8MB8SW6742QDW1BP64BADCP8PKRY670ED034XACXQQCHWP8X7AMNAW8F07ZW5ZBXZQWF9RZ19CFXJHP20A25SRGX7AVW5WQR3EZDYV90NRBHSE85EDNG1MZZY3J9VBTRCMTFXWCJHS4R4K5QVSB5REJHTYRR51E6VMS9REBH18CXNV8GWZM5C895SPRDZFHDG2F4ADVSR8TYVYCJS5BWZ54BJY0K1CA998YS2GYHRR7478G7TSGNJV3K0MNQGYG4Y5738NE89TKV0M01T9GWNNHRRVZJSWRC3593HTM531FVWH59BRESJQPGSYHN69QY693MW9EADBH9732NA4DGK3RGX783S04002",
          age_mask: 0,
        },
        denomPubHash:
          "51EGPX2B16K5AH35N0FE738MRYNZHA2J4BEXC7BKEFX87QRZJQS909V5FGCXERBX74RTCS6WAFXKQPT7HEJV5P5QH3CE90ZHBCAYNN0",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "G66MN8NM14D80X2XMSKBJ1PWFHY00T8WX5JAPYDSB7ZHP4PGXKH5HY06YPZ89SAZY4XRQJCN3NDJA0QYV3WNH72G1YYSSCCVEQSV02R",
        stampExpireDeposit: {
          t_s: 1691858048,
        },
        stampExpireLegal: {
          t_s: 1754930048,
        },
        stampExpireWithdraw: {
          t_s: 1676306048,
        },
        stampStart: {
          t_s: 1668530048,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 32,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000WWMJ4A7APX8J1GGPDCFX3RWDZVP5W4480XY8K9GW7FGMH5W3X0F60BCSAFKMT1KEFVPJAKBGHF6XV5W5F3BEHFYSEQZ6GVQ992V79FY4ZHQR9NN76Y1C6PNXXQE0C82MJT3DW7RERZHHEWYGWE00E0V0MA35MGDD8K918AXKVSKKQDJ9P7G7JPGSPKBJBG6Q34C2PQGE53TVKH2GZR4QDM8FAS1X7CECSP4Z7PEWXZ5655EGRECF48PR9KE66C5XBJP90Z25RRFGE8ZA4C5JJB6PNXSFYDV4Q10VT94SY7JG3JZH15CKQFHB8X4BFDZ3H34WD7JK5WXC7YRN17WQMDSXMZV561F3E1ZSC1EN2867ZW054K4RD5THEB0DNXVNMPD8C0PVD2FRSSYZMATMT1KRYK04002",
          age_mask: 0,
        },
        denomPubHash:
          "5WMDWYV3RCHN33C0YNHC428518TCP2C9DTBDV446DV8W5C97C1JZS4G0ZRTMTK7160GSNJZAT9N1JX8KZZXFT7FFM8R3CGZE372FJ8G",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "7BYWB5HB2982K9Z8KYXD756WHTGD8ASNMM7MEKJG1RA5ARA0635TR2DPDBKAZT4RNW1P8BS8969FQAC6C3F8GWFEVTXDY2GEWSTJC0G",
        stampExpireDeposit: {
          t_s: 1707409448,
        },
        stampExpireLegal: {
          t_s: 1770481448,
        },
        stampExpireWithdraw: {
          t_s: 1691857448,
        },
        stampStart: {
          t_s: 1684081448,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 1024,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000Z9C5FKM2YRNES20BD5CQA19SMVS7JAK03PGBZXX1QHK6F729FH7JJST3JSA4BQCQFM2V106TZ1PHY3J1EV6BX1VSV29ZRWEZJXRR44MFEDVK6JVGF0WPS74Z15ET04038HDPG23XATSKHAS0V9RJ5NZ7QH2Y9S2N5T5WB0JYFY782QSE9ND9H1X6H4BJJ9QCH6M2Q79C0RPB75J8TV49JDNWCY5EE04SB1H8S3FVKY34M29VH3XP0M3S2ME8YFJQ5BKEKTBHBS0MGDNPJ8HHFPPJGWYJ8XGMEEN0WRDETB19MGATKKSG5EZ48S335C5YD1X9ZBMT6P5DS1CSJGF4N3AY0YYZ9E7S9QAY6QBRPZSN6M25FG7GDMJK3N3G0AJ3F8PF9YQGSBEC4GRXK4BDN3E11904002",
          age_mask: 0,
        },
        denomPubHash:
          "5XCSKX2PNDNJY5JAPES1FXF5VVAGBCAP48QNJ9SWWFCN0C6Q3YBPK6ZT8RSQ5GG62CN505RE1G0CHEM0Q4DW9BYGBV32Q36YEWB6CEG",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "VWAD0D88YHDYSSGVWTGNG0ZY3H2F2NRXPXHRPZRXPP10AP71NCQ80R9JGQ5FVA5N0NV8K05ZRVDAGNNY5P9JEX0GK45NXF7ZHK09R0R",
        stampExpireDeposit: {
          t_s: 1676306648,
        },
        stampExpireLegal: {
          t_s: 1739378648,
        },
        stampExpireWithdraw: {
          t_s: 1660754648,
        },
        stampStart: {
          t_s: 1652978648,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 512,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XE8VRR6Y8YQC39MNVYT5TCDH83K88SG9CASZ3B69S34ZDG4H4NZXKKSTVCVTEK257HF91J6A6KY34ST8ZH6QCCGQHEHDJPZXVMKVJD588TN1FB3HB626DM0H146C7FZ63PT2FH9TBR2VCNW17Z0YBPDDBD96K1EDH5W7XAJKH64C7K8MTFGTXWJJW2E0MS3237CTK7Q4NJNDVP1D07WY8P7XSRRC7J69SZ655VGEWATJMRE87VRRHKK9KERJ2RMQJG127RPJE1BEWDXXX5QQSJ9ZEKEW6QQ9P8C8GTHZJNP3X3YX0QHPTS18XAPCPZHWBY6HA5S57943F7JKPGY30K9P7FRP6VDNKN8X5MZSWWX06K4FQZK6542JP4AG4KDMKSZG1FXPF8YNQWG6QZFM2S4Z7S04002",
          age_mask: 0,
        },
        denomPubHash:
          "6C8M550YVAWPA5X43HZA9NJ49E9ZZQ6PPG6NSXJDYEJ55F6PG0GRRR5WVEXDMYBCNGW3E3FXKKFWP62K6D879A44EG21THPVHD50ZKG",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "G37XK59GQHC00Z4WW3Z1RWMAKBV912GWRXG6XX9DP8PA3T8B8655AYJTZAR1WA390YSCXGBMKDY5GB7C3ZBEERPKD41VV1A4TY6NT28",
        stampExpireDeposit: {
          t_s: 1684082348,
        },
        stampExpireLegal: {
          t_s: 1747154348,
        },
        stampExpireWithdraw: {
          t_s: 1668530348,
        },
        stampStart: {
          t_s: 1660754348,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 128,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000ZEETGYYX4KZEPE9D20AWY6J1VBDSE12E7RD6MM6YA66SHN574E4DH28ADTQQQSG1Y975YEJW8FKP1V58MTH5DBZVMRRDMD0YX071MSFKR97BYJ4PCJ8HDVPQ666FSG3F4K7G4X9BMY2AKG4X1FA6ZXQPSA17CCN9PNTFEZY7N9X3NZA58VHMY0KVZ7MS3H1F67RDHDQR26E4AFZYXX2S40RFPQPYWJ2XSBPB25C7BMCK0FCY1BJNH8BHJY6RRN45725C0JB3QQRYD0XY6J50V5DV84F1VFWCNW5MF9WANZ1NSVYN58YSYBMHK8FQ2R2PK8R8VT8X0WJYE8EMRCDBBVBYZJJRPHH8VPGK1NTP72V7PQ48XB85GVADQ1PSAPNTHGWCW24GYB9BFSJ3ZW34NHXYXV04002",
          age_mask: 0,
        },
        denomPubHash:
          "6FCWS9WQCM9ZKJDVP295S6K338J1P1YWAYYV58R2HYJYR4FXWZGHQJEHDRS87X8RV127SFY09FQFDBHF2XET83JSAQ9TFETM2N31QV8",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "W6S2QEVWZ9N9AQHNCSS9PPSXS51BNTKYQVFCMT5HD4AJQABKWM3EFR6YN5QCQX29YXDSGWZDXYBY6QK8HK20T0JY49CGKFMA8CDFG1R",
        stampExpireDeposit: {
          t_s: 1684082348,
        },
        stampExpireLegal: {
          t_s: 1747154348,
        },
        stampExpireWithdraw: {
          t_s: 1668530348,
        },
        stampStart: {
          t_s: 1660754348,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 512,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000Y4FPGQGNC94KA9RK82FMXNJM2SBE5ZV5KZRN90HP6T7D5GFPX2C457CA17AKPFFHFDX02R53DC8D2CJNFK5DVFMBGTGBEB9C98R5AZTE82SA8KAPS73WMYBJSK58MSV9S0J5PSGVRNJJWGSN9M9CCRCNFPX1EWY6V0P6KAAGTTAF0XYKFESSFC5P5P2ZSCRCJDJY24R2ZARWX1YNY3KXXKMFPGWE3QAQ4TSRWMJ0VD3WTCG5ZBVF2YD82MFFMD65ECDBY8GRTJ9D6GG7S8GT6MK7X1CTB8SX63FWRWJ40HY79EN3CQEW42X1EKH0442RA29V2CDK763E7Q84CCM35B25RBTTJ3KSKWR5PHBTEYVZPW53JK46BZMB0DVJ9KFKRTCS68N8GWDGFR4CAK354C4GTZ04002",
          age_mask: 0,
        },
        denomPubHash:
          "6FH03DKB4Q7HBC6QMM3AGDWN7S8GX00MHDV6PK40VEFS00KD5XVYJ7VHPRWZW41KS1E7VXWEW9PYPPWVV33BW82SH1MT35C10DSZBN0",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "YTSHPFBBXEEGJENHD5STZ0Q2HQ7CQEC9CYRAXQQKS0GX67HT4MW2S3H0BGMGH1ZBKFPSS4RZJE0T541F2BD647M8ZPVKJCGBXC6Z00G",
        stampExpireDeposit: {
          t_s: 1707409448,
        },
        stampExpireLegal: {
          t_s: 1770481448,
        },
        stampExpireWithdraw: {
          t_s: 1691857448,
        },
        stampStart: {
          t_s: 1684081448,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 16386,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XF6Z6BWWR4RDPM3E2WRNHEA8W4B2BPJDNEKKTP9QKFTPDHY2X6JV67F94CHCQD417FCPDMJFF432A90J4PTQ5PDM3YMTDFA83VVB4K60021V33Y9M0D473QT7DJ7H4ZYNMDPRBBN8F87XZQ9TDBDMRY187EWFG0YPGCWM28YNWZ984A4ZYMR2SAX7H96D517EDEPBEYNYD9N9VKVEQ6RFBMCYSES76SRQKR2V5PNPWQGDRDNMT925GX3QEP5RNPK2XFA7SWGBSH89Z7EJWYTP5MZT3JJT6EG2VJF4T2C52QM9Q1V42F0BWE5XNA9KM8K7M0FZKT5R1NW5FPFJXY59KMDHR7J2PET9240TGRR3KWGV07PEGXJD9XMB8M1Z3SA9NKGK4BD6GCAV4BDSGRYSTQJDS04002",
          age_mask: 0,
        },
        denomPubHash:
          "6MRTS4RM6K0XV8RMAC01FMVQDC1RYXQQBTZHYX3S4ZZDN5TBS6YGX3NA917JH6NKM2GFJWSQJB78P20VZV7DNJVKRJ1XJTNE4EY7M18",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "E9DC21CZ73PX8N57VDKZCA9AHB7NASV7GG90A197H9MT7Y0BDD4SXKQCT14D36N18V11K0S0S016R8CXDV51QTF8CMDCE0YMGQ0462G",
        stampExpireDeposit: {
          t_s: 1684082348,
        },
        stampExpireLegal: {
          t_s: 1747154348,
        },
        stampExpireWithdraw: {
          t_s: 1668530348,
        },
        stampStart: {
          t_s: 1660754348,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 1024,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000X3G6GBFKFKE0MYB2WK2CRV5G47CD8ST3TY78V422Y9W30TBV8NRZBQ3N1HKDEG1Z64CKXRPDAS1HTW4DEWA753EE1Q79ZXGPFK4NBA6CHKBKNGE3NY04SGTD4M5X09KR1B2925N7KMEX9EG2Y700AZE4GW9KVTXWB9MA4CRBJD08CW0Z7HN3RZN7JSP5YVAA4QZTVZHDPFJ14VKJD0J3N9QP4761YWBYT7GMGBHY8BRYKDJEY05QZYV962K17MGNCGS9173HA2ZVFS0DWVASXBWZMXZ78K2B9ZZVSDMTTMWYM7TEX61X5MPAK5XYN0JVSK2N7E95EWN9WWV108YYGCTTEZPW7ZKX154ZZERE779V1E0GR9ZWW7K2AA5DKVR25MT1TGWQQE082Q751FYZHFTTMH04002",
          age_mask: 0,
        },
        denomPubHash:
          "6NM0VKYB4FNJD6DJKSX8CETJD7GGW1QYGPRMTFSDZ662YFAEV7GC7H11RXTTPNTP4S1N008S3QEZZ4Z8W8D1SMJEJT1KQ7DJWSTTKC0",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "XT3BXRP5MA3DB43P6HK4ZAGMWPAR438J11RT99V6NVM16NE9W9C93KCE50PAPNE9H1N1B5A5GKB5J8PA5K1FTZVD8M2QHEZTMM5XJ10",
        stampExpireDeposit: {
          t_s: 1707409448,
        },
        stampExpireLegal: {
          t_s: 1770481448,
        },
        stampExpireWithdraw: {
          t_s: 1691857448,
        },
        stampStart: {
          t_s: 1684081448,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 32,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000YYKSTJGNW57CJNJJXEKJG81RFCJ8DXVQQGAJRNFJ2V755SRC12TXHKC5X1TZMV56RBHNHKD7YER2H05W9ZEZSWYQYB9KZVGSVPHP5NZ55EWXYMWNX76VEXMF5QFKKQRK7V2VPF8ABVP6SRXC3WJZREWNZ2WXWD24NY2WQMNSHDK53VJQ1QYXNTGJCFNQJ42NQHTEA5B4SM4GA2N3NF39HE6QZW3CBFTBKVZ2Y6JSR55RF5ZXTVHJQS8AW2BTS6503RRR8T4W8GCKHHJ7MJPX88HHPR2FAFGSDQRH4EVAKNEBK18YZ9R0WRQ85Z1GBN5GVPBJJ4K9DNDMFSVC0F2XSF0QSW3596VK7FM8FYGDYCGRA4V23BDZQFXNMRWV7412WMA7B0EVVA4NYPCYF65938V1ED04002",
          age_mask: 0,
        },
        denomPubHash:
          "75VRHSWK5XCYFDV7R96QPSPWEDCEC6D3KGHEDK2EC86BPCPPH84A6S2ZPA93Z66BCWYY401NEHPSY2Z331XZVBH851WP738TV360FB0",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "C1XDY32WWVGVP09ZSJPT1MHMSXHQNPXJXGC68PX9AFPEAC34AP39NPB9074DR94GJRE9DQMC15NG72JKTGA7R6TS5DDAKB7ZXTTMT28",
        stampExpireDeposit: {
          t_s: 1676306648,
        },
        stampExpireLegal: {
          t_s: 1739378648,
        },
        stampExpireWithdraw: {
          t_s: 1660754648,
        },
        stampStart: {
          t_s: 1652978648,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 4,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XTJDEYRYP4WWJA2C3NYTPHK0R8VBMQ1ZCK39ESKYJ3HXDG3A9X67HHQVFM43S5MPVQ7J05JTFCNW21EM7Q0A9GQD0107YGRNCE4SWEQ2VCYR94P33HMKGDMYPWBF18Q3MZ90NY5CZ7PSQMSKKM3JFNMX5V91C2JGVJR7G8JHZVB6HHJE6AEYDCQN48Q8CY8WS2A9B88203YBMC4RB9GX388YRSBFFZ3E93AY7R9MX2MT780DSEK73CBS334JAZCWW5D4ZGTNVFTHGFZE2SBQDDNGPMX5N6SD5VWHC1Z90A47R7RCTCP8TAXJ64SM277WT0SWYCVD2KHFCE0ERNWBVEWPZ6Z2175HT3N4C72D9MSTQ6ETNDVCKDQETV2BQY5KHKWBJR9G1YQ19BM15VEK36YJAS04002",
          age_mask: 0,
        },
        denomPubHash:
          "81NSVWYMSQZCW3FAJ8WY1AEDPBPHAHGR166QT7AHKHW55SKF8HXM25XQYY9E47363EB4J6SP0TYH4SAN52P9AMMQ11JPK3F3NVH547R",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "A05G3RKDM7E8JWGJG7TQNFGAE3KC1XGWJQK9BQ9S14XAHR46YQY9T6WASAFGGG703CKZ8M8KW71197AS7Z6SS5W71P77A62NCQDN03G",
        stampExpireDeposit: {
          t_s: 1676306648,
        },
        stampExpireLegal: {
          t_s: 1739378648,
        },
        stampExpireWithdraw: {
          t_s: 1660754648,
        },
        stampStart: {
          t_s: 1652978648,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 16386,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XV1KCQJ6CV7ZK2WD5RHM61BA086MH87KSKZFE34J548ANAR054XQ00T1CXDTXQDPPHC18J8NEGQN4H71B9E4KJS8E5VBNDF5GNK1Q9Z60WV6E149KPKKA8H5N76R5WG9Q3D1EP909R1FRZK1R89AVFHV7Z56WQMMP6XCPM92KBY88FEYZ9MGPGV3VCK1SHQ8SHN277MZH6W8EHR3K30HBRSF81M30FGMDCP43YAECSQB3CAXD2F0H372MRR1DX3ZNPP9K8TBM67YWZC51MJTKEQ6M4X3PYH4EG695ZK1ZMPD0A3F6P5X11SSZNGYF9H95AC3RZA1V44J97VT8ZQZPE43YNE7AC2RA0P5EZ9DJFX73D21Z61WSKM8G99WN6H7Y40JMHS5MMGDT0917215DCM86F04002",
          age_mask: 0,
        },
        denomPubHash:
          "8EXMW6C2F93MJ4RSATDTA9E28R236N9CT6N5Y37VGSN5FWEGA7725D2FYB7JAV3JTMRSDAPA4NQNZ8C7QP9MYKE3NR67X8CQS8EKQ7R",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "3N18HVB69S08T54ZA2PX6BYKKJZ6PE7H74RZV5PRNEV6WKP16T9JNKQ4A86KH9DMT96D0P2VG6FYFV60VW332HPRGHMNYWDCV2GWT18",
        stampExpireDeposit: {
          t_s: 1699633748,
        },
        stampExpireLegal: {
          t_s: 1762705748,
        },
        stampExpireWithdraw: {
          t_s: 1684081748,
        },
        stampStart: {
          t_s: 1676305748,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 1024,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000X7D1JCCS855C43QVWVN5KMD10E26DWTFS1MJ4731SMR3DTQ7JSMJJPYHJ0X00EVK5167938VEE9KS6KP466A5GZ59GR8K8MF0BFCP6V6WARD2FZEN3QMVJYA6BNB93W8RVVDRJTV045KQ1E6HT6W10MW2GH8DEWYHEJXDGK2RNFE1ENAZ7SAKMDP6QFARQ0MJ0MDJ8N17C5NVTB51GM0VXRB8VTSZ57KPW8QQAE3JW98C3WZ3W9W5CTNYQK9KM89XEF5PMV90XNKBNS77GWSKQDQNWN3ZXP9EAHWF4KF4Q1R0QP97XVCVD5ZSG1GF8C2BFYMZ09CBHBA0TJTP16B4VY9TD3EZ1BZPV5R6STAT8BWN3PRQYFB5CYMYWFE8R6G6B8FSPWK9J5MWG58Q6AGW5A6YZ04002",
          age_mask: 0,
        },
        denomPubHash:
          "8QSGYQXTTABG8238JBT4DDM9SN0G0T63WZ2DZWGVGH2JY7JTWNZ6WQKV44NYZ3FVBQ1967GFYYWD4D6MW6VKG0RG47QZMR2WKTR2MA0",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "G32H6KPR2VA4XCPVAKFKA25JAV08KJ813ASFHNNYNKAD651YB6SR9KFGJSRGCDPDZR9V23J7ZJRXRPDXD8AP217WQS2BT6HP6TXGE38",
        stampExpireDeposit: {
          t_s: 1699633748,
        },
        stampExpireLegal: {
          t_s: 1762705748,
        },
        stampExpireWithdraw: {
          t_s: 1684081748,
        },
        stampStart: {
          t_s: 1676305748,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 4096,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000Y91SMA2HFHSV3PZJ7D05RGGTM9APJM89A9PFK0QYQYYRBRGQVXS4HEP9G696E3J13KAVC1YNRETPRGJTXJ0XVB7P213D68C1216ZG36946A3GQZX315XGMYEVYDXC7AGJHS8CWRXYHDN22CFA0TFS69DKS4V6T57EPV7S2B1T56FZGXZGSHD2VESV7MYGNAW9QQ3JGAYJGG8YHQYM4E71A0JFPKJ7WW2HGD8QZ5DP2TNWXD1XDHSQ3KRRQNK0EG711PQHSDJMFTFG4K720T5CQB3JB2XYPPH2GJX2RH02S553CS3KPWVGXTR06E6YN5AS9RY5P40Y822VTSV5Q1V4R01F7TGXPFKX3E3ZXZNK9TZ9Q5EJ0VHW9PN0W0E8A4FMQZVTR0YSS9NYRCS4JX8W990F104002",
          age_mask: 0,
        },
        denomPubHash:
          "9FSRXFW7BTGRVYY37STMM33FP3F07FQ0X09X3N2HCYR6HC6WNWT0M7NDF1EYH1E274RM3D8ZKMDSNGN5TYSJPAQZSZB83SF3GN78RZ8",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "303S4QMDXHGBWWVJNPQ8MHG7JCF52N8JKHGZW26SVR3QZAZ027GM45H25W0Z99WRAHQPR2M20YWKM344D901ZQX5R8FTWWZGS29PE38",
        stampExpireDeposit: {
          t_s: 1707409448,
        },
        stampExpireLegal: {
          t_s: 1770481448,
        },
        stampExpireWithdraw: {
          t_s: 1691857448,
        },
        stampStart: {
          t_s: 1684081448,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 262144,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XHT19P2JY7783A0EAR9EX2K2VJZD68AKRMRWJ2B8HTHV3X2X1WQ4QV5TETHXKH0JYZVXB4S46JDRR20561ETKQFEHT3217CHM0A6AK3SMVQK2F7VHZRFKAD6HMBBGTB6J3ATZVVQ4S6GQ9A7FB6Z69S7TTY0CX4E3JA35CVXV05S8SZWBABJTQRC1WJ3JV44XAQ24RD0C415603D2K038ASGEJH89VQ6VK9C6JMS7EVRGNTQ39SZSVF233CDTRVSZT677R4QDKAYQWE81PK106F1B3Z14T1NYN84D0BCR34A607FG4P2TA2MN64CDXC1M5WAR184F1VPHVZD7PK8SN3S8VPVWMXJXD85JZ4977RRD7Y8J90AZH1JCZ98WXXBRNY3QWWTKESC2Z3ATDJH13XHJH04002",
          age_mask: 0,
        },
        denomPubHash:
          "9KD8XPMB5N6ST9E71TQ6RSP5T2M7NP7VM19SW2JKBDBT3NA0MHX4DN18WVC7MHRQ1NT45577S363G82VFQYDWF4BF7JVTAQ6GK52QW8",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "SMA83AG52P4JAGRJAZD3GE4SG4EAF8KHA2D46RB4RR5K7RX3688QBF9X5RBJ6XAB67WBFBJNY76KSCT2NX0MPSRRXZRE2DJ1K30TA30",
        stampExpireDeposit: {
          t_s: 1684082348,
        },
        stampExpireLegal: {
          t_s: 1747154348,
        },
        stampExpireWithdraw: {
          t_s: 1668530348,
        },
        stampStart: {
          t_s: 1660754348,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 32768,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XWG9MKF7F7BW52TYMQV7K5B3JB9NAQBGNJAPN5T3ZE7Z1KY0YAF5Y9GW94MFHCQB70QK7YGAH1XYS16H5KN5RX8NN5BK58NB15BQEM65NQ97HFE2NBA06KYPJH91M10WPEYQ8X0J9FYXDPNVQY2613BTFGSPDPX8DMPDZNGYRHTGA40H46MAVH4FYVRS1JPHE7MCKMJ72AGXE866QTNVREHMBJHMMEVFAPHRTNS5CE6YC7M7P11CVR5CEMHTQ0A3FSNA926WJY3K4H1AKWQEGP9CFNH0VN76F8NYRBFJMAMXNR2ZVJWBWQ0639SGKJ5K61D5FYP2RHR9SFR299WTGV70AZRQYZB0T04EDAPCV69N04ZCT1RSZQABSEMA804SFRH0RYKVWPEN0D8RN39C2QPPE104002",
          age_mask: 0,
        },
        denomPubHash:
          "9QN3BR9GM9KNAW0JZZ35WQT3Z49P5PK497848H9TMGRVH1XF18B8S6640B9QK8XQ5W9VSKJW946CNMCXWZD05S6073VEN9JAMMVW6D8",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "531NM2DN6W8ZMYR233JP5CQ09YDG1XW7JSYC1W8ZQ2ME688AVZ67G2X807ZFQBS5ST72TEGT05DQY57BB8CW8CRQXDBSPVR8AFB960R",
        stampExpireDeposit: {
          t_s: 1707409448,
        },
        stampExpireLegal: {
          t_s: 1770481448,
        },
        stampExpireWithdraw: {
          t_s: 1691857448,
        },
        stampStart: {
          t_s: 1684081448,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 128,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000YR62A5A1H96Q0BN7TM3MYBFZ167B9ZRPKRTEFMBA5GQNYE8Q4VS7XJC86HW4ZQ20KPKR555RGX0AN61PBMAENG79D5T3SZFYDNKFSP6JHEAVTZ6JG3RN1NCW5JQGKRAW0A7F7H12PF0431ZS4VAJHJ9CZS3X8A8XPM1YMG7C2TNA4ZV6EBNAP8FRHTFMQF8XE6GPR3P7T4BHZF7Y57B0YE609MG9NVHFDVRD1V1CZ1N32WY6633ZS3GH2R2CZRAVP4G1MX5BJKY0NW4H36QPSTJPAZ61TDS9B03ZCCPZP62TF5ZX02Z4XRG8GJ1Z2KSVA9H3GECWCQHC4AJXVZKDC53CD5BBYSAT2PQQDTQA8R9GPBHW9B9WMY7F56STDDPEBH65ZXNK2RGKK5SNGMWPYM51FF04002",
          age_mask: 0,
        },
        denomPubHash:
          "A3WP2RFFM2TJ0SJ8Q51PQZDZ1X8QD8FPXEHEJK1YNZS3CXTDMMH52FQ7CBA363RNRA695C05GFBSWZ3RHJ1H3SF45KPM0JB7TRAHD7R",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "F0FW6HJV5W0PKZA3DR5QJER0EVZA57J2N8CV93PZPA2ZCTPZ37Z9N0CRPNT5SSD7JKH0HDP86CDG01BED8JJ2PQY9NV2VKKVM2EQW00",
        stampExpireDeposit: {
          t_s: 1691858048,
        },
        stampExpireLegal: {
          t_s: 1754930048,
        },
        stampExpireWithdraw: {
          t_s: 1676306048,
        },
        stampStart: {
          t_s: 1668530048,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 16386,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XM3P5GM1TKQDPWA3E2FD7KK6XPX5BRM7ZQM7VT8146Q3NWYQTNTD74S31V1DBRC567PW9JDAPJC4MZ445RRRS3QSA7BREGTY07BR5CQSZ7HDZK334GPW3N6R7J79R0AZC5P05426BWC7AKCYRTMZ0F7RBD81MB8G77V2TYFXEMNW5HNJ2FK7DMFXG7CNJY65NPYNJ8PDZ1T7455XSTP8MEZZR7RQ8R0M25V4N76W4275MNHEMZ5XPF9CB54AXEKSZ492WYGCGQ56KSMZ2XHJMDS1TWPJ7P2MY17YPGV0W4J30XPE4RPB24Z7R74SYK04FE4NY3CPG5TCNDH7T2129KQEJ15NZEG268RYTD5PCBP0R95FV8B719MZ5XA1J99XW17S37CBRC12M3QGRHYARQ6RZ704002",
          age_mask: 0,
        },
        denomPubHash:
          "AC2QVXBWH4769B4BQ7T1DNZET5S2HKSMP6PY2JTXN6CP4Z3E86FQ0VQ6FNEQ9A86FVCKAJ8ASZA9G1VS6ZH7FYY29FPB3V3EQ1EKC2R",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "QVAHMEGA3QBJ08D2CM5ZATBABHB98VZJQX031P3Z6M6ZMTJG7QYV5H6YPWN5EQRY12WBWX121YYKFC339PNJVXP59M8Y2GY41XVWT30",
        stampExpireDeposit: {
          t_s: 1699633748,
        },
        stampExpireLegal: {
          t_s: 1762705748,
        },
        stampExpireWithdraw: {
          t_s: 1684081748,
        },
        stampStart: {
          t_s: 1676305748,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 131072,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000Y8J7T0C307Q53WTB9VSN5EZYQ04F7ATBDK2GTQPQE9FH5MTA9DGD2PSY0P9826BMS9M1ATR456KKMGESC70MTR6M673QPVH4X69E3ZAW9ZYMQZVX12H8KV5MBNPVQNFXN5R00YQKMQQKXXDD34Q0JGK9FZH0SEXERHHM89G2ZRX8FT6TBNJSFKS42P280WDJQ84A16P4Z1KVR4J5WK45NHSJRTS2VCC56ZRZD4VJ413WEKZ9BYWRMDCDKDJTKBGTT5J5Z2T1GBB9TVVWW06CYPDC2R3KQ7H8PPAJT2GRH1WT7K0JGNRYT9ERXGW11WEAR8FA2W48PHA73PF0QSE39P53D5R8K4NZES3M6RZN5FXPGABVFYP8ZBFK1YCA1CSHWMFFHA9PCGNPG59943V2527P9104002",
          age_mask: 0,
        },
        denomPubHash:
          "AKP4WVQJP3EE9F7FXV6S0XYVP5PWDRG3YWDNSFSFCM8BT0A58H32EC9C32WMESXHA2WJWGWB2QJDB8D03PY2K3ACG7FQPASXQ45AM60",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "9RNNQ6MXSWBXTGBY8EVCQ7B5N1EXM6JVTASGEMM7FG6WDCX4RV8TEVT5M2F0ANMFC47498VG6G635DQQ9HM93ZKY3Y14TDW3GXGGE28",
        stampExpireDeposit: {
          t_s: 1691858048,
        },
        stampExpireLegal: {
          t_s: 1754930048,
        },
        stampExpireWithdraw: {
          t_s: 1676306048,
        },
        stampStart: {
          t_s: 1668530048,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 4096,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XG907A8GNKFJJC9R7KV43HZC1V8GZ2ECQ7WEJVT4AXHBJYYTZY48EA373X392J4FBHJY9DM6Q1V4THTDSM8GZ2QQBEKASSWBHNN0H8GMQ90K8SFR74PFD2VW16HDGE3NXQ4YYFHDV1GBDCYDND9Q5FV49D7YCQ9MNJW1FB6WETVD4Z4V7YWMGV86CCJ743CVAAXDDKZTRR0911VMPH0J9B3WJJTE82ZMQPGKMKVW5FJS2RCN6P559ZTV53C813HSPPXA59990QWTC4NZ8X42NVEQETWY6QM64G39E7GT1QQGH2QYDR1AR11FCZZZH2H4V2261Z6NDM4DEGGVTV4DN38CTM80VQVYTVS94MS2NP5WD9CR2SV8HTHV9TQCKQFTWMDZK70P1QF1GBD0T54XEQQXQD04002",
          age_mask: 0,
        },
        denomPubHash:
          "AM3DWEV2EKAWFAJAXZYM5GGPWQDNJC8T2BQR1YN9KZE9WK2A0YMJ47PT1F0WYJBW0PG1TP3SKRVRG00N188M98Q19VZ7AJF4W9GCZJG",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "9NDPJB0EYW03JBTKF4X98HG365Q53682P573487G31T44KHYWGGNWXXX43EFJG45JVZ57NF3JVQGXNYCSHF1PB6EVW0312FMZTXK810",
        stampExpireDeposit: {
          t_s: 1684082348,
        },
        stampExpireLegal: {
          t_s: 1747154348,
        },
        stampExpireWithdraw: {
          t_s: 1668530348,
        },
        stampStart: {
          t_s: 1660754348,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 262144,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000YFHYSPVASCRCPQMREY9RM2NG67GS5JX6AQRMJJ9ZP2ZC0460XE7CJ82T1X1Y55HEBJ2WGKJ56Q64MW16SX2PMT87YYQ37G5XWGRRNACRHC3Y4JK8J2MWA6D8PN8BYQ9HN2491GF8W4R2NG522TS6BSZJXPRKJXWDEM5M0PG629A7WB53X9DZSFBRNZ3RGVKCWC5PB7X76AS69SV94MKSPJQ2TD3FRN4DXGY4F6GW0H7P79KPEZTSHCNM0W3T9HF07CQW6ZD1CR2PRGM0MJ7DRGHYT8Z630KKQS00996MCJ01BYW7WDZY31VW27NG5H725CFY86ZRX4EQ9G6ABCR9311BF3C0H4ACGF06KAV01G3HAPS3KF2GW377F71KRKBFASKS64ZX2168J7PM2K9YVFTTS904002",
          age_mask: 0,
        },
        denomPubHash:
          "B112X95RCC6Q81VQEY4M6VPY5JXPPCQDCYJK52727S5DS2NGQV29CMXBA300G7PVV2FVM40K00FSDRPWVRT0Z1GXT4P466J5KBNR800",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "TSDDE3RPN6GJSX69KJ6T1H93CF5ZBPNXM06HGWJM3R4S424ZJQF605676GAQ8239T1HH4XPW3CTC7G38XMCND3KE91GWYM8EAGKJE38",
        stampExpireDeposit: {
          t_s: 1676306648,
        },
        stampExpireLegal: {
          t_s: 1739378648,
        },
        stampExpireWithdraw: {
          t_s: 1660754648,
        },
        stampStart: {
          t_s: 1652978648,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000Y1KVZ28HRJHYE0ZYNN9DZ1Y8PGNQVQ0FXNE9K3WXKJJAWP8S6NNHV3P484TH6E0SAW6TEHXTX1N2R7H3VE1AJBJGDQAYJ1EHER8X9M064BSYKJAHPK3CN4JWC81HN02KPFG2W0JJJF1VQK17SNAHM03AKTPNDBE6A15Z9RFWYQAHTHYFJDWGFFRVA9CJ7CAFZAE9N2QS9BWKFPHC2H85E35JG1Y8JTKGVRDY01CZD71E64XJBGDGT14H50VYRQAXM32BZWQG219XB5G5Y3TVWM05C8EV1ZSD8RKECMDQM4N9T51XFCB4D3ZZYTF2CT16Z0XZKJ77749076KE7N92RD093T8THN3SME2MN0N8D36GF2E3GEBH79S6GBFSZ2SP0A5YJTN22EM6F96H61MWGG0ZWB04002",
          age_mask: 0,
        },
        denomPubHash:
          "BQB4YXY626B2P8AGK2H78FQPGYXWX10M2HCSBT504NMRCKK5KJ7QMBH3RMWRQZ4FPBQ8613JR273E83HQPEFCBQM9QQQRB94EYVY96G",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "XH6KSW0V1TAAB7GE30WA5976A694070DTNBPATZGJ046DW66FTPSJ9SC3Q8QS0D54YN8ZP8DQ5Z5CNRK16D8K6BYK1PFV8YWDGFBT3G",
        stampExpireDeposit: {
          t_s: 1699633748,
        },
        stampExpireLegal: {
          t_s: 1762705748,
        },
        stampExpireWithdraw: {
          t_s: 1684081748,
        },
        stampStart: {
          t_s: 1676305748,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000YPDAMMV694NF7N6Z9SXQ9168M51QD2MAW9Y4XM2RASHCAPN6XFG8VEYK4TSX7T55ZSHXM781Q8Z2MH2Q2286ST9NBVTXE51GXQQ2BMZ9KXGEZSYSY0NJ0GBE1SKF2F908V833C0P21P9P3XVV03PBCH42SGRPPFA3GX6A1K1CVNE71NZPY9Z1X4ECB9G9GTJ88VFPNJZDWFT2STDX7K5070D3YQBECMEE1F9KEH8VMKE6Y3F9192VSTG3RMR0W495D5GPTAZEFZEWBV6VE4K732N331FBKGYPFWR1ZEJR0NH95E3FRCDENB97CPBZWNF55FX53P0CHEATXXQW7A2FVPGY23FKVM9F9PP0JNZF5557PCCMWSSTR9S0WYTBYE7JZND4DXTMM5480NRYR4GEACV4104002",
          age_mask: 0,
        },
        denomPubHash:
          "BSG0VFJ9QXM3QCNAMPKFFJXH4GDE1ZXTC1DCDHM1JRYRQE7KVBNQD84XXFS45HZG6M98SY9J7FZ917VQ8KEW2DRH71S9F28KZGSSZYR",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "C9072K8V733WHWB5KP0TQZP3CGZ44PXFC97BVJ0Y6930G3WQH0QNJKWSSPYG32TZ5V5XTK6TZ87V018FEE2QATK1NGMWGJ00BXEPA3R",
        stampExpireDeposit: {
          t_s: 1676306648,
        },
        stampExpireLegal: {
          t_s: 1739378648,
        },
        stampExpireWithdraw: {
          t_s: 1660754648,
        },
        stampStart: {
          t_s: 1652978648,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 262144,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000X2THEJAFX43C6QRKV8M2Z30AZ91K5KR5V3TB4J07XF109AR71ASA1YXWJFJAQE5031F9WWEW11YD5NXZ94MQRH6ZPPWMP1DSQP4KNR0NDBZXGK94RS2GNGJJV7CACDMMW3346NKMP1DTSTSEGYGTSPET4RZBC2C9T2Q90XXDKAFWD0JYFJ0KRHJGEP7CC7JSJCT240XN90752CYG40ZBWJFNFS311P7D207C6GXSEMA0QPT2JZF3Y6VXM4TVKW2JYCB1CDKPT88CNF9H8NSZE76Y3WGVD9K0BNJEP96CXDD1ZXABYSBZZZJ454W7CEJ5TE5QTV802X0MD7244XF8435KJCS4JFPE0XM9DSG6NR0W2CYSD56H5MYT1077FFTW9EE25KQY47WHQMSMKRYN8SJQZX04002",
          age_mask: 0,
        },
        denomPubHash:
          "BV11RXWDDHSWCHASZJTGQ4E8167KVGVX1WNZCXXNTW3FW7NCRG4GCV39PFJ0XP7B4RVBVRDTJVQ2CVQ29NZ4AM9JPTGF1HDQRFJWRPR",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "HXCX8D084CTBGSXTCPY8P0X0MRKVDT61PAJ2D0HG5S5HF7B5FDSEJT6AXXF1390YKHBN6QHH6FMV69SHRYZ0ZEVMWKJ213E6WEP5R0G",
        stampExpireDeposit: {
          t_s: 1699633748,
        },
        stampExpireLegal: {
          t_s: 1762705748,
        },
        stampExpireWithdraw: {
          t_s: 1684081748,
        },
        stampStart: {
          t_s: 1676305748,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 64,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XEAPNRRT47F0SGZAFY8A78W5XECJ41TS79KQCXC25WG6KXFX7HGWKGCNP3QQB8PV9PR8HP1966MSD5K50EWF3Q0W991VCD7J0KQJ68Z07MYXSJ6KYB1C970QEK1AKH96Z0SHV76B1C6Q91SQFSXT71BZQ1R56K7FHZ006WBFQX78KA5DTXS2A4KE120CGV4HK0DDS5K6SX8QWCX7VQKPFKH8XRYPQHZZBM3A4P6KT38DAWRQWCP70R8F290M03060C9VB00RQ1EYN5Q8KZCDFS9XXGW7AZBAR0F3Y011NZM10FQS0YY2HHT2CT7BXSJM0JB36C8BYGQXH1C58VWP10QKT534G44Z28FXR9T0J1F5C8TEVKR6Q23J0Q8TGNQSZNZYJBQ50VPY0CVYRCPQ0ZB62N04002",
          age_mask: 0,
        },
        denomPubHash:
          "CBJZ9S6NDACHB91RKXR4THY0A4VWG1V3K33JA128H1T3THF3ZNCVVGATSNYTCFVW0SZPQD8MJAJYS1D327F1W1PNW6EJEDHW3834V4G",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "E9W8YACKF9JAB5CXRVQ61B36D1W5HS0BJ5GJCNDRA14309KZZ3EWHDSY12G42NT0RVTXRMA1EZ78Q4Z86QD1YREY6RCN38MN5XM3T08",
        stampExpireDeposit: {
          t_s: 1699633748,
        },
        stampExpireLegal: {
          t_s: 1762705748,
        },
        stampExpireWithdraw: {
          t_s: 1684081748,
        },
        stampStart: {
          t_s: 1676305748,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 512,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XTR2EJ44HCH7VGEBVASH43R6HWEWV1H51MBDXPXVE49KJHGN3911J1QQRQQR17Z0YB42QC28SHGBC0CVR6ZRN1RH5ZD2Q9A62V24A5JCAMF0R0AMDS9Z3JWYCS7APKT2E7YGNPPVYG814P0XEWPF2CPV6MHK0SJVCFP771ZW8YWXTJYNCJS3A5GWYRJ3MKH6K1S09301K3GX6YAADMD5N3Z0YT2C7RVZ7TZCWA7CXZCDF1BN7E4V6Z51NEJE9QMD16ZM7824WKX3TGKJKTGBGDFQRHQZN7A27011H6M3MDARG347YQGRD7NCMYW1GHYF5FD07TXFG34VB7P7NHQF9BSM6TPA2EAZD4JTDJY5A6HSSD0VATZERAM1SR4RPK7KN189HG70FFFCZCNYBF0J679B4704002",
          age_mask: 0,
        },
        denomPubHash:
          "CF3VCR90H08W7Z8VMHF8ZW369173J7HB2GQV6T14KP32AVXQ8YJG9VVF507G6QC6NXYJRPE7M9FJS7MZD714HVVT3VY1627NRDR6N00",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "33T126PBW4980H4K56VER24H2HQXQVCKX5MRAT26QD68ZGP6EHPSDSDEMRTMCBKVM6RRBR5JMHP61P0KDNXGPV389324C03EG36HY0R",
        stampExpireDeposit: {
          t_s: 1707409448,
        },
        stampExpireLegal: {
          t_s: 1770481448,
        },
        stampExpireWithdraw: {
          t_s: 1691857448,
        },
        stampStart: {
          t_s: 1684081448,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 2,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000WVG1ARHCEZK8ZVZ5PCHWJ6Q7MC3JVK5EJP4WHQDKFZS8M9XWRWVK8HF5KMT0HEFWZPZRKGKRH5PZKV0EK0A80HM13GFD5SBPKHQ66TYQ8BNCK5YWBJGA55Q5QKTZS8NN4VF5V46HT6F50QHK01X8V83H8Z2TVRX11N6X4R4TT5ATTW8W7RAEE9D6Q0HNCPDHQZ9E61902SGY2J5NY58766T9KSMKE8RZ30P1G23DG0HWSAC9Q85QE78M1XDG5YXVHGHSGTK14W4R7MEFZ7KQ3Y1RGEAJ6DCVPXM3KY7PEHZMPN8B3W3H4XKT2VJ9P036GW2TBW49JXXMDJPHYD2PHDFYTCKB3AWYG0CVWQC6FN900VEB797A79251XGSXQC903HVG0HXR49GJ46T7CTHJFWBN704002",
          age_mask: 0,
        },
        denomPubHash:
          "CPNAS39Q674W4E3DE78FTQY6X9K58D1F4HEZXT1Q5S948KHEKZHJFF4K8DKB40WNH2V180ZYMCKC7KKT1MGKXX6JM4H9H2MH7D7YCA0",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "N5T7W1HWQPEQE7FBK6CBXDBFJJ6XPXB2NZFDT8A52JFF1S0YS36S3HVCM01SHS3336EY3NJ6PH9A60DEDR5RPNSNC3ZJ8ZQ1DRMZR20",
        stampExpireDeposit: {
          t_s: 1691858048,
        },
        stampExpireLegal: {
          t_s: 1754930048,
        },
        stampExpireWithdraw: {
          t_s: 1676306048,
        },
        stampStart: {
          t_s: 1668530048,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 32768,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000YC0CDQKJCH3QFN5V9TPEZTAA4821XZHA8MM7D3FP6X2Q38ZS3TC5TPSQY2RM7MTMGSHXMPH1S0HNFRKARQZ6P81QJ57Q99GAV533GDN0XYY50ANRK0ETNNKSZX75GKYT4765MGP8B1F5DC9KR7QFHBMNETF56CCA59TNN85PRBB794VXZB5BZ5J9KR5R3B34G7C5718QEDD35Q36NPKY432YT32MN7ZZQMT1ZMAVAG31PZ8M32W2KQ2CYVDH3G2Z799JAXPPR5TFZ7PAKWGSBEPRY6XS3HX1F8TE3QK2JW9JQPV6C6JRZMDRK6YDKPWYEKYT576VDCZHP7P7WS7WZ2DRCJA4HANPW0JGEEW1R5A5PQMN8580HEWQ4VGG1Z4DFPSXXRD9B9GP6P2355J375Q6YX04002",
          age_mask: 0,
        },
        denomPubHash:
          "D4P0Y0H0WRBS1MRCAD8WXCFDZ92H54V9CTVS0FBZ2MGEM9S2G695DHTJ9NZ0XXVGF6GSZST4C857947XBPA7F6HD255DWPNY51SC6GR",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "3ZVAY55PVPXA24AP5YR86JE97H4A5JNPJKK3E1NHAPSF2HY8D6CGMDNR8K857XM3MCAM8PT2CDBARXSHG81Q7R3KJ9BDW15GGR29C3G",
        stampExpireDeposit: {
          t_s: 1676306648,
        },
        stampExpireLegal: {
          t_s: 1739378648,
        },
        stampExpireWithdraw: {
          t_s: 1660754648,
        },
        stampStart: {
          t_s: 1652978648,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 524288,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000Y1H8Y9F460KEZMHE9BWW49BRQMY209KJ8TYVRZNJ7ND7BDQD48KFXDYJZYDRJ2RS39S8S8ZBJD4F88M9CNSC4NHZMQV52VAKCH5WXNBM56B2QK8PVS26EJS5P4339P62V2WXEKQXX6BBF3G08BXMDE689990ZP90HWY1M1163FJ3GYAQQ1JDGRQBZ0G4S4MPH96J4QGMZ9H0QKT6XMBQQHH968VFPNATJPCGWSJQAQ3AJB37G8X225Y2EZHSA91DSH7G0TQR995QVT7TXEJHZGS2Z7QVV243YMZ0C1KSYASD445S2AR0NN3JE2FV6YYGHMM36XW39ZJ5QK89JY728NZ3162EKRXRTES0HVG8Y2NMMR20451PR291BN0TEB5CXJ21WM8AEVWMBX01DXQJBESK9904002",
          age_mask: 0,
        },
        denomPubHash:
          "DKQDG5JPWBVKKW8YCFQRDZW4YV5EYGMNZ8WF9VVQ1KFCQ1J4A05APWXNNQAKW21M5G19SSXBRD6C5ED4B7TE6Y3GB6B19KW6JN8BS70",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "7RQ8QVRWMDAMNYDBNY3WWN1J3ERKCCH6YB7R9M7A54QMD58BMNYV9ERT7NA9BXJGR8275JFN1ST1QGRKQKXFN95HWYM30PN4765KJ2G",
        stampExpireDeposit: {
          t_s: 1691858048,
        },
        stampExpireLegal: {
          t_s: 1754930048,
        },
        stampExpireWithdraw: {
          t_s: 1676306048,
        },
        stampStart: {
          t_s: 1668530048,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 2048,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XZ4D41AZG1XVA5ZX86R13NF2N6X7CWM071HFE5BEWSDEBCXZ40KRXMFBS4V3GTHGBBGV0CHC2NSQJ2Y54PTYXM17F511T8Q8XTNJDD7XN6P5S8NWGB32VM4H87M01H4H25B05NEY061PARKA1SH94C52P89W6QQEBJVN1RE1QPJRAK66JDE41KZZBJ6Q78VJZ5JC7CK5XEY0QMHFFY08457GVH9TJ7W5Q87QH81WQB6CWVV4Z5GPBYGKD0Q1QQSF2HQ0D9PAV6JR8HTY5QCCEB84SEYSVDZJ5K0VX4K2W4MFA079MDEC898Y8CPE9R42BRMGB6X33JQW56C5EGWPDNDCTNA42YYW38YWTBZD39ZDJ1JDC0FZQTF221A5721FACK8D7N601PGQD4G0Y4YJEC1MZ04002",
          age_mask: 0,
        },
        denomPubHash:
          "DVG6Y6YQNWPPEYG1D07CYYTYJRWRZDRAYAZW30PH6GFCG3YR0DBNWP0X2T5Y3N0EPMEE2VZJJ1DSWBC43EC5PTRWWNJ4M5WY5T79XR0",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "PFF67BX24D2Q2WMN99BJ6C3WQYAEECG292283SBQ6EVH73P752BX9CJYX4R8930F3JD9VZEPB2CBCXJ8FKC4N3ANKAVV99H9FX8YA1G",
        stampExpireDeposit: {
          t_s: 1699633748,
        },
        stampExpireLegal: {
          t_s: 1762705748,
        },
        stampExpireWithdraw: {
          t_s: 1684081748,
        },
        stampStart: {
          t_s: 1676305748,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 16,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000YK6C2ZSD4PKW29B2DEATHJMG7G8YPPY5AEJEMDW7FFHFNVC2D7T834FTNE9WKFNFXZJ60DCKEVMQFNBW7FJTYG6S62N6ZDEW7CKP5P1N2K0X1K3G4B78RTRYJBY71PDHSQJYFMKJK5XJVT4VXQ4082R49KWPV7E55RW4BZ1TF4E7TNVN6BMVB7W1SHHZ2PRRMKHDAQSMPVMAD4RPTP8Y46YTEAJ8XC0VJ65C1FZB30DMC4E3V6EMV9RC5X0BBGF143R4T3H8MS53NHBXAYBPCAC463FASA30V892VQV7Z5ZW3K7FSJAN0CKD0RPSNHRZ7J8SVSRZKWE2SX9XPKG2XR9D0XP4T11B310CE86VRB28FWAGVQ3AMW2V72Y4ZM02CKE4YEAVHPY7BSC914AA9WZKA904002",
          age_mask: 0,
        },
        denomPubHash:
          "DVPAF8KSMDXBQKRJQBXJA0DV6ZF80WHD6XEQVJVD9VT76H1RK0011R4CH505FRHSYZP1Q46C79NDJ093XB6S3N2SWTCK9K3TDZZVP2R",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "JRFV89G4EDVVFY1EZFGAS9CCAYQ5XMSD5ZX3SK4JKA0Z905HGHNNJYC3CZ2D2TR1Y1N29GPWH9BAD7X46MWSGGHV211M7TQKS8Z5C08",
        stampExpireDeposit: {
          t_s: 1676306648,
        },
        stampExpireLegal: {
          t_s: 1739378648,
        },
        stampExpireWithdraw: {
          t_s: 1660754648,
        },
        stampStart: {
          t_s: 1652978648,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 2048,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XX3W2677WE10FY6MZ70F68TSNBGQEE6D9388W4ZXPAWT0B9XF4TD6WNJ6KV7NS0VBS3YRXEMCEN9A1XX82H1QB0YGGGQKE02866N2KJHDPTT69FAGH0EJ4JFAHS89HCKDPNGQG2P8FKNH9MF2JWVYCKY88660SQ03E3GYP01AM8QZEGS419T1E6APDGZQAZVWVS4GHGGRG9KS9YB10KMWY05085K4E3ZW95F43VXR95YQY49ENT17EXEQP013T4KFX3EZSMGXN54DS30Y2NMH08F18VN3GS5V7CZ9J2PQK2YCZQHTAN2W03TYH4R26HM8ZJR21BF9RTSFFVTSVT2X3D2H3JNQQ4A6XDQ00WP91XDF6F0JKWXTXAK0NBFR7W1YQV4PP5TETKF99M4QYVY710DD504002",
          age_mask: 0,
        },
        denomPubHash:
          "DX6Q1C7SHYSJDGCHV7PDBFS8BT92TPN890Q16PSZMF4CHYGCP1H4GBG4VNZZBNECP3JXAFDMS8WPN3QJ2S9T2E8596JW808FAMJ5FBG",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "TBG2YY8Z4FKP5XARX2RY5DA8BW29SKTFWEHF93PX9PHWVMDZXZ07B50NQ18MNDTYPMMZAR9J1ZHA5BH8A5YPA5FFJHQF9PWCQZPTC1G",
        stampExpireDeposit: {
          t_s: 1699633748,
        },
        stampExpireLegal: {
          t_s: 1762705748,
        },
        stampExpireWithdraw: {
          t_s: 1684081748,
        },
        stampStart: {
          t_s: 1676305748,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 16386,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XVN9D87820WD2EQ3R15EFJ22N7C375PMR6GBT60A4TJ30PK49M8NAFRC9N55V29B0Q8HKDH13JW27BY3P32N3ZFN0H0P04DVS92HGG6KMG2XA5C64J7G8PWR7C7717DPA31P05ZKAV5TJ2ZXHE6GTVSB4N6CJZVZ4GZN9R9A3BSG63NTBEYNTPHHDQAKP8ADDZS5N1X8VDF7XHTB1TPA87QC4H280X2GH6WQWNQYHKAB9Y4B1MHY11QXGY2HCDTKTDZEX6YQWNQRZTD6H9WNV4397SW6Q10NGC6DF0SM4CE9AC5RA08Y981037CAF8PMEP8HQA4EGQFPW7VW3VZZK3H42RK38MAB3PMZ9DZTE709S9DXXCVACAAS9G663CK5VDD3BQNYA526ZRP29SM19STZP504002",
          age_mask: 0,
        },
        denomPubHash:
          "EAHNEBG8MTJM94TCB9VESFW0P8714HAES9RD9GK5R9VGQ2TWP778G067HXJRRH399HQ1WBTCZ2Q6SKX0QQ3K94SFZJ5379FFGEZEYE0",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "SQVXDKM2ZCDFPA98RAARAJYJC49ZWYZ5G0TTJP5E67FCBFS9FXHZX8H02PEEQBADR2A735KJMX5XPV1FE4G2YM625WEJPQJP04CM23G",
        stampExpireDeposit: {
          t_s: 1691858048,
        },
        stampExpireLegal: {
          t_s: 1754930048,
        },
        stampExpireWithdraw: {
          t_s: 1676306048,
        },
        stampStart: {
          t_s: 1668530048,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 8192,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XR1576Y11HJGKVSAFJ4TQNBX4J1N4FGYTGPGXQ6B7DZ4RH5G3KPWCHJ98RKJBHJK29F90G22F8CJVFMH03WHFEZFH72C7SY6D95AJW94M5SYYFP5MZSEVA4KSNR3HPAEK98JSSHHNXX6B6DBJ15CXPHQ47Z5YJAY0GCGX50V69NPM89XW984H40WAV59VYEHWRVMF07TX5XQEH2QAR6479ZGZ3W5SW4WWAPEMRRZ1VNHNRM8BRGJBANE0BNC6TRDH8XJMY07K435WXXX5Q4CRET2A4J2N79BZSER7PHK7AA5HP4HXSN6TRY6P82K6P199277SB778GTEQMV646NXSVPY540SPQ89DCS77V695DZD2G7VA5A5BTWJFH4BS6GJBYC09H9C87SMBN2CJX47HCBC1Z04002",
          age_mask: 0,
        },
        denomPubHash:
          "EDG0JP9M6PM566SSB1K7VZM0XSGMRV998N0D0VE0QPM3QV3Q55XBY9YG9M832GYQAVA1JQ2TYRFMP2N2A9XQQK5DJ5MPGWG34Y6C1Z8",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "4302M5FERDX36GW4SMZ3YGWAJY9JS204626CNAHX19JYM5YG34AK0PAX25CCBMN92RAHEY5KX9HS28PGZ855725AJEAD8S6NJPTP630",
        stampExpireDeposit: {
          t_s: 1707409448,
        },
        stampExpireLegal: {
          t_s: 1770481448,
        },
        stampExpireWithdraw: {
          t_s: 1691857448,
        },
        stampStart: {
          t_s: 1684081448,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 1048576,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000Y4TYKJ1D7VF83WKM5C8GWGYGEZ3AD7JNF189EB1QP4M9P07QM2EJ039C4AE3C4GYPRBXGAN5DAXJJXSF81976B56FN62BDDXBQXN5NJWA0H2KWS4244SYPJC3QGXN63ZXGRV1N4GTME07AP02HGCB7S3W88G4D4CSB798X07SAYQSA2Z1H6FDHSS5TKJ4R4VECFMAFYBKQ16DN7PAVE6XBBY3E1V3FCDP3GN8GMHNESF620P7SY9YA43GR2R75BHESNA6V16FSFACFJ6PZM5X80WYY99Y9E0352BVBHC5G86NFC71KBYQDEACS8H8T4VWWAVZD7NKCFXJRMB1E4CX2WTTB6F3HW8J1GW6AW15BYMXHMW1F6WGYBFY0FZY2MXKPE1RFHE9VD449E0F5PJD7F6AH04002",
          age_mask: 0,
        },
        denomPubHash:
          "EN3MSEP1VV2VNQHDHMVBAHMTK43ZNJS7WVSMN3PNX8WM3P9A379HSCX39N0QQFMVCH5RQK60E5S5338JFBHMXE9RAN0KX8N7MGXQB7G",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "735NB61N156F47244BWB3AQ41GS9TNZGF7R9HCXJWZEQ87PD8YR9MN586XETD3DTHS3H975SDPHQJPBKG67ASWAY2GKBTE8AXZN7018",
        stampExpireDeposit: {
          t_s: 1684082348,
        },
        stampExpireLegal: {
          t_s: 1747154348,
        },
        stampExpireWithdraw: {
          t_s: 1668530348,
        },
        stampStart: {
          t_s: 1660754348,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 2,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000Y47J85AXZVCVFPSJZPZ8THN1XSB8JSGBKAAWFNZZB1YAVKZY1C8SNRZ8J6NEQ0YY7R8W3JPJ4Q6NYJHE2CRCEBCRS3EKZPDY4AAATKVFY4MDBCTXZZAM6ABD8D180N5XXS702RM7W0N1QPE7HW661J2BHG6RT1EJJKBQZJ06EDJ5CEWQ8P90N5ZDZW4DK0KPPY8ZA15NDT97TDG1DGD9GAQMN4GAE2S5P0SQJE7SPPFP8W2M8PYXF995BH5QJ70W44NF434SND5K1ZJX7CCEZE38STA6777ZFQC5PKWJDK840DW3PRVNA6TNTE9PVY1FQFA16FKWJFVAN86VBHQ1NBWVKBFQ48XY4C3BBF5ZS0YATTRQ2RKBE4Z6WV5MYFK912GKBXT4VMR4MJRTM49T92CYSD04002",
          age_mask: 0,
        },
        denomPubHash:
          "EQFK63S4SB9APG91K5Z54XNP2VVVAEH4TBCJTESKENGM0GYREVACD4NGTGDGEFPR6P8938NQNYR6NE8BN2WGS4W7HDYDPKSTF6KZXQR",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "23FRAVDXRSDPMM60Q48E6GGP02ZZCVY9VQNWQDHJCG7F4YSTX95P9BX7FXNKXHY3Z169SQAD5GVQH5CKS4GDKNKSTYJE877KV8C381G",
        stampExpireDeposit: {
          t_s: 1684082348,
        },
        stampExpireLegal: {
          t_s: 1747154348,
        },
        stampExpireWithdraw: {
          t_s: 1668530348,
        },
        stampStart: {
          t_s: 1660754348,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 32,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XJB3KDZ32BS3BR845VMEDK9DYH4PQ10T58CHYYN9XJ4ERBNTZKQQ85YHDNV1RKB8JMG8KDPF9NWGPGJN5S0SV56ET3XWA9YVGY4KGT3W07FENHXMKYMXX8ZPJ0DX5FYG0Z5Y94MK7H7X9KZ6MEKMF5Y1G4FKK2SH5WS2MQ5FHD3DPKRYGQHSJWX0JTBQQKJQEMK6QT9XCC5J7VCJT304JVFBBXGX6YTC77TGFVWVP6R8MFHD4K9HH6TX3ZZ76BT37B5GTVTFHTWNXMHTY3E663G6Z7ZE6TGBPJ75A09GPW48Z29R5EKRF38X7RHEWVXVHGZ42RB3V786XF7BBXYCV499WBJZ1HH512XB82630F4JGBG1ZQKZY7FRHAJKGZXA93QV7XX016PN2CKPZ8R6CF3D8H04002",
          age_mask: 0,
        },
        denomPubHash:
          "EXB3JJAGEMM9ZYKP5VFJBBTETRJN7E08PE5ZQ6XQY2444BGMPYPXV1M4WAKKW6SFHSSH8V6DAX440199Q99QCJGKQEBYVPTPXC2EHF8",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "59DGYN32JXP4AEY28ABF2RXE4A2Z2DTQ9GMC1C50JA2HMD2DRY1DWB4PRK2889831BAC0QV0348RD9CF2H2WKNX6EQ1J455Q0PB6Y30",
        stampExpireDeposit: {
          t_s: 1691858048,
        },
        stampExpireLegal: {
          t_s: 1754930048,
        },
        stampExpireWithdraw: {
          t_s: 1676306048,
        },
        stampStart: {
          t_s: 1668530048,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 262144,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000YRJM1KTJ35RXF5PDVF0HR15XDD5VXCC6GND37H7GTF12ZY5C0NXSKXS2HH0NTHA9X0RMT12K5XVX52PEJ67XQYT8FK0HP2QXX4W0QBYR1MDC6JF8DZM72HFPMKRJAW979C3GNMCZ1PW3G0H4MSH47BP3117WY9DZ7SB0RQZ23CZHGZHCKVQ3PAWBEWEKJTSV9EB05HR14GMGS0WAT9QS5DCMWZ5CVVFEM5064TSHGR0VVNSSAQ6PQQ23DFDT0XD4MBJBTK1SHJTGWE6160KYW57C0V56MYEPSMVNDRRMR46GRNT5D4CZFQNZNJ30F8H385JE5S5ATDTNPJGTMTFJYW0S7YKJEPE8P58WHMZGN34KG7PD3726M9GT3F18968Y9ASBRNH9ZMDPMHK361K5ZMNJGS04002",
          age_mask: 0,
        },
        denomPubHash:
          "F909KXX28Y8RNM0T6K458771X8GF0MDDWJ9S30FJF3K3GFPS8B763VW1X8329X7W0KF06VNSF25F9N303CWVNWDAY1MDM7SBJQ5DSW0",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "T03J0H6T6VM6XARVT68PYJYVZSQPC5X5T6SKRBA2EHW4B75APGSZHTE5F5S63X0FMH58NYXNZFQNRH687R157ZR93MTQZSNE4RYJA30",
        stampExpireDeposit: {
          t_s: 1676306648,
        },
        stampExpireLegal: {
          t_s: 1739378648,
        },
        stampExpireWithdraw: {
          t_s: 1660754648,
        },
        stampStart: {
          t_s: 1652978648,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 64,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XAD37E6SBV59BBATWY4KY47WHVBHMCYTZN4JTM04FGR0P5AD206JCKCMTVWJSEXZJWD7X7ARERHBWMG0XJ8Z1AH3EFK4VFHH8J4HP2KW5MBEB002HCNN633DRND1V0RJ0B9YC2SVAC27RE5R9KST9BGBD5P3VN6X0HNZ2854F5ZQCFZDQYEZFDQHN0X6859B43PRSHHVQ20R45ZX443NATVGV45X9DN61FNGHKQ2CAJTT5YWJMK2VRZAX16HFGK5SXWQ0MR7XX60H0B3J2K846DM7ZRXE04MTWY0VXBDGDKVGMEZRAGZNFCJDYNR0ZFTM5RCY9ER36SJ7M56EQ6TBDMKA77ZJ0A9170X6RHYWKXFEA3A2T9Y0FHJ9CGDJZZVE7NXB6VZ5VRVQW6SSZ0J9XC0V904002",
          age_mask: 0,
        },
        denomPubHash:
          "FFMYK6BNXSDQXW11N4VF45ZBSKFNXHFN0FY5DKAE1ZWS66GZTH4ZMMZ65NSZXEJF6CD1E05B0EHNMQDYNTN867J2ZG03B8ZCM9VKEY0",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "9YSD8YAYHS0PXVWDM96AMP9892QS4FBTNK603XZ2CZMFYCQVF19PMT3RT986B9K2VBNNQKJXDMGJPRA35KEPP67Z4GCZ06J12V2NM0G",
        stampExpireDeposit: {
          t_s: 1707409448,
        },
        stampExpireLegal: {
          t_s: 1770481448,
        },
        stampExpireWithdraw: {
          t_s: 1691857448,
        },
        stampStart: {
          t_s: 1684081448,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 2048,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000YBS4GSFSFBZ6C81NK9SSBNPW1YK7KD178YVN43ZCGN69XTY0SNE6ST5Q66J8DFFJ5X2A11Q3CBCXMHJVQKE745BAG9PZ5Z1WE6M91D8V5F16WEE3CM9G5TV4FWHV91ZJCR7K8Y7HJPAJGYV2THFJJE84193VP50BEYND92W253G3WD932EYV42X6XKZK4CDCAWMN24SSVN1Q6WKWYFTFS2DVR0MF7HKHSQX08D084K92JQ87TJYQRQP74XJPJ8AFHWSESTAJ74NNB4VZ3GWWPR3CJ3KB6THXZKHNTYZWJN1J2DYA2MV7E1H3N45M5C92ZE3QNK7T2E5W4XAGPZTTPT0J6FGX0G6QYPTY1PJ9KASQTMPJECKXGCFMZFRE8TJA6R2TW6A8CW2S713XJCCX3XE6SV04002",
          age_mask: 0,
        },
        denomPubHash:
          "G3KDRJ4X4VKHV8DQ62K9276XGQJ8BJ208QZ6DVC9RVW2V8K8VNQSMSA9TN7F2XPRP3BHK4DJKZJGWJ9NZ98ST4WMGCM9A45BB4375C0",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "9YPKYKX29GJJ641P1XSDA4WY4SXN587EGQ43EAZ82AR6PJ3QEQV1K9TSYGEPYWF5WYKTDKNJNBCD2CJSPGD508SWG6023A8XEWXNC38",
        stampExpireDeposit: {
          t_s: 1684082348,
        },
        stampExpireLegal: {
          t_s: 1747154348,
        },
        stampExpireWithdraw: {
          t_s: 1668530348,
        },
        stampStart: {
          t_s: 1660754348,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 65536,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000Z5Z7M5ZVNM2YWWA2QABYGHAT71MACS90D2TZ5V4PP1HXS3FB4WB11HVK8YAACKRK5G85K35T7HWVEZB84X9WZ4PWZQCJ041GRYPDQG41V306QBWF2TFWZVYEXKBK2N2VVZR3CXNNP5KTHS53Y4ZAJ7DAD1275S4V24KAQWQF6476YG1RP1FYA8Q6BDNX80MB25T6HV5N3V8DC9P7MAXSPGY3PY958P6H92H54RVQPHD55TX5CWDEE188A67RM5PNCM3ZTWEGCF87SHM5HQRFH276PAFSHAMXY7MZ74FQTGM102EE6YCRBBXE9D51BEA6XZV657ND69XX6NA2HWDE1GETCXZQ0CSD7WK5J70KGEKYAYE41MM6G6WVZ2NRZMG5AS3H6TK8JQ9Z0GRBEF5HCESB4H04002",
          age_mask: 0,
        },
        denomPubHash:
          "GMDQ4R4YR352H6WMF629FZWEPVBCA9H4Z8BBRS82QZ1N4T9TK9JG6XKH066ZR2W9EJ9WNV3DB17GWS7KBBNDX46DT1FB2A0WXCVZYM0",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "PRG2YPFXYR8VNNVDJY9FKJJXW4E3XEKJ4NRT6AC7BCC6M3Z751WARJXWQGJY9KY20NYGM4FXH34825TAPM154MZ4W5QBWCE3MH37W28",
        stampExpireDeposit: {
          t_s: 1691858048,
        },
        stampExpireLegal: {
          t_s: 1754930048,
        },
        stampExpireWithdraw: {
          t_s: 1676306048,
        },
        stampStart: {
          t_s: 1668530048,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 65536,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000YATXXTJNMXY6DAHXNK0BFPANQB0200GRVAPF0P565WQ0A16DND9PAMJY398NHTZC8EYWJW4689E00QVX5NSHT4TEYA5SHXJEP1GB8R86K2K3PWW4S1X8N7JQJC8CDY5S3H0XD3WDQ45QM6YFMRQ9EZ8KJ1SP71AV5Q650TJS492P689SZJ71AEFP4BY4WSK40W5BAPDK8AWCEF1A9JMX8MF4MRZ1BJM8YZME63X6M9B9T97PTPMD6PKQT396PK5YC4264BFJ9SYR03C1FFERGMGGK6F89DS8HNNB5237K1X5MKEBZJEQSMPG4PS7QS483PK8W3GYGD73VEH0XTX9J71QNMKYHTQ4860FJP38ZGHV2PHSZWEEF0ECDQAXEG5VSVZ9SA4T7BZ885R24RTK9FGSQ304002",
          age_mask: 0,
        },
        denomPubHash:
          "GN2PZCM23K44GA44GTFWDK3YWXHSD2RQH44HMBZKMD43YGDTKB2VX0VZPPEJ6QS3HQ8WNWCRKYCSX3J98N2835VHC0ECDT7QVSJ7F5R",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "MZJ7MGJ74W2HAV692JRWCX8MBRV7PJB2Q9X30Y1XC70Z6W71BCNJWAB502WSEMJG5K6WF8Q1AJ45C782JTWKM6DAC6XQWPFKG6CT02G",
        stampExpireDeposit: {
          t_s: 1676306648,
        },
        stampExpireLegal: {
          t_s: 1739378648,
        },
        stampExpireWithdraw: {
          t_s: 1660754648,
        },
        stampStart: {
          t_s: 1652978648,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 2,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000X4A0F6A8CQS717XF4GRW230S9B8XZC4R8A8QPXESM8MC71G6CTAAJTW8TYPZQHMQTM763QAAMVZZYTJ2TY8Q9DHBJ5E690WWP1KAANRCY8NGAN63XWWXBPXT1B6141G4YG95PVZ8T9Q54PFS6YEFKD2XENCE2Q32ZDV8TTEGFKJ73Z4KAC7WE78HB007V9PSVQXV475T61TXTHRGATHGQBFCE746FCX1KQWKWJVEB8TDSWH6J8F98MYGKF5GTHJ33YC7ABN3SNNR00KR5XZHM0QH0A5EEDBQR236A02APBP18T9BFYAMAQWXMNKD0XGNHP88SFTFNHXQ203CT3NB893T91V91Q0DBX3RDT9JYPF83JXSF3HC9E2R6BG96XQ6451FW8PS1BN8WKRM77VR1Y4V5V04002",
          age_mask: 0,
        },
        denomPubHash:
          "H36YXHAAMBW58BF2NJAB01T2T6K4NKMTGPNHPEBZGQ87TG8AJ7SWBE2G70EVDP2XX6960SS4GBR2A7M8KM3A93WPYKSQE0S7M0Y55X8",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "DCCNBBFAQADJWY46NDGYWBH7Z16XKRH520N0F20VZKDE25F8X31S61DRFVT18PHV8JXCAMC00SZN16RY1RRYP1PGYT145MAYG00E638",
        stampExpireDeposit: {
          t_s: 1691858048,
        },
        stampExpireLegal: {
          t_s: 1754930048,
        },
        stampExpireWithdraw: {
          t_s: 1676306048,
        },
        stampStart: {
          t_s: 1668530048,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 131072,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XHQBGNQQ8HXB8V22AWHGDAM21PC8EVQ62AVJ5Z7AW2C6CDZTTWEQZQ6YNNT777BRG4H6WZ8BG42236ZDEPBVYKFFB438ACA5PBHNYJT3RHAFA8SZNTPF1ZRMVD33VA4MVYTH3Y4DTWCMFTW7ENS4XZ8SE10SG6CC14X12WXEYPQZEB84CBQEC863DM84M32KW19AJQG0XNRKHH0D23QQV535Z4J278XPHGNWM025BJMFTFM2H5NJW7HJJMQHXYJJ25WDYY7ZCHZ69QX0DDE3GV1JVS4WRRDN9210GKMR3MMS9Y5N6ZFKE2PJ1R25RA7MDEH9FSZWFG0ZCKS5F7QVEB09XXDDSXH2J0DGKSPVWR4ARBV41D0XQMVZD6FP6A8HXJBAGVKE6ZZK6GCW7X2F1237DK04002",
          age_mask: 0,
        },
        denomPubHash:
          "J7XTNDZQ7K70RPENXKTA9AFSFSACTC9J85EQ7YDHEWXECDRAGHYPKQVYT324SGS4YGE802KBWP903AWERTP6BHMSFEJQEQ8J5ZYZFVR",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "TQKQNWGMRPA3SD66MV9W8R7XZM7VEBKAN27BY8Y6VFN4QY9K9D8V45HWZZC5DRPQNBY2ZGDTWB4Z6EFZSA0C1J50BEXYZWKP7FDCA30",
        stampExpireDeposit: {
          t_s: 1707409448,
        },
        stampExpireLegal: {
          t_s: 1770481448,
        },
        stampExpireWithdraw: {
          t_s: 1691857448,
        },
        stampStart: {
          t_s: 1684081448,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 32768,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000ZARCT99YQ8AXKQZA6CZYXV76YPZ6AN7FKME84QA99PJJ5GRZJ6APT3M6P1KN9G6TN3BV61F38M9279290QWPNCX1V5N1VH5QGC0DEMMVKXC3CVH4852RTFCG26JKTZE14MB3PWB4GXYQ1DNA6C6D5F963AGJ7D3WZ4CQHCAFWECAXT1M72S8BEH4B3GPJB11KA90SPWVG22HXNG3JRFMYYHKM2W21X24W3AR1JZ9Z1TB8WFA1MRAP98EKFNSGFAX2H7Q90NFXN2P7TRNCVS955BTEYBPF8FWRW78SZPRW9QFQ1BGXCG6812N9714222277PMN4VA7ACJRTS65HTPRDEKE3YSDF7ZH6EYCAREAJN982XZFSD4HF2YRMDTRXGJZ4CPWFG210S12J3N06DJ2TXA1304002",
          age_mask: 0,
        },
        denomPubHash:
          "J9VD576SJQ08A7KSHNF4VWNXWG2PHTH3DXHRRNJE0YJ27B8A5BT067M3G8Q83W8GPKD2TJARJ986Z1ZTKY37PE6G411F00D2RY34E3R",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "V74GFJ4X5XY7GKWVRBG82RJHH8WQ4Y0Q20RHHJSQERBCQHAQRPRD3JD98E9ZQPQ1M0TMWNGA0YD0DK4E0DDTVM88M2BDZ91N23EZY08",
        stampExpireDeposit: {
          t_s: 1699633748,
        },
        stampExpireLegal: {
          t_s: 1762705748,
        },
        stampExpireWithdraw: {
          t_s: 1684081748,
        },
        stampStart: {
          t_s: 1676305748,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 2048,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000YWTG5JNDTQ13N9R2PFAGECYWY7V4BJ4F03DWS99ZM3T4AR9MNTZ0W92N4ZB2DRPNT9QHP6B8HZJTFA88JZXEKPPD0W64F8GZA64DXJB4H7VZAH5Z6V8K6VGF1XTHVRH1PS52V5GMB9BERPA3RZX86RPMK2G4BJ5ZSH29CSGZXGQQ4SXH4JKNK17HVFQB7FKNBYB1X42FJ6V0PBGRHD3B4WR3AEQ90ZQVYVB8S3BAH5F1CZKV21MKMCMSZGBN355V20C6C1BJC453B84XWT7F35EPYC0P8XBYJRQ03N1DN49QDF85WMMFSKQKHT500P4WWKXV5S000H5B5AG7B4FM73J2D6BEDEXE77M3V8CWFAWF2J1KRYPQQYDXM33CVHTDRADD7H5PAB7KV1KVJMGFGCEEAD04002",
          age_mask: 0,
        },
        denomPubHash:
          "KP09R6T2QGH82KX2GF8C8ZXQCD3GYV4AV35FDD6BZ1VWKZEGXJPZ4NN978BRZ6P0FS81P4103YB2PWD5T5CAMCE0PE685TMD7V12AH0",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "JQYJR16991BN3B8CS1Q0YKKK7GZF169B0A1RN8PEZCMHNH63WT7ECYMTPXESJTMKDVN34CGN374JXVHVQAFS46AEPAEPQAYMN5H3A08",
        stampExpireDeposit: {
          t_s: 1676306648,
        },
        stampExpireLegal: {
          t_s: 1739378648,
        },
        stampExpireWithdraw: {
          t_s: 1660754648,
        },
        stampStart: {
          t_s: 1652978648,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 8192,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XGKGKV1GY8Z1G72VSQPF27C29A46DJP34TJYNCBH6VV32S81125X7QKZM7SEZ886X6RR1JVP8XA98XC58JXT80Y91RG2ZM2M7QQ5KY3TC7A0ST7M3G3R56YY3BNNK2WMDFJVAAPE878HE1P7BYART5ESMHX8YHM2DN5H3GTQDS2DQY21VRZHJ9CS2PT58H4DTFBGFRWRPYD5EG46Z807H53G3AYAATD7VB8NZ1FH18AP7Q4NZC62QEW0S8K4Y7WQGBJ59D0S0EJA0W5NFF0MNZTMRMZA1HB9KGGKPCRWE1NH4H3GCAAD2PCGDZ1NE3P7QBWGMVAD9M50ZVPMT9NH0HST43AREHXDXTJRJCG4VV1645KT9NKT2N1WD6MRG8ZKVKANACPSPQJW0RGT8CMYQ4X92B04002",
          age_mask: 0,
        },
        denomPubHash:
          "M19GBTQP89BM6HYAEAV8Q27JE6T119SYVFDVR9FKY180NJX8R5BVXPYZN89BSA8NVKM62662K35ZF029GF8P54EQWPSVQEPAVDEVN3G",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "K37PWV4PDRQXAJ9169KTQ9ZGBZ2N1BVYK7SET99JKRD0KRFA8V2C4WBSR2VXDYQ2QP71B5QNAVRQ5Y59VMT3R3RMNXEXA975CMXF01G",
        stampExpireDeposit: {
          t_s: 1699633748,
        },
        stampExpireLegal: {
          t_s: 1762705748,
        },
        stampExpireWithdraw: {
          t_s: 1684081748,
        },
        stampStart: {
          t_s: 1676305748,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 2,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XZ2BMX8JZXSHS0MJ0ZZ85264TNBTP06C2P7HCDM0TC944P6C6JZYZ4Z632QXJA2F5XCY36G3ZZPV41A95QXQX7ACK5MR9F3B2JQKPB6JGBAP23X7J6VQWWWXX3FNXERDFB2MKZN1T56JH1TDQWKSP3M2WH6VEF4M3XRXAYP9ZZCX4TCXTB34ZXYJGY5HVPXK5SZP5XJ2511J7GE8GQDF3XGB96K4NDDS3WGRK0F5NB0C9SVRWC9JWSZKYH90H8VRR0YNADTP8YS2XVX8VF1RKJWD1QESANZ0DNHK8X4GW2N14NDNXJ0GF290GJ97EC9WQSP65NTVM3D83Q8WWNN2G6T5HGX03RZKYCAEJ187QBYJ4X4Y1AGCHTNJP49B7BZXA4A88XEJD1GNTXKP3BNSS34CWX04002",
          age_mask: 0,
        },
        denomPubHash:
          "MD5PAR7H0ZB5PJKM09DHFPF1JFW1DK4MKK1W88RQMJAVZJHTNC7ZEHWN2HZ8WE7WJNTQ8CPC0MQRWM00REH1N5JRHX6BZC1P1V2A9K8",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "PMQR80NT67MGV3W5NBYZYD568SZ9S2FMS55ZYY6DGYP1K9F39TXPMQ9AC1B4E4QJY6PJ20NPMC022MJPNHDKB7FRW2SZ7CX4YHH542G",
        stampExpireDeposit: {
          t_s: 1676306648,
        },
        stampExpireLegal: {
          t_s: 1739378648,
        },
        stampExpireWithdraw: {
          t_s: 1660754648,
        },
        stampStart: {
          t_s: 1652978648,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 8,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XP5W3T6PN7S132S28QZ2NHEEP0JD6H46GXNT7F77WSPE8CN3N71S0MKTSYCMZDP4Q20NPPP9K6XAA59CY8G84DXCC6KQPBFN45HHA7ZQ0507MQDAFBSZ0ZF927DWF5XWTF5J8RNK639P36M9ZWEA8FZ1N2N2G6Y2QK1PARJAR4ZRQ71PBD6AMEKPYPMSXW4NZBZ2GM1MVGAVB9JTBWDCCC4X4BEART7QKK6C3YWYYS0HCXNKDXG0N76TBT48F6CTBS3SKXXEV3EHE1KV0HJMKCMYTGQTYS8MJBQXHCXS11CD8W8FFK8C921N1EH6BJNBNHPA587RQ28R5B3FBNSQY4KDX1JPY8HA5Q2M5657RWTPNNHS19K4SFCASFN0B9SSJ44X8E289TS0QF4SJJNFY766WK04002",
          age_mask: 0,
        },
        denomPubHash:
          "MH2F49X0Q5Q46ZC0J6CDJZ9S99J9NEC29C2FSYZTG3H2PKTMQS6S0HBHN3Q7JXZM6CMRT41ACWQD5V2BSEADR1Q395RF378S0XJ7XQR",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "MN5Y2T4Y9X8AQNS3MT3B03GAC24JAJBA7S7DAB3KB865T78G1FTCG74K4KKADPNSV3RPCR2WMQAY4XSMTA59VMRQ4RM69P9SK4ANC28",
        stampExpireDeposit: {
          t_s: 1707409448,
        },
        stampExpireLegal: {
          t_s: 1770481448,
        },
        stampExpireWithdraw: {
          t_s: 1691857448,
        },
        stampStart: {
          t_s: 1684081448,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 64,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000YCR92ACFEN7BMV2750MNFB3P1DDF8KA620N3XZS9TYT3TR619N5K3ZBT35N26G400R4E4E63C2SWTGAXDA9BFC8FXZPQFPVRG3SB3XGS1MTK5ZSFTCEW3T2PRAZSNR8KCVE42K65QS7MB4TVPHP9K81PPCPV445T1KJ450VQX2P3MJ6RK2G1E3JYMCM27HNGFY49G6JWZ6CNX2XB89FCKWRXF2M93S8FQG39GEAPEWS1Y7KHNN2XD4HKTFPJHYDH3WVDXNDBA8MN254C8GQ7RNKJN67R03MFP4R78V432T42J3FQTYFKECRVRYD3TGFPY3RBCGGHJ19DWGAY5Q60XZM6AT61446NEGVVTWZXT9EBTNE342DNPPA3HFZ8TN2S7CJDD83S7MH7Y85VPTZ6A2MK4Q04002",
          age_mask: 0,
        },
        denomPubHash:
          "MR1ZBMDQX04ZXZ2TPPKNEPJHVM55FCRZZ1QPCEMPDZD51PG0GQR16DX49KB6Y7HZ0NM1J1AMJCKG44W4P71ENB61J3H3SNAPYJ2DV9G",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "WCZFG533FFGN80Z672WEG9X6V8RRQZCV262VQYBW7E2WFNB07XYZK1CMKH6KY4GEK6QYDDEDE7DZFE9CD3EGBZDMSFNBMQF4TTNEM1R",
        stampExpireDeposit: {
          t_s: 1699633748,
        },
        stampExpireLegal: {
          t_s: 1762705748,
        },
        stampExpireWithdraw: {
          t_s: 1684081748,
        },
        stampStart: {
          t_s: 1676305748,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 8192,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XDGZ6TQJN4EAF15NHTE9YSZR0T0ZYYPD93ZJ3M4C0QMY4WP4ZPM93W5RV6YPFNJJ602AS22XYVFDHMW74B6PW88NBA87WGJXY22C84RRTG40ZEZ5KBXCF60VTFCX3HPT1SADY44AEHXNC8JEA5KPQGW7YHXNDJR8JA08RTMH3H5GCEM4YSV6C2B4T3QHEMWT6GDH7X1PBNGYMKP6BJEFGQDJ6YPPXZ5XB51QCQG0Z914DTP648Z328Y372BHDRAENW88WWR786TV8XFRYBZSX6MY4WDHJ9PGTX61JB2S6E8JM4AK4XFS45WTTM8789JH433GZQ7T078236ET9KGE2QMK230KWYYSNFGZYXWVMP3KYYRNXG2BYZ923RMJBV717P99QBQ6NKBBDFPA77PXVEQJXD04002",
          age_mask: 0,
        },
        denomPubHash:
          "MS7BMYCZSBJCDPV036TDNXG39172YBK80FEFN0A9DVV9T83RR2S4KARP6X6CWKC799GTEYXQXN4BMRQNMREPEZ5P8Q74QG3N6FZQ9N0",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "WGY7WW6JF9EK6DBMC5JXHK1HXKGHV6V2RP66SB4Z3BP5YD964S6VVFPQVY83YHRCQ3R954K39SKPXTH24H7MR8YJSPCNK6RYEEYJ63R",
        stampExpireDeposit: {
          t_s: 1699633748,
        },
        stampExpireLegal: {
          t_s: 1762705748,
        },
        stampExpireWithdraw: {
          t_s: 1684081748,
        },
        stampStart: {
          t_s: 1676305748,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 524288,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000X2M2RZQEQGPDAPWSSX468T9YT4E2EVX02P11HWM398589CHGCB1SRFM8K957C0CF7JYF74RCANYW5A17CW504W4NHTAZCPHZJJX5TQ29Q4TEAQ8VRJNYEMHQRBQ563YJECJ5WB1HM41Z382SHJ3JZ1FC69ESCM6Q3RKKP3YFZH83NHFBXHR836VXQVS329F753RQ2Q359ABB1QFEE64F4SPT66GVYRYFF2V76VQZ9EW4C0C8D76P8FZTGWEPMJJZCVYFNB8K4TNAC0PYQK8MYTVGZDP7SEJDXC062C2EHMCARK1JSMT9EZPX76YZASDG3SVY0P9HDGTCJN76EJ4HT1YH1RHMMAYWH3Y0VF5HSPQB7NZW2TFDA3CXB5YHKF0064DX86V3W18ZKJ7M707FZWX0C104002",
          age_mask: 0,
        },
        denomPubHash:
          "MV12BFTVBWQXQT023CYMTETZ7Z7PT5P1RK4S8RB0ZW67E1188HXKBKEVHQBCJZAENWF0XGEYZXFHE1Z5472V00Y9AVS53K5B719RFBR",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "25YN7KW5PPGT3YY91C0JGC5F8GNT5T1HDGD8VB2PXMEW7VFC1SA9R8G3NZB3JMBTQMVCZPV4249GKYJ4SSEGP918YQAW5P3HWT2N82R",
        stampExpireDeposit: {
          t_s: 1676306648,
        },
        stampExpireLegal: {
          t_s: 1739378648,
        },
        stampExpireWithdraw: {
          t_s: 1660754648,
        },
        stampStart: {
          t_s: 1652978648,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 32768,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000WVZJ4VN7JYDCRN64QSTZPGRA78R3Z8273DSC8HZ6H9SQ79TAPEBF24XG9VW6N0QVNYY764JNSNG6M0KH53A413M1JVHPDMTX4C73S9GYTHR23EFYJ68PXK523781AAW3FBXTHHEJDWR99V1PX2BD21DZ81P3HDJRHXK5ZH6PD87TMG6QJ8KE8W85XYEQMHXGJ2YRN6Z4FH7C3ZM7PK2J1QW7Y95GY6DVSAH2344FT8HDEHQKFMB8BSXWBS7M3RATA0H0AQBDVSKMT8YJZDQ8T5WBJDYX637JDTRMR1F9KA0B5DHESKS5S9PE396YE9RBPYWVZB3SFQWNZSFFFJCYZ6MRM2W7FB7T4XZXT788V6KVSKV6CY1X61CR7N24BMTWQWE0NSRQF5TYRWS84FV5NNGGTQ04002",
          age_mask: 0,
        },
        denomPubHash:
          "N2HPHPHG974TSESZCTC24G1CSZSFGC0K3ZK8CGE0PHJE4EVT539A14GCNASMGVSET4KRH8VTPB5TGFSDWTD5SZBQ7J5J9BBXCMTKPG0",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "NHCKNCPSRCV15C1CF8T0K05F1NPCKJ740748AW0F3V8FEHBWXAYQYH81RKQW7F0JCHDF9K2TRFCSJP1E1FFY1BK1V2BSM55MYEX302R",
        stampExpireDeposit: {
          t_s: 1699633748,
        },
        stampExpireLegal: {
          t_s: 1762705748,
        },
        stampExpireWithdraw: {
          t_s: 1684081748,
        },
        stampStart: {
          t_s: 1676305748,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 65536,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000Z6YH0507MQC8N3P2JH71PWGFW2W24FMBNTMBXDMQX10NW8QEEXP1KBD0QN8PJS6M7DP806JY1ZM1NHS61DHEAACBBEY0FHC1YAHD1J5P5ZY0DD1P6MABVX61E25M7MBAHFEFAPVHE9AFZ3EJTDS9NE0YHAQA3M0FMC100CEJ7J9H9DMYT3G646QD347XN2WDVFCPSRN9CDS3999FJ8B2EVD1444ZWXPGXJ9RTB3P1513Q74K546GB9SX2NM5NN1BMMSNRZCMNS3PD6KY4QX7GP6K62466PF82WAEE2WCR6AGGF3JP9ZZEBBK7Y5XCG67A87A4T9MGFV2S2TZTSEW62TTF02CS5BD8F3WMJW9ANW1Q0CYGA5PSQFFNNJR2K6SHMFWNHVXBMJRGZ46MY826Z1E3B04002",
          age_mask: 0,
        },
        denomPubHash:
          "NSC7159V6BVF147ZZST45KZ23A6TQJ4RZC0YJ6KR54Z4GHTX8XJH37M8T6JPA13JFF8A9DQZT4MJM678BC3BA5DSQ1WWSXMHFE32J90",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "9YKXKPS4JYAZY7Y7T0GGZEC36Z45K0T2P0K4JS2AB3ZSV4YYBBXM0TP02RXNWA6TVNRD1W7FNC9C081ANDR87EYZWV7HH2YJDSC8820",
        stampExpireDeposit: {
          t_s: 1676306648,
        },
        stampExpireLegal: {
          t_s: 1739378648,
        },
        stampExpireWithdraw: {
          t_s: 1660754648,
        },
        stampStart: {
          t_s: 1652978648,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 16,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XAREJKB18A2H5JX0PY18GD4GK7BQ8WAPJ0CSP7MHWJD00EVP334R7TZ0D3JJV8DVJ62PZZBGTJ18CV2EFEDPE9T71MM3V25GWTBFF9BC2XCM7NMGD9JQ70Q6QPW34146BYFX1X8WE1MCT91NMVPVCZ95PJ83BHWB3MXBBV38ZW01RXHNZ90NY8M099TX810ADD6QW9XM1465H5NFB39YNSBGR73F2DEDB7A3YF2FHZRSHWKK64M99R8SM8V59B4K20CHYK8CCJN00JB9QCVCKV9AYCBMPWJK4F98JJ02BJWKQ222H3C159XED9NE90K1P86GXR4AJSGGBJVZK09DEVKAX1FWETFHF978JHRQTFC8BVR8X7K50J04EC5H69HHMT4MWSSC0YCB87F9G1YES6VJR704002",
          age_mask: 0,
        },
        denomPubHash:
          "PAVD5GR3KEZZMB5M2MW5X86GS7XXD3FB0D5H1RFFPRXMT94K5YA406KVC1GR69AW00390XTBRFZK1WES2Y3WBZ8689KWRQG5E4PAACR",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "P3BTKW4Y6P6YADHN4PG5GWJFZ6N7F7FXH6RTFASH7PS4G68A47JSH4ANKG7W4YZDED6QYT2D8V5NJD9JYT90QSKPXCVDW8DBWRZMJ20",
        stampExpireDeposit: {
          t_s: 1699633748,
        },
        stampExpireLegal: {
          t_s: 1762705748,
        },
        stampExpireWithdraw: {
          t_s: 1684081748,
        },
        stampStart: {
          t_s: 1676305748,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 262144,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XACSY8M2AJ9X5SJDHVQFX63PBH5958RX48898JC0R6PRJAPTNE5Y1QR6XYH6MY7ENGZTJ8V73QFR3GFMBTMYS54M3R8YNW5AYQ4TR73AQMMW7TW13WXDSTYGZQGV032MNP6QQ7TD29WBRAHJW1X53XR0ZX7G75FV60K2NBGK8BGD4XD5PNB167VTP9ZAMFQQKJ3P8JXQZQ5TRZYEB5FVWF7FFEXXREBPF67JPMJTTWH2AXHSHVYSQ2ZKAMCHYH9XR1KP20WVPXFEFTJWTH7MBJ1V8JT7KQHYB5ZA3SHNBAJ6RW4FQ690MGNR9XWAA8WXBKDFY15EP2H60DE785X8P7877KE6EFHKP9BBFHQBXX36H5RNBRGRHE0P57XQVFB1YB3DJ9ZT0E1ZVJ7ZX4M6PDS8F104002",
          age_mask: 0,
        },
        denomPubHash:
          "PEJB53RQH8XXZ003F5018RPF2VRZQG179WFC6YX7MH0TF00E7SNFSXAFJ1YBE7Z9BKANCC1NAK3DGBAWGNC26D21VA52GHNMV950SFG",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "2TB2C54AKG040Z2TMV279XJSPWC052N4AP371VF2G11CP6TZ1QQ5RDNVAH0NZRRJEWTPRR4MWWFW74QTF4PDQPM8RZWWCD55V4GBJ3G",
        stampExpireDeposit: {
          t_s: 1684082348,
        },
        stampExpireLegal: {
          t_s: 1747154348,
        },
        stampExpireWithdraw: {
          t_s: 1668530348,
        },
        stampStart: {
          t_s: 1660754348,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 4,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000YNT8CTN883Q7J6566GN35CNB37AAN0WJHJ0SFQRZ5EZRMJP4MCDXM9TTF95R2V8EDRX8QJFZ6DNXY74JF2F05HMS6T18BR78CZ8PMFR0T9WDSNPSFNT67DESR9Q9HGKWHKXZ60MC7M63QF62NCYJB8XSGEARNABQ9FYW3YHS1T4NXHF49MA1KFCESKE2XGZ37J7JEH8B1X5P2943N69JMAMMHJ1Y6G7KNSRZ4VJGNHJ51AF1W7C35E8VR8MGYKDCMGTSG0TG00W394S0TBGT989FVSHA3B4T1DF4G0BGG4GYVDQ74J9QN4TMN0K7TE8VFJ89BPQJYW6GJXPT7FS2KA8C1TT791VTKYSQX6X1Q5DHB8NX35J8ET3XDV7PNDYAW7PA4QBD6TRMH3TJ9X74A9XSX904002",
          age_mask: 0,
        },
        denomPubHash:
          "PGYDP1DTM0N5G0CA3YPN22M7P7B6CN1R6A26GJF6QCEMVNF9NGN0M84VWJ20Z4SDVJSBS34WC39HG3E4TGZAYFQEAFBFF3J8KDJ7H78",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "DT6HVF6E7F1JJEF48C6S3MMDR0Y7RCFRD60KBB833JQYPF32VC11K4D3N3HAYYKRDD61VWNR6THQ08ZHA4GEAAK5NVKCSG8P2KAX008",
        stampExpireDeposit: {
          t_s: 1676306648,
        },
        stampExpireLegal: {
          t_s: 1739378648,
        },
        stampExpireWithdraw: {
          t_s: 1660754648,
        },
        stampStart: {
          t_s: 1652978648,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 65536,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000YR6JCA7Z7B59S95YPVAZ6B31DWHF2V8N7AG0HA0JXF91DCTRXNP8MNF7ZHS8AR980DJCWFSETZVKP8T7FM0E5Q4X0R2CEWNQRCK0SQB26DENK2KYZEZSEQ3GR6DMSRDSH63VPYF563VXJE23VTZFBH3QZ3AJZ853M9A672G0PQY1P4MYZCZHMB6VKVEVGVGG4P7S4H7MCP9HZHAB41ZMGR1PPZZYMJBJN3W2NNT1SE5HHSDV1ZE10NYASZ5R2032TKZZPC4HCW22YFEEEAJR30JGJJDKNZ4WPQA12D045PCTKTPJT3DQM4V9YAJJHNNQ5D9YPRC57W3YADN0WGYNVQ245A78E7KR7VDS6G98EECKQZBGQ5E52F01NENSSGFAY645Q5DQJ03B48YHSJB0MDN62V04002",
          age_mask: 0,
        },
        denomPubHash:
          "PQY6ZPXEQXD75NM5KQMESGK1Q1VH08099QPWC38NAX3C5J83NKG0V40W7T1038MTAVEH6560170T2BZ0ZSY98AZEJC79A3KGV1DVRW8",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "ZD0MP0EACAJ0WJQCZW4GX7FFXSXYP2W9FDC699S8WCNZ7EAR974E0TMDCM2NSSEDSRN78QCR0H8QSV1SFJ8F97P71RBPJAZ27P6GR3R",
        stampExpireDeposit: {
          t_s: 1691858048,
        },
        stampExpireLegal: {
          t_s: 1754930048,
        },
        stampExpireWithdraw: {
          t_s: 1676306048,
        },
        stampStart: {
          t_s: 1668530048,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000Z580QT1TJP8J176XE7AW3BWJFRB9AK4ZC8E9YZR687PZPWEWWDS8764S5VKX0SX8ZR4FMPFFZ581GSA9P4S7GT2245XS3B5JFF4KQ65MSRDFA2TBGN0H48K7KXD8FQ20CVBPYH1WE2G5M6AEVHAFBJWYPCKFS6G48N3ANFKXN5ENSY0X5747ZYQMP9KDAF4019F5GH87P5A67T05WQEQC9KP8XN9H197E7GHA44S3KAJXYEB43AACC18JY17V3X7D2FFGWPDDXAX6DETFPM3FFVVH0MFJ30XWSQCX1TZS4HGN9CMB28HYFEW2PXE7C47JF4BTZMP0N65WK9JH4F3R7D1T43FF316AYS9SRDYGZ412C3XJJ8G91Q1ENNM9W4QPC19J9NMCX3YK19AE3GMSKF6DB04002",
          age_mask: 0,
        },
        denomPubHash:
          "PZQ3CHEXGTS8RBPFD06XD5TDEV52CADW5Y8V92D281595X60QWPHFH6PP1GYZ9CPC9R79794RY3XGQ8CVKTDE974Q2DW755S3Y6NTBR",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "6HZ4THJWDBDK6E8S4HFFVVFFC85B0V36KZ9JFP3EMBGHSG9MKQCGFD76YFJ3Q51FDP7PV08WE85KM2MJE8RYRR4D5SYJGRPFGMYRM38",
        stampExpireDeposit: {
          t_s: 1699633748,
        },
        stampExpireLegal: {
          t_s: 1762705748,
        },
        stampExpireWithdraw: {
          t_s: 1684081748,
        },
        stampStart: {
          t_s: 1676305748,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 32,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XVXG0K020DS1CMJGR6XQZ5FCZDHG9HJQPVETR4J68NB9TB3PJZ3EHHDVGY26WYAZ3KSA89BD3JR4HVJMP6EVN3YB0173VH85EHH9HPVRQ4BYX2F2SACDJ8QT6TKTEFJF34WDXHH1DP7474J12BMJW6YG886EYKZM7196FMVTDSXKRHYCDW1WFQCCB5PZFHAG7VEW3W6XD964XEJQPRWARV0M99VX789KQ74T6V64KZX28TBA2SC94P6BF7QBFAPMX9MAD8JHSTQFBQW379076W3G36X428E7YSMKYCDTZ6T4SRJ07TGXCRRS4GJHZ5ERR4JVZA2EV7RQWZR246TCSB3N2YBGVA4NGSRST4WJCMYFPKTAN3S8YH3BAXB3TRHN6TGYZ9S287PD2VAC313ESN61Y704002",
          age_mask: 0,
        },
        denomPubHash:
          "Q6PSM1D22TN8CG99BZAWYXDAW504QRHSF9YGEKAVS1H1RZJ5GNNMF0613EY5F97ZHG4XXXJE3WWPJGRDK9BYQSZZ0JEGTZHH45S3S48",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "D19GSMQECKQV3NZQCB2E715JBBDY7CHKKR2TY04RW148V5P72RD388TK770ZTM0FVW4H3MQ3YR7SX9WX7F60FVYK3CSZJY4992H020G",
        stampExpireDeposit: {
          t_s: 1691858048,
        },
        stampExpireLegal: {
          t_s: 1754930048,
        },
        stampExpireWithdraw: {
          t_s: 1676306048,
        },
        stampStart: {
          t_s: 1668530048,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 16,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000X8DBXYPB4GWRATX5AQZZPRAB6GBEJGZVKFHJGCEW33965XNX6P6SNERCAQ0NK8V93D4XRPEJ0F060SP2BPP4A521BAEEZ3R361G8V62KF0DQPZJWCVVE52EKJ9VWM5W5F4Z2ERB1NZQ7JCR5G84YZAC4N9VFF083RV02WTG7QS8SBTK98H0MMBDTP8944PMJZDTEKFD8BMWGAPXBBXDYXQARXE9AZ14P4P3XS5T9RE5W79Q23X582ZW5HHGQHKEDYGYSZ7JHFPT1B2M27SQ64XPMSPFMV9YK30E6CJPDT8T1S5VMFB820TXK0248QZDZ4CNR42FZAPCZRV4K25J342MQ674REY76K59QF4T3DEYEGYSBJ363TK7B5ZXR480CX0MDC139REK7PNSWEV0SM3C0CV04002",
          age_mask: 0,
        },
        denomPubHash:
          "QAJTB04Z1BFPJMFHQT639T7V40N56JNDK34AYR48NX1J2C2CBKNRAWY0DXEKPDFDWH1YK0VB1AD27DW7BKCYPX8PGSXZ1CQZZGADAMG",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "VK1HYAK0PE180FEGJXS24FYKMQ03YDND6V00TJW6TY9DWTQ5BHR3G772YCXP4FMNQFZJW6PDRM5P7CRNE1RV8RD3RQDER4B1ESWZC08",
        stampExpireDeposit: {
          t_s: 1684082348,
        },
        stampExpireLegal: {
          t_s: 1747154348,
        },
        stampExpireWithdraw: {
          t_s: 1668530348,
        },
        stampStart: {
          t_s: 1660754348,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 2048,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000WTG4R61ZNM68T7KF57736JK5F28SGD3HEETGCYKXZ2Q44AVT1MP6JS5B0W961VTWH0HG9H799Z7SBY619WCRS90DA79WB0TPSJ0HD73Y46XN35E5C09Z7QS85CFTXZ3SVCBF17QVXGXHN9Y8YA0GQA2WPYCQDVNAMN99P67WJHQ8DQ9Q01JK1S8HGGXW4RRMVV7W7QAKVEJXZBRFTVFPJTVKGZC84B0KF4HD4VJ372XSYEPWRX1D7KKSWNAKN98V44JKVE0ZZ1NR5DHP7DG4410HXXF6K7HDS3QZWQ6SFP4N391PG49M29FGDGJ034TB5TE18N67D7ZG634M276B5MVMQW79NNXD0ATYAAP0XPSGW1ZQ6MJRE5Q3ZAQCFZ4RQB8QHGYSGA4ZTZRF2GJ90DF75K04002",
          age_mask: 0,
        },
        denomPubHash:
          "QS8F486F060SCA7294V0H9HCVCNJGJ084AWWS24042G3VNTF9F6ER9PZ1YC5PTE2TXCVQRSYDHEG1NKBWM6JRXHEFDPFE78WD1CVZV8",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "GPZCCD4EK6TXWRPYQR1D1ATQVGQGJ2CRJGEECPX2B23V46ZYF508WQE5NSJSTG3JAXV0PBTRC7TKAKSK994J0TXXMBYT3KPPH3MXC20",
        stampExpireDeposit: {
          t_s: 1707409448,
        },
        stampExpireLegal: {
          t_s: 1770481448,
        },
        stampExpireWithdraw: {
          t_s: 1691857448,
        },
        stampStart: {
          t_s: 1684081448,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 512,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XZPT83F4A3VH385PD9PPMJXD8VN4TZ30HS5CMH8A0R27RWPDH38VHSBYA7Z02ZCVDMY3K46EAEG3F3G7S1Q1VH9D2MQY1D15EFD0F0FD3WTDVSZVMTFJYVD7QXEF25PNA3V4KQ7SP7GEZ28YNSAQYDRBZVXK5VFSS1HH5GH456K76ZJPSQ5ZD9SB4ZE12V0B1PW6TKPVK9TJN298SJ0F41X3SCDJJBSDYY1C03K82KX7VW0EKZ6284SCF6GRT1GMNAA4HR16RSGG21J2QMSZHJNPQ13K8CTT412FQRNDG60XN2W2QDDTH44XZPQC5MB5BJTR12B5PMC3MSBKM7WJA4H6G151PKQ3FYG3MH3RRJHRQAQKZ2YWJZVANFJZ2ZV79Q2NVFNS9JQ0E952809F42SKAN04002",
          age_mask: 0,
        },
        denomPubHash:
          "R41YY7QCCGMJYRF9VKVQZ4RW2WPRYCST19SC514W3E2HC0B944GYHTWK5YS54JP079ZZ1FCX2383QGYTNG00CVTTQRPNZSYJSA9MJMR",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "77TG68MD0FJCP9G55Z7R9XHE2T6KVY49NKYV65S2DZ18KXDTBZTXW99VDV3J7NN4GNQ99X8Q5FMA7G935TGFE50ZSF55AJPJWX8YP10",
        stampExpireDeposit: {
          t_s: 1676306648,
        },
        stampExpireLegal: {
          t_s: 1739378648,
        },
        stampExpireWithdraw: {
          t_s: 1660754648,
        },
        stampStart: {
          t_s: 1652978648,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 32,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XWS94YEXSZFXQW9T0T7TDT3KAS1AM01DHWDYX994JV6KA40AG1MNDVACAS37H2C43V4PG11NR2X761P8A9FJA1D4QD2X71GXE18VM5CAS3G9HXTS5EYHYMPZ5M9MN4Q3NVXN5W5MN0DYSGZ75C4W5CSE24R780J1A0DJ0H6JGBRQ9V5AA17K8FS4GXAHAVPQY1BQSYG0Y27RY1FDVV9XN8203VN1HTKF0B1N0P7B77GNE9K4S4P9X15B16VM68M2FQKFHYXGGFEF3T1EK3KDXYA2WY91D1HAFDAX93W5ZWJ8H6K3XP0KMDWC47K8NGHZTZGYWXBT6D1F0N1ZF7CSYGW05C66GT3JRAQPVJZQKYVW9FNY5P60AVN1QRN3WT0S57D437T58E3TCJ86RZXH66GSMS04002",
          age_mask: 0,
        },
        denomPubHash:
          "R8FBJNRK7YFRGKCG0A3G9SR8Z8E1TZ52NTCZQ3WK4PZ8D08J6N73423B9CJJPYSBEXZ0GD93Q7KMS1J44PKGS8XSC2104GP2NM7EY28",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "5RBAT4K873CRN05XAAVJ8J7QA3BTDPDC4S97NEDF39NQGK0Q9HNY29A9TDYT1KTX19K6AYD38BJE73CHN8PRVTX0P2574AYBWWKVT10",
        stampExpireDeposit: {
          t_s: 1699633748,
        },
        stampExpireLegal: {
          t_s: 1762705748,
        },
        stampExpireWithdraw: {
          t_s: 1684081748,
        },
        stampStart: {
          t_s: 1676305748,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 8,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000YSJ10QTTCPAMCWG0C0T93DJYXD29HXJS52AX4S9VXQWJ9CRQ1GGYNQB79FAN1CX9W32YYKCM31SJRW8CFDXM8WQSG6SNBQTNF87J55WQQXR5DWHVSTECB3C6WY8BXVMTAYK1JPQ0D240M73M779RAA0ZR8A0G64ES5HMP67HXT358FPQM0TDQ7JQJD46YJ5DAPF5B5ZYQA3S43JGWC2EEWMCGH3VESF50S1SEYXSA7TKEEAAQVRFNGD7F6FM7QX54Z1CJK0CFGKM6H0TZBZRTQQZG0HFDHDTGE54X0G53FEZEWQWWYG1V2VZX6AKSYD8MVHK0R0Q02871ZFHZD48PMVP0V1Q1KNQY4KRDCG8TT5XZF5CAF57RBZWZWCF6RA07T34PMQ3Z2TRRNJ7BG1330MHAD04002",
          age_mask: 0,
        },
        denomPubHash:
          "RA4XM6TBY4CB3561Y3N80QGNFHS0NB2DWWDG990BV31CDYNV7AX6B6YN8PBYQ9DN8FKAWXG71S2QDNGEHNKTS4KM12YJR58JH2K4CCR",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "D11EQTVPC20T4WZW17XSV2DAQDA99G90151T7CAN7E3DBY7VHYHAGF1RE6BJMPT1TGAEEEXYE63ECQ98EFPKY02X3XXKTT251W9D61R",
        stampExpireDeposit: {
          t_s: 1707409448,
        },
        stampExpireLegal: {
          t_s: 1770481448,
        },
        stampExpireWithdraw: {
          t_s: 1691857448,
        },
        stampStart: {
          t_s: 1684081448,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 8192,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000YBNW9JPA1N79QHW6THETSBAZSZ0DPF15WAS1RTSW91XG3MER1304V8T81DPG4ZSDD4K3EKW2RTJ3PMNZ49CDKCKJKDCE2YNRJTS6KW6QFNG0MCJ2R5G2JP0EF1BTAXKTGBHGTF2VSDS86275B9H1B482Q2Y837R07VY4KDJBFQG3ZSHDGVCNDKRAJ84P4F3A63HJDH9B48A8884GV5YNQMB699ZDWKEWZAJ40P2NQZNG3M2TXDW3TSQDH2E4PDD1JJD3WQF0QAWB2TRFCAY7568X2QB0QRQ5K77YDYT2MC9440ECKDK9W89EE63H53ZM1Z8KHXB5V3G7YYFD3X5NA27C4PZGKNT4SZVQR2EACZMGWXQ3HS9G6CSA8WFXGK4RWPRXSBJQBT6CYW0PYHWHZ5ZZEB04002",
          age_mask: 0,
        },
        denomPubHash:
          "RG2HA68MAE1DMK77WH0MC8PQ0J5HRPQ6HDMT64WPCZ0DZC9JKDFZ6F4QT4PN6MD7ZNBQ8YXAH4GD1YYBXTX99NPW4EKNK760CCD2XGG",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "S9AWJV3EHWC0DVA95YZKS74XYQZVT7MWFMYDPTJWRZ1AWVK81QB8WX3YRS79M5M053HYPGAVRA15611R05CNBNVXTCYJ17KENMPS018",
        stampExpireDeposit: {
          t_s: 1684082348,
        },
        stampExpireLegal: {
          t_s: 1747154348,
        },
        stampExpireWithdraw: {
          t_s: 1668530348,
        },
        stampStart: {
          t_s: 1660754348,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 16,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XM4EW6WZ9AYZPYDFVT8C8H6R7AKTZQS3J5XTX7T317R1XDKSNJTFBJ83V76JFV1C92A90FTVHSWBGR610PMM8W6P4QPKVY94PM9CXVCGXHESKF5HF4H8QT6PH6S62Q2H29FRXY9H0P7QGMJYH079V8SY2RVJP95D4748R6K44Y3WP662G3YVTNXSDS38CRHNJK8PV3JKRFEHM4YWTXJ16VMMZDB16JSXP64MMHTFHH11MBTNWC2E6EZ6XAZB517KHVKZ27YBD0RBZH864PY04R4WAD6RT22F4YADN264JRFKTSA7MG32E0PA20C5DN1VETMZAS1418F1KY3Y255QNEQ3XQYHNTVY1YVK7SJKG2603XZ8G4FTS1F98QWN21H3T9YHENV5R51710YATPDT8JSA7304002",
          age_mask: 0,
        },
        denomPubHash:
          "RVPFTDQDY4CA1VGM3YZVSKR2GKMANJX7K03AJNC5NPVP7S3D7NNHB9EP4BG4N3XFNNGFXR1MWZ62VCZ6PQ08PGP63BVH44EP2SKT1PR",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "4D2XQV8AP38PXSSN88HDPB6ST7HKHYTKX26SXHMD8TG76AVVQQW5BW9X5S9WFE10QTD8E83R3DCDC1AY2AWNXDZ7ZYRFGXNSD9P7T00",
        stampExpireDeposit: {
          t_s: 1691858048,
        },
        stampExpireLegal: {
          t_s: 1754930048,
        },
        stampExpireWithdraw: {
          t_s: 1676306048,
        },
        stampStart: {
          t_s: 1668530048,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 512,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000X6C186ZV3TAWHXCTEZQNZAD72KPM3KHRQ87RNRSF4MA0W4HWBCKYCWKG7BBFHC5KSK2M9D1PXKGX7TWYGJ9TFTCS2TQYF2FCAQJYZRZZCZZ3PCXZE6SGYCGWZR1M79VMDSMK92XBCG82MP07KVJ5ZPVD4SHF5CCD9BP6ASDJZP7S5RQKYJVYVTY2GGTJF8342F32SDZ4RA90ASPFKWK4RMQHA14DH39Q0NNM2WN4M1EWRZV7TZ0VZQ1BNV84K625SHMRKYDJ0X3M4HWFN0QVB8T6P9QTZAVW2KT1BJCEPSSEZH3N4CGFA5XV91EMM36VRSKK8BKX79T6XJBWS2N319QMA0XMTG7CZ22PV7ZFQQS0PK4ZAWT5TTPASX270VGH6WT550M3E4F6B2KHGHF2WS31H704002",
          age_mask: 0,
        },
        denomPubHash:
          "RW3NXHJNMM6X9HV664KZAXVN299X8RJZCXCRKCX16753EHAGH2JCK2CVG5QC1NM9J65812JA4R582V8Z92JGYPPXE4CZCS1KJNAP4W0",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "7JJ2B8MZ2WJBQ9P6F6CKYTGC8DSRW1BVS6MNMT8C9124NZ91H74VH0AV84PVV8Q6P3KCM28HB8JW0N7XXYAE8H6ZV34D89ZQWDF2008",
        stampExpireDeposit: {
          t_s: 1707409448,
        },
        stampExpireLegal: {
          t_s: 1770481448,
        },
        stampExpireWithdraw: {
          t_s: 1691857448,
        },
        stampStart: {
          t_s: 1684081448,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 131072,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XNGPDRJHB1SX6H2KHT64KWYT4S5DGKDG4JC95ZSEJD836CMYFTFK6JQ64AS3K04FJ3TMZ7YBG1F7FTV7WH941CB158C5875SBD5754SNMDTYEX7YQN3QC4MTSCNF37W8XG885YNFTPR770G5KMAKF4TAY0XAKKE1YA1F83PM309BCX07JSPR12GHXT89BC0C1QQP2NG4VJS12621E390N060169NWM0DK3NP3ENB7W6SGAETGYC4ASNBMYDY7H45TZY7X3TG2PNZXFPSK07141XX0K99Y59BD0PCYP2PD9XYW1EGFRA3ZM5MJDVJVSEGV4ZF2FRP6J83MAGK4YN7QF85CKX8XS4T5MYBBNQV4EN76MJ9889Q9GGZEEDQ2WW654D4ZS20AKCWV14RHY5PC2S68X04002",
          age_mask: 0,
        },
        denomPubHash:
          "S0A68JXE3GH8MMCE9JJH1820HY6CG1Y7VQ3AGGT9X8PVZHFFG78PH6210JDC19PNTXWVV50BN75F0428CT9T02YFPEXTJ8XN0MJPPQG",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "9ZZXT1ET04C4FG2R3YRDMTDQEJQYE5XR2YYD0XAYKWT9XR5Y5APDC6YNH2EFV3SWM5ZHM5Q9EEDBSA3X2FP7EBWF02945WN7XHSAY18",
        stampExpireDeposit: {
          t_s: 1707409448,
        },
        stampExpireLegal: {
          t_s: 1770481448,
        },
        stampExpireWithdraw: {
          t_s: 1691857448,
        },
        stampStart: {
          t_s: 1684081448,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000YHS2A207D2HNYHQ06T908YDNEBF68V4NCXPVVKY3RQE0B65F6R1CCV8JGPQSSAA0TV4DR6VKZDNYX66VCXG2S6N3KHXKH1ZDG86ZPV7AM87SEY2V9VVKY36GZF1FW2KHZ5T924VPJ9YT96H9Q0XMAN0VWYS0HBAT76MW9CP58G25FT2SRGF1GCQ1NGQGFGCW1MMWFMBBCJH2S0PSA7JQPZM21QJWD5G6B7GB1HZ4KZHCKRWMZ5S6D33C0A1XR2082JARS86N4QVN8K4Q8YFDDCHE4BN5ZKNYQ965MR9KJV400KW8F2NQ7VYN8JMK1038MTM58D7Y1A59JTGZT1R6YEQQABF1N7CVRGFDAYBZRWJGAFR9SVWCPWFF91CEQ3S2RG4G8YC67P5GQTEBYH91C6VDZB04002",
          age_mask: 0,
        },
        denomPubHash:
          "SKF9V38PM7QAEHPKF56SZ5R81NCTESVDQ57J3CCYHJ4KQ3SYDY3CQQ5EM0MH5SBXQMRKHVRHT8V9TG91HEN2HRFCYRQ4AD45TAETMG8",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "1RVKBV2TQFBG19GCPEHDZVA3MAS8CY0AWZ6K2ENZ8HPQBSKWB1AYQX2EYB8TGWN3ACDMGK96K05D1FH15YTWFXP1TMBHPTFQCG5FJ0R",
        stampExpireDeposit: {
          t_s: 1699633748,
        },
        stampExpireLegal: {
          t_s: 1762705748,
        },
        stampExpireWithdraw: {
          t_s: 1684081748,
        },
        stampStart: {
          t_s: 1676305748,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 128,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000X2VE95PA9PJ8Q3GWYYJNZJJPA7GN9N9YBP2CWKJYXPRS23BVR8CBJ6YKFTS7Q36J8578EGX508RJDD994PFNFXVATH29AZXCZB0S1FE20WPSEBBFTCKVZGKD454H6MPAVJE73VSYPDN9GGMMX7PBKX035HE0NZVNNV3GSKYKP0VFXTD5KAV943KKN4TPFBTK355ETAH9PQ9KN1V0QKBPX59QGX5AN91P3V49RSQW8VKBFZ00Z8MD9JV3CNNFDS5SFMC6AS9Z9WXR9ADS0XT7Q8ZMH49JR61NHZBMPZSV60HTWP13BWTX5PXM1XYKQJJPHQJDAYNG5HK8AW787EN2SC3BQBCB8AGK1D6CZJGDJHDTW830TSBDA9ZBKEFK849GA5QT7JDZHNV14R9HPVEGG3NVXB04002",
          age_mask: 0,
        },
        denomPubHash:
          "T5DXW0C65EZH5WYD53QWCCVX0SG3SMJ3A8Q1KZRAKMSSJ4P6CCS36EYJF0XR84QJ3CBYDJFVMVQ4D2MFPDDYG1BGKQSC8MYX5MCZ29R",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "3TGB4ZBRMT6HPGDYHYZQG9AHK4KNBV3JR9D8MRVQ38TS306P13RVQ7CTZ4JD8Y97Q5SNDXN1RMYB3DZXJDA45KDV655XYEB51PNV238",
        stampExpireDeposit: {
          t_s: 1676306648,
        },
        stampExpireLegal: {
          t_s: 1739378648,
        },
        stampExpireWithdraw: {
          t_s: 1660754648,
        },
        stampStart: {
          t_s: 1652978648,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 1024,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000YX34FHZT0C5AGW7EX9YEZ43YPJ5KJBM5J4BC4KD78A0Z1TY62DV7G1EWTEHQDNZ9B7R02TJDW81GZ66C1KW6DTVNHR5DSSGAZTKXM01YEW3VHKYGVNX7KDZ3NES0XNSWZS4YG4SEQTMF6X0XDYSQ5A7QH183KMT5ASJZ7Q7E0Z0RFSS3W5FV7XFA57DJ6NMJV8A7H0C3BQF3B04C3K70B8444M3K1JPTQ2776FJ3NHYG3C9WTPEJ55TV5V8NS8QFASD82F65JJVY9157G8KRD8DFFY1BCFHBZN61ECM827TNES9FXYVAJ54HJAE977X3F1KJZHFHRHKX8G0S5SVKYBAT47J5MWXF2JJVXW3M4TCGMY5BK11EVJJGAQF9FNXTS9QQM9JW8T3BKX8BQ3AJPESD8304002",
          age_mask: 0,
        },
        denomPubHash:
          "TKEAVANX0AWBNT4ZARKSXXHTFYY2753A0YSS15VD32K8DDW8ZYNAFNJ81H5R3A3EJMCB704XRA498C1M6N01YCQ6EQDW9Z0XKYVY0N0",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "75TST9AA9R4D0K4ZJD2MQKC46H7S1QGVXB36BHC32TJP98WXV8C1TA6TAWJAV9KN6T12W9S6PEYF6SKKTMENHFEXP08QF95DKM8Y200",
        stampExpireDeposit: {
          t_s: 1684082348,
        },
        stampExpireLegal: {
          t_s: 1747154348,
        },
        stampExpireWithdraw: {
          t_s: 1668530348,
        },
        stampStart: {
          t_s: 1660754348,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 8192,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XPT4DATEBE8PDK04TE8QHNY425BJ4KYVCM959YV4Z5QSED3PG7PACHZ2SJS7M35P6WJRC921RDK5NFGE8RDRQK8DRP56ATGYPH68CTB7G9JCGET86FEGA5JPCQN5ZKP87NJ9MGRYQ3S0FRN1N71WS6BFEEHGFZH50GCRCXKV10TE03AJD4TA5CFHJZRJTKZYXZST3P0SMBTSRG3E23NW8777HWPCP3FFE6G2M65TJSEXW7QYXVPP0SDG1Z6BPRV6P1EBY9NXNFW96JX08MGGDV5B4Z8JPB58NGM8H59J7T3JJ0ZQK714Q0T1DTKJN5NDC19JANR8XBW1GW1JQG7PSVYWMG8GTR8M3CGAWBCDR105MCYX92C7DQP0DVNCP4JMEP39VP7S5ES2PC6AEX41JGPPMS04002",
          age_mask: 0,
        },
        denomPubHash:
          "TRQPEK0DJKP005JF62J00XK6J5SX3XYQSPTG7VNJ196HD1CC9MG7D8GX77TPD2DJB7R58N3XB7XC2PRGST2JQMEW3Q1D53PSHFBS6YR",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "43WP2EGW2M131SHGT86JZ043QVDWZCMX03XBYSEV0WBJPME0EF1CZHZVSYPERC8XEKH3SF5ZGCZ5B3Y2WNQ0R39976KQW53J42T6T18",
        stampExpireDeposit: {
          t_s: 1684082348,
        },
        stampExpireLegal: {
          t_s: 1747154348,
        },
        stampExpireWithdraw: {
          t_s: 1668530348,
        },
        stampStart: {
          t_s: 1660754348,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 8,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000YZTP0ZC2X96CMNRCEN1KZ20X6H55EXN9RS4A2J1NHBMWKAR8DR146EVT47YMFJTRQWSJCVX5HMCGA2F793GVYK8851WRHRJQX1QSSVPZ024TWWYD1DW7HTQ8Z1M0NF3VQCVP0E7MGRXC6N4E37ZM0GBEBY6SGF2PF01PM764NJN2PSPDKXG012WBZMJ8E0YB0A1NFD3Z0N4X2JJ787CC2M2G63SC8RGWBRV90VN4258Q96BXCAF62DMJTS5Y9J00WHX5HRM2XH0GEP4452GGWH07P7HPHWFVBD1N5A14HS22XX26S6PMV74TP0P2R69REP0YTN38GGSYDA6CZ7Z8PX9FMSSVR9NRANYJ20FNDQCPN194D70VDDWHZGXC11KS72SWQR587HE7X8B1W00DTHFC4V04002",
          age_mask: 0,
        },
        denomPubHash:
          "V6PP4DDX9FQQEBR08364HVFZVBCDEMYT5P74JVGN5G4YAZY6KHGC59HZX1KDBKGP6Q6AF7NQ1EDTXQ1V4BTVQ3CDP95YV8ZPNYBTV70",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "E1Q95WWJXP4Q4S02J9AC9TB1GE2FDV5CWRJQKGKS2KP9BA7BKC0Q3AEJKXTQEJRA2GKYP1BX6146RYZ9Z0XG1A4P82GBJRDQYZ6T60G",
        stampExpireDeposit: {
          t_s: 1684082348,
        },
        stampExpireLegal: {
          t_s: 1747154348,
        },
        stampExpireWithdraw: {
          t_s: 1668530348,
        },
        stampStart: {
          t_s: 1660754348,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 64,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000Y4TJ75D7NPAX0TF5SGDV96PGMG1E8DDHV84QTBCMCBVJ791QK5MHYK0ECKTAZKBJXMW29V7WYNFTTFHC5X87RZX1NN6Z5JSPF9GD3T6MENQ6PA32MVE51SR4RYYNW511NF20Q0B9S1TPFMJZ0M10FRQHC1JTJWNVWGN29Y5CMQTF1MS9RBSME2QP7EWS1MEEPBDF1SPAERCJ93HW9F91NPFFXTRFDMMEA7NP6A78HP68BKEPF404H5PPG88BY0SCC7JVXWJEH8B0D8WHQ931BG9ZYEBDJY9K6Z8XC8Q3FAZZJVM7ZFV2TFS22MDE8BVY9FCCHCW2H9ENV12EKDYTP9HMZ8QE44961P7FTNR32NFAWPF6RDK08G4V0EVBFYM4CAQ1FWPGAWZDNRY1KWKPSKDTQZ04002",
          age_mask: 0,
        },
        denomPubHash:
          "VYJNC6S0HQ4A2QRFTE4N64DB2QX339KQ0FC87F87H2H7Y6Z76XRT3CRZ9BRR72B71JAJ5YZNJDA8NKFD6D7XB7F1YYA3TK2S3T13978",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "491KS8FPZ0X39BR864JBTFYHR13CHNSJN5YGAG5GY6MCKAK5DSV788XBBMP7V0N4VAAKJ9PVJBNVR7RHYK0F5678YWF9E0C3MHWJE00",
        stampExpireDeposit: {
          t_s: 1691858048,
        },
        stampExpireLegal: {
          t_s: 1754930048,
        },
        stampExpireWithdraw: {
          t_s: 1676306048,
        },
        stampStart: {
          t_s: 1668530048,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 524288,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XXCPVGMQ385HZTC2V3M5Z8WS7Y19RDTP6JVJ2VGY9XY5Z42YW7RSV2JMK0FJMVNG4E5M3Q08V7E99GE1Q8VNVR53HG2WACSDSJM4NT61KFSAHAVE627B4Y6DR563MK6QHZR0YPFV97Z2MEVFCP4MFHK400VFV94KBN6V2PJ6W542NS1V25WRBAFHPYD7H5FRFQAKMR15JJYHFT7J6ATV9XP5HVR0ZD53YST4760FYPHD1M5X7DTGBHARSHAG8PWECJFFD6YW49PBHNCE8TS374PK8J0MAN5KJJ689RY1ZDXZX1KPHS47C51TCGB00Y4HGPTDVDC4PB226X3PV1X51ZVPEDTTDAB9NR4YP36PJ4PKDKXWAM58QTXNACD9P3TSWSPG7XV2Q87V3NR2JRJ8HDMM6704002",
          age_mask: 0,
        },
        denomPubHash:
          "W2T9DWXZKXHD97A20NH1VVNYHAEQW08VZPWB69SQPBEXQDXCSTNSTPHR6PZSHMN37ZV8ZGK2GV8NT1R5G1HRF8CXRKV09RT9TPK9JCR",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "6GMBSXHZTVHZ82ZSVH170NTCMZHJN7JCNYRWCP7MHWFHT02V91KWY9TWWQ5ETQ7ENBM6BPVW0G35QW0WH0152B32M4VDT0FCZSA4E38",
        stampExpireDeposit: {
          t_s: 1707409448,
        },
        stampExpireLegal: {
          t_s: 1770481448,
        },
        stampExpireWithdraw: {
          t_s: 1691857448,
        },
        stampStart: {
          t_s: 1684081448,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 524288,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000Y1J87YWTWR54RC2KE061Y26WY44RGK07ZGW8BWPPR6XA9YQQ70ABD2ACZB4M3KYG61GQPVC65BGYFKWEE5DBJCYSARRTYNMBRTWR57AJBN4R6FZ6Q6GXCVKEZWGR1YP36MPZK5DMWBEXJ9A9G5SDSPKCFBB7QHZ6MDEYZAS99H2NVWR2M87WXSTS8PQ3WHDB66R19VQZYSQGT2P21NDRG5Z9NTWSQFPW3WM679D7EKZ5NBGMMBMV5PZ8SN1TF9VFXZGFZWEHH4V47YB679B25CT4AM2NR9XA61K8QKNH6KBKCET7MZ8VZYF9NR1N2KYM8CA1S853ANK01T4HY88D3K1W4JF332C8AXRK7NE5XKW5CJ4A80905XX1S3DGWPVA6T7J8PP86GSD131ZN2C3T1HEFN04002",
          age_mask: 0,
        },
        denomPubHash:
          "W2VH6V55RJ1TFE0RQ32GYK1XC5R9P081YDEXZC9S0VDM8DQCMM4S1HEK1JV0B12QDXWTRJP0R5TBH6A23D0D1ZCJTQNQ0DTFP0040E0",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "YK4Y1BDX54HD23559TEDRNWET4PE24G6YVJRRMQBEWZNDBB7EDZJ9QMC4ZWKH3X5ATJ4HR2TQ5AC0QWNACT5QHBZVBHEF4586TNFC20",
        stampExpireDeposit: {
          t_s: 1707409448,
        },
        stampExpireLegal: {
          t_s: 1770481448,
        },
        stampExpireWithdraw: {
          t_s: 1691857448,
        },
        stampStart: {
          t_s: 1684081448,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 16,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000Y7Y3KA4DCWFVVPYVGR4VKNGAHCAY7Z01JQJXZV7CXGWY8QT808FXR8NNGPVGP654RFYNQFEYVH6HNRNGNW8T0VCWEBPSGNH41KJ70NC4W7H5QA1YRKNEX66PE1M8BSYS5N1X4HXJAKC9VYHX484WDAYJ2J1ZS7T3MD677DGZG0M54BM22D6JQP8NMWWFN29YC4F1SQM4EKBWCVZFVF44SMZW7Y7MBB7N6WJM1EG6G8KDYTG99PZEN75HX7Y3MW50JYY41WJT2N61R1WGRBP8QSDAZCQ6RKA8W9EVHEATD5QJVF01451WJQ83KXWEV91SHG9WJH03K5TDT104ZTVXD4M737YEENJGJC8F0AMC0P03EVN2MJ29CKHT9HDQFDWJNBGEW8E74C0ZB82P664M41K4NV04002",
          age_mask: 0,
        },
        denomPubHash:
          "W69JBFAGJRD4FBFSTZD124H157V84SMQTEH6WNJZER07BWS1BWVNZAAGBWQF0YT90EQSXXVW5V0MKRTWQEDTM1026QZJYY4RV43ZZNG",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "90QEVDT0TK7FD6VPNRP7XVARWPZ1RF13W9VNKW4B4P6MHR5W6YES7TG16AE0Y9B1G06APJNKH3NYK3212Q8AD6M44ZW1QCHW0MN0230",
        stampExpireDeposit: {
          t_s: 1684082348,
        },
        stampExpireLegal: {
          t_s: 1747154348,
        },
        stampExpireWithdraw: {
          t_s: 1668530348,
        },
        stampStart: {
          t_s: 1660754348,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 4096,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000Y020EQ54PKEN0P1PNHJ584WX466K0AS2M15BH2P3SHPKWTAFJ5118KQG7R938B97G0C7NNM5AA5D0D20QMHQRJSFFXM62TARA0BEYPSBBTNHJNCTAKQHGXD9YTSRZF91STNB079EF4KE7PN6QPGC1PVAS4H05DBT88KZW44XR9F1KGT4VM0WXDYVP0JJEECTD4NY6NW82N2MFGVM6CD8KY79F8SA679X69EFX99BS50DJ7YTCZVDPJGKTWAJSDZ8QV9T2H2P3D6VJ17J54YZG5T774ZQ6D90F3EQG1F6MD4P0PA8AHFG565XX19Z0XQQH2XFWK802XP6FCXNTEVQ3RVHM95PQRBA7CW4DRR5GRKDB61MAW117VJFZ8B2M5MWQSK0TCZTBBE75G3BEWFQWCDD5N04002",
          age_mask: 0,
        },
        denomPubHash:
          "WE6C9EAEXBVBX15WRCZEJ939N4VXS16WTH5RVNM5DYJASZRGXFDR1VKFNPJGXWFGVACRHC0A6JJW2QHE236G4PCQW7DWN1H5VN9MVK8",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "Y5Q1ND84QKC7GQVQHWG6GSQ0XTKCV8AJ02ZR9XSQ8AW51SKK2VPYQ136SKBKZGB66GQKK34J83EHFG626J4GTFSS680X9Y3AEJ8GM0G",
        stampExpireDeposit: {
          t_s: 1691858048,
        },
        stampExpireLegal: {
          t_s: 1754930048,
        },
        stampExpireWithdraw: {
          t_s: 1676306048,
        },
        stampStart: {
          t_s: 1668530048,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 2,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XZAJ6XW6WC6YW356M9EAK4Y6S66YXCT7XC7M404624PFP6NYKHAQH7HM22M7JJDK7V4AWNPY3XPTDBFPJWSAF9CKMAYRQM54B2TKZ0QD6GB2FFEXW1WGFQNMFM54MH57HXZTA21DFCR7CF46T5QZ2J2JN6BAXXY99J6CGJF0CXG7WN0F4Y2KZ45WMQ0ZV9PWE61S4XBHA9QVCHKFZJHX08D68ZJBG8P61NEYPNV6BVK011T98MFX989VACEFSGKN95G4J4FDCME1PQVK2Z266WS7KBAJW39NND3V1H1RRQFC6Q2QS4AZ6CY3Q28DMZBB2NSANJKYHXXEBZDJKZH55R9GCG1EM0Q1SWTDBENH10QD6ZWZGTGB49CRSXP6NFRJ31C46V052ARETBEEKHHYN6YMR104002",
          age_mask: 0,
        },
        denomPubHash:
          "WTW0N2G7KF4W1E3PECJFRSVCH4BVTCSAYA3JHJJ83HFFEMXR3GP5DRZ2BBTJD6NRZ13HW4BBP5AS1JAEQWED7C45TFPKW71KNWN3JMR",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "5Y6MS8BCHX9DMAAQPJ15DHKYKBPMAMP3482ZEQQDD3FAR8EKFCEEY408JQTS9X7PEEKTAAJGW9TWQDYG7V1FSTNVMRS5NY86N3MK218",
        stampExpireDeposit: {
          t_s: 1707409448,
        },
        stampExpireLegal: {
          t_s: 1770481448,
        },
        stampExpireWithdraw: {
          t_s: 1691857448,
        },
        stampStart: {
          t_s: 1684081448,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 8,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XCA65H5YXSZD1S578YJRK9B29PG4JSYZ0WYG75AA657EVV05KCN0VK2335D2V6S5PVAR6238YH5P6B8RV5FX1NBXGG390BR04AYWC9C5Q12JAY6Z822G95Z2D2S36N8HWCDE5K28HMG1344JAKQ9KDP2AV87PKE1ACHNZ18HRXY06XV8D32MS62G1Z3AEGR7PRWFJ7DVHP811SH80NFAPF568JEV1MXNZKQA4V77QQMX4TFQEZ1EQFP2FA8WBRQ8N1D0MFDPJVGMWVATG0Z663YEYF0HKT1SXX4E2Q390J4QYS27PNPEWNGSGGYR94QYMFJQZ70B16828N2BGVHXEGRMF2QWVS55HK6PDY7YN7FTVRDYZ9ZV478T3S1GA5FT9075ZR9T9MZP5PDRK32826N4VF04002",
          age_mask: 0,
        },
        denomPubHash:
          "X7WVRHZAY64TST4M92WKB7HWST911YX809ZH15DPGA4QZ6FD4CA7CG8ESWG0MW5RD6741VHP2E3ANB4D58E66M8XR4QKZPQNZM8ZNNR",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "JT8M8HGH93BNT63RB1B3K9C6XHA7F3ARYMZFARTA9ES9XVY6561WAH5SCEKTP3Q9DHW4EZCA4YZJ9XTAAZS8Y6F5V8FHC1N2ZNXP230",
        stampExpireDeposit: {
          t_s: 1699633748,
        },
        stampExpireLegal: {
          t_s: 1762705748,
        },
        stampExpireWithdraw: {
          t_s: 1684081748,
        },
        stampStart: {
          t_s: 1676305748,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 1048576,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000YESJNG9NQH12C64QD8X1F84064VC79QR2D2AT8DZ2QME2K3X3PM2RCH7HAS7DAMYAMYC2EHVYNERW8CXFXXHSW9BA10Z8XZD4EDHSDP5WPAC5RVBTB9XV2PAG4SMRY4VCF1MZXAWVQGF40W3CHMVM4A58WPWW5Y353Y6F7FM6K4BYY296XVKVF9FP6DKW7VESX0QS67CNCWJ2KW12T4CY26J8GG5SQ05G6QG79BJ4Q9NEQDNND7RYXZKJ8HFD4NB9ZHBCMEZGJ0P721JX5KFB0HK4AEBW6BR5H2B48075T3VJDQPMPTGWDMN79NABWZ1MYX30JVGYKGD789HC30W5RD5YVC70E2TCRHEPQZEJ9YWYY2314ZZ0ZSAPC9CACAWQ14EN246CWSM0YDHDB6GAXENZS04002",
          age_mask: 0,
        },
        denomPubHash:
          "XCYZARWSTHA7E5F28J9M78M66GET3VCFA92YWRSV8RN47Z9Z39ENS0MX6H7TC5DB3FTA7KF3WN6D0X9Y0QJNKBM1C5EGZ0RGN8KDJN8",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "DP8Y39Z0F2W5NV6GGG8Z6DDAFR0N6NVV976YHGM8BVB8AA82NNTA1SA58M5EMJ1J4EVPXAB1QECPG265JZYHFYWBB8GW202YY1J7P08",
        stampExpireDeposit: {
          t_s: 1684082348,
        },
        stampExpireLegal: {
          t_s: 1747154348,
        },
        stampExpireWithdraw: {
          t_s: 1668530348,
        },
        stampStart: {
          t_s: 1660754348,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 1048576,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XCJV04HK7YNN2ZCG4984GAG0CSEGFXT1N0FYTMC0C3XSP54ZSKGBSMAG6EQHWH23XDWYX917BR207QEHJTYM56WMGXF7HEM5QCZQ4CBQ69MF7XH0VA7WQ29SDH5C80RPWZ4KXJB2GP1H34SEECCMT4X4YHC7C7JPYND5F88EG99Y807M8BTZ185Q1HPWQGT4G12M2KVVNT3C03DAT18RAWMYMHNVBKFM079K6T1NF8DKQ6A0D7RMAYTPRTFCS1DTPX7M3XSTD9M2C6JMWHRVM0DN4APG1KW0HNBVYRKA5F9KB2MGWWMZTFCNFBCZR0AQ9Z6T59CZH9K1NBYQ3RPJVZET7DRM34MC1E2HPARF28TRYMREAJDDACPNAEFZZM0RJHATNK9SCTXJ16HVB0KR9C5GH904002",
          age_mask: 0,
        },
        denomPubHash:
          "YKH2MAZY87PGTSAQQXJ8JG86K84SSVXW6N0KBHTYWBDJT2WRPAGH92BMQ3N3XEPZG4NQA7C5BJJMD5S0RVC82KRJ2Q5Q803KT89AMHG",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "72J1146CXEZDSB5GF1RH9ZNHRH5D8MFYWFTDNFKZXDXDN8V7P7SRHBN589GCHAGDXH47QAFP9WWZ9X84MRY8P456YYJFGS755KTH40R",
        stampExpireDeposit: {
          t_s: 1676306648,
        },
        stampExpireLegal: {
          t_s: 1739378648,
        },
        stampExpireWithdraw: {
          t_s: 1660754648,
        },
        stampStart: {
          t_s: 1652978648,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 4096,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000Y6RDVM995JYT242N7H2BV1WHVB3X39S7MPN4XH7QRXRR78RDKH2MVRFTK2QZEVPQCEBDR2P9NG0B8MT3392H88E2W3NPAR8NMSXRV0MKNVCJZPJAC65VB7FZ469QTGTWD3PDPDFPRN82WPBXCW06VRNJMAQD8WF5HM34RR5EWG84PTD7TQAT2MGGQX3MFKEGEK9HDYAR4MQVY489QNZT2JM4ZM77BZDD7BZF24FWJ2T2NTTMXDC6F13GS02BMNFY3VYBKSTTR7A6NNT2EZMQV33ABYGKG8D6X383JWAG1WT0ZFT1SENAEMST1PHC48QA7D1VKH8M33AYDT5BWVGKH92AM3N7RKCWYW92QB2ZZYAQ0CZ1ZD7D36BS20J8G4RGP3PRKVK8SMTXCABFMRQXPBJPJN04002",
          age_mask: 0,
        },
        denomPubHash:
          "YX2GBWZ5BKP3PY24W1BBCNH3VZ6W4VJXEXW5JT2WXG456KX14HAPE9B20NP3AAB5G58T912BG86S57QHSQ8SCG3GMN2K8RF72Q45FA0",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "EM34QEQ7V541GMA7BYGBX6CCWMGJ5Q4XG1S4MP4CX36ANFD2PWJAFGJ5F98JYKX9AJ1AEW85ARD54KM6YTZVYZMEA4SW42M1APW3J38",
        stampExpireDeposit: {
          t_s: 1699633748,
        },
        stampExpireLegal: {
          t_s: 1762705748,
        },
        stampExpireWithdraw: {
          t_s: 1684081748,
        },
        stampStart: {
          t_s: 1676305748,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 32768,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000WT2S8QPQ6G6DAG4MX8E4286H6MSTWZ494AZDK5AQYSWP0ZWA68MDBE6F2S58WC1KE7GVKYWWW0624E5F9335VG7113MF9CQZJTQSWY4Y6FX1QW23HY5AJRH0ED1NK09KQ7J91F8DPNKW16M5RTR14G8SMY066QVZ2ZGWB4HMR7EKG49C6YM1EAQZ0DJS60D5PY47CZ64WPVT7QJ6D69WF923Z9F7A0F12ETE1BDJY2C6DT7FGS1JQTY2JBEF3CH7HB8XGRCM7ZY6MFDMS6RVXXZ3Z6EZPCA0DRN2WHXFZXQHE9G7R3S53E2DRT4YA4G9Z0SFPXGYCKPNATERQCYCQYN0C8ZTWNDDQM4NV68P3MMCQYXKERY8GGHAHT70WSSDA9QGMK5V2H59CZGFAATKZTKKYD04002",
          age_mask: 0,
        },
        denomPubHash:
          "Z6KH2GVKNP5Z0XJJF6FKPGHAFVTYH7C68QYXA19KHR586779AY3D6V8MYTZNX6WD1W0B1NPT43E6FKZCKFWEMAN3VDB5NB6ZSACE2Z8",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "0KY1C7YBTCT94SXDK0AYVDBGH2MBX79B8572G2WGQWYB6N95CWH2JZAG8REY541Y06B8MRD6VBAGK3HFRJ8RYA6V51KZ0A26BN6NW0R",
        stampExpireDeposit: {
          t_s: 1691858048,
        },
        stampExpireLegal: {
          t_s: 1754930048,
        },
        stampExpireWithdraw: {
          t_s: 1676306048,
        },
        stampStart: {
          t_s: 1668530048,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 8,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000YNCQMRWRFWWE8CEW7GYBGMC4376PMYZ898JFSEYHS3D9KZTQF32TKFTWA6YSAB6FN8T8CZJ5WRC3NZJ9XSFFGD0KX6GREDFYWBXRZQZTX7ZTW4VH0PABEA94B2E76P1J9G8Q60VC7F6MB3VRN8FMZ8G21R03R945VTAFKY1HR49QXZF756CRN73TXQCFAKDP82M7B8VG3S162YW1MS8VC02JB74CJ0RMF43WZ1DBXA77WAHEPR3744B5N494CR8ZQ5R9AP817XN5WZ300XW8S0MQDTGABXXHHKFJDNZ3SFZBHEHSWX6B2DHPCYSDF35MSH958X7DXPGNZBEV5P4XR88K9F46QQWEAJGF343Q7DEFEF4HPK8TD5CA141BV90H2ZF3JF6B3AX1V0F5AGTBC9H5MB04002",
          age_mask: 0,
        },
        denomPubHash:
          "ZNXFAT509Z2KDBNCZP0178V654CYBW5SQXCBN35S0A2H1RHK03JEA6AF1NAWH4NATVFKNWP95RJKQDKM2X0VH1DKNHAR4HJZ469Y7VG",
        exchangeBaseUrl: "https://bitcoin.ice.bfh.ch/",
        exchangeMasterPub:
          "YCWD4QXP607YDZ47NF40MZ6BNMKNFKPECD6JYMTTMTAANZ6C7W00",
        feeDeposit: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefresh: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeRefund: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        feeWithdraw: {
          currency: "BITCOINBTC",
          fraction: 1,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "JTNGKHSWF386MG4XYYD4ZZK9ASG2QVXRJSDGBWVZPPKBM53TPY51W107N4Z6H19R695SFP3GMCDZ0HBDW57XZRHSVSYEHFZKR3D0J3G",
        stampExpireDeposit: {
          t_s: 1707409448,
        },
        stampExpireLegal: {
          t_s: 1770481448,
        },
        stampExpireWithdraw: {
          t_s: 1691857448,
        },
        stampStart: {
          t_s: 1684081448,
        },
        verificationStatus: "unverified",
        value: {
          currency: "BITCOINBTC",
          fraction: 4,
          value: 0,
        },
        listIssueDate: {
          t_s: 1652978648,
        },
      },
    ],
  },
] as any;

export const kudosExchanges: ExchangeListItem[] = [
  {
    exchangeBaseUrl: "https://exchange1.demo.taler.net/",
    currency: "KUDOS",
    tos: {
      currentVersion: "0",
      contentType: "text/plain",
      content:
        'Terms Of Service\n****************\n\nLast Updated: 09.06.2022\n\nWelcome! The ICE research center of the Bern University of Applied\nSciences in Switzerland (“we,” “our,” or “us”) provides an\nexperimental payment service through our Internet presence\n(collectively the “Services”). Before using our Services, please read\nthe Terms of Service (the “Terms” or the “Agreement”) carefully.\n\n\nThis is research\n================\n\nThis is a research experiment. Any funds wired to our Bitcoin address\nare considered a donation to our research group. We may use them to\nenable payments following the GNU Taler protocol, or simply keep them\nat our discretion.  The service is experimental and may also be\ndiscontinued at any time, in which case all remaining funds will\ndefinitively be kept by the research group.\n\n\nOverview\n========\n\nThis section provides a brief summary of the highlights of this\nAgreement. Please note that when you accept this Agreement, you are\naccepting all of the terms and conditions and not just this section.\nWe and possibly other third parties provide Internet services which\ninteract with the Taler Wallet’s self-hosted personal payment\napplication. When using the Taler Wallet to interact with our\nServices, you are agreeing to our Terms, so please read carefully.\n\n\nHighlights:\n-----------\n\n   * You are responsible for keeping the data in your Taler Wallet at\n     all times under your control. Any losses arising from you not\n     being in control of your private information are your problem.\n\n   * We may transfer funds we receive from our users to any legal\n     recipient to the best of our ability within the limitations of\n     the law and our implementation. However, the Services offered\n     today are highly experimental and the set of recipients of funds\n     is severely restricted. Again, we stress this is a research\n     experiment and technically all funds held by the exchange are\n     owned by the research group of the university.\n\n   * For our Services, we may charge transaction fees. The specific\n     fee structure is provided based on the Taler protocol and should\n     be shown to you when you withdraw electronic coins using a Taler\n     Wallet. You agree and understand that the Taler protocol allows\n     for the fee structure to change.\n\n   * You agree to not intentionally overwhelm our systems with\n     requests and follow responsible disclosure if you find security\n     issues in our services.\n\n   * We cannot be held accountable for our Services not being\n     available due to any circumstances. If we modify or terminate our\n     services, we may give you the opportunity to recover your funds.\n     However, given the experimental state of the Services today, this\n     may not be possible. You are strongly advised to limit your use\n     of the Service to small-scale experiments expecting total loss of\n     all funds.\n\nThese terms outline approved uses of our Services. The Services and\nthese Terms are still at an experimental stage. If you have any\nquestions or comments related to this Agreement, please send us a\nmessage to ice@bfh.ch. If you do not agree to this Agreement, you must\nnot use our Services.\n\n\nHow you accept this policy\n==========================\n\nBy sending funds to us (to top-up your Taler Wallet), you acknowledge\nthat you have read, understood, and agreed to these Terms. We reserve\nthe right to change these Terms at any time. If you disagree with the\nchange, we may in the future offer you with an easy option to recover\nyour unspent funds. However, in the current experimental period you\nacknowledge that this feature is not yet available, resulting in your\nfunds being lost unless you accept the new Terms. If you continue to\nuse our Services other than to recover your unspent funds, your\ncontinued use of our Services following any such change will signify\nyour acceptance to be bound by the then current Terms. Please check\nthe effective date above to determine if there have been any changes\nsince you have last reviewed these Terms.\n\n\nServices\n========\n\nWe will try to transfer funds that we receive from users to any legal\nrecipient to the best of our ability and within the limitations of the\nlaw. However, the Services offered today are highly experimental and\nthe set of recipients of funds is severely restricted.  The Taler\nWallet can be loaded by exchanging fiat or cryptocurrencies against\nelectronic coins. We are providing this exchange service. Once your\nTaler Wallet is loaded with electronic coins they can be spent for\npurchases if the seller is accepting Taler as a means of payment. We\nare not guaranteeing that any seller is accepting Taler at all or a\nparticular seller.  The seller or recipient of deposits of electronic\ncoins must specify the target account, as per the design of the Taler\nprotocol. They are responsible for following the protocol and\nspecifying the correct bank account, and are solely liable for any\nlosses that may arise from specifying the wrong account. We may allow\nthe government to link wire transfers to the underlying contract hash.\nIt is the responsibility of recipients to preserve the full contracts\nand to pay whatever taxes and charges may be applicable. Technical\nissues may lead to situations where we are unable to make transfers at\nall or lead to incorrect transfers that cannot be reversed. We may\nrefuse to execute transfers if the transfers are prohibited by a\ncompetent legal authority and we are ordered to do so.\n\nWhen using our Services, you agree to not take any action that\nintentionally imposes an unreasonable load on our infrastructure. If\nyou find security problems in our Services, you agree to first report\nthem to security@taler-systems.com and grant us the right to publish\nyour report. We warrant that we will ourselves publicly disclose any\nissues reported within 3 months, and that we will not prosecute anyone\nreporting security issues if they did not exploit the issue beyond a\nproof-of-concept, and followed the above responsible disclosure\npractice.\n\n\nFees\n====\n\nYou agree to pay the fees for exchanges and withdrawals completed via\nthe Taler Wallet ("Fees") as defined by us, which we may change from\ntime to time. With the exception of wire transfer fees, Taler\ntransaction fees are set for any electronic coin at the time of\nwithdrawal and fixed throughout the validity period of the respective\nelectronic coin. Your wallet should obtain and display applicable fees\nwhen withdrawing funds. Fees for coins obtained as change may differ\nfrom the fees applicable to the original coin. Wire transfer fees that\nare independent from electronic coins may change annually.  You\nauthorize us to charge or deduct applicable fees owed in connection\nwith deposits, exchanges and withdrawals following the rules of the\nTaler protocol. We reserve the right to provide different types of\nrewards to users either in the form of discount for our Services or in\nany other form at our discretion and without prior notice to you.\n\n\nEligibility and Financial self-responsibility\n=============================================\n\nTo be eligible to use our Services, you must be able to form legally\nbinding contracts or have the permission of your legal guardian. By\nusing our Services, you represent and warrant that you meet all\neligibility requirements that we outline in these Terms.\n\nYou will be responsible for maintaining the availability, integrity\nand confidentiality of the data stored in your wallet. When you setup\na Taler Wallet, you are strongly advised to follow the precautionary\nmeasures offered by the software to minimize the chances to losse\naccess to or control over your Wallet data. We will not be liable for\nany loss or damage arising from your failure to comply with this\nparagraph.\n\n\nCopyrights and trademarks\n=========================\n\nThe Taler Wallet is released under the terms of the GNU General Public\nLicense (GNU GPL). You have the right to access, use, and share the\nTaler Wallet, in modified or unmodified form. However, the GPL is a\nstrong copyleft license, which means that any derivative works must be\ndistributed under the same license terms as the original software. If\nyou have any questions, you should review the GNU GPL’s full terms and\nconditions at https://www.gnu.org/licenses/gpl-3.0.en.html.  “Taler”\nitself is a trademark of Taler Systems SA. You are welcome to use the\nname in relation to processing payments using the Taler protocol,\nassuming your use is compatible with an official release from the GNU\nProject that is not older than two years.\n\n\nLimitation of liability & disclaimer of warranties\n==================================================\n\nYou understand and agree that we have no control over, and no duty to\ntake any action regarding: Failures, disruptions, errors, or delays in\nprocessing that you may experience while using our Services; The risk\nof failure of hardware, software, and Internet connections; The risk\nof malicious software being introduced or found in the software\nunderlying the Taler Wallet; The risk that third parties may obtain\nunauthorized access to information stored within your Taler Wallet,\nincluding, but not limited to your Taler Wallet coins or backup\nencryption keys.  You release us from all liability related to any\nlosses, damages, or claims arising from:\n\n1. user error such as forgotten passwords, incorrectly constructed\n   transactions;\n\n2. server failure or data loss;\n\n3. unauthorized access to the Taler Wallet application;\n\n4. bugs or other errors in the Taler Wallet software; and\n\n5. any unauthorized third party activities, including, but not limited\n   to, the use of viruses, phishing, brute forcing, or other means of\n   attack against the Taler Wallet. We make no representations\n   concerning any Third Party Content contained in or accessed through\n   our Services.\n\nAny other terms, conditions, warranties, or representations associated\nwith such content, are solely between you and such organizations\nand/or individuals.\n\nTo the fullest extent permitted by applicable law, in no event will we\nor any of our officers, directors, representatives, agents, servants,\ncounsel, employees, consultants, lawyers, and other personnel\nauthorized to act, acting, or purporting to act on our behalf\n(collectively the “Taler Parties”) be liable to you under contract,\ntort, strict liability, negligence, or any other legal or equitable\ntheory, for:\n\n1. any lost profits, data loss, cost of procurement of substitute\n   goods or services, or direct, indirect, incidental, special,\n   punitive, compensatory, or consequential damages of any kind\n   whatsoever resulting from:\n\n   1. your use of, or conduct in connection with, our services;\n\n   2. any unauthorized use of your wallet and/or private key due to\n      your failure to maintain the confidentiality of your wallet;\n\n   3. any interruption or cessation of transmission to or from the\n      services; or\n\n   4. any bugs, viruses, trojan horses, or the like that are found in\n      the Taler Wallet software or that may be transmitted to or\n      through our services by any third party (regardless of the\n      source of origination), or\n\n2. any direct damages.\n\nThese limitations apply regardless of legal theory, whether based on\ntort, strict liability, breach of contract, breach of warranty, or any\nother legal theory, and whether or not we were advised of the\npossibility of such damages. Some jurisdictions do not allow the\nexclusion or limitation of liability for consequential or incidental\ndamages, so the above limitation may not apply to you.\n\nOur services are provided "as is" and without warranty of any kind. To\nthe maximum extent permitted by law, we disclaim all representations\nand warranties, express or implied, relating to the services and\nunderlying software or any content on the services, whether provided\nor owned by us or by any third party, including without limitation,\nwarranties of merchantability, fitness for a particular purpose,\ntitle, non-infringement, freedom from computer virus, and any implied\nwarranties arising from course of dealing, course of performance, or\nusage in trade, all of which are expressly disclaimed. In addition, we\ndo not represent or warrant that the content accessible via the\nservices is accurate, complete, available, current, free of viruses or\nother harmful components, or that the results of using the services\nwill meet your requirements. Some states do not allow the disclaimer\nof implied warranties, so the foregoing disclaimers may not apply to\nyou. This paragraph gives you specific legal rights and you may also\nhave other legal rights that vary from state to state.\n\n\nIndemnity and Time limitation on claims and Termination\n=======================================================\n\nTo the extent permitted by applicable law, you agree to defend,\nindemnify, and hold harmless the Taler Parties from and against any\nand all claims, damages, obligations, losses, liabilities, costs or\ndebt, and expenses (including, but not limited to, attorney’s fees)\narising from: (a) your use of and access to the Services; (b) any\nfeedback or submissions you provide to us concerning the Taler Wallet;\n(c) your violation of any term of this Agreement; or (d) your\nviolation of any law, rule, or regulation, or the rights of any third\nparty.\n\nYou agree that any claim you may have arising out of or related to\nyour relationship with us must be filed within one year after such\nclaim arises, otherwise, your claim in permanently barred.\n\nIn the event of termination concerning your use of our Services, your\nobligations under this Agreement will still continue.\n\n\nDiscontinuance of services and Force majeure\n============================================\n\nWe may, in our sole discretion and without cost to you, with or\nwithout prior notice, and at any time, modify or discontinue,\ntemporarily or permanently, any portion of our Services. We will use\nthe Taler protocol’s provisions to notify Wallets if our Services are\nto be discontinued. It is your responsibility to ensure that the Taler\nWallet is online at least once every three months to observe these\nnotifications. We shall not be held responsible or liable for any loss\nof funds in the event that we discontinue or depreciate the Services\nand your Taler Wallet fails to transfer out the coins within a three\nmonths notification period.\n\nWe shall not be held liable for any delays, failure in performance, or\ninterruptions of service which result directly or indirectly from any\ncause or condition beyond our reasonable control, including but not\nlimited to: any delay or failure due to any act of God, act of civil\nor military authorities, act of terrorism, civil disturbance, war,\nstrike or other labor dispute, fire, interruption in\ntelecommunications or Internet services or network provider services,\nfailure of equipment and/or software, other catastrophe, or any other\noccurrence which is beyond our reasonable control and shall not affect\nthe validity and enforceability of any remaining provisions.\n\n\nGoverning law, Waivers, Severability and Assignment\n===================================================\n\nNo matter where you’re located, the laws of Switzerland will govern\nthese Terms. If any provisions of these Terms are inconsistent with\nany applicable law, those provisions will be superseded or modified\nonly to the extent such provisions are inconsistent. The parties agree\nto submit to the ordinary courts in Bern, Switzerland for exclusive\njurisdiction of any dispute arising out of or related to your use of\nthe Services or your breach of these Terms.\n\nOur failure to exercise or delay in exercising any right, power, or\nprivilege under this Agreement shall not operate as a waiver; nor\nshall any single or partial exercise of any right, power, or privilege\npreclude any other or further exercise thereof.\n\nYou agree that we may assign any of our rights and/or transfer, sub-\ncontract, or delegate any of our obligations under these Terms.\n\nIf it turns out that any part of this Agreement is invalid, void, or\nfor any reason unenforceable, that term will be deemed severable and\nlimited or eliminated to the minimum extent necessary.\n\nThis Agreement sets forth the entire understanding and agreement as to\nthe subject matter hereof and supersedes any and all prior\ndiscussions, agreements, and understandings of any kind (including,\nwithout limitation, any prior versions of this Agreement) and every\nnature between us. Except as provided for above, any modification to\nthis Agreement must be in writing and must be signed by both parties.\n\n\nQuestions or comments\n=====================\n\nWe welcome comments, questions, concerns, or suggestions. Please send\nus a message on our contact page at legal@taler-systems.com.\n',
    },
    paytoUris: ["payto://x-taler-bank/bank.demo.taler.net/Exchange"],
    auditors: [],
    wireInfo: {
      accounts: [
        {
          payto_uri: "payto://x-taler-bank/bank.demo.taler.net/Exchange",
          master_sig:
            "FW34QNAQQHTXCQSD771EDHW5P9YT8T83CTN4SQJGXR8ZF8G4RFZDV8682G496J85R48DHQSQN72CEQE1K3BJFCQSR57VDECZ9JXCW10",
        },
      ],
      feesForType: {
        "x-taler-bank": [
          {
            closingFee: {
              currency: "KUDOS",
              fraction: 1000000,
              value: 0,
            },
            endStamp: {
              t_s: 1672531200,
            },
            sig: "6W58FM8MBK09KQSAE8QGGSDHFKPQ7014H3G3WXYF4CN059X97SQNNEA4H25HDZQ7146Y04EVZPRE34H3VB8WGTE9AXEPA7WYM637T30",
            startStamp: {
              t_s: 1640995200,
            },
            wireFee: {
              currency: "KUDOS",
              fraction: 1000000,
              value: 0,
            },
            wadFee: {
              currency: "KUDOS",
              fraction: 1000000,
              value: 0,
            },
          },
          {
            closingFee: {
              currency: "KUDOS",
              fraction: 1000000,
              value: 0,
            },
            endStamp: {
              t_s: 1704067200,
            },
            sig: "FGFMT9ZHT9YM688MZ04GD59W214NRGFY6JNZPC36KYY03DQ7P5T1HXW19Q4RK9J75AMA6W8ZPBSHN6A2B4S8GQ6FBHE4FBHXSC8MA2R",
            startStamp: {
              t_s: 1672531200,
            },
            wireFee: {
              currency: "KUDOS",
              fraction: 1000000,
              value: 0,
            },
            wadFee: {
              currency: "KUDOS",
              fraction: 1000000,
              value: 0,
            },
          },
          {
            closingFee: {
              currency: "KUDOS",
              fraction: 1000000,
              value: 0,
            },
            endStamp: {
              t_s: 1735689600,
            },
            sig: "V1F7CA67DS3XT4M88XC1DP98Y19ETCY1CSNRX6E0KZFZ21BQ8WR8P7EJHB930219GK3XGG9XQ4SHC76KMS1S2XXKN49FBK3HFE38Y00",
            startStamp: {
              t_s: 1704067200,
            },
            wireFee: {
              currency: "KUDOS",
              fraction: 1000000,
              value: 0,
            },
            wadFee: {
              currency: "KUDOS",
              fraction: 1000000,
              value: 0,
            },
          },
          {
            closingFee: {
              currency: "KUDOS",
              fraction: 1000000,
              value: 0,
            },
            endStamp: {
              t_s: 1767225600,
            },
            sig: "YQ1ATYAQ0CHZ38GHYC8D4WT6CJFKBNMZYXHVN1AGC5PHJHM0TZFHFS57R2YFNZMFERZB4HXXKKPP1WMHQKD1FMGE26QE0B0HNDV6P28",
            startStamp: {
              t_s: 1735689600,
            },
            wireFee: {
              currency: "KUDOS",
              fraction: 1000000,
              value: 0,
            },
            wadFee: {
              currency: "KUDOS",
              fraction: 1000000,
              value: 0,
            },
          },
          {
            closingFee: {
              currency: "KUDOS",
              fraction: 1000000,
              value: 0,
            },
            endStamp: {
              t_s: 1798761600,
            },
            sig: "58YMQM2W1PF1Q98TE1MKKAM5MWWGJB0SWZNR2CXZPMMYZX4J9PZV5HRNNW6K1942EB78N4324Z2NS5J30F8Y8VNFHCWRYVJ6W4N3400",
            startStamp: {
              t_s: 1767225600,
            },
            wireFee: {
              currency: "KUDOS",
              fraction: 1000000,
              value: 0,
            },
            wadFee: {
              currency: "KUDOS",
              fraction: 1000000,
              value: 0,
            },
          },
          {
            closingFee: {
              currency: "KUDOS",
              fraction: 1000000,
              value: 0,
            },
            endStamp: {
              t_s: 1830297600,
            },
            sig: "0XXNNRH5AHWCZPH0STE6KTTPXKYR1QSTWDMMJ657MAV5SCB7DAM01Y8BTXJWR2XSATAA5ZRVWE3HRK456F1NP8FADH7C4FQ87PZYP1G",
            startStamp: {
              t_s: 1798761600,
            },
            wireFee: {
              currency: "KUDOS",
              fraction: 1000000,
              value: 0,
            },
            wadFee: {
              currency: "KUDOS",
              fraction: 1000000,
              value: 0,
            },
          },
        ],
      },
    },
    denominations: [
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000Z2SH86VV11J3QT9E3R3MF41EDQX3R30CHC3HH1V5MECGBS9FEHDPXHT78YDQFGVMMEAX7TBYB6QJED2513G0REZWVA49EG149JEA8MGBYTTSCMTA3GF8QV3AKWQVXVXDEENKJG8738ZSMSG698Q55D3S6YR9BRA523GYQZ680VSJWRJW0CVR1WFBJTV143X9KV6WQ0YDN7PKSB3GFTZ4RR2JVWH21Z3RJYF2KFWHYKCG813X5TRYV96FS3YCZ2PFA70DPWGS09W2WM7GW35GTRBDKJ8EQYSMWJSDRESC81SZ3XC40YH9T894QNT7V5T0G38RSE7HMX1097V7V254RY8FYX4CH9SGWD5HKYE7Z2T0TK393ECSFZSBXPMG6YM2R644R75HPM1NT38T3P7QG87YV504002",
          age_mask: 0,
        },
        denomPubHash:
          "6BY86FJZK8GBWDZ9Z8GF2CDZVZW613F214AM96E9WMCK9064289K7PZZPFDKHK2BMPDTWRXXGKB2WXFCA280WMBRQEZAZ884C3R6VTG",
        exchangeBaseUrl: "https://exchange.demo.taler.net/",
        exchangeMasterPub:
          "FH1Y8ZMHCTPQ0YFSZECDH8C9407JR3YN0MF1706PTG24Q4NEWGV0",
        feeDeposit: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeRefresh: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeRefund: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeWithdraw: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "JEXTAP09WF04H63WSYAWRFEX2C9RPNZ1JDC7YTM1F6VGQV7G17MSFCP2KJQBPDCGYSGPMSZCWDE0P7AVDEDNH4HMJE3S4CR7JGZXT2G",
        stampExpireDeposit: {
          t_s: 1882187402,
        },
        stampExpireLegal: {
          t_s: 2197547402,
        },
        stampExpireWithdraw: {
          t_s: 1724507402,
        },
        stampStart: {
          t_s: 1629899402,
        },
        verificationStatus: "unverified",
        value: {
          currency: "KUDOS",
          fraction: 0,
          value: 1,
        },
        listIssueDate: {
          t_s: 1629899402,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000X1TJZYN5HGTJ3GHQ590B008BQ40JXCZMVZWZDVW41F478ZBXFKBME1S8YHNBPJQR2PYJ4XT8HHQM12M77TKNY2R3XN156P8DAF0D0B7MBT8QAB8T149BSSWQPXSYPKHCNKQXVVZGYE54JZYJG81F1VD7QNB8HEE6PMKMNJQWXJN7MPPJR779NR44W2E564M11MQWA1TAAAXPZYC0X3QC2427BJ83W4PR1ZJPSB3TYC4PV7D5FN89QB426WFBKG09WZBNTX683BGG06Y7S8720FC4KQBHA79ZVZTSEH4773SACBEC9W0D1MFMXFF2SB56HAFVZPJ42C3AG9PS57M1AAH8R6244WQ5STXJF7JZE7908C6PNSQS7RKW9M1K7HH29T2FF7SBVB2FPZ58BT19SKZ8FH04002",
          age_mask: 0,
        },
        denomPubHash:
          "ABR2QRJ2VQ4KDCNQ2NWVBSHCA0FECNHAMFPAH0Y4PJ23M14S8XKT8FNNKQ7THGXV1Q8QR8XQ411Z502N7WM1F579GCJJ89GAQQM2MZ8",
        exchangeBaseUrl: "https://exchange.demo.taler.net/",
        exchangeMasterPub:
          "FH1Y8ZMHCTPQ0YFSZECDH8C9407JR3YN0MF1706PTG24Q4NEWGV0",
        feeDeposit: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeRefresh: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeRefund: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeWithdraw: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "9A8BKYG6F8ZJHN7E93SJGR43FT08BPSBDB52MV4YDTYVWNW33RAWEK70V8AJR9CD26BSDZ1PGZZRWETWS4GN077SV2MPZ4981GXMM30",
        stampExpireDeposit: {
          t_s: 1890078239,
        },
        stampExpireLegal: {
          t_s: 2205438239,
        },
        stampExpireWithdraw: {
          t_s: 1732398239,
        },
        stampStart: {
          t_s: 1637790239,
        },
        verificationStatus: "unverified",
        value: {
          currency: "KUDOS",
          fraction: 0,
          value: 10,
        },
        listIssueDate: {
          t_s: 1629899402,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000Y1AHY7RA22DX698Q5ZNBF5T81RWPSNR7B9ZRA3Z8E9KF0FRHAR23H7PGE917GR4JZFXZ2H7CJKKT5F09YN3P9JG0XEDDGHJV2QXS2AQQ1HJRQTCBSXB7JTQX2FPRSEV4M8C6H62GYAXEZFKMRTN7J4NHXWR3J0DQH28EKKCR2Y0W21BTZFSSJFB9FNMRAN2PDHDSQBJH7G6V0NRBQ1ZBTTF2G2675EN2F7J2Q9Y0M89AXZZGF296QB63SXZ5GR4YZ3FNJEPJCVN6P78B03JSSFQV2XVMN9QVDWP53BWR6MX8ZYJNQ969DZNZ8AK7KEGJQ035VNWFG7CSY7A50GEJ8G6D60SGPYAN9YH2HSRA785C84W4TB0W7AJ8QWTSJESS1A3V5XC3FNQQ8B09A5QWD7R93H04002",
          age_mask: 0,
        },
        denomPubHash:
          "AYKKZ0HXDJVHEQBP1KSV32P8NF6R9CT9HXRF856WJMJZ8DBGGFPQZ731E28M09QMA5TPWQY7YDBVHH9TKAE3WG51HPM6BZS18ZA535G",
        exchangeBaseUrl: "https://exchange.demo.taler.net/",
        exchangeMasterPub:
          "FH1Y8ZMHCTPQ0YFSZECDH8C9407JR3YN0MF1706PTG24Q4NEWGV0",
        feeDeposit: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeRefresh: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeRefund: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeWithdraw: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "XSD7GF7SA65644P90E854JME4NS6YV528ZS1FS871RENBJA8YDG5D0CKAMYDY5TKJTMGFQG874GXTC73TWTABB435HPPAVPCV01NT0R",
        stampExpireDeposit: {
          t_s: 1882187402,
        },
        stampExpireLegal: {
          t_s: 2197547402,
        },
        stampExpireWithdraw: {
          t_s: 1724507402,
        },
        stampStart: {
          t_s: 1629899402,
        },
        verificationStatus: "unverified",
        value: {
          currency: "KUDOS",
          fraction: 0,
          value: 2,
        },
        listIssueDate: {
          t_s: 1629899402,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000X7C66AGY9XFH83G8K7N5MJ26VV17PYWWYZAVN77Q5W9YA5N21XME6XHZNC2V0HECH88DYYPHF1EY0GAYHYV1VF20VKZJNREA8NJ2AJQ5GGZGQGYYT59CWE4H02BV7Q821JEA91B097T0HQCZ1MAERSNGEDME6Z2P5FWEQK3448K5PRQQXE49F1BE3RX801BPTGVX3JPSZAB7QTPRBNTN50R1R9S48N4JMQGKTXE22WRHDPMACCSN6B09FDZ53Z0XY9MW4ZJ37QCNBA7V99J9TMYDT5ECYNCV00W0P6S09AN03RTF61KT98K4VDZR72XWHBSKGES6CHJZYRWK04MCX6BCDRQEPHAZHFXT5E0GKA5JSKBANRC2V1275MTDZDQJRAGN4MHM2ANNJD5HWP8QHZ2MXF04002",
          age_mask: 0,
        },
        denomPubHash:
          "B75WVKB7NVFEH9J4YK3RPRAFC4Y8WN9FH6FTES1NHMFZ90RTTSBY84AC4RKP66ERGGXN5H152PM91R8N6W872VKTFD70GGTA1RBAGPR",
        exchangeBaseUrl: "https://exchange.demo.taler.net/",
        exchangeMasterPub:
          "FH1Y8ZMHCTPQ0YFSZECDH8C9407JR3YN0MF1706PTG24Q4NEWGV0",
        feeDeposit: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeRefresh: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeRefund: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeWithdraw: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "M16G5X5V9VEJK3Z5DKZPHGKYA6F8NMENSZA0JNJ4JAVVS2DY73JHKRQV1Q48QGEZZZG42AKJNV3J1WSM9QCCED4R3KA6DBBBY2SRY2R",
        stampExpireDeposit: {
          t_s: 1890078239,
        },
        stampExpireLegal: {
          t_s: 2205438239,
        },
        stampExpireWithdraw: {
          t_s: 1732398239,
        },
        stampStart: {
          t_s: 1637790239,
        },
        verificationStatus: "unverified",
        value: {
          currency: "KUDOS",
          fraction: 0,
          value: 1,
        },
        listIssueDate: {
          t_s: 1629899402,
        },
      },

      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XWNVCB63AC0RMD0AB4PBP5GBMKKPP47PMEA4FYMATAAYFA49JPP0RV7KHN2272GG2WDM08FR9E8MKKKM62NVRCVPNGNACR2FR060JJD5CXRJE43W484PQJHYJ3Z6QQE8GK7RSBT80GDT64Y2XD7YCZ0BWB5MAVJGYVGGTA63APQF9X12KNSV4EV0SC926EDDC1JY04GGHHJ6CHQ2WBA5JB9KEJWP463T3CKT7RFFCFPV124YC6788EHM7B1Z4QQ2ERFZWD9RNZWPENM7WDMADY0AK9HB9PFHRGVY45RVS2M3NCW914X2PAS2JW1335GT4ZRX22Q8DGFXY0X4CFDDAP8PPTDFCNZ2JWVG7QPGAC1RVJZZBKB26TXV7A9K9NZC1S4PEGSE9A482VA26C914CK6MH04002",
          age_mask: 0,
        },
        denomPubHash:
          "DFPEPMM4G7DQXRSSJN5EFV9N5FA0CW0Z7H0TKJ39XAQVQFGJ241M3FBSC8362YCY82YQYDVNP4X56859C9V7XQ3DPDTVJBV1VRYH828",
        exchangeBaseUrl: "https://exchange.demo.taler.net/",
        exchangeMasterPub:
          "FH1Y8ZMHCTPQ0YFSZECDH8C9407JR3YN0MF1706PTG24Q4NEWGV0",
        feeDeposit: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeRefresh: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeRefund: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeWithdraw: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "J8XS7V10AXFD0CB05KN987JQGKHGENYQ5YDE9XSPDFCGPK62MXDZ5MBSC0NTG69AGQK3Q419ZGVHJ6W9ZNWR721HBYYYZ4X0H1CYA18",
        stampExpireDeposit: {
          t_s: 1890078239,
        },
        stampExpireLegal: {
          t_s: 2205438239,
        },
        stampExpireWithdraw: {
          t_s: 1732398239,
        },
        stampStart: {
          t_s: 1637790239,
        },
        verificationStatus: "unverified",
        value: {
          currency: "KUDOS",
          fraction: 10000000,
          value: 0,
        },
        listIssueDate: {
          t_s: 1629899402,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000Y3YT1REGPJ949VKG2TDASRMEX1F5GDMCTFSKASZK8A1NXEEBNFG1MVNCBJSNPQCREC4RDGVN24B5AG5GDA9JZ4HQ2VZGEZ27YQBEDT68VZ76K8SXDAS8BRVJY6HREXP7N7G75W5K6BHYTKP3MRS1F5HY3ZPMZE1M15KEKC507RSXZMR35W49S8X3VJTX9XVGWEHGBCCVC3PJZ8GZ93Z1B4BYYXGKN1DDCEFWVDW4GSBCH28N2M9K9R74GD6CG072F64QC2RKEA55ZVPD22HXKSH83VKPRA8BKKHFRVZKZCVZ80CNCNM8BKBC3XGKC4R2MDWAJH64XPBS8A1K0EKB38RNHJMH2TN6SE2WTHVEV4CC55XHH37GMPQ7HTGMQGNMYR53870KS0KVTK0J1EY102P36Z04002",
          age_mask: 0,
        },
        denomPubHash:
          "GVG9DHSMNZ02C3BD2KKWFRF0G2PVEPE7DRH8FHVK92JCDCS043RJF5NY04Q5AWPST5A4CAYE8WA0MJNV46ZXZJVR7J2CS7469KG19A0",
        exchangeBaseUrl: "https://exchange.demo.taler.net/",
        exchangeMasterPub:
          "FH1Y8ZMHCTPQ0YFSZECDH8C9407JR3YN0MF1706PTG24Q4NEWGV0",
        feeDeposit: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeRefresh: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeRefund: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeWithdraw: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "HWEXT58J3SST2JZVX1FPA3J76A3ZAHJBYPAEN6A2Y0YVF3P5MSAT0B1623EYHSZF27KVGZ7GM8WTX94JSWQDRNW3SKGS0CW4XEJEE20",
        stampExpireDeposit: {
          t_s: 1890078239,
        },
        stampExpireLegal: {
          t_s: 2205438239,
        },
        stampExpireWithdraw: {
          t_s: 1732398239,
        },
        stampStart: {
          t_s: 1637790239,
        },
        verificationStatus: "unverified",
        value: {
          currency: "KUDOS",
          fraction: 0,
          value: 5,
        },
        listIssueDate: {
          t_s: 1629899402,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000X8VQGFR2J9BZEQ9S8Q01R6A14KGDQMET0CHAHPDG5RSRB925P9BTBQ6BX959S57H0WF59342XRW9DQRMZARZ6KNBRYM6XSY21WJV5E6EYYDYB40JVZ4NACPEJN4WPFR8GA3315CJ7KX2W47JBDVX0PJF6BJRKB3YXHCH0MYXK9YJHY7AX9B3RC4WQ0TW3AY9Q972256QTQ66EF9C0RF4V5179S7KVY5PW08DEG1M87FWD6NAHM162S6KCF727643DY5YJZ1458PFQW4TK1NBSBFXSA9EKCKPCKV7JAPMT9PBKZAWDZ5DW4JRP61BY5VQGES6VYP12C9CJF7E88NZM8BSPRWSNE2VK3EKV2B598PXJKZMHYNBJVRVJVQA820T5RMW794D0YM0NDJFW32TGGTGJS04002",
          age_mask: 0,
        },
        denomPubHash:
          "MN60X23HBJCAN85APDMS51NGZ8WT8Y0RDSSY606VG6CVMJWT84A8TFP7632WARDZVZ72YJKD221SMJYX74N0JR08HB87EMYB6T5NMCR",
        exchangeBaseUrl: "https://exchange.demo.taler.net/",
        exchangeMasterPub:
          "FH1Y8ZMHCTPQ0YFSZECDH8C9407JR3YN0MF1706PTG24Q4NEWGV0",
        feeDeposit: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeRefresh: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeRefund: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeWithdraw: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "ZQM2QAV670FRCJE71SXHZHNXZEBEG8RN583NEMZF4YDP1FX79QY95820JQHSS6JXH9RD5SH7C91K7XM7HEPSH52BPHVRB3SXANH3J2R",
        stampExpireDeposit: {
          t_s: 1882187402,
        },
        stampExpireLegal: {
          t_s: 2197547402,
        },
        stampExpireWithdraw: {
          t_s: 1724507402,
        },
        stampStart: {
          t_s: 1629899402,
        },
        verificationStatus: "unverified",
        value: {
          currency: "KUDOS",
          fraction: 0,
          value: 5,
        },
        listIssueDate: {
          t_s: 1629899402,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XTKRS0ABNDFTFSRMD0SRWZQ24FWD2DMZCEZVT83DS1TQS2XVW5K1CB9M6287YFTDG7QGBRWFMSK0K3W8X7YT2Y2DW7TAEC80708AP0MM8R5F13NV1MBPW4PY5191T00P59DB1K90RK5R8Z9W7DHE1F4ZXE68FG0NAVGZ6X6K5H94E59SHTFVGXZMG180Q2MEVFFS8NWRA32QK7M41QQFZ6G8BNRRVV2DHWGEH4DD1K91GXRP5V1PF3CJ217C066DGNFSREF7J650S9TXP9WAYC89HW5G6AGA27G202QWWXK3JVWB7W6D73Z9MQYYTE96FZ6CVJE27W0ZZBET9GN7BB01Z6MNSQF6FZAXW4J9Q7KN5C9EG9GRRSMWTTGX44TN0ZG9GX9CQ0QPTM7PRYENF9P3HX04002",
          age_mask: 0,
        },
        denomPubHash:
          "MZ59NEJF52NF5JW433H8QJSKT0HCBM42SY7W13HFMMP95Y3F9A86V05WTV2HSK1B7HNF50JZPV3FRJBBMXGH3EZZVQAED8XWR77B5E8",
        exchangeBaseUrl: "https://exchange.demo.taler.net/",
        exchangeMasterPub:
          "FH1Y8ZMHCTPQ0YFSZECDH8C9407JR3YN0MF1706PTG24Q4NEWGV0",
        feeDeposit: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeRefresh: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeRefund: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeWithdraw: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "MFZHZH9KT3TPZHSC2Y80XC94VAN7Y5V6BD440H17MCRHC51Y2N73A4R94H7268EN3ZYRR501SAP7PRBBXZKNTWM5788JAB501MRBT00",
        stampExpireDeposit: {
          t_s: 1890078239,
        },
        stampExpireLegal: {
          t_s: 2205438239,
        },
        stampExpireWithdraw: {
          t_s: 1732398239,
        },
        stampStart: {
          t_s: 1637790239,
        },
        verificationStatus: "unverified",
        value: {
          currency: "KUDOS",
          fraction: 0,
          value: 2,
        },
        listIssueDate: {
          t_s: 1629899402,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000Y6H6ZCAVGGBPKJ50CMM45EA9PY3AQT1QR73MRA04M24M18T8550MBEG8PF0WZ4VMZS2S3TG8KT6V9FFWFZ60SZW0KJ2RDNJG8ENWFMKN86VPVSJR13X6WZ2WE223TNKZMW0K6DX9Q466BG1ZEDMRW887CTEW5DSSS6XH8F55RWSPQ53871Q4X203FVAFAC0S1G7J4Q1PN9EGV8P0WHVD9D2Z66DJ9HY7VNZZA7230S1S0A3KE4NKDX69AFZPSN5G3B7MR2EJ8KHTZD4D2340FVQYNZ0VFSHV53T67FEKQY93E59M8RARV8KYEEJ5BC3KA573N0H6S6TB45CCWE3R17TZJXC36W3V89WBVFK8K4QDVV5BRW48A7ST04ENPZ5X2P606F954B7MSWV6ZM674ZEERS04002",
          age_mask: 0,
        },
        denomPubHash:
          "TKZ6NDCCYSFJ53N837M1YG1YHDWJR0SBQECX06A0BC257P093QAVNG5C3TPCPADMFF99YZNRF3V0EJBJRCDS3KVG6D59HQEANAPSVMG",
        exchangeBaseUrl: "https://exchange.demo.taler.net/",
        exchangeMasterPub:
          "FH1Y8ZMHCTPQ0YFSZECDH8C9407JR3YN0MF1706PTG24Q4NEWGV0",
        feeDeposit: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeRefresh: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeRefund: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeWithdraw: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "NMNKTT4S7QS1BGZT22EG4SS58QVV7YEAY4Z2WW06Y809C05C3135WDZX4WR53N07YJKE524D1M4R0HTASF8PXHB4T4142MKF0BVHR10",
        stampExpireDeposit: {
          t_s: 1882187402,
        },
        stampExpireLegal: {
          t_s: 2197547402,
        },
        stampExpireWithdraw: {
          t_s: 1724507402,
        },
        stampStart: {
          t_s: 1629899402,
        },
        verificationStatus: "unverified",
        value: {
          currency: "KUDOS",
          fraction: 10000000,
          value: 0,
        },
        listIssueDate: {
          t_s: 1629899402,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000Y5BMR6GMYVV83D6C3H7VPHKTF6CJ8YDSSR66SGSGG5E5FSE4AWQWPAY9RQQ31MYV10SBCCDMF27CJF50XWXS1GPFMP4WZYRHDMQBC5E1GFSMGN1HVCWCD8B87Y5ADM57AKVRPB6M0ATF2VF9ED9ESKNAGG2FSEPX8EPKG7T50K1Q6JWSHJCWPCJXT4MQEADFCT93KPJBRC7A4KV1F4NE6V3YBTABM53W0QTPDGX35SYYKSN0C22KEE2KXSQ7F72GXNJGQ50SKQTW0FG71QDY2Z8TNTCKGRF90KX3WM9NDG4GBZJEQ7A6T16T2GAZ713Q4WG689G5WGADDTVVVX8M0DENFXYE3AJ0JCD54W8XFRV6QNNHMT3ESZKS6B2MH1SMJDNRZE07SATJG2EKMPH8ZXC2RQ04002",
          age_mask: 0,
        },
        denomPubHash:
          "TQGVWH85SYHKHF1BPSFM1A23BAJAAMHA5BF500JB0F8JE7F7C4KHN7RK397M3Y68T8YWCHZTHSEDMF9VWC5371V8HP795HPWJEQEAGG",
        exchangeBaseUrl: "https://exchange.demo.taler.net/",
        exchangeMasterPub:
          "FH1Y8ZMHCTPQ0YFSZECDH8C9407JR3YN0MF1706PTG24Q4NEWGV0",
        feeDeposit: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeRefresh: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeRefund: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeWithdraw: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "B86BCGM4VDTHCJK9RVMB749K8XDGZD4YXX3PXT2SY0X4C55Q2202WAQ7DCF525MXBEWTMD4NJMN7X90GRZBHAB975J60095W26VJW0G",
        stampExpireDeposit: {
          t_s: 1882187402,
        },
        stampExpireLegal: {
          t_s: 2197547402,
        },
        stampExpireWithdraw: {
          t_s: 1724507402,
        },
        stampStart: {
          t_s: 1629899402,
        },
        verificationStatus: "unverified",
        value: {
          currency: "KUDOS",
          fraction: 0,
          value: 10,
        },
        listIssueDate: {
          t_s: 1629899402,
        },
      },
    ],
  },
  {
    exchangeBaseUrl: "https://exchange2.demo.taler.net/",
    currency: "KUDOS",
    tos: {
      currentVersion: "0",
      contentType: "text/plain",
      content:
        'Terms Of Service\n****************\n\nLast Updated: 09.06.2022\n\nWelcome! The ICE research center of the Bern University of Applied\nSciences in Switzerland (“we,” “our,” or “us”) provides an\nexperimental payment service through our Internet presence\n(collectively the “Services”). Before using our Services, please read\nthe Terms of Service (the “Terms” or the “Agreement”) carefully.\n\n\nThis is research\n================\n\nThis is a research experiment. Any funds wired to our Bitcoin address\nare considered a donation to our research group. We may use them to\nenable payments following the GNU Taler protocol, or simply keep them\nat our discretion.  The service is experimental and may also be\ndiscontinued at any time, in which case all remaining funds will\ndefinitively be kept by the research group.\n\n\nOverview\n========\n\nThis section provides a brief summary of the highlights of this\nAgreement. Please note that when you accept this Agreement, you are\naccepting all of the terms and conditions and not just this section.\nWe and possibly other third parties provide Internet services which\ninteract with the Taler Wallet’s self-hosted personal payment\napplication. When using the Taler Wallet to interact with our\nServices, you are agreeing to our Terms, so please read carefully.\n\n\nHighlights:\n-----------\n\n   * You are responsible for keeping the data in your Taler Wallet at\n     all times under your control. Any losses arising from you not\n     being in control of your private information are your problem.\n\n   * We may transfer funds we receive from our users to any legal\n     recipient to the best of our ability within the limitations of\n     the law and our implementation. However, the Services offered\n     today are highly experimental and the set of recipients of funds\n     is severely restricted. Again, we stress this is a research\n     experiment and technically all funds held by the exchange are\n     owned by the research group of the university.\n\n   * For our Services, we may charge transaction fees. The specific\n     fee structure is provided based on the Taler protocol and should\n     be shown to you when you withdraw electronic coins using a Taler\n     Wallet. You agree and understand that the Taler protocol allows\n     for the fee structure to change.\n\n   * You agree to not intentionally overwhelm our systems with\n     requests and follow responsible disclosure if you find security\n     issues in our services.\n\n   * We cannot be held accountable for our Services not being\n     available due to any circumstances. If we modify or terminate our\n     services, we may give you the opportunity to recover your funds.\n     However, given the experimental state of the Services today, this\n     may not be possible. You are strongly advised to limit your use\n     of the Service to small-scale experiments expecting total loss of\n     all funds.\n\nThese terms outline approved uses of our Services. The Services and\nthese Terms are still at an experimental stage. If you have any\nquestions or comments related to this Agreement, please send us a\nmessage to ice@bfh.ch. If you do not agree to this Agreement, you must\nnot use our Services.\n\n\nHow you accept this policy\n==========================\n\nBy sending funds to us (to top-up your Taler Wallet), you acknowledge\nthat you have read, understood, and agreed to these Terms. We reserve\nthe right to change these Terms at any time. If you disagree with the\nchange, we may in the future offer you with an easy option to recover\nyour unspent funds. However, in the current experimental period you\nacknowledge that this feature is not yet available, resulting in your\nfunds being lost unless you accept the new Terms. If you continue to\nuse our Services other than to recover your unspent funds, your\ncontinued use of our Services following any such change will signify\nyour acceptance to be bound by the then current Terms. Please check\nthe effective date above to determine if there have been any changes\nsince you have last reviewed these Terms.\n\n\nServices\n========\n\nWe will try to transfer funds that we receive from users to any legal\nrecipient to the best of our ability and within the limitations of the\nlaw. However, the Services offered today are highly experimental and\nthe set of recipients of funds is severely restricted.  The Taler\nWallet can be loaded by exchanging fiat or cryptocurrencies against\nelectronic coins. We are providing this exchange service. Once your\nTaler Wallet is loaded with electronic coins they can be spent for\npurchases if the seller is accepting Taler as a means of payment. We\nare not guaranteeing that any seller is accepting Taler at all or a\nparticular seller.  The seller or recipient of deposits of electronic\ncoins must specify the target account, as per the design of the Taler\nprotocol. They are responsible for following the protocol and\nspecifying the correct bank account, and are solely liable for any\nlosses that may arise from specifying the wrong account. We may allow\nthe government to link wire transfers to the underlying contract hash.\nIt is the responsibility of recipients to preserve the full contracts\nand to pay whatever taxes and charges may be applicable. Technical\nissues may lead to situations where we are unable to make transfers at\nall or lead to incorrect transfers that cannot be reversed. We may\nrefuse to execute transfers if the transfers are prohibited by a\ncompetent legal authority and we are ordered to do so.\n\nWhen using our Services, you agree to not take any action that\nintentionally imposes an unreasonable load on our infrastructure. If\nyou find security problems in our Services, you agree to first report\nthem to security@taler-systems.com and grant us the right to publish\nyour report. We warrant that we will ourselves publicly disclose any\nissues reported within 3 months, and that we will not prosecute anyone\nreporting security issues if they did not exploit the issue beyond a\nproof-of-concept, and followed the above responsible disclosure\npractice.\n\n\nFees\n====\n\nYou agree to pay the fees for exchanges and withdrawals completed via\nthe Taler Wallet ("Fees") as defined by us, which we may change from\ntime to time. With the exception of wire transfer fees, Taler\ntransaction fees are set for any electronic coin at the time of\nwithdrawal and fixed throughout the validity period of the respective\nelectronic coin. Your wallet should obtain and display applicable fees\nwhen withdrawing funds. Fees for coins obtained as change may differ\nfrom the fees applicable to the original coin. Wire transfer fees that\nare independent from electronic coins may change annually.  You\nauthorize us to charge or deduct applicable fees owed in connection\nwith deposits, exchanges and withdrawals following the rules of the\nTaler protocol. We reserve the right to provide different types of\nrewards to users either in the form of discount for our Services or in\nany other form at our discretion and without prior notice to you.\n\n\nEligibility and Financial self-responsibility\n=============================================\n\nTo be eligible to use our Services, you must be able to form legally\nbinding contracts or have the permission of your legal guardian. By\nusing our Services, you represent and warrant that you meet all\neligibility requirements that we outline in these Terms.\n\nYou will be responsible for maintaining the availability, integrity\nand confidentiality of the data stored in your wallet. When you setup\na Taler Wallet, you are strongly advised to follow the precautionary\nmeasures offered by the software to minimize the chances to losse\naccess to or control over your Wallet data. We will not be liable for\nany loss or damage arising from your failure to comply with this\nparagraph.\n\n\nCopyrights and trademarks\n=========================\n\nThe Taler Wallet is released under the terms of the GNU General Public\nLicense (GNU GPL). You have the right to access, use, and share the\nTaler Wallet, in modified or unmodified form. However, the GPL is a\nstrong copyleft license, which means that any derivative works must be\ndistributed under the same license terms as the original software. If\nyou have any questions, you should review the GNU GPL’s full terms and\nconditions at https://www.gnu.org/licenses/gpl-3.0.en.html.  “Taler”\nitself is a trademark of Taler Systems SA. You are welcome to use the\nname in relation to processing payments using the Taler protocol,\nassuming your use is compatible with an official release from the GNU\nProject that is not older than two years.\n\n\nLimitation of liability & disclaimer of warranties\n==================================================\n\nYou understand and agree that we have no control over, and no duty to\ntake any action regarding: Failures, disruptions, errors, or delays in\nprocessing that you may experience while using our Services; The risk\nof failure of hardware, software, and Internet connections; The risk\nof malicious software being introduced or found in the software\nunderlying the Taler Wallet; The risk that third parties may obtain\nunauthorized access to information stored within your Taler Wallet,\nincluding, but not limited to your Taler Wallet coins or backup\nencryption keys.  You release us from all liability related to any\nlosses, damages, or claims arising from:\n\n1. user error such as forgotten passwords, incorrectly constructed\n   transactions;\n\n2. server failure or data loss;\n\n3. unauthorized access to the Taler Wallet application;\n\n4. bugs or other errors in the Taler Wallet software; and\n\n5. any unauthorized third party activities, including, but not limited\n   to, the use of viruses, phishing, brute forcing, or other means of\n   attack against the Taler Wallet. We make no representations\n   concerning any Third Party Content contained in or accessed through\n   our Services.\n\nAny other terms, conditions, warranties, or representations associated\nwith such content, are solely between you and such organizations\nand/or individuals.\n\nTo the fullest extent permitted by applicable law, in no event will we\nor any of our officers, directors, representatives, agents, servants,\ncounsel, employees, consultants, lawyers, and other personnel\nauthorized to act, acting, or purporting to act on our behalf\n(collectively the “Taler Parties”) be liable to you under contract,\ntort, strict liability, negligence, or any other legal or equitable\ntheory, for:\n\n1. any lost profits, data loss, cost of procurement of substitute\n   goods or services, or direct, indirect, incidental, special,\n   punitive, compensatory, or consequential damages of any kind\n   whatsoever resulting from:\n\n   1. your use of, or conduct in connection with, our services;\n\n   2. any unauthorized use of your wallet and/or private key due to\n      your failure to maintain the confidentiality of your wallet;\n\n   3. any interruption or cessation of transmission to or from the\n      services; or\n\n   4. any bugs, viruses, trojan horses, or the like that are found in\n      the Taler Wallet software or that may be transmitted to or\n      through our services by any third party (regardless of the\n      source of origination), or\n\n2. any direct damages.\n\nThese limitations apply regardless of legal theory, whether based on\ntort, strict liability, breach of contract, breach of warranty, or any\nother legal theory, and whether or not we were advised of the\npossibility of such damages. Some jurisdictions do not allow the\nexclusion or limitation of liability for consequential or incidental\ndamages, so the above limitation may not apply to you.\n\nOur services are provided "as is" and without warranty of any kind. To\nthe maximum extent permitted by law, we disclaim all representations\nand warranties, express or implied, relating to the services and\nunderlying software or any content on the services, whether provided\nor owned by us or by any third party, including without limitation,\nwarranties of merchantability, fitness for a particular purpose,\ntitle, non-infringement, freedom from computer virus, and any implied\nwarranties arising from course of dealing, course of performance, or\nusage in trade, all of which are expressly disclaimed. In addition, we\ndo not represent or warrant that the content accessible via the\nservices is accurate, complete, available, current, free of viruses or\nother harmful components, or that the results of using the services\nwill meet your requirements. Some states do not allow the disclaimer\nof implied warranties, so the foregoing disclaimers may not apply to\nyou. This paragraph gives you specific legal rights and you may also\nhave other legal rights that vary from state to state.\n\n\nIndemnity and Time limitation on claims and Termination\n=======================================================\n\nTo the extent permitted by applicable law, you agree to defend,\nindemnify, and hold harmless the Taler Parties from and against any\nand all claims, damages, obligations, losses, liabilities, costs or\ndebt, and expenses (including, but not limited to, attorney’s fees)\narising from: (a) your use of and access to the Services; (b) any\nfeedback or submissions you provide to us concerning the Taler Wallet;\n(c) your violation of any term of this Agreement; or (d) your\nviolation of any law, rule, or regulation, or the rights of any third\nparty.\n\nYou agree that any claim you may have arising out of or related to\nyour relationship with us must be filed within one year after such\nclaim arises, otherwise, your claim in permanently barred.\n\nIn the event of termination concerning your use of our Services, your\nobligations under this Agreement will still continue.\n\n\nDiscontinuance of services and Force majeure\n============================================\n\nWe may, in our sole discretion and without cost to you, with or\nwithout prior notice, and at any time, modify or discontinue,\ntemporarily or permanently, any portion of our Services. We will use\nthe Taler protocol’s provisions to notify Wallets if our Services are\nto be discontinued. It is your responsibility to ensure that the Taler\nWallet is online at least once every three months to observe these\nnotifications. We shall not be held responsible or liable for any loss\nof funds in the event that we discontinue or depreciate the Services\nand your Taler Wallet fails to transfer out the coins within a three\nmonths notification period.\n\nWe shall not be held liable for any delays, failure in performance, or\ninterruptions of service which result directly or indirectly from any\ncause or condition beyond our reasonable control, including but not\nlimited to: any delay or failure due to any act of God, act of civil\nor military authorities, act of terrorism, civil disturbance, war,\nstrike or other labor dispute, fire, interruption in\ntelecommunications or Internet services or network provider services,\nfailure of equipment and/or software, other catastrophe, or any other\noccurrence which is beyond our reasonable control and shall not affect\nthe validity and enforceability of any remaining provisions.\n\n\nGoverning law, Waivers, Severability and Assignment\n===================================================\n\nNo matter where you’re located, the laws of Switzerland will govern\nthese Terms. If any provisions of these Terms are inconsistent with\nany applicable law, those provisions will be superseded or modified\nonly to the extent such provisions are inconsistent. The parties agree\nto submit to the ordinary courts in Bern, Switzerland for exclusive\njurisdiction of any dispute arising out of or related to your use of\nthe Services or your breach of these Terms.\n\nOur failure to exercise or delay in exercising any right, power, or\nprivilege under this Agreement shall not operate as a waiver; nor\nshall any single or partial exercise of any right, power, or privilege\npreclude any other or further exercise thereof.\n\nYou agree that we may assign any of our rights and/or transfer, sub-\ncontract, or delegate any of our obligations under these Terms.\n\nIf it turns out that any part of this Agreement is invalid, void, or\nfor any reason unenforceable, that term will be deemed severable and\nlimited or eliminated to the minimum extent necessary.\n\nThis Agreement sets forth the entire understanding and agreement as to\nthe subject matter hereof and supersedes any and all prior\ndiscussions, agreements, and understandings of any kind (including,\nwithout limitation, any prior versions of this Agreement) and every\nnature between us. Except as provided for above, any modification to\nthis Agreement must be in writing and must be signed by both parties.\n\n\nQuestions or comments\n=====================\n\nWe welcome comments, questions, concerns, or suggestions. Please send\nus a message on our contact page at legal@taler-systems.com.\n',
    },
    paytoUris: ["payto://x-taler-bank/bank.demo.taler.net/Exchange"],
    auditors: [],
    wireInfo: {
      accounts: [
        {
          payto_uri: "payto://x-taler-bank/bank.demo.taler.net/Exchange",
          master_sig:
            "FW34QNAQQHTXCQSD771EDHW5P9YT8T83CTN4SQJGXR8ZF8G4RFZDV8682G496J85R48DHQSQN72CEQE1K3BJFCQSR57VDECZ9JXCW10",
        },
      ],
      feesForType: {
        "x-taler-bank": [
          {
            closingFee: {
              currency: "KUDOS",
              fraction: 1000000,
              value: 0,
            },
            endStamp: {
              t_s: 1672531200,
            },
            sig: "6W58FM8MBK09KQSAE8QGGSDHFKPQ7014H3G3WXYF4CN059X97SQNNEA4H25HDZQ7146Y04EVZPRE34H3VB8WGTE9AXEPA7WYM637T30",
            startStamp: {
              t_s: 1640995200,
            },
            wireFee: {
              currency: "KUDOS",
              fraction: 1000000,
              value: 0,
            },
            wadFee: {
              currency: "KUDOS",
              fraction: 1000000,
              value: 0,
            },
          },
          {
            closingFee: {
              currency: "KUDOS",
              fraction: 1000000,
              value: 0,
            },
            endStamp: {
              t_s: 1704067200,
            },
            sig: "FGFMT9ZHT9YM688MZ04GD59W214NRGFY6JNZPC36KYY03DQ7P5T1HXW19Q4RK9J75AMA6W8ZPBSHN6A2B4S8GQ6FBHE4FBHXSC8MA2R",
            startStamp: {
              t_s: 1672531200,
            },
            wireFee: {
              currency: "KUDOS",
              fraction: 1000000,
              value: 0,
            },
            wadFee: {
              currency: "KUDOS",
              fraction: 1000000,
              value: 0,
            },
          },
          {
            closingFee: {
              currency: "KUDOS",
              fraction: 1000000,
              value: 0,
            },
            endStamp: {
              t_s: 1735689600,
            },
            sig: "V1F7CA67DS3XT4M88XC1DP98Y19ETCY1CSNRX6E0KZFZ21BQ8WR8P7EJHB930219GK3XGG9XQ4SHC76KMS1S2XXKN49FBK3HFE38Y00",
            startStamp: {
              t_s: 1704067200,
            },
            wireFee: {
              currency: "KUDOS",
              fraction: 1000000,
              value: 0,
            },
            wadFee: {
              currency: "KUDOS",
              fraction: 1000000,
              value: 0,
            },
          },
          {
            closingFee: {
              currency: "KUDOS",
              fraction: 1000000,
              value: 0,
            },
            endStamp: {
              t_s: 1767225600,
            },
            sig: "YQ1ATYAQ0CHZ38GHYC8D4WT6CJFKBNMZYXHVN1AGC5PHJHM0TZFHFS57R2YFNZMFERZB4HXXKKPP1WMHQKD1FMGE26QE0B0HNDV6P28",
            startStamp: {
              t_s: 1735689600,
            },
            wireFee: {
              currency: "KUDOS",
              fraction: 1000000,
              value: 0,
            },
            wadFee: {
              currency: "KUDOS",
              fraction: 1000000,
              value: 0,
            },
          },
          {
            closingFee: {
              currency: "KUDOS",
              fraction: 1000000,
              value: 0,
            },
            endStamp: {
              t_s: 1798761600,
            },
            sig: "58YMQM2W1PF1Q98TE1MKKAM5MWWGJB0SWZNR2CXZPMMYZX4J9PZV5HRNNW6K1942EB78N4324Z2NS5J30F8Y8VNFHCWRYVJ6W4N3400",
            startStamp: {
              t_s: 1767225600,
            },
            wireFee: {
              currency: "KUDOS",
              fraction: 1000000,
              value: 0,
            },
            wadFee: {
              currency: "KUDOS",
              fraction: 1000000,
              value: 0,
            },
          },
          {
            closingFee: {
              currency: "KUDOS",
              fraction: 1000000,
              value: 0,
            },
            endStamp: {
              t_s: 1830297600,
            },
            sig: "0XXNNRH5AHWCZPH0STE6KTTPXKYR1QSTWDMMJ657MAV5SCB7DAM01Y8BTXJWR2XSATAA5ZRVWE3HRK456F1NP8FADH7C4FQ87PZYP1G",
            startStamp: {
              t_s: 1798761600,
            },
            wireFee: {
              currency: "KUDOS",
              fraction: 1000000,
              value: 0,
            },
            wadFee: {
              currency: "KUDOS",
              fraction: 1000000,
              value: 0,
            },
          },
        ],
      },
    },
    denominations: [
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000Z2SH86VV11J3QT9E3R3MF41EDQX3R30CHC3HH1V5MECGBS9FEHDPXHT78YDQFGVMMEAX7TBYB6QJED2513G0REZWVA49EG149JEA8MGBYTTSCMTA3GF8QV3AKWQVXVXDEENKJG8738ZSMSG698Q55D3S6YR9BRA523GYQZ680VSJWRJW0CVR1WFBJTV143X9KV6WQ0YDN7PKSB3GFTZ4RR2JVWH21Z3RJYF2KFWHYKCG813X5TRYV96FS3YCZ2PFA70DPWGS09W2WM7GW35GTRBDKJ8EQYSMWJSDRESC81SZ3XC40YH9T894QNT7V5T0G38RSE7HMX1097V7V254RY8FYX4CH9SGWD5HKYE7Z2T0TK393ECSFZSBXPMG6YM2R644R75HPM1NT38T3P7QG87YV504002",
          age_mask: 0,
        },
        denomPubHash:
          "6BY86FJZK8GBWDZ9Z8GF2CDZVZW613F214AM96E9WMCK9064289K7PZZPFDKHK2BMPDTWRXXGKB2WXFCA280WMBRQEZAZ884C3R6VTG",
        exchangeBaseUrl: "https://exchange.demo.taler.net/",
        exchangeMasterPub:
          "FH1Y8ZMHCTPQ0YFSZECDH8C9407JR3YN0MF1706PTG24Q4NEWGV0",
        feeDeposit: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeRefresh: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeRefund: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeWithdraw: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "JEXTAP09WF04H63WSYAWRFEX2C9RPNZ1JDC7YTM1F6VGQV7G17MSFCP2KJQBPDCGYSGPMSZCWDE0P7AVDEDNH4HMJE3S4CR7JGZXT2G",
        stampExpireDeposit: {
          t_s: 1882187402,
        },
        stampExpireLegal: {
          t_s: 2197547402,
        },
        stampExpireWithdraw: {
          t_s: 1724507402,
        },
        stampStart: {
          t_s: 1629899402,
        },
        verificationStatus: "unverified",
        value: {
          currency: "KUDOS",
          fraction: 0,
          value: 1,
        },
        listIssueDate: {
          t_s: 1629899402,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000X1TJZYN5HGTJ3GHQ590B008BQ40JXCZMVZWZDVW41F478ZBXFKBME1S8YHNBPJQR2PYJ4XT8HHQM12M77TKNY2R3XN156P8DAF0D0B7MBT8QAB8T149BSSWQPXSYPKHCNKQXVVZGYE54JZYJG81F1VD7QNB8HEE6PMKMNJQWXJN7MPPJR779NR44W2E564M11MQWA1TAAAXPZYC0X3QC2427BJ83W4PR1ZJPSB3TYC4PV7D5FN89QB426WFBKG09WZBNTX683BGG06Y7S8720FC4KQBHA79ZVZTSEH4773SACBEC9W0D1MFMXFF2SB56HAFVZPJ42C3AG9PS57M1AAH8R6244WQ5STXJF7JZE7908C6PNSQS7RKW9M1K7HH29T2FF7SBVB2FPZ58BT19SKZ8FH04002",
          age_mask: 0,
        },
        denomPubHash:
          "ABR2QRJ2VQ4KDCNQ2NWVBSHCA0FECNHAMFPAH0Y4PJ23M14S8XKT8FNNKQ7THGXV1Q8QR8XQ411Z502N7WM1F579GCJJ89GAQQM2MZ8",
        exchangeBaseUrl: "https://exchange.demo.taler.net/",
        exchangeMasterPub:
          "FH1Y8ZMHCTPQ0YFSZECDH8C9407JR3YN0MF1706PTG24Q4NEWGV0",
        feeDeposit: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeRefresh: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeRefund: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeWithdraw: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "9A8BKYG6F8ZJHN7E93SJGR43FT08BPSBDB52MV4YDTYVWNW33RAWEK70V8AJR9CD26BSDZ1PGZZRWETWS4GN077SV2MPZ4981GXMM30",
        stampExpireDeposit: {
          t_s: 1890078239,
        },
        stampExpireLegal: {
          t_s: 2205438239,
        },
        stampExpireWithdraw: {
          t_s: 1732398239,
        },
        stampStart: {
          t_s: 1637790239,
        },
        verificationStatus: "unverified",
        value: {
          currency: "KUDOS",
          fraction: 0,
          value: 10,
        },
        listIssueDate: {
          t_s: 1629899402,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000Y1AHY7RA22DX698Q5ZNBF5T81RWPSNR7B9ZRA3Z8E9KF0FRHAR23H7PGE917GR4JZFXZ2H7CJKKT5F09YN3P9JG0XEDDGHJV2QXS2AQQ1HJRQTCBSXB7JTQX2FPRSEV4M8C6H62GYAXEZFKMRTN7J4NHXWR3J0DQH28EKKCR2Y0W21BTZFSSJFB9FNMRAN2PDHDSQBJH7G6V0NRBQ1ZBTTF2G2675EN2F7J2Q9Y0M89AXZZGF296QB63SXZ5GR4YZ3FNJEPJCVN6P78B03JSSFQV2XVMN9QVDWP53BWR6MX8ZYJNQ969DZNZ8AK7KEGJQ035VNWFG7CSY7A50GEJ8G6D60SGPYAN9YH2HSRA785C84W4TB0W7AJ8QWTSJESS1A3V5XC3FNQQ8B09A5QWD7R93H04002",
          age_mask: 0,
        },
        denomPubHash:
          "AYKKZ0HXDJVHEQBP1KSV32P8NF6R9CT9HXRF856WJMJZ8DBGGFPQZ731E28M09QMA5TPWQY7YDBVHH9TKAE3WG51HPM6BZS18ZA535G",
        exchangeBaseUrl: "https://exchange.demo.taler.net/",
        exchangeMasterPub:
          "FH1Y8ZMHCTPQ0YFSZECDH8C9407JR3YN0MF1706PTG24Q4NEWGV0",
        feeDeposit: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeRefresh: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeRefund: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeWithdraw: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "XSD7GF7SA65644P90E854JME4NS6YV528ZS1FS871RENBJA8YDG5D0CKAMYDY5TKJTMGFQG874GXTC73TWTABB435HPPAVPCV01NT0R",
        stampExpireDeposit: {
          t_s: 1882187402,
        },
        stampExpireLegal: {
          t_s: 2197547402,
        },
        stampExpireWithdraw: {
          t_s: 1724507402,
        },
        stampStart: {
          t_s: 1629899402,
        },
        verificationStatus: "unverified",
        value: {
          currency: "KUDOS",
          fraction: 0,
          value: 2,
        },
        listIssueDate: {
          t_s: 1629899402,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000X7C66AGY9XFH83G8K7N5MJ26VV17PYWWYZAVN77Q5W9YA5N21XME6XHZNC2V0HECH88DYYPHF1EY0GAYHYV1VF20VKZJNREA8NJ2AJQ5GGZGQGYYT59CWE4H02BV7Q821JEA91B097T0HQCZ1MAERSNGEDME6Z2P5FWEQK3448K5PRQQXE49F1BE3RX801BPTGVX3JPSZAB7QTPRBNTN50R1R9S48N4JMQGKTXE22WRHDPMACCSN6B09FDZ53Z0XY9MW4ZJ37QCNBA7V99J9TMYDT5ECYNCV00W0P6S09AN03RTF61KT98K4VDZR72XWHBSKGES6CHJZYRWK04MCX6BCDRQEPHAZHFXT5E0GKA5JSKBANRC2V1275MTDZDQJRAGN4MHM2ANNJD5HWP8QHZ2MXF04002",
          age_mask: 0,
        },
        denomPubHash:
          "B75WVKB7NVFEH9J4YK3RPRAFC4Y8WN9FH6FTES1NHMFZ90RTTSBY84AC4RKP66ERGGXN5H152PM91R8N6W872VKTFD70GGTA1RBAGPR",
        exchangeBaseUrl: "https://exchange.demo.taler.net/",
        exchangeMasterPub:
          "FH1Y8ZMHCTPQ0YFSZECDH8C9407JR3YN0MF1706PTG24Q4NEWGV0",
        feeDeposit: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeRefresh: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeRefund: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeWithdraw: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "M16G5X5V9VEJK3Z5DKZPHGKYA6F8NMENSZA0JNJ4JAVVS2DY73JHKRQV1Q48QGEZZZG42AKJNV3J1WSM9QCCED4R3KA6DBBBY2SRY2R",
        stampExpireDeposit: {
          t_s: 1890078239,
        },
        stampExpireLegal: {
          t_s: 2205438239,
        },
        stampExpireWithdraw: {
          t_s: 1732398239,
        },
        stampStart: {
          t_s: 1637790239,
        },
        verificationStatus: "unverified",
        value: {
          currency: "KUDOS",
          fraction: 0,
          value: 1,
        },
        listIssueDate: {
          t_s: 1629899402,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XVRQ0YDF0TBS1NCFZS86Y1W33A761WRNDYXYBETQWX7AJ7KNACHAYS20XAEBQPEKSWND9147HSR1HYBGXHPH6ZA8Y0P9R8TBZ4PESN4TW92BJ8J9M8XQC0742G7N69F6S76HBK1G58WQ1HGY000FMA70Z4NES5W50164TGJ3XKXV40ZRW2ME3JKX5AJ3C3BAZ917F29VA6WHHN7160F26XDJZ4KW6D84G3HZN6EYBE5ARP5J2B5RZ738EVZDZJR5AJYDPHVDQXTS53M5FC67AR3N1DANV6HBPTSCNSPGK18KQ7KBTQ2SVV6KFVNFD6G7HKW0K5QA3XPXB1N0E6G7FK4ABWZBHF73S7MRY1EQ6YFSG8NWK7G0739VM5FW16GAXS8YHEGQ2V9MJEVNN4CA471EX904002",
          age_mask: 0,
        },
        denomPubHash:
          "BB73X9JJF6XTJ6XHNABRTKQD99AQ8FFQ9VQY76PC2MS5E5APKDK4YHNNJSSKYYPK1C3JEZMPV6R6F2J1YFVX6KMTTRNFENDMS521TSG",
        exchangeBaseUrl: "https://exchange.demo.taler.net/",
        exchangeMasterPub:
          "FH1Y8ZMHCTPQ0YFSZECDH8C9407JR3YN0MF1706PTG24Q4NEWGV0",
        feeDeposit: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeRefresh: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeRefund: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeWithdraw: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "1GEJAA6GWN48NXWC0F7YKYV183G096XQ9EVG0KKTKGNXE1TE4SQ6XNBXWDJJ2A3D7X1TX4ENYW9Q6ME6B4A0CTXM2YNGYE4S7ABFR30",
        stampExpireDeposit: {
          t_s: 1890078239,
        },
        stampExpireLegal: {
          t_s: 2205438239,
        },
        stampExpireWithdraw: {
          t_s: 1732398239,
        },
        stampStart: {
          t_s: 1637790239,
        },
        verificationStatus: "unverified",
        value: {
          currency: "KUDOS",
          fraction: 0,
          value: 1000,
        },
        listIssueDate: {
          t_s: 1629899402,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000Z352JS6EBXGMKVHWHZFH580M3KR9QJQSK8RXS6R7DY7C5GC143RA3QSGA56Q83CQRPWHNN2A9SMTBQC1THY9X0D6NM5YVFGRQN8A7C9CKT1D5EWK20PH3YTQPH49HFRVCY6YFD5JVV2FABRJH6J43EX6FHAPFAV11WSCWET6MD6Z254MV2SPYVDVZFRJRB0T4CBVP9AGERN32AY04W1N4KVAEWR2DKH2EAACXNYF7ZJ1Q7KXTT2F0SHD5K8EC11RJ1BSXNCCCAFBQKE23QF49375XTNTVG9RK6X6FFWGK4PT1A8T25TZSAZFK8BQQB0KYACE2NGMPV6Y3VQKEAMJGQEJP52BRGNPC1H25EYRPKD5Q4M67YF7J1E266H3GSD358G6AV89YKGW8J94NMZB765APN04002",
          age_mask: 0,
        },
        denomPubHash:
          "CKDB1865J7972CAWX8HF7ZJ5VCNSBRF6WG0WWME6J7W7TEM4HK3P1XK64DCCHKDQNNVGBA0HE2QTX7QGMY0PP3SY671J8N183HT4FA0",
        exchangeBaseUrl: "https://exchange.demo.taler.net/",
        exchangeMasterPub:
          "FH1Y8ZMHCTPQ0YFSZECDH8C9407JR3YN0MF1706PTG24Q4NEWGV0",
        feeDeposit: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeRefresh: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeRefund: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeWithdraw: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "DD0E3Q9BMQXYBFPSFTDJW6HH2EKJ2PN4RPWAEX5QSVBCE26CX0WHZKZFAAEBHWFMCGMC4GZXM36EWNJGXV4FTR7E9JEKY7CNHFBZC00",
        stampExpireDeposit: {
          t_s: 1882187402,
        },
        stampExpireLegal: {
          t_s: 2197547402,
        },
        stampExpireWithdraw: {
          t_s: 1724507402,
        },
        stampStart: {
          t_s: 1629899402,
        },
        verificationStatus: "unverified",
        value: {
          currency: "KUDOS",
          fraction: 0,
          value: 1000,
        },
        listIssueDate: {
          t_s: 1629899402,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XWNVCB63AC0RMD0AB4PBP5GBMKKPP47PMEA4FYMATAAYFA49JPP0RV7KHN2272GG2WDM08FR9E8MKKKM62NVRCVPNGNACR2FR060JJD5CXRJE43W484PQJHYJ3Z6QQE8GK7RSBT80GDT64Y2XD7YCZ0BWB5MAVJGYVGGTA63APQF9X12KNSV4EV0SC926EDDC1JY04GGHHJ6CHQ2WBA5JB9KEJWP463T3CKT7RFFCFPV124YC6788EHM7B1Z4QQ2ERFZWD9RNZWPENM7WDMADY0AK9HB9PFHRGVY45RVS2M3NCW914X2PAS2JW1335GT4ZRX22Q8DGFXY0X4CFDDAP8PPTDFCNZ2JWVG7QPGAC1RVJZZBKB26TXV7A9K9NZC1S4PEGSE9A482VA26C914CK6MH04002",
          age_mask: 0,
        },
        denomPubHash:
          "DFPEPMM4G7DQXRSSJN5EFV9N5FA0CW0Z7H0TKJ39XAQVQFGJ241M3FBSC8362YCY82YQYDVNP4X56859C9V7XQ3DPDTVJBV1VRYH828",
        exchangeBaseUrl: "https://exchange.demo.taler.net/",
        exchangeMasterPub:
          "FH1Y8ZMHCTPQ0YFSZECDH8C9407JR3YN0MF1706PTG24Q4NEWGV0",
        feeDeposit: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeRefresh: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeRefund: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeWithdraw: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "J8XS7V10AXFD0CB05KN987JQGKHGENYQ5YDE9XSPDFCGPK62MXDZ5MBSC0NTG69AGQK3Q419ZGVHJ6W9ZNWR721HBYYYZ4X0H1CYA18",
        stampExpireDeposit: {
          t_s: 1890078239,
        },
        stampExpireLegal: {
          t_s: 2205438239,
        },
        stampExpireWithdraw: {
          t_s: 1732398239,
        },
        stampStart: {
          t_s: 1637790239,
        },
        verificationStatus: "unverified",
        value: {
          currency: "KUDOS",
          fraction: 10000000,
          value: 0,
        },
        listIssueDate: {
          t_s: 1629899402,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000Y3YT1REGPJ949VKG2TDASRMEX1F5GDMCTFSKASZK8A1NXEEBNFG1MVNCBJSNPQCREC4RDGVN24B5AG5GDA9JZ4HQ2VZGEZ27YQBEDT68VZ76K8SXDAS8BRVJY6HREXP7N7G75W5K6BHYTKP3MRS1F5HY3ZPMZE1M15KEKC507RSXZMR35W49S8X3VJTX9XVGWEHGBCCVC3PJZ8GZ93Z1B4BYYXGKN1DDCEFWVDW4GSBCH28N2M9K9R74GD6CG072F64QC2RKEA55ZVPD22HXKSH83VKPRA8BKKHFRVZKZCVZ80CNCNM8BKBC3XGKC4R2MDWAJH64XPBS8A1K0EKB38RNHJMH2TN6SE2WTHVEV4CC55XHH37GMPQ7HTGMQGNMYR53870KS0KVTK0J1EY102P36Z04002",
          age_mask: 0,
        },
        denomPubHash:
          "GVG9DHSMNZ02C3BD2KKWFRF0G2PVEPE7DRH8FHVK92JCDCS043RJF5NY04Q5AWPST5A4CAYE8WA0MJNV46ZXZJVR7J2CS7469KG19A0",
        exchangeBaseUrl: "https://exchange.demo.taler.net/",
        exchangeMasterPub:
          "FH1Y8ZMHCTPQ0YFSZECDH8C9407JR3YN0MF1706PTG24Q4NEWGV0",
        feeDeposit: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeRefresh: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeRefund: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeWithdraw: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "HWEXT58J3SST2JZVX1FPA3J76A3ZAHJBYPAEN6A2Y0YVF3P5MSAT0B1623EYHSZF27KVGZ7GM8WTX94JSWQDRNW3SKGS0CW4XEJEE20",
        stampExpireDeposit: {
          t_s: 1890078239,
        },
        stampExpireLegal: {
          t_s: 2205438239,
        },
        stampExpireWithdraw: {
          t_s: 1732398239,
        },
        stampStart: {
          t_s: 1637790239,
        },
        verificationStatus: "unverified",
        value: {
          currency: "KUDOS",
          fraction: 0,
          value: 5,
        },
        listIssueDate: {
          t_s: 1629899402,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000X8VQGFR2J9BZEQ9S8Q01R6A14KGDQMET0CHAHPDG5RSRB925P9BTBQ6BX959S57H0WF59342XRW9DQRMZARZ6KNBRYM6XSY21WJV5E6EYYDYB40JVZ4NACPEJN4WPFR8GA3315CJ7KX2W47JBDVX0PJF6BJRKB3YXHCH0MYXK9YJHY7AX9B3RC4WQ0TW3AY9Q972256QTQ66EF9C0RF4V5179S7KVY5PW08DEG1M87FWD6NAHM162S6KCF727643DY5YJZ1458PFQW4TK1NBSBFXSA9EKCKPCKV7JAPMT9PBKZAWDZ5DW4JRP61BY5VQGES6VYP12C9CJF7E88NZM8BSPRWSNE2VK3EKV2B598PXJKZMHYNBJVRVJVQA820T5RMW794D0YM0NDJFW32TGGTGJS04002",
          age_mask: 0,
        },
        denomPubHash:
          "MN60X23HBJCAN85APDMS51NGZ8WT8Y0RDSSY606VG6CVMJWT84A8TFP7632WARDZVZ72YJKD221SMJYX74N0JR08HB87EMYB6T5NMCR",
        exchangeBaseUrl: "https://exchange.demo.taler.net/",
        exchangeMasterPub:
          "FH1Y8ZMHCTPQ0YFSZECDH8C9407JR3YN0MF1706PTG24Q4NEWGV0",
        feeDeposit: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeRefresh: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeRefund: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeWithdraw: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "ZQM2QAV670FRCJE71SXHZHNXZEBEG8RN583NEMZF4YDP1FX79QY95820JQHSS6JXH9RD5SH7C91K7XM7HEPSH52BPHVRB3SXANH3J2R",
        stampExpireDeposit: {
          t_s: 1882187402,
        },
        stampExpireLegal: {
          t_s: 2197547402,
        },
        stampExpireWithdraw: {
          t_s: 1724507402,
        },
        stampStart: {
          t_s: 1629899402,
        },
        verificationStatus: "unverified",
        value: {
          currency: "KUDOS",
          fraction: 0,
          value: 5,
        },
        listIssueDate: {
          t_s: 1629899402,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000XTKRS0ABNDFTFSRMD0SRWZQ24FWD2DMZCEZVT83DS1TQS2XVW5K1CB9M6287YFTDG7QGBRWFMSK0K3W8X7YT2Y2DW7TAEC80708AP0MM8R5F13NV1MBPW4PY5191T00P59DB1K90RK5R8Z9W7DHE1F4ZXE68FG0NAVGZ6X6K5H94E59SHTFVGXZMG180Q2MEVFFS8NWRA32QK7M41QQFZ6G8BNRRVV2DHWGEH4DD1K91GXRP5V1PF3CJ217C066DGNFSREF7J650S9TXP9WAYC89HW5G6AGA27G202QWWXK3JVWB7W6D73Z9MQYYTE96FZ6CVJE27W0ZZBET9GN7BB01Z6MNSQF6FZAXW4J9Q7KN5C9EG9GRRSMWTTGX44TN0ZG9GX9CQ0QPTM7PRYENF9P3HX04002",
          age_mask: 0,
        },
        denomPubHash:
          "MZ59NEJF52NF5JW433H8QJSKT0HCBM42SY7W13HFMMP95Y3F9A86V05WTV2HSK1B7HNF50JZPV3FRJBBMXGH3EZZVQAED8XWR77B5E8",
        exchangeBaseUrl: "https://exchange.demo.taler.net/",
        exchangeMasterPub:
          "FH1Y8ZMHCTPQ0YFSZECDH8C9407JR3YN0MF1706PTG24Q4NEWGV0",
        feeDeposit: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeRefresh: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeRefund: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeWithdraw: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "MFZHZH9KT3TPZHSC2Y80XC94VAN7Y5V6BD440H17MCRHC51Y2N73A4R94H7268EN3ZYRR501SAP7PRBBXZKNTWM5788JAB501MRBT00",
        stampExpireDeposit: {
          t_s: 1890078239,
        },
        stampExpireLegal: {
          t_s: 2205438239,
        },
        stampExpireWithdraw: {
          t_s: 1732398239,
        },
        stampStart: {
          t_s: 1637790239,
        },
        verificationStatus: "unverified",
        value: {
          currency: "KUDOS",
          fraction: 0,
          value: 2,
        },
        listIssueDate: {
          t_s: 1629899402,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000Y6H6ZCAVGGBPKJ50CMM45EA9PY3AQT1QR73MRA04M24M18T8550MBEG8PF0WZ4VMZS2S3TG8KT6V9FFWFZ60SZW0KJ2RDNJG8ENWFMKN86VPVSJR13X6WZ2WE223TNKZMW0K6DX9Q466BG1ZEDMRW887CTEW5DSSS6XH8F55RWSPQ53871Q4X203FVAFAC0S1G7J4Q1PN9EGV8P0WHVD9D2Z66DJ9HY7VNZZA7230S1S0A3KE4NKDX69AFZPSN5G3B7MR2EJ8KHTZD4D2340FVQYNZ0VFSHV53T67FEKQY93E59M8RARV8KYEEJ5BC3KA573N0H6S6TB45CCWE3R17TZJXC36W3V89WBVFK8K4QDVV5BRW48A7ST04ENPZ5X2P606F954B7MSWV6ZM674ZEERS04002",
          age_mask: 0,
        },
        denomPubHash:
          "TKZ6NDCCYSFJ53N837M1YG1YHDWJR0SBQECX06A0BC257P093QAVNG5C3TPCPADMFF99YZNRF3V0EJBJRCDS3KVG6D59HQEANAPSVMG",
        exchangeBaseUrl: "https://exchange.demo.taler.net/",
        exchangeMasterPub:
          "FH1Y8ZMHCTPQ0YFSZECDH8C9407JR3YN0MF1706PTG24Q4NEWGV0",
        feeDeposit: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeRefresh: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeRefund: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeWithdraw: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "NMNKTT4S7QS1BGZT22EG4SS58QVV7YEAY4Z2WW06Y809C05C3135WDZX4WR53N07YJKE524D1M4R0HTASF8PXHB4T4142MKF0BVHR10",
        stampExpireDeposit: {
          t_s: 1882187402,
        },
        stampExpireLegal: {
          t_s: 2197547402,
        },
        stampExpireWithdraw: {
          t_s: 1724507402,
        },
        stampStart: {
          t_s: 1629899402,
        },
        verificationStatus: "unverified",
        value: {
          currency: "KUDOS",
          fraction: 10000000,
          value: 0,
        },
        listIssueDate: {
          t_s: 1629899402,
        },
      },
      {
        denomPub: {
          cipher: "RSA",
          rsa_public_key:
            "040000Y5BMR6GMYVV83D6C3H7VPHKTF6CJ8YDSSR66SGSGG5E5FSE4AWQWPAY9RQQ31MYV10SBCCDMF27CJF50XWXS1GPFMP4WZYRHDMQBC5E1GFSMGN1HVCWCD8B87Y5ADM57AKVRPB6M0ATF2VF9ED9ESKNAGG2FSEPX8EPKG7T50K1Q6JWSHJCWPCJXT4MQEADFCT93KPJBRC7A4KV1F4NE6V3YBTABM53W0QTPDGX35SYYKSN0C22KEE2KXSQ7F72GXNJGQ50SKQTW0FG71QDY2Z8TNTCKGRF90KX3WM9NDG4GBZJEQ7A6T16T2GAZ713Q4WG689G5WGADDTVVVX8M0DENFXYE3AJ0JCD54W8XFRV6QNNHMT3ESZKS6B2MH1SMJDNRZE07SATJG2EKMPH8ZXC2RQ04002",
          age_mask: 0,
        },
        denomPubHash:
          "TQGVWH85SYHKHF1BPSFM1A23BAJAAMHA5BF500JB0F8JE7F7C4KHN7RK397M3Y68T8YWCHZTHSEDMF9VWC5371V8HP795HPWJEQEAGG",
        exchangeBaseUrl: "https://exchange.demo.taler.net/",
        exchangeMasterPub:
          "FH1Y8ZMHCTPQ0YFSZECDH8C9407JR3YN0MF1706PTG24Q4NEWGV0",
        feeDeposit: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeRefresh: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeRefund: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        feeWithdraw: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
        isOffered: true,
        isRevoked: false,
        masterSig:
          "B86BCGM4VDTHCJK9RVMB749K8XDGZD4YXX3PXT2SY0X4C55Q2202WAQ7DCF525MXBEWTMD4NJMN7X90GRZBHAB975J60095W26VJW0G",
        stampExpireDeposit: {
          t_s: 1882187402,
        },
        stampExpireLegal: {
          t_s: 2197547402,
        },
        stampExpireWithdraw: {
          t_s: 1724507402,
        },
        stampStart: {
          t_s: 1629899402,
        },
        verificationStatus: "unverified",
        value: {
          currency: "KUDOS",
          fraction: 0,
          value: 10,
        },
        listIssueDate: {
          t_s: 1629899402,
        },
      },
    ],
  },
] as any;
