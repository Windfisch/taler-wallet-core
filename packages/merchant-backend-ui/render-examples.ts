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

import mustache from "mustache";
import fs from "fs";
import { format, formatDuration, intervalToDuration } from "date-fns";

/**
 * This script will emulate what the merchant backend will do when being requested
 * 
*/

const sourceDirectory = process.argv[2]
const destDirectory = process.argv[3]

if (!sourceDirectory || !destDirectory) {
	console.log('usage: render-mustache <source-directory> <dest-directory>')
	process.exit(1);
}

if (!fs.existsSync(destDirectory)) {
	fs.mkdirSync(destDirectory);
}

/**
 * Load all the html files
 */
const files = fs.readdirSync(sourceDirectory).filter(f => /.html/.test(f))

files.forEach(file => {
	const html = fs.readFileSync(`${sourceDirectory}/${file}`, 'utf8')

	const testName = file.replace('.html', '')
	if (testName !== 'ShowOrderDetails') return;
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const { exampleData } = require(`./src/pages/${testName}.examples`)

	Object.keys(exampleData).forEach(exampleName => {
		const example = exampleData[exampleName]

		//enhance the example with more information
		example.contract_terms_json = () => JSON.stringify(example.contract_terms);
		example.contract_terms.timestamp_str = () => example.contract_terms.timestamp && format(example.contract_terms.timestamp.t_s, 'dd MMM yyyy HH:mm:ss');

		example.contract_terms.hasProducts = () => example.contract_terms.products?.length > 0;
		example.contract_terms.hasAuditors = () => example.contract_terms.auditors?.length > 0;
		example.contract_terms.hasExchanges = () => example.contract_terms.exchanges?.length > 0;

		example.contract_terms.products.forEach(p => {
			p.delivery_date_str = () => p.delivery_date && format(p.delivery_date.t_s, 'dd MM yyyy HH:mm:ss')
			p.hasTaxes = () => p.taxes?.length > 0
		})
		example.contract_terms.has_delivery_info = () => example.contract_terms.delivery_date || example.contract_terms.delivery_location

		example.contract_terms.delivery_date_str = () => example.contract_terms.delivery_date && format(example.contract_terms.delivery_date.t_s, 'dd MM yyyy HH:mm:ss')
		example.contract_terms.pay_deadline_str = () => example.contract_terms.pay_deadline && format(example.contract_terms.pay_deadline.t_s, 'dd MM yyyy HH:mm:ss')
		example.contract_terms.wire_transfer_deadline_str = () => example.contract_terms.wire_transfer_deadline && format(example.contract_terms.wire_transfer_deadline.t_s, 'dd MM yyyy HH:mm:ss')
		example.contract_terms.refund_deadline_str = () => example.contract_terms.refund_deadline && format(example.contract_terms.refund_deadline.t_s, 'dd MM yyyy HH:mm:ss')
		example.contract_terms.auto_refund_str = () => example.contract_terms.auto_refund && formatDuration(intervalToDuration({ start: 0, end: example.contract_terms.auto_refund.d_us }))

		const output = mustache.render(html, example);

		fs.writeFileSync(`${destDirectory}/${testName}.${exampleName}.html`, output)
	})
})
