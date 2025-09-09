/**
 * @typedef {"MONDAY"|"TUESDAY"|"WEDNESDAY"|"THURSDAY"|"FRIDAY"|"SATURDAY"|"SUNDAY"} DayOfWeek
 */

/**
 * @typedef {Object} HorarioDTO
 * @property {number} id
 * @property {DayOfWeek} dia                // java.time.DayOfWeek → MAYÚSCULAS
 * @property {string} apertura              // "HH:mm"
 * @property {string} cierre                // "HH:mm"
 */

/**
 * @typedef {Object} RestauranteDTO
 * @property {number} id
 * @property {string} nombre
 * @property {string | null | undefined} [descripcion]
 * @property {string | null | undefined} [imagen]   // Cloudinary
 * @property {"abierto"|"cerrado"} estado           
 * @property {string | null | undefined} [direccion]
 * @property {number | null | undefined} [lat]
 * @property {number | null | undefined} [lon]
 * @property {HorarioDTO[] | undefined} [horarios]
 */

/**
 * @typedef {Object} RestauranteUpdateDTO
 * @property {string} [nombre]
 * @property {string} [descripcion]
 * @property {string} [direccion]
 * @property {number} [lat]
 * @property {number} [lon]
 * @property {string | null} [imagen]
 * @property {"abierto"|"cerrado"} [estado]  // evitar enviar; el GET lo recalcula
 * @property {HorarioDTO[]} [horarios]       // tu service no lo usa en /{id}
 */

/**
 * @typedef {Object} HorarioRequestDTO
 * @property {DayOfWeek} dia
 * @property {string} apertura   // "HH:mm"
 * @property {string} cierre     // "HH:mm"
 */

/**
 * @typedef {Object} HorarioRequestSemanalDTO
 * @property {HorarioRequestDTO[]} tramos   // lista PLANA
 */

// Export vacío para poder referenciar este módulo en otros JSDoc con import()
export { };
