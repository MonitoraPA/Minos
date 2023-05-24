/** 
 * This file is part of Minos
 *
 * Copyright (C) 2023 ebmaj7 <ebmaj7@proton.me>
 *
 * Minos is a hack. You can use it according to the terms and
 * conditions of the Hacking License (see licenses/HACK.txt)
 */ 

/**
 * Portions of this file are Copyright (C) 2020 Andrea Cardaci <cyrus.and@gmail.com>
 * (see licenses/MIT.txt)
 */

const createHAR = () => {
    // HAR template
    const packageInfo = require('../package');
    const har = {
        log: {
            version: '1.2',
            creator: {
                name: 'Minos',
                version: packageInfo.version
            },
            pages: [],
            entries: []
        }
    };
	return har;
}

module.exports = createHAR;
