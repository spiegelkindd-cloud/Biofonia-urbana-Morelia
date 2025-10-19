// by Spiegelkind @spiegelkindd & Gemini Sonification AI
// APACHE License 2.0
// "Continuum Granular" Script (v2 - Corregido y Robusto)
// October 19, 2025

(
s.boot;
s.waitForBoot {

	// --- 1. CONFIGURACIÓN SÓNICA ---
	var tempo = 120;
	var barDuration = (60 / tempo) * 4;
	var subdivisions = [1, 0.5, 0.25, 0.125, 0.0625];
	var rates = [0.5, 1, 2, 4];

	// --- PARÁMETROS DE EFECTOS ---
	var revMix = 0.2;
	var revRoom = 0.8;
	var revDamp = 0.5;
	var panRate = 2;

	// --- 2. DEFINICIÓN DEL SYNTHDEF ---
	SynthDef(\continuumPlayer, {
		|buf, gate = 0, amp = 0.7,
		 revMix = 0.3, revRoom = 0.7, revDamp = 0.5,
		 panRate = 2|

		var sig, env, pannedSig, reverbedSig;
		var pos, rate, trigger;

		pos = \pos.kr(0);
		rate = \rate.kr(1);
		trigger = \trigger.tr(0);

		env = Env.perc(0.01, 0.5, curve: -4).ar(gate: trigger, doneAction: 0);

		// CORRECCIÓN 1: Usamos '1' como número de canales para hacerlo universal.
		// CORRECCIÓN 2: El argumento se llama 'phase', no 'phasor'.
		sig = BufRd.ar(1, buf,
			phase: Phasor.ar(trigger, rate * BufRateScale.kr(buf),
				start: pos * SampleRate.ir, // Convertimos segundos a frames
				end: BufFrames.kr(buf)
			),
			loop: 1
		);

		pannedSig = Pan2.ar(sig, SinOsc.kr(panRate).range(-1, 1), env * amp);
		reverbedSig = FreeVerb.ar(pannedSig, revMix, revRoom, revDamp);
		Out.ar(0, XFade2.ar(pannedSig, reverbedSig, revMix.linlin(0, 1, -1, 1)));

	}).add;

	// --- 3. CARGA Y SINCRONIZACIÓN ---
	~file = Buffer.read(s, "/Users/camilacv/Desktop/file.WAV");
	s.sync;

	// --- 4. LÓGICA DE REPRODUCCIÓN ---
	~player = Synth(\continuumPlayer, [
		\buf, ~file.bufnum,
		\revMix, revMix,
		\revRoom, revRoom,
		\revDamp, revDamp,
		\panRate, panRate
	]);

	~looper = Routine({
		var randomPos, playDur, randomRate;
		inf.do {
			randomRate = rates.choose;
			playDur = (barDuration * subdivisions.choose) / randomRate;
			randomPos = rrand(0.0, max(0, ~file.duration - playDur));

			("Rate: " ++ randomRate ++ "x, Dur: " ++ playDur.round(0.01) ++ "s, Pos: " ++ randomPos.round(0.01) ++ "s").postln;

			~player.set(
				\pos, randomPos,
				\rate, randomRate,
				\trigger, 1
			);
			playDur.wait;
		}
	}).play;

	"Script 'Continuum Granular' iniciado. Presiona Cmd + . para detener.".postln;
};
)


//borrar esto es para grabar
s.prepareForRecord
s.record
s.stopRecording
s.quit
