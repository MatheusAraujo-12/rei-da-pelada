let timerId = null;
let timeLeft = 0;

self.onmessage = function(e) {
    const { command, value } = e.data;

    if (command === 'start') {
        timeLeft = value;
        if (timerId) {
            clearInterval(timerId);
        }
        timerId = setInterval(() => {
            if (timeLeft > 0) {
                timeLeft--;
                self.postMessage({ type: 'tick', timeLeft: timeLeft });
            } else {
                clearInterval(timerId);
                timerId = null;
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