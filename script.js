// Botões do header e o botão de reinicar
const themeButton = document.getElementById("theme-button");
const soundButton = document.getElementById("sound-button");
const resetButton = document.getElementById("reset-button");

// Placar
const playerScoreElement = document.getElementById("player-score");
const computerScoreElement = document.getElementById("computer-score");

// Área da batalha
const playerChoiceElement = document.getElementById("player-choice");
const computerChoiceElement = document.getElementById("computer-choice");
const resultIcon = document.getElementById("result-icon");
const resultMessage = document.getElementById("result-message");

// Estatística
const streakElement = document.getElementById("streak");
const winsElement = document.getElementById("wins");
const matchesElement = document.getElementById("matches");

// Clique nos botões
const choiceButtons = document.querySelectorAll(".choice-card");

// Configuração do jogo
const CHOICES = {
    rock: {
        name: "Pedra",
        icon: "✊",
        beats: "scissors",
        key: "1"
    },

   paper: {
        name: "Papel",
        icon: "🖐",
        beats: "rock",
        key: "2"

    },
    scissors: {
        name:"Tesoura",
        icon: "✌",
        beats: "paper",
        key: "3"
    }

};

// Lista apenas com os nomes: ["rock", "paper", "scissors"]
const CHOICE_IDS = Object.keys(CHOICES);

const RESULTS = {
    win: {
        icon: "🎉",
        message: "Você venceu!",
        color: "var(--success)",
        playerBorder: "var(--success)",
        computerBorder: "var(--danger)"
    },

    lose: {
        icon: "😢",
        message: "Você perdeu!",
        color: "var(--danger)",
        playerBorder: "var(--danger)",
        computerBorder: "var(--success)"
    },

    draw: {
        icon: "🤝",
        message: "Empate!",
        color: "var(--text-muted)",
        playerBorder: "var(--text-muted)",
        computerBorder: "var(--text-muted)"
    }
};

// Tempo (em milissegundos) que o computador "pensa" 
const SUSPENSE_TIME = 700;

// Velocidade que os emojis trocam durante o suspense
const SUSPENSE_SPEED = 100;

// Vitórias necessárias para ganhar o jogo (melhor de 5 = 3)
const WINS_TO_WIN = 3;

//Estado do jogo
const state = {
    playerScore: 0,
    computerScore: 0,
    streak: 0,
    matches: 0,

    // True enquanto o computador está "pensando"
    isPlaying: false,

     // True quando alguém já chegou a 3 vitórias
    gameOver: false,

    soundOn: true,
    theme: "dark"
};

// Guardam os temporizadores do suspense para podemos cancelar
let suspenseInterval = null;
let suspenseTimeout = null;

// Preferências salvas
function saveSetting(name, value) {
    try {
        localStorage.setItem("jokenpo-" + name, value);
    } catch (error) {
        // Se não conseguir salvar, o jogo continuar normal
    }
}

function loadSetting(name, fallback) {
    try {
        const value = localStorage.getItem("jokenpo-" + name);

        return value !== null ? value : fallback;
    } catch (error) {
        return fallback;
    }
}

// SOM
let audioContext = null;

function playTone(frequency, duration, startAt = 0, type = "sine") {
    if (!state.soundOn) {
        return;
    }

    try {
             // O AudioContext só é criado no primeiro som, poque os navegadores exigem um clique antes
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        if (audioContext.state === "suspended") {
            audioContext.resume();
        }

        const oscillator = audioContext.createOscillator();
        const volume = audioContext.createGain();
        const start = audioContext.currentTime + startAt;

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, start);

        // O volume sobe rápido e desce suave, para não "estalar"
        volume.gain.setValueAtTime(0.0001, start);
        volume.gain.exponentialRampToValueAtTime(0.15, start + 0.01);
        volume.gain.exponentialRampToValueAtTime(0.0001, start + duration);

        oscillator.connect(volume);
        volume.connect(audioContext.destination);

        oscillator.start(start);
        oscillator.stop(start + duration + 0.02);
    } catch (error) {
        // Se o navegador não suportar áudio, o jogo segue sem som
    }
}

const sounds = {
    click() {
        playTone(440, 0.08);
    },

    win() {
        playTone(523, 0.15, 0);
        playTone(659, 0.15, 0.15);
        playTone(784, 0.3, 0.3);
    },

    lose() {
        playTone(330, 0.2, 0, "triangle");
        playTone(247, 0.35, 0.2, "triangle");
    },

    draw() {
        playTone(392, 0.12, 0, "triangle");
        playTone(392, 0.12, 0.18, "triangle");
    },
};

function updateSoundButton() {
    soundButton.textContent = state.soundOn ? "🔊" : "🔇";
}

function toggleSound() {
    state.soundOn = !state.soundOn;

    saveSetting("sound", state.soundOn ? "on" : "off");
    updateSoundButton();

    // Se acabou de ligar, toca um bip para confirmar
    sounds.click();
}

//TEMA
function applyTheme(theme) {
    state.theme = theme;

    document.documentElement.setAttribute("data-theme", theme);

    themeButton.textContent = theme === "dark" ? "🌙" : "☀️";
}


function toggleTheme() {
    const newTheme = state.theme === "dark" ? "light" : "dark";

    applyTheme(newTheme);
    saveSetting("theme", newTheme);

    sounds.click();
}

// Lógoca do jogo
function getComputerChoice() {
    const randomIndex = Math.floor(Math.random() * CHOICE_IDS.length);

    return CHOICE_IDS[randomIndex];
}

// Descobre o resultado do ponto de vista do jogador
function getResult(playerChoice, computerChoice) {
    if (playerChoice === computerChoice) {
        return "draw";
    }

    if (CHOICES[playerChoice].beats === computerChoice) {
        return "win";
    }

    return "lose";
}

// Atualização da tela
function updateScoreboard() {
    playerScoreElement.textContent = state.playerScore;
    computerScoreElement.textContent = state.computerScore;
}

function updateStats() {
    streakElement.textContent = state.streak;
    winsElement.textContent = state.playerScore;
    matchesElement.textContent = state.matches;
}

// Volta a área da batalha para o estado inicial
function resetBattleArea() {
    playerChoiceElement.textContent = "?";
    computerChoiceElement.textContent = "?";

    // "" remove o estilo inline e devolve a cor original do CSS
    playerChoiceElement.style.borderColor = "";
    computerChoiceElement.style.borderColor = "";

    resultIcon.textContent = "⚔️";
    resultMessage.textContent = "Faça sua escolha";
    resultMessage.style.color = "";
}

function showResult(result) {
    const info = RESULTS[result];

    resultIcon.textContent = info.icon;
    resultMessage.textContent = info.message;
    resultMessage.style.color = info.color;

    playerChoiceElement.style.borderColor = info.playerBorder;
    computerChoiceElement.style.borderColor = info.computerBorder;
}

// Suspense do computador
function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function startSuspense(onFinish) {
    if (prefersReducedMotion()) {
        onFinish();
        return;
    }

    let index = 0;

    suspenseInterval = setInterval(function () {
        const id = CHOICE_IDS[index % CHOICE_IDS.length];

        computerChoiceElement.textContent = CHOICES[id].icon;

        index++;
    }, SUSPENSE_SPEED);

    suspenseTimeout = setTimeout(function () {
        cancelSuspense();
        onFinish();
    }, SUSPENSE_TIME);
}

function cancelSuspense() {
    clearInterval(suspenseInterval);
    clearTimeout(suspenseTimeout);
}

// Rodada
function play(playerChoice) {
    // Ignora cliques enquanto a rodada anterior não teerminou
    if (state.isPlaying || state.gameOver) {
        return;
    }

    state.isPlaying = true;

    sounds.click();

    // Limpa o resultado anterior e mostra a jogada do jogador
    resetBattleArea() ;
    playerChoiceElement.textContent = CHOICES[playerChoice].icon;
    resultMessage.textContent = "Pensando...";

    // O computador escolhe agora, mas só revelamos depois do suspense
    const computerChoice = getComputerChoice();

    startSuspense(function () {
        finishRound(playerChoice, computerChoice);
    });
}

function checkGameOver() {
    if (state.playerScore < WINS_TO_WIN && state.computerScore < WINS_TO_WIN) {
        return;
    }

    state.gameOver = true;

    const playerWon = state.playerScore >= WINS_TO_WIN;

    resultIcon.textContent = playerWon ? "🏆" : "💀";
    resultMessage.textContent = playerWon ? "Você é campeão!" : "Fim de jogo";
    resultMessage.style.color = playerWon ? "var(--success)" : "var(--danger)";

    resetButton.textContent = "🔄 Jogar novamente";
}

function finishRound(playerChoice, computerChoice) {
    const result = getResult(playerChoice, computerChoice);

    computerChoiceElement.textContent = CHOICES[computerChoice].icon;

    state.matches++;

    if (result === "win") {
        state.playerScore++;
        state.streak++;
    }

    if (result === "lose") {
        state.computerScore++;
        state.streak = 0;
    }

    // No empate ninguém pontua e a sequência continua
    updateScoreboard();
    updateStats();
    showResult(result);
    checkGameOver();

    sounds[result]();

    state.isPlaying = false;
}

// Reiniciar
function resetGame() {
    // Se o computador estava "pensando", cancela
    cancelSuspense();

    state.playerScore = 0;
    state.computerScore = 0;
    state.streak = 0;
    state.matches = 0;
    state.isPlaying = false;

    state.gameOver = false;
    resetButton.textContent = "🔄 Reiniciar partida";

    updateScoreboard();
    updateStats();
    resetBattleArea();

    sounds.click();
}

// Eventos
choiceButtons.forEach(function (button) {
    button.addEventListener("click", function () {
        play(button.id);
    });
});

// Teclas 1, 2 e 3
document.addEventListener("keydown", function (event) {
    // Não atrapalha atalhos como Ctrl + 1 e ignora tecla segurada
    if (event.ctrlKey || event.metaKey || event.repeat) {
        return;
    }

    const id = CHOICE_IDS.find(function (choiceId) {
        return CHOICES[choiceId].key === event.key;
    });

    if (id) {
        play(id);
    }
});

resetButton.addEventListener("click", resetGame);
themeButton.addEventListener("click", toggleTheme);
soundButton.addEventListener("click", toggleSound);

// Inicialização
function init() {
    // Recupera as preferências salvas (ou usa o padrão)
    applyTheme(loadSetting("theme", "dark"));

    state.soundOn = loadSetting("sound", "on") === "on";
    updateSoundButton();
    
    resultMessage.setAttribute("aria-live", "polite");

    updateScoreboard();
    updateStats();
}

// Não precisa esperar o carregamento da página porque o <script> está no final do <body>, depois de todo o HTML.
init();