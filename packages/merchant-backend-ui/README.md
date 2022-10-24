Merchant Backend pages

# Description

This project generate 5 templates for the merchant backend:

 * DepletedTip
 * OfferRefund
 * OfferTip
 * RequestPayment
 * ShowOrderDetails

This pages are to be serve from the merchant-backend service and will be queried for browser that may or may not have javascript enabled, so we are going to do server side rendering.
The merchant-backend service is currently supporting mustache library for server side rendering. 
We also want the be able to create a more interactive design if the browser have javascript enabled, so the pages will be serve with all the infromation in the html but also in javascript.

In this scenario, we are using jsx to build the template of the page that will be build-time rendered into the mustache template. This template can the be deployed into a merchant-backend that will complete the information before send it to the browser.

# Building

The building process can be executed with `pnpm build`

# Testing

This project is using a javascript implementation of mustache that can be executed with the command `pnpm render-examples`.
This script will take the pages previously built in `dist/pages` directory and the examples definition in the `src/pages/[exampleName].examples.ts` files and render a to-be-sent-to-the-user page like the merchant would do.
This examples will be saved invidivualy into directory `dist/examples` and should be opened with your testing browser.
Testing should be done with javascript enabled and javascript disabled, both should look ok. 


