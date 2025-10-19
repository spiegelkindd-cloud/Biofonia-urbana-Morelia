// by Spiegelkind @spiegelkindd
// APACHE License 2.0
// "Random Hot Cues" Script (v2 - Corregido)
// October 19, 2025

(
s.boot;
s.waitForBoot {

	// --- 1. CONFIGURACIÓN ---
	var tempo = 120;
	var barDuration = (60 / tempo) * 4;
	var subdivisions = [1, 0.5, 0.25, 0.125];

	// --- 2. DEFINICIÓN DEL SINTETIZADOR ---
	// Es buena práctica definir los SynthDefs primero.
	SynthDef(\playFile, {
		|buf, startPos = 0, dur = 1, amp = 0.7|
		var sig, env;
		env = Env.linen(attackTime: 0.01, sustainTime: dur - 0.02, releaseTime: 0.01, level: amp).ar(Done.freeSelf);
		sig = PlayBuf.ar(
			numChannels: 1, // og 2: este file.wav = mono
			bufnum: buf,
			rate: BufRateScale.kr(buf),
			startPos: startPos * BufSampleRate.kr(buf)
		);
		Out.ar(0, sig * env);
	}).add;

	// --- 3. CARGA DE RECURSOS ---
	// Carga tu archivo de audio en un buffer
	~file = Buffer.read(s, "/Users/camilacv/Desktop/file.WAV");

	// --- 4. SINCRONIZACIÓN ---
	// ¡Esta es la corrección clave!
	// Pausa la ejecución aquí hasta que el SynthDef y el Buffer estén cargados en el servidor.
	s.sync;

	// --- 5. LÓGICA DE REPRODUCCIÓN ---
	// Esta rutina ahora se crea y ejecuta DESPUÉS de que todo está garantizado que está listo.
	~looper = Routine({
		inf.do {
			var currentSubdivision, playDur, randomPos;

			currentSubdivision = subdivisions.choose;
			playDur = barDuration * currentSubdivision;

			// Ya no es necesario ~file.wait, el buffer está listo.
			// Nos aseguramos de no pedir un fragmento más largo que el propio archivo.
			randomPos = rrand(0.0, max(0, ~file.duration - playDur));

			("Playing for " ++ playDur.round(0.01) ++ "s, from " ++ randomPos.round(0.01) ++ "s").postln;

			Synth(\playFile, [
				\buf, ~file.bufnum,
				\startPos, randomPos,
				\dur, playDur
			]);

			playDur.wait;
		}
	}).play;

	"Script iniciado. Presiona Cmd + . para detener.".postln;
};
)
