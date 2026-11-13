/**
 * Teléfono argentino normalizado al formato de WhatsApp ("549" + área +
 * número, sin el 0 ni el 15). Es la forma en que se guarda `telefonoLogin` y
 * la que piden los links wa.me.
 *
 * Cubre lo que la gente escribe: con o sin +54, con o sin 9, con el 0 de
 * larga distancia y con el 15 del celular ("0351 15 555-1234"). El 15 solo se
 * puede sacar cuando viene separado del número o con el 0 adelante, que es
 * cuando se distingue del área; un número todo junto sin 0 se toma como está.
 */
export function normalizarTelefono(entrada: string): string | null {
  const conEspacios = entrada.trim();
  let d = conEspacios.replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("54")) d = d.slice(2);
  if (d.startsWith("9") && d.length === 11) d = d.slice(1);

  // "0351 15 5551234" o "0351-15-5551234": el 15 va separado después del área.
  const conQuince = conEspacios.match(/^(?:\+?54\s*9?\s*)?0?(\d{2,4})[\s-]+15[\s-]*([\d\s-]{6,10})$/);
  if (conQuince) d = conQuince[1] + conQuince[2].replace(/\D/g, "");
  if (d.startsWith("0")) d = d.slice(1);

  return d.length === 10 ? `549${d}` : null;
}

/** Para el campo "Email o teléfono" del login: sin @ y con dígitos, es un teléfono. */
export function pareceTelefono(entrada: string): boolean {
  return !entrada.includes("@") && /\d{6,}/.test(entrada.replace(/\D/g, ""));
}
