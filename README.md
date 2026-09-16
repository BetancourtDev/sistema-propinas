# 🍽️ Sistema de Gestión y Liquidación de Propinas

Sistema web integral, portátil y autónomo diseñado para restaurantes, bares y locales gastronómicos. Permite registrar ventas diarias por turnos (mañana y noche), calcular propinas estimadas por mozo, consolidar semanas de liquidación y distribuir el pozo de retenciones entre el personal de apoyo (Cocina, Caja y Encargados) con deducción de adelantos e impresión de comprobantes de pago.

---

## 🚀 Características Principales

* **📅 Carga Diaria por Turnos (AM / PM):**
  * Registro de ventas individuales por camarero en turno mañana (AM) y turno noche (PM).
  * Cálculo inmediato de la propina estimada (por defecto **5%**) y del aporte al pozo de retención (por defecto **30%**).
  * Selector ágil de los 7 días de la semana con métricas KPI diarias en tiempo real.

* **📈 Resumen Semanal Consolidado:**
  * Vista centralizada de toda la semana por mozo: Total vendido, Propina estimada, Aporte al pozo, Turnos trabajados y Promedio de propina por turno.
  * Tarjetas KPI semanales globales (Total generado, promedio por mozo y promedio por turno).

* **💼 Distribución Proporcional del Pozo de Retención:**
  * Distribución basada en dotación de personas y factores de ponderación.
  * **Configuración calibrada por defecto:**
    * **Cocina:** Factor `8` $\rightarrow$ equivale a **$\frac{2}{3}$ (66,67%)** del pozo entre 7 personas.
    * **Caja:** Factor `7` $\rightarrow$ equivale a **$\frac{1}{6}$ (16,67%)** del pozo entre 2 personas.
    * **Encargados:** Factor `7` $\rightarrow$ equivale a **$\frac{1}{6}$ (16,67%)** del pozo entre 2 personas.
  * Ajuste automático de redondeo al centavo exacto para que el total repartido cuadre perfectamente con el pozo retenido.

* **💵 Control de Adelantos y Liquidación Individual Neta:**
  * Registro de adelantos entregados durante la semana a miembros de Cocina, Caja o Encargados.
  * Deducción automática en la liquidación individual final.
  * **Generador de Recibos / Comprobantes de Pago:** Modal con formato de ticket listo para imprimir con estilos adaptados (`window.print()`).

* **👥 Administración de Nómina y Personal:**
  * Pestaña dedicada para dar de alta y baja colaboradores en Salón (Camareros) y personal del pozo (Cocina, Caja, Encargados).
  * Filtros por área y sincronización automática con las planillas y conteos de dotación.

* **📊 Exportación Completa a Excel (`.xlsx`):**
  * Generación nativa en el navegador mediante **SheetJS** (`xlsx`).
  * Archivo multisolapa profesional estructurado en:
    1. `CAMAREROS`: Lista activa de personal de salón.
    2. Solapas diarias (`04-09`, `05-09`, etc.): Planillas diarias con turnos AM, PM y total general del día.
    3. `RESUMEN`: Consolidado semanal de ventas, turnos, KPIs, desglose del pozo y liquidación individual neta.

* **💾 Respaldo Portátil y Privacidad:**
  * **100% Client-Side:** Funciona completamente en el navegador sin requerir conexión a internet, bases de datos ni backend.
  * Los datos se persisten de forma segura en `localStorage`.
  * Herramientas para **Exportar e Importar respaldos en formato JSON** con un solo clic.
  * PIN de seguridad (`1270`) para prevenir la eliminación accidental de planillas o el reseteo del sistema.

* **🎨 Diseño y Experiencia de Usuario (UI/UX):**
  * Interfaz moderna con estética Glassmorphism y paleta de colores optimizada.
  * **Modo Oscuro / Modo Claro** con alternador rápido y persistencia de preferencia.
  * Formato numérico adaptado a moneda argentina (`ARS`, `es-AR` con separador de miles y decimales).

---

## 📐 Lógica de Cálculos y Fórmulas

### 1. Ventas y Propinas de Salón
$$\text{Propina Estimada} = \text{Total Vendido} \times 5\%$$
$$\text{Aporte al Pozo (Retención)} = \text{Propina Estimada} \times 30\%$$
$$\text{A Entregar al Mozo} = \text{Propina Estimada} - \text{Aporte Retención}$$

### 2. Turnos y Promedios
$$\text{Turnos Trabajados} = \text{Cantidad de turnos (AM o PM) con venta mayor a \$0}$$
$$\text{Promedio Propina por Turno} = \frac{\text{Total Propina Ganada}}{\text{Turnos Trabajados}}$$

### 3. Reparto del Pozo entre Personal de Apoyo
Para cada área $i$ (Cocina, Caja, Encargados):
$$\text{Puntos}_i = \text{Factor}_i \times \text{Cantidad de Personas}_i$$
$$\text{Porcentaje}_i = \frac{\text{Puntos}_i}{\sum \text{Puntos}} \times 100$$
$$\text{Importe Bruto}_i = \text{Pozo Total} \times \frac{\text{Puntos}_i}{\sum \text{Puntos}}$$
$$\text{Neto Individual} = \frac{\text{Importe Bruto}_i}{\text{Personas}_i} - \text{Adelantos Individuales}$$

---

## 📁 Estructura del Proyecto

```text
sistema-propinas/
│
├── index.html        # Estructura semántica, tabs de navegación, modales y plantillas
├── style.css         # Diseño visual, variables de tema (dark/light), responsive y estilos de impresión
├── app.js            # Lógica completa de estado, cálculos matemáticos, persistencia y exportación Excel
└── README.md         # Documentación general del proyecto
```

---

## 💻 Requisitos y Puesta en Marcha

### Requisitos:
* Cualquier navegador web moderno (Google Chrome, Microsoft Edge, Mozilla Firefox, Safari, Opera).
* No requiere instalar Node.js, Python, PHP ni ningún servidor web.

### Cómo ejecutar:
1. Descarga o clona la carpeta del proyecto.
2. Haz doble clic sobre el archivo `index.html` para abrirlo directamente en tu navegador preferido.

---

## 📖 Guía de Uso Rápido

1. **Crear una Planilla Semanal:**
   * En la barra lateral izquierda, selecciona la fecha de inicio del período y haz clic en **"Crear Nueva Semana"**.
2. **Cargar las Ventas Diarias:**
   * Dirígete a la pestaña **"Carga Diaria"**.
   * Selecciona el día (Día 1 a Día 7) y carga los importes de venta en el turno Mañana (AM) y/o Noche (PM).
3. **Revisar el Resumen Semanal:**
   * Entra a **"Resumen Semanal"** para observar el total consolidado, verificar el promedio de los mozos y auditar la distribución del pozo.
4. **Registrar Adelantos del Pozo (si corresponde):**
   * En la sección de distribución del resumen, selecciona el área y colaborador para cargar un adelanto en pesos.
5. **Generar e Imprimir Recibos:**
   * En la tabla de **Liquidación Individual Neta**, haz clic en el botón **"Recibo"** junto al colaborador para abrir su comprobante e imprimirlo en impresora térmica o tradicional.
6. **Descargar en Excel o Hacer Respaldo:**
   * Haz clic en **"Exportar a Excel"** en el encabezado para descargar el reporte completo `.xlsx`.
   * En la pestaña **"Ajustes"**, puedes exportar un archivo `.json` de respaldo para guardar una copia de seguridad en tu computadora.

---

## 🔒 Seguridad y PIN

* **PIN por Defecto:** `1270`
* Se solicita antes de realizar acciones destructivas, como eliminar planillas históricas o restablecer el sistema a valores de fábrica.

---

## 🛠️ Tecnologías Utilizadas

* **HTML5:** Marcado semántico y accesible.
* **CSS3:** Variables CSS para temas dinámicos, Flexbox, Grid y media queries para impresión limpia de tickets.
* **JavaScript Vanilla (ES6+):** Programación reactiva basada en estado centralizado (`state`), sin dependencias pesadas.
* **SheetJS (xlsx):** CDN para la generación y maquetación de libros de cálculo Excel en el cliente.
* **Web Storage API (`localStorage`):** Almacenamiento local persistente sin servidor.
