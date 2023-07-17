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
				"Dichiara che",
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
				declarations: [
					'La Repubblica Italiana è lo Stato membro in cui risiede abitualmente',
					'La Repubblica Italiana è lo Stato membro in cui lavora',
					'La violazione si è verificata mentre era fisicamente presente sul suolo della Repubblica Italiana'
				],
				signature_1 : {label: 'Firma autografa'},
				signature_2 : {label: 'Firmerò digitalmente il reclamo'},
				data_controller: {label: 'Estremi identificativi del titolare del trattamento', placeholder: 'Estremi identificativi del titolare del trattamento', infobox: 'Gli estremi identificativi del titolare dovrebbero essere di norma disponibili in rete. Puoi provare ad effettuare una ricerca con un motore di ricerca inserendo come query: "titolare trattamento dati" oppure "privacy policy" seguito dal nome dell\'host individuato. Ricorda di inserire'},
				data_responsible: {label: 'Estremi identificativi del responsabile del trattamento (se conosciuto)', placeholder: 'Estremi identificativi del responsabile del trattamento (se conosciuto)', infobox: 'Gli estremi identificativi del responsabile non sono sempre di facile individuazione. Puoi provare ad effettuare una ricerca con un motore di ricerca inserendo come query: "responsabile trattamento dati" oppure "privacy policy" seguito dal nome dell\'host individuato.'},
			},
			buttons: {
				next: "Avanti",
				prev: "Indietro",
				submit: "Genera il reclamo",
				signature: "Carica foto della firma",
				idphoto: "Carica documento di identità fronte/retro"
			},
			labels: {
				missingFile: 'Nessun file selezionato'
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
		missingOption: "Seleziona almeno un'opzione",
		missingData: "Completa il form con i dati mancanti",
		missingDataController: "Inserisci gli estremi del titolare",
		missingSignature: "Carica una foto della firma autografa",
		missingIDCard: "Carica una foto del documento di identità fronte/retro"
	}
};