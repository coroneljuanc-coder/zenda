import { describe, expect, it } from "vitest";
import { calcularTotal } from "../carrito/precios";
import {
  MENSAJES,
  buscarMunicipio,
  celularValido,
  correoValido,
  primerCampoConError,
  validarDatosEntrega,
} from "./datos-entrega";
import { DEPARTAMENTOS } from "./divipola";

const validos = {
  nombreCompleto: "Ana Prueba",
  correo: "ana@ejemplo.com",
  celular: "3001234567",
  departamento: "05",
  ciudad: "05001",
  direccion: "Cra 1 # 2-3",
  detalles: "",
  notas: "",
  aceptoPolitica: true,
};

describe("celular (RN1 de ZTV-19)", () => {
  it("COM-01-CP3 · «12345» y «2001234567» son inválidos; «3001234567» es válido", () => {
    expect(celularValido("12345")).toBe(false);
    expect(celularValido("2001234567")).toBe(false);
    expect(celularValido("3001234567")).toBe(true);
  });

  it("acepta espacios y guiones al escribirlo y lo guarda solo con dígitos", () => {
    expect(celularValido("300 123 4567")).toBe(true);
    const r = validarDatosEntrega({ ...validos, celular: "300-123-4567" });
    expect(r.ok && r.datos.celular).toBe("3001234567");
  });
});

describe("correo (RN1)", () => {
  it("COM-01-CP4 · «ana@» es inválido; «ana@ejemplo.com» es válido", () => {
    expect(correoValido("ana@")).toBe(false);
    expect(correoValido("ana@ejemplo.com")).toBe(true);
  });
});

describe("calcularTotal (RN3)", () => {
  it("COM-01-CP7 · $ 149.700 + envío $ 12.000 = $ 161.700; desde $ 200.000 el envío es gratis", () => {
    expect(calcularTotal(149_700)).toBe(161_700);
    expect(calcularTotal(200_000)).toBe(200_000);
  });
});

describe("validarDatosEntrega (RN1, RN2 y escenario 3)", () => {
  it("datos válidos: limpia espacios y deja vacíos los opcionales como null", () => {
    const r = validarDatosEntrega({
      ...validos,
      nombreCompleto: "  Ana Prueba  ",
      correo: "ANA@Ejemplo.com",
    });
    expect(r).toEqual({
      ok: true,
      datos: { ...validos, correo: "ana@ejemplo.com", detalles: null, notas: null },
    });
  });

  it("escenario 3: sin ciudad y con celular «12345» da los dos mensajes exactos", () => {
    const r = validarDatosEntrega({ ...validos, ciudad: "", celular: "12345" });
    expect(r).toEqual({
      ok: false,
      errores: {
        celular: "Ingresa un celular colombiano de 10 dígitos que empiece por 3",
        ciudad: "Selecciona tu ciudad",
      },
    });
    expect(!r.ok && primerCampoConError(r.errores)).toBe("celular");
  });

  it("RN2: sin autorizar el tratamiento de datos no avanza", () => {
    const r = validarDatosEntrega({ ...validos, aceptoPolitica: false });
    expect(r).toEqual({ ok: false, errores: { aceptoPolitica: MENSAJES.aceptoPolitica } });
  });

  it("una ciudad de otro departamento no es válida (lista DANE)", () => {
    const r = validarDatosEntrega({ ...validos, departamento: "05", ciudad: "11001" });
    expect(r).toEqual({ ok: false, errores: { ciudad: MENSAJES.ciudad } });
  });

  it("límites: nombre de 2 y 81 caracteres, dirección de 4, notas de 201", () => {
    const r = validarDatosEntrega({
      ...validos,
      nombreCompleto: "An",
      direccion: "Cra",
      notas: "x".repeat(201),
    });
    expect(r).toEqual({
      ok: false,
      errores: {
        nombreCompleto: MENSAJES.nombreCompleto,
        direccion: MENSAJES.direccion,
        notas: MENSAJES.notas,
      },
    });
    expect(validarDatosEntrega({ ...validos, nombreCompleto: "x".repeat(81) }).ok).toBe(false);
    expect(validarDatosEntrega({ ...validos, nombreCompleto: "x".repeat(80) }).ok).toBe(true);
  });

  it("una petición sin campos recibe un mensaje por cada campo obligatorio", () => {
    const r = validarDatosEntrega({});
    expect(r.ok).toBe(false);
    expect(!r.ok && Object.keys(r.errores).sort()).toEqual(
      [
        "aceptoPolitica",
        "celular",
        "ciudad",
        "correo",
        "departamento",
        "direccion",
        "nombreCompleto",
      ].sort(),
    );
  });
});

describe("lista DANE (DIVIPOLA)", () => {
  it("tiene 33 departamentos y 1.122 municipios, con códigos que empiezan por el del departamento", () => {
    expect(DEPARTAMENTOS).toHaveLength(33);
    expect(DEPARTAMENTOS.reduce((n, d) => n + d.municipios.length, 0)).toBe(1122);
    for (const d of DEPARTAMENTOS)
      for (const [codigo] of d.municipios) expect(codigo.slice(0, 2)).toBe(d.codigo);
  });

  it("Medellín es el municipio 05001 de Antioquia", () => {
    expect(buscarMunicipio("05", "05001")).toEqual({
      departamento: "Antioquia",
      ciudad: "Medellín",
      codigoDane: "05001",
    });
  });
});
