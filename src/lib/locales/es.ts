/**
 * Spanish overrides for field patterns.
 * Only lists patterns that differ from English defaults.
 * Merge concatenates these arrays with the English defaults at load time.
 */
export const esPatterns = {
	fieldPatterns: {
		firstName: [/\bnombre\b/i, /\bprimer\b/i],
		lastName: [/\bapellidos?\b/i],
		email: [/\bcorreo\b/i],
		phone: [/\btel[eé]?fono?\b/i, /\bcel(?:ular)?\b/i],
		address: [/\bdirecci[oó]n\b/i, /\bdomicilio\b/i, /\bcalle\b/i],
		city: [/\bciudad\b/i, /\bpoblaci[oó]n\b/i, /\bmunicipio\b/i],
		state: [/\bprovincia\b/i, /\bestado\b/i, /\bregi[oó]n\b/i],
		country: [/\bpa[ií]s\b/i, /\bnacionalidad\b/i],
		zipCode: [/\bcp\b/i, /\bcep\b/i, /\bc[oó]digo(?:\s*postal)?\b/i],
		company: [/\bempresa\b/i, /\bnegocio\b/i],
		username: [/\busuario\b/i],
		password: [/\bcontrase[nñ]a\b/i, /\bclave\b/i],
		date: [/\bfecha\b/i, /\bnacimiento\b/i],
		age: [/\bedad\b/i],
		number: [/\bmonto\b/i, /\bcantidad\b/i, /\bcant\b/i],
	},
	confirmPatterns: [/\bconfirmar\b/i],
};
