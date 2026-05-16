import { describe, it, expect, beforeEach } from "bun:test";
import { loadLocale, resetLocaleCache, esPatterns } from "../../../src/lib/locales";

beforeEach(() => {
	resetLocaleCache();
});

describe("Spanish locale patterns (merged with English defaults)", () => {
	it("loads Spanish locale without errors", () => {
		const patterns = loadLocale("es");
		expect(patterns).toBeDefined();
		expect(patterns.fieldPatterns).toBeDefined();
	});

	// Verify merged behaviour: English + Spanish patterns both match
	it("firstName matches English 'first name' AND Spanish 'nombre'", () => {
		const patterns = loadLocale("es");
		const firstName = patterns.fieldPatterns.firstName!;
		expect(firstName.some((p) => p.test("first name"))).toBe(true);
		expect(firstName.some((p) => p.test("nombre"))).toBe(true);
	});

	it("lastName matches English 'surname' AND Spanish 'apellido'", () => {
		const patterns = loadLocale("es");
		const lastName = patterns.fieldPatterns.lastName!;
		expect(lastName.some((p) => p.test("surname"))).toBe(true);
		expect(lastName.some((p) => p.test("apellido"))).toBe(true);
	});

	it("email matches English 'email' AND Spanish 'correo'", () => {
		const patterns = loadLocale("es");
		const email = patterns.fieldPatterns.email!;
		expect(email.some((p) => p.test("email"))).toBe(true);
		expect(email.some((p) => p.test("correo"))).toBe(true);
	});

	it("phone matches English 'phone' AND Spanish 'teléfono' AND 'celular'", () => {
		const patterns = loadLocale("es");
		const phone = patterns.fieldPatterns.phone!;
		expect(phone.some((p) => p.test("phone"))).toBe(true);
		expect(phone.some((p) => p.test("teléfono"))).toBe(true);
		expect(phone.some((p) => p.test("celular"))).toBe(true);
	});

	it("address matches English 'address' AND Spanish 'dirección'", () => {
		const patterns = loadLocale("es");
		const address = patterns.fieldPatterns.address!;
		expect(address.some((p) => p.test("address"))).toBe(true);
		expect(address.some((p) => p.test("dirección"))).toBe(true);
	});

	it("city matches English 'city' AND Spanish 'ciudad'", () => {
		const patterns = loadLocale("es");
		const city = patterns.fieldPatterns.city!;
		expect(city.some((p) => p.test("city"))).toBe(true);
		expect(city.some((p) => p.test("ciudad"))).toBe(true);
	});

	it("state matches English 'state' AND Spanish 'provincia' AND 'estado'", () => {
		const patterns = loadLocale("es");
		const state = patterns.fieldPatterns.state!;
		expect(state.some((p) => p.test("state"))).toBe(true);
		expect(state.some((p) => p.test("provincia"))).toBe(true);
		expect(state.some((p) => p.test("estado"))).toBe(true);
	});

	it("country matches English 'country' AND Spanish 'país'", () => {
		const patterns = loadLocale("es");
		const country = patterns.fieldPatterns.country!;
		expect(country.some((p) => p.test("country"))).toBe(true);
		expect(country.some((p) => p.test("país"))).toBe(true);
	});

	it("zipCode matches English 'zip' AND Spanish 'cp' AND 'código postal'", () => {
		const patterns = loadLocale("es");
		const zip = patterns.fieldPatterns.zipCode!;
		expect(zip.some((p) => p.test("zip"))).toBe(true);
		expect(zip.some((p) => p.test("cp"))).toBe(true);
		// "código postal" as a phrase
		expect(zip.some((p) => p.test("código postal"))).toBe(true);
	});

	it("company matches English 'company' AND Spanish 'empresa'", () => {
		const patterns = loadLocale("es");
		const company = patterns.fieldPatterns.company!;
		expect(company.some((p) => p.test("company"))).toBe(true);
		expect(company.some((p) => p.test("empresa"))).toBe(true);
	});

	it("username matches English 'username' AND Spanish 'usuario'", () => {
		const patterns = loadLocale("es");
		const username = patterns.fieldPatterns.username!;
		expect(username.some((p) => p.test("username"))).toBe(true);
		expect(username.some((p) => p.test("usuario"))).toBe(true);
	});

	it("password matches English 'password' AND Spanish 'contraseña' AND 'clave'", () => {
		const patterns = loadLocale("es");
		const password = patterns.fieldPatterns.password!;
		expect(password.some((p) => p.test("password"))).toBe(true);
		expect(password.some((p) => p.test("contraseña"))).toBe(true);
		expect(password.some((p) => p.test("clave"))).toBe(true);
	});

	it("date matches English 'date' AND Spanish 'fecha' AND 'nacimiento'", () => {
		const patterns = loadLocale("es");
		const date = patterns.fieldPatterns.date!;
		expect(date.some((p) => p.test("date"))).toBe(true);
		expect(date.some((p) => p.test("fecha"))).toBe(true);
		expect(date.some((p) => p.test("nacimiento"))).toBe(true);
	});

	it("age matches English 'age' AND Spanish 'edad'", () => {
		const patterns = loadLocale("es");
		const age = patterns.fieldPatterns.age!;
		expect(age.some((p) => p.test("age"))).toBe(true);
		expect(age.some((p) => p.test("edad"))).toBe(true);
	});

	it("number matches English 'number' AND Spanish 'monto' AND 'cantidad'", () => {
		const patterns = loadLocale("es");
		const num = patterns.fieldPatterns.number!;
		expect(num.some((p) => p.test("number"))).toBe(true);
		expect(num.some((p) => p.test("monto"))).toBe(true);
		expect(num.some((p) => p.test("cantidad"))).toBe(true);
	});

	// Confirm patterns: English + Spanish
	it("confirmPatterns includes English AND Spanish patterns", () => {
		const patterns = loadLocale("es");
		expect(patterns.confirmPatterns.some((p) => p.test("confirm"))).toBe(true);
		expect(patterns.confirmPatterns.some((p) => p.test("confirmar"))).toBe(true);
		expect(patterns.confirmPatterns.some((p) => p.test("repeat"))).toBe(true);
		expect(patterns.confirmPatterns.some((p) => p.test("verify"))).toBe(true);
		expect(patterns.confirmPatterns.some((p) => p.test("retype"))).toBe(true);
	});

	// Override-only contract: only field types with Spanish-specific patterns
	// should have additional entries. Verify 'primer' is in firstName
	it("firstName includes 'primer' from Spanish", () => {
		const patterns = loadLocale("es");
		expect(
			patterns.fieldPatterns.firstName!.some((p) => p.test("primer")),
		).toBe(true);
	});
});
