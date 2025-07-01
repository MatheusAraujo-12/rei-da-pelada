let timerId = null;
let timeLeft = 0;

// Esta função escuta as mensagens vindas do componente principal
self.onmessage = function(e) {
    const { command, value } = e.data;

    if (command === 'start') {
        timeLeft = value;
        
        // Se já houver um timer, limpa antes de começar um novo
        if (timerId) {
            clearInterval(timerId);
        }

        // Inicia o intervalo que roda a cada segundo
        timerId = setInterval(() => {
            if (timeLeft > 0) {
                timeLeft--;
                // Envia o tempo restante de volta para o componente principal
                self.postMessage({ type: 'tick', timeLeft: timeLeft });
            } else {
                clearInterval(timerId);
                timerId = null;
                // Envia uma mensagem dizendo que o tempo acabou
                self.postMessage({ type: 'done' });
            }
        }, 1000);
    } else if (command === 'pause') {
        if (timerId) {
            clearInterval(timerId);
            timerId = null;
        }
    } else if (command === 'stop') {
        if (timerId) {
            clearInterval(timerId);
            timerId = null;
        }
        timeLeft = 0;
    }
};