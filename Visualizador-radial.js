//Visualizador radial de audio
// VARIABLES GLOBALES
var canvas, // Variable para el lienzo de p5.js
  bgColor, // Variable para almacenar el color de fondo
  radialArcs = [], // Arreglo para almacenar nuestros dos sistemas de arcos (bajos y agudos)
  fft, // Objeto de Análisis de Fourier para analizar el audio
  soundFile, // Objeto para almacenar el archivo de sonido cargado
  soundSpectrum; // Variable para el espectro de sonido (no se usa activamente pero es parte del original)

function setup() {
  // --- MODIFICACIÓN CLAVE PARA EL FEEDBACK ---
  // Se añade un canal alfa (transparencia) al modo de color.
  // Ahora es HSB (Tono, Saturación, Brillo, Alfa). El alfa va de 0.0 a 1.0.
  colorMode(HSB, 360, 100, 100, 1.0);
  
  frameRate(60); // Establece la velocidad de fotogramas a 60 por segundo
  canvas = createCanvas(windowWidth, windowHeight); // Crea un lienzo que ocupa toda la ventana
  canvas.drop(gotFile); // Habilita la función 'gotFile' cuando se arrastra un archivo al lienzo
  
  // Define el color de fondo en HSB. Tono 330 (un magenta oscuro), Saturación 0 (gris), Brillo 5 (casi negro).
  bgColor = color(330, 0, 5);
  background(bgColor); // Dibuja el fondo inicial
  
  initRadialArcs(); // Llama a la función para inicializar los visualizadores de arcos
  
  // Dibuja el texto de bienvenida en la pantalla
  textAlign(CENTER);
  fill(0, 0, 90); // Color blanco para el texto
  text('Arrastra un archivo MP3 aquí, luego haz clic para reproducir.', width / 2, height / 4);
}

// Esta función se activa cuando un archivo es arrastrado sobre el lienzo
function gotFile(file) {
  // Comprueba si no hay un sonido ya cargado Y si el archivo es de tipo 'audio'
  if ((!soundFile) && (file.type == "audio")) {
    background(bgColor); // Limpia el texto de bienvenida
    soundFile = new p5.SoundFile(file.data); // Crea un objeto de sonido con el archivo
    initSound(); // Inicializa el objeto FFT para el análisis
    canvas.mouseClicked(togglePlay); // Asigna la función play/pause al clic del mouse
  }
}

function draw() {
  // El bucle de dibujo principal solo se ejecuta si hay un archivo de sonido cargado
  if (soundFile) {
    
    // --- MODIFICACIÓN 1: El Feedback Espectral ---
    // En lugar de limpiar la pantalla con background(), dibujamos un rectángulo
    // semi-transparente del color de fondo. El valor '0.1' del alfa determina
    // qué tan rápido se desvanecen los trazos anteriores. Un valor más bajo crea una estela más larga.
    noStroke(); // Nos aseguramos de que el rectángulo no tenga borde
    fill(330, 0, 5, 0.1); // El mismo color de fondo, pero con muy poca opacidad
    rect(0, 0, width, height); // Dibuja el rectángulo sobre todo el lienzo
    
    analyseSound(); // Analiza el sonido en el fotograma actual
    updateRadialArcs(); // Actualiza los datos de los arcos con la nueva información del sonido
    drawRadialArcs(); // Dibuja los arcos en su nueva posición y estado
  }
}

// Inicializa los dos conjuntos de arcos radiales con sus parámetros específicos
function initRadialArcs() {
  // Constructor: (Nº de arcos, radio mínimo, radio máximo, ángulo base, grosor máx, tono mín, tono máx)
  // Arcos para los bajos: 40 arcos, más internos, gruesos y en tonos magenta/rojo.
  radialArcs[0] = new RadialArcs(40, height / 4, width, 0, 3, 330, 360); // Bajos
  // Arcos para los agudos: 60 arcos, más externos, finos y en tonos violeta/magenta.
  radialArcs[1] = new RadialArcs(60, height / 12, height, -HALF_PI, 1.5, 300, 330); // Agudos
}

// Actualiza los valores de los arcos basándose en la energía del sonido
function updateRadialArcs() {
  if (soundFile.isPlaying()) {
    // A cada conjunto de arcos se le pasa la energía de una frecuencia (bajos o agudos)
    radialArcs[0].updateArcs(getNewSoundDataValue("bass"));
    radialArcs[1].updateArcs(getNewSoundDataValue("treble"));
  }
}

// Llama a la función de dibujo para cada conjunto de arcos
function drawRadialArcs() {
  radialArcs[0].drawArcs();
  radialArcs[1].drawArcs();
}


// ----------------------------------------------------------------------------------
// --- CLASE RadialArcs: Gestiona un conjunto completo de arcos concéntricos ---
// ----------------------------------------------------------------------------------
class RadialArcs {
  constructor(arcCount, minR, maxR, baseR, maxStr, minH, maxH) {
    this.radialArcCount = arcCount; // Cantidad de arcos en este conjunto
    this.minRadius = minR; // El radio del arco más pequeño (interno)
    this.maxRadius = maxR; // El radio del arco más grande (externo)
    this.radialArcs = []; // Arreglo para guardar cada objeto RadialArc individual
    this.baselineR = baseR; // Ángulo de rotación base para todo el conjunto
    this.maxStroke = maxStr; // Grosor máximo de línea
    this.minHue = minH; // Tono de color mínimo
    this.maxHue = maxH; // Tono de color máximo
    this.initArcs(); // Llama al método para crear los arcos individuales
  }

  // Crea cada uno de los objetos RadialArc y los guarda en el arreglo
  initArcs() {
    for (let a = 0; a < this.radialArcCount; a++) {
      this.radialArcs[a] = new RadialArc(a, this.radialArcCount, this.minRadius, this.maxRadius, this.baselineR, this.maxStroke, this.minHue, this.maxHue);
    }
  }

  // Actualiza los valores de los arcos. 'd' es el nuevo valor de la energía del sonido (de 0 a 1)
  updateArcs(d) {
    // Recorre el arreglo de arcos desde el final hacia el principio
    for (let a = this.radialArcs.length - 1; a >= 0; a--) {
      if (a > 0) {
        // Cada arco toma el valor del arco que tiene justo delante (más interno).
        // Esto crea el efecto de que la onda se propaga hacia afuera.
        this.radialArcs[a].setValue(this.radialArcs[a - 1].getValue());
      } else {
        // El primer arco (el más interno) recibe el nuevo valor directamente del análisis de sonido.
        this.radialArcs[a].setValue(d);
      }
    }
  }

  // Dibuja todos los arcos del conjunto
  drawArcs() {
    for (let a = 0; a < this.radialArcs.length; a++) {
      this.radialArcs[a].redrawFromData();
    }
  }
}

// ----------------------------------------------------------------------------------
// --- CLASE RadialArc: Define un único arco, su apariencia y comportamiento ---
// ----------------------------------------------------------------------------------
class RadialArc {
  constructor(id, arcs, minR, maxR, baseR, maxStr, minH, maxH) {
    this.arcID = id; // Identificador de este arco (su posición en el conjunto)
    this.totalArcs = arcs; // Número total de arcos en su conjunto
    this.minRadius = minR;
    this.maxRadius = maxR;
    // Calcula el radio de ESTE arco en particular, distribuyéndolo entre el radio mínimo y máximo
    this.arcRadius = this.minRadius + (((this.maxRadius - this.minRadius) / this.totalArcs) * this.arcID + 1);
    this.maxStroke = maxStr;
    this.minHue = minH;
    this.maxHue = maxH;
    this.dataVal = 0; // El valor actual de este arco (de 0 a 1), representa la amplitud
    this.centerX = width / 2; // Coordenada X del centro del lienzo
    this.centerY = height / 2; // Coordenada Y del centro del lienzo
    
    // --- MODIFICACIÓN 2: Arcos de 180 grados ---
    // Se cambia QUARTER_PI por PI. Ahora la longitud máxima del arco será de 180 grados
    // a cada lado del eje, en lugar de 45.
    this.arcMaxRadian = PI;
    
    this.arcBaseline = baseR; // El ángulo de rotación base
    this.arcStartRadian = 0; // Ángulo de inicio del arco
    this.arcEndRadian = 0; // Ángulo de fin del arco
  }

  // Asigna un nuevo valor de datos al arco
  setValue(d) {
    this.dataVal = d;
  }

  // Devuelve el valor de datos actual del arco
  getValue() {
    return this.dataVal;
  }

  // Función principal para actualizar y dibujar
  redrawFromData() {
    this.updateArc();
    this.drawArc();
  }

  // Actualiza los ángulos de inicio y fin del arco basándose en su valor (dataVal)
  updateArc() {
    // El arco se dibuja simétricamente. La mitad se extiende en sentido horario y la otra en antihorario.
    this.arcEndRadian = this.arcBaseline + (this.arcMaxRadian * this.dataVal);
    this.arcStartRadian = this.arcBaseline - (this.arcMaxRadian * this.dataVal);
  }

  // Dibuja el arco en el lienzo
  drawArc() {
    this.dataColor = this.getDataHSBColor(this.dataVal); // Obtiene el color basado en el valor
    stroke(this.dataColor); // Aplica el color al trazo
    // El grosor del trazo también depende del valor, un sonido más fuerte crea una línea más gruesa
    strokeWeight(map(this.dataVal, 0, 1, 0, this.maxStroke));
    noFill(); // Los arcos no tienen relleno
    
    // Dibuja el arco principal
    arc(this.centerX, this.centerY, this.arcRadius, this.arcRadius, this.arcStartRadian, this.arcEndRadian);
    // Dibuja el arco reflejado en el lado opuesto (restando PI, que son 180 grados)
    arc(this.centerX, this.centerY, this.arcRadius, this.arcRadius, this.arcStartRadian - PI, this.arcEndRadian - PI);
  }

  // Calcula el color HSB basándose en el valor del arco
  getDataHSBColor(d) {
    // Mapea el valor (0 a 1) al rango de tonos definido para este conjunto de arcos
    this.dataHue = map(d, 0, 1, this.minHue, this.maxHue);
    // Un valor más alto resulta en menor saturación (color más "lavado")
    this.dataSaturation = map(d, 0, 1, 100, 80);
    // Un valor más alto resulta en mayor brillo (color más "brillante")
    this.dataBrightness = map(d, 0, 1, 10, 100);
    return color(this.dataHue, this.dataSaturation, this.dataBrightness);
  }
}

// ----------------------------------------------------------------------------------
// --- FUNCIONES DE SONIDO ---
// ----------------------------------------------------------------------------------

// Obtiene la energía de una banda de frecuencia y la mapea a un rango de 0 a 1
function getNewSoundDataValue(freqType) {
  // fft.getEnergy puede recibir "bass", "lowMid", "mid", "highMid", "treble"
  return map(fft.getEnergy(freqType), 0, 255, 0, 1);
}

// Inicializa el objeto FFT
function initSound() {
  // Parámetros: (smoothing, bins). Smoothing suaviza los cambios entre fotogramas.
  fft = new p5.FFT(0.4, 1024);
  soundFile.amp(0.7); // Baja un poco el volumen general para evitar saturación
}

// Función para reproducir o pausar el sonido
function togglePlay() {
  if (soundFile.isPlaying()) {
    soundFile.pause();
  } else {
    soundFile.loop(); // loop() lo reproduce en bucle continuo
  }
}

// Llama al método analyze() del objeto FFT
function analyseSound() {
  soundSpectrum = fft.analyze();
}
