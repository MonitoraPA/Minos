/** 
 * This file is part of Minos
 *
 * Copyright (C) 2023 ebmaj7 <ebmaj7@proton.me>
 *
 * Minos is a hack. You can use it according to the terms and
 * conditions of the Hacking License (see licenses/HACK.txt)
 */ 

export const strings = {
	components: {
		topBar: {
			urlBox: "inserisci un indirizzo",
			button: {
				start: "Inizia",
				analyze: "Analizza",
				tooltip: "Inserisci un URL per proseguire"
			}
		},
		main: {
			title: "Minos",
			button: "Verifica sito web"
		},
		report: {
			label: "Il log della navigazione è stato salvato nel file: ",
			button: "Reclama al Garante",
			badHostsDetected: "Durante la navigazione sono stati individuati trasferimenti illeciti verso questi hosts:",
			noBadHostsDetected: "Non sono stati individuati trasferimenti illeciti durante la navigazione."
		}, 
		form: {
			title: 'Inserisci le informazioni necessarie per sporgere reclamo:',
			pages: [
				"Dati anagrafici",
				"Recapito",
				"Dichiaro che",
				"Firma e documento di identità"
			],
			fields: {
				name: { label: 'Nome', placeholder: 'Nome' },
				surname: { label: 'Cognome', placeholder: 'Cognome' },
				birthdate: { label: 'Data di nascita', placeholder: 'GG/MM/AAAA' },
				birthplace: { label: 'Luogo di nascita', placeholder: 'Luogo di nascita' },
				fisccode: { label: 'Codice Fiscale', placeholder: 'Codice fiscale' },
				address: { label: 'Residenza', placeholder: 'Residenza' },
				phone: {label: 'Telefono', placeholder: 'Telefono'},
				paddr: {label: 'Indirizzo', placeholder: 'Indirizzo'},
				email: {label: 'Email', placeholder: 'Email'},
				fax: {label: 'Fax', placeholder: 'Fax'},
				decl_1: {label: 'La Repubblica Italiana è lo stato membro in cui risiedo abitualmente'},
				decl_2: {label: 'La Repubblica Italiana è lo stato membro in cui lavoro'},
				decl_3: {label: 'La violazione si è verificata mentre ero fisicamente presente sul suolo della Repubblica Italiana'}
			},
			buttons: {
				next: "Avanti",
				prev: "Indietro"
			}
		}
	},
	err: {
		emptyField: "Riempi tutti i campi",
		invalidFiscCode: "Inserisci un codice fiscale valido",
		invalidBirthDate: "Inserisci una data di nascita valida",
		missingContact: "Seleziona almeno un recapito",
		invalidPhone: "Inserisci un numero di telefono valido",
		invalidEmail: "Inserisci un indirizzo email valido",
		invalidFax: "Inserisci un numero di fax valido",
		missingOption: "Seleziona almeno un'opzione"
	}
};