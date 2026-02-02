var activeOscillators = {};
var audioCtx;
var osc;

document.addEventListener("DOMContentLoaded", function(event) {
    
    //my interesting thing is making my background flash when you press a note
    function pulseBackground() {
        document.body.classList.add("bg-pulse");
        setTimeout(() => document.body.classList.remove("bg-pulse"), 120);
    }

    
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    //this will control the volume of all notes before playing
    const globalGain = audioCtx.createGain(); 

    //max gain from code in instructions
    const maxGain = 0.8;
    globalGain.gain.setValueAtTime(maxGain, audioCtx.currentTime)
    globalGain.connect(audioCtx.destination);

    function safePolyphony() {
        //figuring out how many notes we are playing at one time
        const isNotes = Object.keys(activeOscillators).length;
        //we use the amount of notes playing to scale down our volume with this formula 1/sqrt(n) because its louder than 1/n
        const mul = isNotes > 0 ? 1 / Math.sqrt(isNotes) : 1;
        //this is taking our gain which is .8 and then multiplying it by our "scale" var to make sure it doesnt go over 1
        globalGain.gain.setValueAtTime(maxGain * mul, audioCtx.currentTime);
    }   

    //checks for pressing down key
    window.addEventListener('keydown', keyDown, false);
    //checks for letting go of key
    window.addEventListener('keyup', keyUp, false);

    // values for keys 
    const keyboardFrequencyMap = {
        '90': 261.625565300598634,  //Z - C
        '83': 277.182630976872096, //S - C#
        '88': 293.664767917407560,  //X - D
        '68': 311.126983722080910, //D - D#
        '67': 329.627556912869929,  //C - E
        '86': 349.228231433003884,  //V - F
        '71': 369.994422711634398, //G - F#
        '66': 391.995435981749294,  //B - G
        '72': 415.304697579945138, //H - G#
        '78': 440.000000000000000,  //N - A
        '74': 466.163761518089916, //J - A#
        '77': 493.883301256124111,  //M - B
        '81': 523.251130601197269,  //Q - C
        '50': 554.365261953744192, //2 - C#
        '87': 587.329535834815120,  //W - D
        '51': 622.253967444161821, //3 - D#
        '69': 659.255113825739859,  //E - E
        '82': 698.456462866007768,  //R - F
        '53': 739.988845423268797, //5 - F#
        '84': 783.990871963498588,  //T - G
        '54': 830.609395159890277, //6 - G#
        '89': 880.000000000000000,  //Y - A
        '55': 932.327523036179832, //7 - A#
        '85': 987.766602512248223,  //U - B
    };

    //default waveform when we first load up
    let currentWaveform = "sawtooth";

    //my custom backgrounds for each waveform
    const waveformBackgrounds = {
        sine: "images/sine.png",
        sawtooth: "images/sawtooth.png",
        square: "images/square.jpg",
        triangle: "images/triangle.jpeg"
    };

    // set default background on load
    document.body.style.setProperty("--bg-url", `url("${waveformBackgrounds[currentWaveform]}")`);

    //we are getting the waveform the user selected here
    const waveButtons = document.querySelectorAll(".wave-btn");
    waveButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            currentWaveform = btn.dataset.wave;

            waveButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            //change full-page background image
            document.body.style.setProperty("--bg-url", `url("${waveformBackgrounds[currentWaveform]}")`);
        });
    });

    //so when we have that key and it is not already active then we can play that note, and also check for polyphony and do so safely
    function keyDown(event) {
    const key = (event.detail || event.which).toString();
        if (keyboardFrequencyMap[key] && !activeOscillators[key]) {
            playNote(key);
            pulseBackground();
            safePolyphony();
        }
    }

    //when the key is pressed and there is an oscillator then do the function
    function keyUp(event) {
    const key = (event.detail || event.which).toString();
        if (keyboardFrequencyMap[key] && activeOscillators[key]) {

            //getting the time of which stopped playing
            const currTime= audioCtx.currentTime;

            //figure out what note we are on
            const note = activeOscillators[key];

            //how long the release period is going to be
            const releaseTimer = 0.08 ;
            
            //del oscillator key and check polyphony 
            delete activeOscillators[key];
            safePolyphony();

            // neat function to cut the decay/attack
            note.gainNode.gain.cancelScheduledValues(currTime);

            // we start the release from this value we cancelled at, or a vert small number if too late
            const currVal = Math.max(note.gainNode.gain.value, 0.0001);
            note.gainNode.gain.setValueAtTime(currVal, currTime);

            // fade node out
            note.gainNode.gain.exponentialRampToValueAtTime(0.0001, currTime+ releaseTimer);

            // after fade we stop osc
            note.osc.stop(currTime+ releaseTimer + 0.02);

        }
    }

    function playNote(key) {

        //creating an osc for each note
        const osc = audioCtx.createOscillator();

        //set the freq for note we play now
        osc.frequency.setValueAtTime(keyboardFrequencyMap[key], audioCtx.currentTime)

        //user selects which one form theyd wnat
        osc.type = currentWaveform

        //creating a gain node for note
        const gainNode = audioCtx.createGain();

        //as soon as we click key set the gain to small num so no click
        const currTime= audioCtx.currentTime;
        gainNode.gain.setValueAtTime(0.0001, currTime);
        
        //slowly ramp up to the full gain
        gainNode.gain.exponentialRampToValueAtTime(1.0, currTime+ 0.05);
        
        //connect notegain to globalgain, which alr pointing to the destination
        osc.connect(gainNode);
        gainNode.connect(globalGain);

        //play note
        osc.start();

        //map the key to osc and gainnode
        activeOscillators[key] = { osc, gainNode };
    }
});