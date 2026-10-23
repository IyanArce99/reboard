# «¿Qué tabla necesito?» — Asistente de recomendación

Ruta canónica: **`/calculadora-litros`**. Nombre visible: «¿Qué tabla necesito?».

Es **el único recomendador.** Todos estos accesos llevan aquí:
- Menú.
- «Descúbrelo en 30 s» y «¿Qué tabla necesitas?» en la home.
- «No sé: ¿qué tabla necesito?» en la hoja de búsqueda.
- «Afinar recomendación».

No existe una segunda calculadora en un modal. El buscador mantiene «Sé los litros» con su rango manual.

> **Es un stepper visual, no un formulario gigante.** Una pregunta por pantalla.

Implementación de referencia: `wzRec()` y `wizardVals()` en `design/source/prototype-logic.js`. Las constantes (`WLV`, `WCUR`, `WFQ`, `WWV`, `WGL`, `WQ`, `TINFO`, `REC`) están en `mock-data.js`.

## Estructura de la página
1. H1 «¿Qué tabla necesito?», explicación y «Empezar de nuevo» (si hay progreso).
2. **Asistente:**
   - **D:** tarjeta blanca de 560 px de alto mínimo, más el panel lateral «Tu perfil hasta ahora» (300 px, petróleo). El panel muestra el resumen editable y el volumen orientativo en directo.
   - **M:** tarjeta a ancho completo y barra de navegación fija abajo.
3. **Resultado**, que sustituye al asistente.
4. **Contenido SEO**, siempre visible bajo el asistente, sin interrumpir el flujo: cómo interpretar litros y medidas, ejemplos orientativos calculados con la misma función, enlaces a categorías y guía.

En cada paso:
- «Paso N de 7».
- Barra de progreso de 7 segmentos: hechos en turquesa, el actual en petróleo, los pendientes en #D6E4E3. Los hechos se pueden pulsar para volver.
- Etiqueta «Opcional» en los pasos 3 a 7.
- Pregunta grande y ayuda.
- Anterior · [Saltar] · **Continuar** (amarillo).

## Pasos
| # | Pregunta | Tipo | Opciones / validación |
|---|---|---|---|
| 1 | ¿Cuánto pesas? | Número grande (`inputmode=numeric`, 44 px mono) + accesos rápidos 55/65/75/85/95 + altura opcional (cm) | **Obligatorio.** Entre 30 y 160 kg. Si no es válido, borde rojo y el mensaje «Introduce un peso entre 30 y 160 kg». Enter = Continuar |
| 2 | ¿Cuál es tu nivel? | OptionCard única con descripción | **Obligatorio.** Estoy aprendiendo / Ya cojo olas por mi cuenta / Hago giros y maniobras / Tengo bastante experiencia |
| 3 | ¿Qué tabla usas ahora? | OptionCard única | Opcional. Softboard, Evolutiva, Midlength, Shortboard, Longboard, Otra, No tengo tabla. Si no es «No tengo tabla», aparecen la longitud y los litros opcionales |
| 4 | ¿Con qué frecuencia surfeas? | OptionCard única | Opcional. Menos de 1/semana · 1–2/semana · 3 o más/semana |
| 5 | ¿Qué olas sueles surfear? | OptionCard única | Opcional. Pequeñas y suaves · Medianas · Potentes o grandes · No estoy seguro |
| 6 | ¿Qué quieres conseguir? | OptionCard **múltiple** (2 columnas en D) | Opcional. Aprender y coger más olas · Pasar de una softboard a una tabla rígida · Mejorar mis giros · Conseguir más maniobrabilidad · Surfear con más facilidad en olas pequeñas · Practicar un surf más tranquilo |
| 7 | ¿Dónde buscas y cuánto quieres gastar? | Chips + input | Opcional. Toda España / Canarias / Gran Canaria / Tenerife / Otras zonas (desplegable). Presupuesto: Sin límite / 150 / 250 / 400 € u otro. **Solo filtra anuncios, no altera la recomendación** |

**Navegación:**
- Anterior conserva las respuestas.
- Saltar avanza sin responder.
- Si se intenta continuar el paso 1 o el 2 sin valor válido, se muestra el error o un toast.
- Las respuestas se guardan en `localStorage`, así que sobreviven a una recarga.
- «Empezar de nuevo» lo resetea todo.

## Reglas de recomendación (lógica **orientativa y simplificada**, sin validar por surfistas ni shapers)
Fuente de verdad: `src/lib/finder/recommend.ts`, cubierta por `tests/unit/finder.test.ts`.
```
factor[nivel] = aprendiendo [0.85, 1.05] · cojo olas [0.60, 0.78] · giros [0.46, 0.58] · experiencia [0.36, 0.44]
k = 1
frecuencia: <1/sem ×1.08 · ≥3/sem ×0.95
olas: pequeñas ×1.05 · grandes ×0.92
objetivos: aprender|softboard ×1.03 (no se acumulan) · maniobrabilidad ×0.94 · giros ×0.97 · olas pequeñas ×1.04
k se limita a [0.90, 1.20]   (antes, acumulando reducciones, un avanzado de 75 kg bajaba a ≈0,29 L/kg)
rango = round(peso × factor × k)
tabla actual (solo si se ha elegido una, tiene 10–200 L y el nivel no es experto):
  no bajar más de un 20 %: lo ≥ round(actual × 0.80)   (antes ×0.78, que era un 22 %)
rango final entre 15 y 120 L; hi ≥ lo + 4; por encima de 120 L, nota de que es más de lo habitual en tablas de serie
```
**Comparación con reglas generales habituales** (orientativas, no una fuente concreta): principiante ≈0,8–1,0+ L/kg · intermedio ≈0,55–0,7 · avanzado ≈0,38–0,45. «Aprendiendo» y «experiencia» caen dentro; «cojo olas» queda algo por encima del intermedio (es intermedio bajo); «giros», entre intermedio y avanzado.
**Tipos por nivel:**
- Aprendiendo: Softboard, Evolutiva, Longboard.
- Cojo olas: Evolutiva, Midlength, Fish.
- Giros: Híbrida, Fish, Midlength.
- Experiencia: Shortboard, Híbrida, Fish.

**Ajustes:**
- «Pasar de softboard» pone Evolutiva primero y quita Softboard.
- «Surf tranquilo» añade Midlength y Longboard delante.
- «Olas pequeñas» añade Fish delante.
- Con olas grandes se quitan Longboard y Softboard.
- Se muestran los 3 primeros.

**Longitud orientativa por nivel:** 7'6"–9'0" · 7'0"–8'0" · 6'0"–7'2" · 5'8"–6'4".

«Qué buscar» y «Qué evitar» son textos fijos por nivel.

## Resultado
- **Bloque petróleo:**
  - «Estas son las tablas que mejor podrían encajarte» y un subtítulo con el peso, el nivel y las olas.
  - Chips de respuestas editables (✎ lleva al paso).
  - Tres tarjetas: **volumen** (número grande en mono) más la longitud, **qué buscar** y **qué evitar**.
  - Explicación del porqué, con el aviso del 20 % si aplica.
- **Tipos de tabla para ti:** 3 tarjetas con foto, «Primera opción» o «También puede encajar» (sin prometer que encaja), medidas orientativas, por qué, a tener en cuenta y CTA «Ver N [tipo]», o «Sin anuncios · crear alerta» si no hay ninguno.
- **Tablas de segunda mano para ti:**
  - Anuncios que cumplen volumen, tipo, zona y presupuesto. Cada uno lleva su motivo: «En tu rango: 47 L dentro de 69–85 L · Evolutiva».
  - CTA amarillo «Ver todas las tablas compatibles», que lleva a `/buscar` con los filtros y el perfil aplicados.
  - **Sin anuncios:** «Todavía no hay tablas publicadas entre X y Y L.» (o «No hay tablas…» si lo que excluye es la zona o el presupuesto). Opciones para ampliar **solo si dan resultados** (nunca «(0)»), «Crear alerta» una sola vez y un enlace para publicar.
- **Alerta con este perfil:** email opcional.
- **Guardar mi perfil de surfista:** sin registro, en local. Activa:
  - «Te encaja» en las tarjetas, si los litros están en el rango.
  - La explicación de compatibilidad en la ficha («Esta tabla está dentro de tu rango orientativo de volumen…», o «fuera» si no lo está).
  - El filtro «Solo tablas para mí».
  - Las medidas marcadas en la ficha de modelo.
- Repetir cuestionario.
- Aviso: «Recomendación generada con una lógica simplificada de demostración.»

## Pendiente
- Validar los factores con surfistas y shapers.
- Perfil en la nube, ligado al email.
- Medir el abandono por paso.
- Ilustraciones de tipo de ola (hoy no se muestran a propósito, para no complicar).
