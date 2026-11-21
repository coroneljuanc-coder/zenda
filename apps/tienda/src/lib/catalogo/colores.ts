/**
 * Muestra de color para el selector (ZTV-15). Es solo una ayuda visual: el nombre del color
 * siempre se escribe al lado (el color nunca se dice solo con color, por accesibilidad).
 * Un color que no esté aquí se muestra con la muestra gris neutra.
 */
const MUESTRAS: Record<string, string> = {
  blanco: "#ffffff",
  negro: "#111111",
  gris: "#9a9a9a",
  azul: "#2f5da8",
  "verde oliva": "#6b7140",
  verde: "#3e8e5a",
  morado: "#6b4c9a",
  terracota: "#c0603e",
};

export function muestraDeColor(nombre: string): string {
  return MUESTRAS[nombre.trim().toLowerCase()] ?? "#d9d9d9";
}
