import { describe, it, expect, beforeEach } from "bun:test";
import {
	loadLocale,
	resetLocaleCache,
	defaultPatterns,
} from "../../../src/lib/locales";

beforeEach(() => {
	resetLocaleCache();
});

describe("default (English) locale patterns", () => {
	it("loads all 18 field types", () => {
		const patterns = loadLocale("en");
		const fieldTypes = Object.keys(patterns.fieldPatterns);
		expect(fieldTypes.length).toBe(18);
	});

	it("has confirmPatterns with English confirm keywords", () => {
		const patterns = loadLocale("en");
		expect(patterns.confirmPatterns).toBeDefined();
		expect(patterns.confirmPatterns.length).toBeGreaterThanOrEqual(4);
	});

	// -- firstName --
	it("firstName matches 'first name'", () => {
		const patterns = loadLocale("en");
		const firstNamePatterns = patterns.fieldPatterns.firstName!;
		expect(firstNamePatterns.some((p) => p.test("first name"))).toBe(true);
	});

	it("firstName matches 'fname'", () => {
		const patterns = loadLocale("en");
		expect(patterns.fieldPatterns.firstName!.some((p) => p.test("fname"))).toBe(
			true,
		);
	});

	it("firstName matches standalone 'Name'", () => {
		const patterns = loadLocale("en");
		expect(patterns.fieldPatterns.firstName!.some((p) => p.test("Name"))).toBe(
			true,
		);
	});

	it("firstName does NOT match 'nombre' (Spanish only)", () => {
		const patterns = loadLocale("en");
		expect(
			patterns.fieldPatterns.firstName!.some((p) => p.test("nombre")),
		).toBe(false);
	});

	// -- lastName --
	it("lastName matches 'last name'", () => {
		const patterns = loadLocale("en");
		expect(
			patterns.fieldPatterns.lastName!.some((p) => p.test("last name")),
		).toBe(true);
	});

	it("lastName matches 'surname'", () => {
		const patterns = loadLocale("en");
		expect(patterns.fieldPatterns.lastName!.some((p) => p.test("surname"))).toBe(
			true,
		);
	});

	it("lastName does NOT match 'apellido' (Spanish only)", () => {
		const patterns = loadLocale("en");
		expect(
			patterns.fieldPatterns.lastName!.some((p) => p.test("apellido")),
		).toBe(false);
	});

	// -- name --
	it("name matches 'name'", () => {
		const patterns = loadLocale("en");
		expect(patterns.fieldPatterns.name!.some((p) => p.test("name"))).toBe(true);
	});

	it("name matches 'full name'", () => {
		const patterns = loadLocale("en");
		expect(
			patterns.fieldPatterns.name!.some((p) => p.test("full name")),
		).toBe(true);
	});

	it("name does NOT match inside 'username' (no word boundary)", () => {
		const patterns = loadLocale("en");
		expect(
			patterns.fieldPatterns.name!.some((p) => p.test("username")),
		).toBe(false);
	});

	// -- email --
	it("email matches 'email'", () => {
		const patterns = loadLocale("en");
		expect(patterns.fieldPatterns.email!.some((p) => p.test("email"))).toBe(
			true,
		);
	});

	it("email does NOT match 'correo' (Spanish only)", () => {
		const patterns = loadLocale("en");
		expect(patterns.fieldPatterns.email!.some((p) => p.test("correo"))).toBe(
			false,
		);
	});

	// -- phone --
	it("phone matches 'phone'", () => {
		const patterns = loadLocale("en");
		expect(patterns.fieldPatterns.phone!.some((p) => p.test("phone"))).toBe(
			true,
		);
	});

	it("phone matches 'mobile'", () => {
		const patterns = loadLocale("en");
		expect(patterns.fieldPatterns.phone!.some((p) => p.test("mobile"))).toBe(
			true,
		);
	});

	it("phone does NOT match 'telefono' (Spanish only)", () => {
		const patterns = loadLocale("en");
		expect(
			patterns.fieldPatterns.phone!.some((p) => p.test("telefono")),
		).toBe(false);
	});

	// -- address --
	it("address matches 'address'", () => {
		const patterns = loadLocale("en");
		expect(
			patterns.fieldPatterns.address!.some((p) => p.test("address")),
		).toBe(true);
	});

	it("address matches 'street'", () => {
		const patterns = loadLocale("en");
		expect(patterns.fieldPatterns.address!.some((p) => p.test("street"))).toBe(
			true,
		);
	});

	it("address does NOT match 'dirección' (Spanish only)", () => {
		const patterns = loadLocale("en");
		expect(
			patterns.fieldPatterns.address!.some((p) => p.test("dirección")),
		).toBe(false);
	});

	// -- city --
	it("city matches 'city'", () => {
		const patterns = loadLocale("en");
		expect(patterns.fieldPatterns.city!.some((p) => p.test("city"))).toBe(true);
	});

	// -- state --
	it("state matches 'state'", () => {
		const patterns = loadLocale("en");
		expect(patterns.fieldPatterns.state!.some((p) => p.test("state"))).toBe(
			true,
		);
	});

	// -- country --
	it("country matches 'country'", () => {
		const patterns = loadLocale("en");
		expect(
			patterns.fieldPatterns.country!.some((p) => p.test("country")),
		).toBe(true);
	});

	// -- zipCode --
	it("zipCode matches 'zip'", () => {
		const patterns = loadLocale("en");
		expect(patterns.fieldPatterns.zipCode!.some((p) => p.test("zip"))).toBe(
			true,
		);
	});

	it("zipCode matches 'postal'", () => {
		const patterns = loadLocale("en");
		expect(
			patterns.fieldPatterns.zipCode!.some((p) => p.test("postal")),
		).toBe(true);
	});

	// -- company --
	it("company matches 'company'", () => {
		const patterns = loadLocale("en");
		expect(
			patterns.fieldPatterns.company!.some((p) => p.test("company")),
		).toBe(true);
	});

	it("company matches 'organization'", () => {
		const patterns = loadLocale("en");
		expect(
			patterns.fieldPatterns.company!.some((p) => p.test("organization")),
		).toBe(true);
	});

	it("company does NOT match 'empresa' (Spanish only)", () => {
		const patterns = loadLocale("en");
		expect(
			patterns.fieldPatterns.company!.some((p) => p.test("empresa")),
		).toBe(false);
	});

	// -- username --
	it("username matches 'username'", () => {
		const patterns = loadLocale("en");
		expect(
			patterns.fieldPatterns.username!.some((p) => p.test("username")),
		).toBe(true);
	});

	it("username matches 'login'", () => {
		const patterns = loadLocale("en");
		expect(patterns.fieldPatterns.username!.some((p) => p.test("login"))).toBe(
			true,
		);
	});

	// -- password --
	it("password matches 'password'", () => {
		const patterns = loadLocale("en");
		expect(
			patterns.fieldPatterns.password!.some((p) => p.test("password")),
		).toBe(true);
	});

	it("password does NOT match 'contraseña' (Spanish only)", () => {
		const patterns = loadLocale("en");
		expect(
			patterns.fieldPatterns.password!.some((p) => p.test("contraseña")),
		).toBe(false);
	});

	// -- date --
	it("date matches 'date'", () => {
		const patterns = loadLocale("en");
		expect(patterns.fieldPatterns.date!.some((p) => p.test("date"))).toBe(true);
	});

	it("date matches 'dob'", () => {
		const patterns = loadLocale("en");
		expect(patterns.fieldPatterns.date!.some((p) => p.test("dob"))).toBe(true);
	});

	it("date matches 'birthday'", () => {
		const patterns = loadLocale("en");
		expect(
			patterns.fieldPatterns.date!.some((p) => p.test("birthday")),
		).toBe(true);
	});

	// -- age --
	it("age matches 'age'", () => {
		const patterns = loadLocale("en");
		expect(patterns.fieldPatterns.age!.some((p) => p.test("age"))).toBe(true);
	});

	// -- number --
	it("number matches 'number'", () => {
		const patterns = loadLocale("en");
		expect(
			patterns.fieldPatterns.number!.some((p) => p.test("number")),
		).toBe(true);
	});

	it("number matches 'amount'", () => {
		const patterns = loadLocale("en");
		expect(
			patterns.fieldPatterns.number!.some((p) => p.test("amount")),
		).toBe(true);
	});

	it("number does NOT match 'monto' (Spanish only)", () => {
		const patterns = loadLocale("en");
		expect(
			patterns.fieldPatterns.number!.some((p) => p.test("monto")),
		).toBe(false);
	});

	// -- English confirm patterns --
	it("confirmPatterns matches 'confirm'", () => {
		const patterns = loadLocale("en");
		expect(patterns.confirmPatterns.some((p) => p.test("confirm"))).toBe(true);
	});

	it("confirmPatterns matches 'repeat'", () => {
		const patterns = loadLocale("en");
		expect(patterns.confirmPatterns.some((p) => p.test("repeat"))).toBe(true);
	});

	it("confirmPatterns does NOT match 'confirmar' (Spanish only)", () => {
		const patterns = loadLocale("en");
		expect(
			patterns.confirmPatterns.some((p) => p.test("confirmar")),
		).toBe(false);
	});

	// -- loadLocale without param (falls back to en for empty lang) --
	it("loadLocale() without param returns English patterns", () => {
		// When document.documentElement.lang is empty, detectPageLocale returns "en"
		const patterns = loadLocale();
		expect(
			patterns.fieldPatterns.email!.some((p) => p.test("email")),
		).toBe(true);
	});

	// -- defaultPatterns export matches loadLocale("en") --
	it("exported defaultPatterns matches loadLocale('en')", () => {
		const loaded = loadLocale("en");
		expect(defaultPatterns.fieldPatterns.email).toEqual(
			loaded.fieldPatterns.email,
		);
	});
});
