/** 
 * This file is part of Minos
 *
 * Copyright (C) 2023 ebmaj7 <ebmaj7@proton.me>
 *
 * Minos is a hack. You can use it according to the terms and
 * conditions of the Hacking License (see licenses/HACK.txt)
 */ 

const PDF = require('pdfkit');
const path = require('path');
const document = require(path.join(__dirname, '../../assets/document.json'));
const fs = require('fs');

const textOptions = { align: 'justify' };
const indent = 15;
const imgOffset = 20;

exports.createDocument = (path, data) => {
	const doc = new PDF({font: 'Times-Roman'});

	const date = new Date(Date.now());
	const locale = 'it-IT';
	const dateString = date.toLocaleDateString(locale, {})

	doc.pipe(fs.createWriteStream(path));

	doc.fontSize(11);

	doc.text(document.address[0], { align: 'right' });
	doc.text(document.address[1], { align: 'right' });
	doc.text(document.address[2], { align: 'right' });

	doc.moveDown();
	doc.font('Times-Bold').text(document.title, textOptions);

	doc.moveDown();

	const generalities = document.generalities
		.replace('%name%', data.name + " " + data.surname)
		.replace('%birthplace%', data.birthplace)
		.replace('%birthdate%', data.birthdate)
		.replace('%address%', data.address)
		.replace('%fisccode%', data.fisccode)
		.replace('%delivery%', data.delivery);

	doc.font('Times-Roman').text(generalities, textOptions);

	doc.moveDown();
	doc.text('a) ' + data.declarations.join(';') + ';', doc.x + indent, doc.y);
	doc.moveDown();
	doc.text('b) ' + document.data_controller_label + ": " + data.data_controller + ';', textOptions);
	doc.moveDown();
	doc.text('c) ' + document.data_responsible_label + ": " + data.data_responsible + ';', textOptions);
	doc.moveDown();
	const facts = document.facts
		.replace('%date%', dateString)
		.replace('%website%', data.website)
		.replace('%badhosts%', data.badhosts.join(', '));
	doc.text('d) ' + facts, textOptions);
	doc.moveDown();
	doc.text('e) ' + document.regulation, textOptions);
	doc.moveDown();

	doc.text(document.pre_request + ":", doc.x - indent, doc.y, textOptions);

	doc.moveDown();
	doc.font('Times-Bold').text(document.request_label, { align: 'center' });
	doc.moveDown();
	doc.font('Times-Roman').text(document.request.replace('%data-controller%', data.data_controller) + ':', textOptions);
	doc.moveDown();

	// set indentation
	doc.text('', doc.x + indent, doc.y);
	for(const req of document.specific_requests){
		doc.text(req + ';', textOptions);
		doc.moveDown();
	}

	doc.text(document.attachments_label + ':', doc.x - indent, doc.y, textOptions);
	doc.moveDown();

	doc.text('1) ' + data.attachment, textOptions);
	doc.moveDown();

	doc.text(document.date, { align: 'left', continued: true }).text(document.signature, { align: 'right' });
	doc.text(dateString);

	doc.addPage().text('Documento di identità:');
	doc.image(data.idcard, doc.page.margins.left, doc.page.margins.top + imgOffset, { fit: [doc.page.width - (doc.page.margins.left + doc.page.margins.right), doc.page.height - (imgOffset + doc.page.margins.top + doc.page.margins.bottom)] });

	doc.end();
}